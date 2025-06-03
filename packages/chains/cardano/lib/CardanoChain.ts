import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  AbstractUtxoChain,
  AssetBalance,
  BlockInfo,
  BoxInfo,
  ChainUtils,
  NotEnoughAssetsError,
  NotEnoughValidBoxesError,
  PaymentOrder,
  PaymentTransaction,
  SigningStatus,
  SinglePayment,
  TransactionAssetBalance,
  TransactionType,
  ValidityStatus,
} from '@rosen-chains/abstract-chain';
import JSONBigInt from '@rosen-bridge/json-bigint';
import CardanoTransaction from './CardanoTransaction';
import CardanoUtils from './CardanoUtils';
import cardanoUtils from './CardanoUtils';
import { ADA, CARDANO_CHAIN } from './constants';
import AbstractCardanoNetwork from './network/AbstractCardanoNetwork';
import Serializer from './Serializer';
import {
  CardanoAsset,
  CardanoBoxCandidate,
  CardanoConfigs,
  CardanoTx,
  CardanoUtxo,
} from './types';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { CardanoRosenExtractor } from '@rosen-bridge/rosen-extractor';

class CardanoChain extends AbstractUtxoChain<CardanoTx, CardanoUtxo> {
  declare network: AbstractCardanoNetwork;
  declare configs: CardanoConfigs;
  CHAIN = CARDANO_CHAIN;
  NATIVE_TOKEN_ID = ADA;
  extractor: CardanoRosenExtractor;
  protected signFunction: (txHash: Uint8Array) => Promise<string>;

  constructor(
    network: AbstractCardanoNetwork,
    configs: CardanoConfigs,
    tokens: TokenMap,
    signFunction: (txHash: Uint8Array) => Promise<string>,
    logger?: AbstractLogger
  ) {
    super(network, configs, tokens, logger);
    this.extractor = new CardanoRosenExtractor(
      configs.addresses.lock,
      tokens,
      logger
    );
    this.signFunction = signFunction;
  }

  /**
   * extracts payment order of a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns the transaction payment order (list of single payments)
   */
  extractTransactionOrder = (transaction: PaymentTransaction): PaymentOrder => {
    const tx = Serializer.deserialize(transaction.txBytes);

    const order: PaymentOrder = [];
    for (let i = 0; i < tx.body().outputs().len(); i++) {
      const output = tx.body().outputs().get(i);

      // skip change box (last box & address equal to bank address)
      if (
        i === tx.body().outputs().len() - 1 &&
        output.address().to_bech32() === this.configs.addresses.lock
      )
        continue;

      const assetBalance = CardanoUtils.getBoxAssets(output);
      const wrappedBalance = ChainUtils.wrapAssetBalance(
        assetBalance,
        this.tokenMap,
        this.NATIVE_TOKEN_ID,
        this.CHAIN
      );
      const payment: SinglePayment = {
        address: output.address().to_bech32(),
        assets: wrappedBalance,
      };
      order.push(payment);
    }
    return order;
  };

  /**
   * generates unsigned payment transaction for payment order
   * @param eventId the id of event
   * @param txType transaction type
   * @param order the payment order (list of single payments)
   * @param unsignedTransactions ongoing unsigned PaymentTransactions (used for preventing double spend)
   * @param serializedSignedTransactions the serialized string of ongoing signed transactions in Cardano Wasm format (used for chaining transactions)
   * @returns the generated payment transaction
   */
  generateMultipleTransactions = async (
    eventId: string,
    txType: TransactionType,
    order: PaymentOrder,
    unsignedTransactions: PaymentTransaction[],
    serializedSignedTransactions: string[]
  ): Promise<PaymentTransaction[]> => {
    this.logger.debug(
      `Generating Cardano transaction for Order: ${JsonBigInt.stringify(order)}`
    );
    // calculate required assets
    const fee = this.configs.fee;
    const requiredAssets = order
      .map((order) => order.assets)
      .reduce(ChainUtils.sumAssetBalance, {
        nativeToken:
          this.getMinimumNativeToken() +
          this.tokenMap.wrapAmount(this.NATIVE_TOKEN_ID, fee, this.CHAIN)
            .amount,
        tokens: [],
      });
    this.logger.debug(
      `Required assets: ${JsonBigInt.stringify(requiredAssets)}`
    );
    const unwrappedRequiredAssets = ChainUtils.unwrapAssetBalance(
      requiredAssets,
      this.tokenMap,
      this.NATIVE_TOKEN_ID,
      this.CHAIN
    );

    if (!(await this.hasLockAddressEnoughAssets(requiredAssets))) {
      const neededADA = unwrappedRequiredAssets.nativeToken.toString();
      const neededTokens = JSONBigInt.stringify(unwrappedRequiredAssets.tokens);
      throw new NotEnoughAssetsError(
        `Locked assets cannot cover required assets. ADA: ${neededADA}, Tokens: ${neededTokens}`
      );
    }

    const forbiddenBoxIds = unsignedTransactions.flatMap((paymentTx) => {
      const txBody = Serializer.deserialize(paymentTx.txBytes).body();
      const ids: string[] = [];
      for (let i = 0; i < txBody.inputs().len(); i++)
        ids.push(CardanoUtils.getBoxId(txBody.inputs().get(i)));

      return ids;
    });
    const trackMap = this.getTransactionsBoxMapping(
      serializedSignedTransactions.map((serializedTx) =>
        CardanoWasm.Transaction.from_bytes(Buffer.from(serializedTx, 'hex'))
      ),
      this.configs.addresses.lock
    );

    const coveredBoxes = await this.getCoveringBoxes(
      this.configs.addresses.lock,
      unwrappedRequiredAssets,
      forbiddenBoxIds,
      trackMap
    );
    if (!coveredBoxes.covered) {
      const neededAdas = unwrappedRequiredAssets.nativeToken.toString();
      const neededTokens = JSONBigInt.stringify(unwrappedRequiredAssets.tokens);
      throw new NotEnoughValidBoxesError(
        `Available boxes didn't cover required assets. ADA: ${neededAdas}, Tokens: ${neededTokens}`
      );
    }
    const bankBoxes = coveredBoxes.boxes;
    // calculate input boxes assets
    let remainingAssets = CardanoUtils.calculateUtxoAssets(bankBoxes);
    this.logger.debug(`Input assets: ${JsonBigInt.stringify(remainingAssets)}`);

    const txBuilder = CardanoWasm.TransactionBuilder.new(
      await this.getTxBuilderConfig()
    );
    let orderValue = CardanoWasm.BigNum.zero();

    // add outputs
    order.forEach((order) => {
      if (order.extra) {
        throw Error('Cardano does not support extra data in payment order');
      }
      // accumulate value
      const orderLovelace = this.tokenMap.unwrapAmount(
        this.NATIVE_TOKEN_ID,
        order.assets.nativeToken,
        this.CHAIN
      ).amount;
      orderValue = orderValue.checked_add(
        CardanoUtils.bigIntToBigNum(orderLovelace)
      );

      // reduce order value from remaining assets
      remainingAssets = ChainUtils.subtractAssetBalance(
        remainingAssets,
        ChainUtils.unwrapAssetBalance(
          order.assets,
          this.tokenMap,
          this.NATIVE_TOKEN_ID,
          this.CHAIN
        )
      );

      // create order output
      const address = CardanoWasm.Address.from_bech32(order.address);
      const value = CardanoWasm.Value.new(
        CardanoUtils.bigIntToBigNum(orderLovelace)
      );
      // inserting assets
      const orderMultiAsset = CardanoWasm.MultiAsset.new();
      order.assets.tokens.forEach((asset) => {
        const assetInfo = asset.id.split('.');
        const policyId: CardanoWasm.ScriptHash =
          CardanoWasm.ScriptHash.from_hex(assetInfo[0]);
        const assetName: CardanoWasm.AssetName = CardanoWasm.AssetName.new(
          Buffer.from(assetInfo[1], 'hex')
        );
        orderMultiAsset.set_asset(
          policyId,
          assetName,
          CardanoUtils.bigIntToBigNum(
            this.tokenMap.unwrapAmount(asset.id, asset.value, this.CHAIN).amount
          )
        );
      });
      value.set_multiasset(orderMultiAsset);
      const orderBox = CardanoWasm.TransactionOutput.new(address, value);
      txBuilder.add_output(orderBox);
    });

    // add inputs
    const txInputsBuilder = CardanoWasm.TxInputsBuilder.new();
    bankBoxes.forEach((box) => {
      const txHash = CardanoWasm.TransactionHash.from_bytes(
        Buffer.from(box.txId, 'hex')
      );
      const inputBox = CardanoWasm.TransactionInput.new(txHash, box.index);
      txInputsBuilder.add_regular_input(
        CardanoWasm.Address.from_bech32(this.configs.addresses.lock),
        inputBox,
        CardanoWasm.Value.new(orderValue)
      );
    });
    txBuilder.set_inputs(txInputsBuilder);
    this.logger.debug(
      `Remaining assets: ${JsonBigInt.stringify(remainingAssets)}`
    );

    // create change output
    remainingAssets.nativeToken -= fee;
    const changeBox = CardanoUtils.createTransactionOutput(
      remainingAssets,
      this.configs.addresses.lock
    );
    txBuilder.add_output(changeBox);

    // set ttl and fee
    txBuilder.set_ttl((await this.network.currentSlot()) + this.configs.txTtl);
    txBuilder.set_fee(CardanoUtils.bigIntToBigNum(fee));

    // create the transaction
    const txBody = txBuilder.build();
    const tx = CardanoWasm.Transaction.new(
      txBody,
      CardanoWasm.TransactionWitnessSet.new(),
      undefined
    );
    const txBytes = Serializer.serialize(tx);
    const txId = CardanoWasm.FixedTransaction.from_hex(tx.to_hex())
      .transaction_hash()
      .to_hex();

    // sort input utxos
    const inputUtxos = structuredClone(bankBoxes);
    inputUtxos.sort((a, b) =>
      a.txId === b.txId ? a.index - b.index : a.txId < b.txId ? -1 : 1
    );
    const cardanoTx = new CardanoTransaction(
      txId,
      eventId,
      txBytes,
      txType,
      inputUtxos.map((box) => JSONBigInt.stringify(box))
    );

    this.logger.info(
      `Cardano transaction [${txId}] as type [${txType}] generated for event [${eventId}]`
    );
    return [cardanoTx];
  };

  /**
   * extracts box id and assets of a box
   * Note: it returns the actual value
   * @param box the box
   * @returns an object containing the box id and assets
   */
  protected getBoxInfo = (box: CardanoUtxo): BoxInfo => {
    return {
      id: CardanoUtils.getBoxId(box),
      assets: {
        nativeToken: BigInt(box.value),
        tokens: box.assets.map((asset) => ({
          id: CardanoUtils.getAssetId(asset),
          value: BigInt(asset.quantity),
        })),
      },
    };
  };

  /**
   * submits a transaction to the blockchain
   * @param transaction the transaction
   */
  submitTransaction = async (
    transaction: PaymentTransaction
  ): Promise<void> => {
    // deserialize transaction
    const tx = Serializer.deserialize(transaction.txBytes);

    // send transaction
    try {
      const response = await this.network.submitTransaction(tx);
      this.logger.info(
        `Cardano Transaction [${transaction.txId}] submitted. Response: ${response}`
      );
    } catch (e) {
      this.logger.warn(
        `An error occurred while submitting Cardano transaction [${transaction.txId}]: ${e}`
      );
      if (e instanceof Error && e.stack) {
        this.logger.warn(e.stack);
      }
    }
  };

  /**
   * requests the corresponding signer service to sign the transaction
   * @param transaction the transaction
   * @param requiredSign the required number of sign
   * @param signFunction the function to sign transaction
   * @returns the signed transaction
   */
  signTransaction = (
    transaction: PaymentTransaction,
    requiredSign: number
  ): Promise<PaymentTransaction> => {
    const tx = Serializer.deserialize(transaction.txBytes);
    const cardanoTx = transaction as CardanoTransaction;
    return this.signFunction(
      CardanoWasm.FixedTransaction.from_hex(tx.to_hex())
        .transaction_hash()
        .to_bytes()
    ).then((signature: string) => {
      const signedTx = this.buildSignedTransaction(tx.body(), signature);
      return new CardanoTransaction(
        cardanoTx.txId,
        cardanoTx.eventId,
        Serializer.serialize(signedTx),
        cardanoTx.txType,
        cardanoTx.inputUtxos
      );
    });
  };

  /**
   * gets input and output assets of a payment transaction
   * @param transaction the payment transaction
   * @returns assets of input and output boxes
   */
  getTransactionAssets = async (
    transaction: PaymentTransaction
  ): Promise<TransactionAssetBalance> => {
    const tx = Serializer.deserialize(transaction.txBytes);
    const cardanoTx = transaction as CardanoTransaction;
    const txBody = tx.body();

    let inputAssets: AssetBalance = {
      nativeToken: 0n,
      tokens: [],
    };
    // extract input box assets
    const inputUtxos = Array.from(new Set(cardanoTx.inputUtxos));
    for (let i = 0; i < inputUtxos.length; i++) {
      const input = JSONBigInt.parse(inputUtxos[i]) as CardanoUtxo;
      const boxAssets = this.getBoxInfo(input).assets;
      inputAssets = ChainUtils.sumAssetBalance(inputAssets, boxAssets);
    }

    let outputAssets: AssetBalance = {
      nativeToken: BigInt(tx.body().fee().to_str()),
      tokens: [],
    };
    for (let i = 0; i < txBody.outputs().len(); i++) {
      const output = txBody.outputs().get(i);
      const boxAssets = CardanoUtils.getBoxAssets(output);
      outputAssets = ChainUtils.sumAssetBalance(outputAssets, boxAssets);
    }

    return {
      inputAssets: ChainUtils.wrapAssetBalance(
        inputAssets,
        this.tokenMap,
        this.NATIVE_TOKEN_ID,
        this.CHAIN
      ),
      outputAssets: ChainUtils.wrapAssetBalance(
        outputAssets,
        this.tokenMap,
        this.NATIVE_TOKEN_ID,
        this.CHAIN
      ),
    };
  };

  /**
   * generates mapping from input box id to serialized string of output box (filtered by address, containing the token)
   * @param address the address
   * @param tokenId the token id
   * @returns a Map from input box id to serialized string of output box
   */
  getMempoolBoxMapping = async (
    address: string,
    tokenId?: string
  ): Promise<Map<string, CardanoUtxo | undefined>> => {
    const mempoolTxs = await this.network.getMempoolTransactions();
    const trackMap = new Map<string, CardanoUtxo | undefined>();
    mempoolTxs.forEach((cardanoTx) => {
      // iterate over tx inputs
      for (let i = 0; i < cardanoTx.inputs.length; i++) {
        let trackedBox: CardanoBoxCandidate | undefined;
        // iterate over tx outputs
        let index = 0;
        for (index = 0; index < cardanoTx.outputs.length; index++) {
          const output = cardanoTx.outputs[index];
          // check if box satisfy conditions
          if (output.address !== address) continue;
          if (tokenId) {
            if (
              !output.assets.find(
                (asset) => CardanoUtils.getAssetId(asset) === tokenId
              )
            )
              continue;
          }

          // mark the tracked box
          trackedBox = output;
          break;
        }

        // add input box to trackMap
        const input = cardanoTx.inputs[i];
        trackMap.set(
          CardanoUtils.getBoxId(input),
          trackedBox
            ? CardanoUtils.convertCandidateToUtxo(
                trackedBox,
                cardanoTx.id,
                index
              )
            : undefined
        );
      }
    });

    return trackMap;
  };

  /**
   * checks if a transaction is in mempool
   * @param transactionId the transaction id
   * @returns true if the transaction is in mempool
   */
  isTxInMempool = async (transactionId: string): Promise<boolean> => {
    const mempoolTxIds = (await this.network.getMempoolTransactions()).map(
      (tx) => tx.id
    );

    return mempoolTxIds.includes(transactionId);
  };

  /**
   * checks if a transaction is still valid and can be sent to the network
   * @param transaction the payment transaction
   * @param _signingStatus
   * @returns true if the transaction is still valid
   */
  isTxValid = async (
    transaction: PaymentTransaction,
    _signingStatus: SigningStatus = SigningStatus.Signed
  ): Promise<ValidityStatus> => {
    const tx = Serializer.deserialize(transaction.txBytes);
    const txBody = tx.body();

    // check ttl
    const ttl = txBody.ttl();
    if (ttl && ttl < (await this.network.currentSlot())) {
      this.logger.info(
        `Tx [${transaction.txId}] is invalid: ttl [${ttl}] is expired`
      );
      return {
        isValid: false,
        details: {
          reason: `tx ttl, [${ttl}], is past`,
          unexpected: false,
        },
      };
    }

    // let valid = true;
    for (let i = 0; i < txBody.inputs().len(); i++) {
      const boxId = CardanoUtils.getBoxId(txBody.inputs().get(i));
      if (!(await this.network.isBoxUnspentAndValid(boxId))) {
        this.logger.info(
          `Tx [${transaction.txId}] is invalid due to spending invalid input box [${boxId}] at index [${i}]`
        );
        return {
          isValid: false,
          details: {
            reason: `input [${i}] is spent or invalid`,
            unexpected: false,
          },
        };
      }
    }

    // check if input and output assets match
    const txAssets = await this.getTransactionAssets(transaction);
    const isValid = ChainUtils.isEqualAssetBalance(
      txAssets.inputAssets,
      txAssets.outputAssets
    );
    return {
      isValid: isValid,
      details: isValid
        ? undefined
        : {
            reason: `input and output assets are not equal`,
            unexpected: false,
          },
    };
  };

  /**
   * verifies additional conditions for a event lock transaction
   * @param transaction the lock transaction
   * @param blockInfo
   * @returns true if the transaction is verified
   */
  verifyLockTransactionExtraConditions = async (
    transaction: CardanoTx,
    blockInfo: BlockInfo
  ): Promise<boolean> => {
    return true;
  };

  /**
   * verifies transaction fee for a payment transaction
   * @param transaction the payment transaction
   * @returns true if the transaction verified
   */
  verifyTransactionFee = async (
    transaction: PaymentTransaction
  ): Promise<boolean> => {
    const tx = Serializer.deserialize(transaction.txBytes);
    if (
      tx.body().fee().compare(CardanoUtils.bigIntToBigNum(this.configs.fee)) > 0
    ) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: Transaction fee [${tx
          .body()
          .fee()
          .to_str()}] is more than maximum allowed fee [${this.configs.fee.toString()}]`
      );
      return false;
    }
    return true;
  };

  /**
   * verifies PaymentTransaction extra conditions like metadata and change box address
   * @param transaction to verify
   * @param signingStatus the signing status of transaction
   * @returns true if all conditions are met
   */
  verifyTransactionExtraConditions = (
    transaction: PaymentTransaction,
    signingStatus: SigningStatus = SigningStatus.UnSigned
  ): boolean => {
    const tx = Serializer.deserialize(transaction.txBytes);

    // check metadata
    if (tx.auxiliary_data()) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: Contains metadata`
      );
      return false;
    }

    // check change box
    const changeBoxIndex = tx.body().outputs().len() - 1;
    const changeBox = tx.body().outputs().get(changeBoxIndex);
    if (changeBox.address().to_bech32() !== this.configs.addresses.lock) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: Change box address is wrong`
      );
      return false;
    }

    return true;
  };

  /**
   * gets the minimum amount of native token for assetTransfer
   * @returns the minimum amount
   */
  getMinimumNativeToken = () => {
    return this.tokenMap.wrapAmount(
      this.NATIVE_TOKEN_ID,
      this.configs.minBoxValue,
      this.CHAIN
    ).amount;
  };

  /**
   * generates mapping from input box id to serialized string of output box (filtered by address, containing the token)
   * @param txs list of transactions
   * @param address the address
   * @param tokenId the token id
   * @returns a Map from input box id to output box
   */
  protected getTransactionsBoxMapping = (
    txs: CardanoWasm.Transaction[],
    address: string,
    tokenId?: string
  ): Map<string, CardanoUtxo | undefined> => {
    const trackMap = new Map<string, CardanoUtxo | undefined>();

    txs.forEach((tx) => {
      const txBody = tx.body();
      const txId = CardanoWasm.FixedTransaction.from_hex(tx.to_hex())
        .transaction_hash()
        .to_hex();
      // iterate over tx inputs
      for (let i = 0; i < txBody.inputs().len(); i++) {
        let trackedBox: CardanoWasm.TransactionOutput | undefined;
        // iterate over tx outputs
        let index = 0;
        for (index = 0; index < txBody.outputs().len(); index++) {
          const output = txBody.outputs().get(index);
          // check if box satisfy conditions
          if (output.address().to_bech32() !== address) continue;
          if (tokenId) {
            const boxTokens = cardanoUtils.getBoxAssets(output).tokens;
            if (!boxTokens.find((token) => token.id === tokenId)) continue;
          }

          // mark the tracked box
          trackedBox = output;
          break;
        }

        // add input box to trackMap
        const input = txBody.inputs().get(i);
        const boxId = CardanoUtils.getBoxId(input);
        if (trackedBox) {
          const boxMultiAsset = trackedBox.amount().multiasset();
          const boxAssets: Array<CardanoAsset> = [];
          if (boxMultiAsset) {
            for (let k = 0; k < boxMultiAsset.keys().len(); k++) {
              const scriptHash = boxMultiAsset.keys().get(k);
              const asset = boxMultiAsset.get(scriptHash)!;
              for (let j = 0; j < asset.keys().len(); j++) {
                const assetName = asset.keys().get(j);
                const assetAmount = asset.get(assetName)!;
                boxAssets.push({
                  policy_id: scriptHash.to_hex(),
                  asset_name: CardanoUtils.assetNameToHex(assetName),
                  quantity: BigInt(assetAmount.to_str()),
                });
              }
            }
          }
          const cardanoBox: CardanoUtxo = {
            txId: txId,
            index: index,
            value: BigInt(trackedBox.amount().coin().to_str()),
            assets: boxAssets,
          };
          trackMap.set(boxId, cardanoBox);
        } else {
          trackMap.set(boxId, undefined);
        }
      }
    });

    return trackMap;
  };

  /**
   * builds a signed transaction from transaction body and signature
   * @param txBody body of unsigned transaction
   * @param signature generated signature by signer service
   * @returns a signed transaction (in CardanoWasm format)
   */
  protected buildSignedTransaction = (
    txBody: CardanoWasm.TransactionBody,
    signature: string
  ): CardanoWasm.Transaction => {
    const vKeyWitness = CardanoWasm.Vkeywitness.from_bytes(
      Buffer.from(
        `825820${this.configs.aggregatedPublicKey}5840${signature}`,
        'hex'
      )
    );
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
    vkeyWitnesses.add(vKeyWitness);
    const witnesses = CardanoWasm.TransactionWitnessSet.new();
    witnesses.set_vkeys(vkeyWitnesses);
    return CardanoWasm.Transaction.new(txBody, witnesses);
  };

  /**
   * converts json representation of the payment transaction to CardanoTransaction
   * @returns CardanoTransaction object
   */
  PaymentTransactionFromJson = (jsonString: string): CardanoTransaction =>
    CardanoTransaction.fromJson(jsonString);

  /**
   * generates transaction builder config using protocol params
   * @returns TransactionBuilderConfig
   */
  protected getTxBuilderConfig =
    async (): Promise<CardanoWasm.TransactionBuilderConfig> => {
      const params = await this.network.getProtocolParameters();
      return CardanoWasm.TransactionBuilderConfigBuilder.new()
        .fee_algo(
          CardanoWasm.LinearFee.new(
            CardanoWasm.BigNum.from_str(params.minFeeA.toString()),
            CardanoWasm.BigNum.from_str(params.minFeeB.toString())
          )
        )
        .pool_deposit(CardanoWasm.BigNum.from_str(params.poolDeposit))
        .key_deposit(CardanoWasm.BigNum.from_str(params.keyDeposit))
        .coins_per_utxo_byte(
          CardanoWasm.BigNum.from_str(params.coinsPerUtxoSize)
        )
        .max_value_size(params.maxValueSize)
        .max_tx_size(params.maxTxSize)
        .prefer_pure_change(true)
        .build();
    };

  /**
   * generates PaymentTransaction object from raw tx json string
   * @param rawTxJsonString
   * @returns PaymentTransaction object
   */
  rawTxToPaymentTransaction = async (
    rawTxJsonString: string
  ): Promise<CardanoTransaction> => {
    const tx = CardanoWasm.Transaction.from_json(rawTxJsonString);
    const txBytes = Serializer.serialize(tx);
    const txId = CardanoWasm.FixedTransaction.from_hex(tx.to_hex())
      .transaction_hash()
      .to_hex();

    const inputBoxes: Array<CardanoUtxo> = [];
    const inputs = tx.body().inputs();
    for (let i = 0; i < inputs.len(); i++) {
      const utxoInfo = inputs.get(i);
      const boxId = `${utxoInfo.transaction_id().to_hex()}.${utxoInfo.index()}`;
      inputBoxes.push(await this.network.getUtxo(boxId));
    }

    const cardanoTx = new CardanoTransaction(
      txId,
      '',
      txBytes,
      TransactionType.manual,
      inputBoxes.map((box) => JSONBigInt.stringify(box))
    );

    this.logger.info(`Parsed Cardano transaction [${txId}] successfully`);
    return cardanoTx;
  };

  /**
   * serializes the transaction of this chain into string
   */
  protected serializeTx = (tx: CardanoTx): string => JsonBigInt.stringify(tx);

  /**
   * verifies consistency within the PaymentTransaction object
   * @param transaction the PaymentTransaction
   * @returns true if the transaction is verified
   */
  verifyPaymentTransaction = async (
    transaction: PaymentTransaction
  ): Promise<boolean> => {
    const tx = Serializer.deserialize(transaction.txBytes);
    const cardanoTx = transaction as CardanoTransaction;
    const baseError = `Tx [${transaction.txId}] is not verified: `;

    // verify txId
    const txId = CardanoWasm.FixedTransaction.from_hex(tx.to_hex())
      .transaction_hash()
      .to_hex();
    if (transaction.txId !== txId) {
      this.logger.warn(
        baseError +
          `Transaction ID is inconsistent (expected [${transaction.txId}] found [${txId}])`
      );
      return false;
    }

    // verify inputUtxos
    const txInputs = tx.body().inputs();
    if (cardanoTx.inputUtxos.length !== txInputs.len()) {
      this.logger.warn(
        baseError +
          `CardanoTransaction object input counts is inconsistent [${
            cardanoTx.inputUtxos.length
          } != ${txInputs.len()}]`
      );
      return false;
    }
    for (let i = 0; i < txInputs.len(); i++) {
      const input = txInputs.get(i);
      const actualInputId = `${input
        .transaction_id()
        .to_hex()}.${input.index()}`;
      const cardanoInput = JsonBigInt.parse(
        cardanoTx.inputUtxos[i]
      ) as CardanoUtxo;
      const expectedId = `${cardanoInput.txId}.${cardanoInput.index}`;
      if (expectedId !== actualInputId) {
        this.logger.warn(
          baseError +
            `BoxId for input at index [${i}] is inconsistent [expected ${expectedId} found ${actualInputId}]`
        );
        return false;
      }
    }

    return true;
  };
}

export default CardanoChain;
