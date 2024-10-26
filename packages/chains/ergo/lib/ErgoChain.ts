import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractUtxoChain,
  AssetBalance,
  BlockInfo,
  BoxInfo,
  ChainUtils,
  ImpossibleBehavior,
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
import * as wasm from 'ergo-lib-wasm-nodejs';
import { ERG, ERGO_CHAIN, NUMBER_OF_BLOCKS_PER_YEAR } from './constants';
import ErgoTransaction from './ErgoTransaction';
import ErgoUtils from './ErgoUtils';
import AbstractErgoNetwork from './network/AbstractErgoNetwork';
import Serializer from './Serializer';
import { ErgoConfigs, GuardsPkConfig } from './types';
import JsonBI from '@rosen-bridge/json-bigint';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { ErgoRosenExtractor } from '@rosen-bridge/rosen-extractor';
import { RosenTokens } from '@rosen-bridge/tokens';

class ErgoChain extends AbstractUtxoChain<wasm.Transaction, wasm.ErgoBox> {
  CHAIN = ERGO_CHAIN;
  NATIVE_TOKEN_ID = ERG;
  extractor: ErgoRosenExtractor;
  static feeBoxErgoTree =
    '1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304';
  declare network: AbstractErgoNetwork;
  declare configs: ErgoConfigs;
  protected signFunction: (
    tx: wasm.ReducedTransaction,
    requiredSign: number,
    boxes: Array<wasm.ErgoBox>,
    dataBoxes?: Array<wasm.ErgoBox>
  ) => Promise<wasm.Transaction>;

  constructor(
    network: AbstractErgoNetwork,
    configs: ErgoConfigs,
    tokens: RosenTokens,
    signFunction: (
      tx: wasm.ReducedTransaction,
      requiredSign: number,
      boxes: Array<wasm.ErgoBox>,
      dataBoxes?: Array<wasm.ErgoBox>
    ) => Promise<wasm.Transaction>,
    logger?: AbstractLogger
  ) {
    super(network, configs, tokens, logger);
    this.extractor = new ErgoRosenExtractor(
      configs.addresses.lock,
      tokens,
      logger
    );
    this.signFunction = signFunction;
  }

  /**
   * generates unsigned payment transaction for payment order
   * @param eventId the id of event
   * @param txType transaction type
   * @param order the payment order (list of single payments)
   * @param unsignedTransactions ongoing unsigned PaymentTransactions (used for preventing double spend)
   * @param serializedSignedTransactions the serialized string of ongoing signed transactions (used for chainning transaction)
   * @param inputs the inputs for transaction
   * @param dataInputs the data inputs for transaction
   * @returns the generated payment transaction
   */
  generateMultipleTransactions = async (
    eventId: string,
    txType: TransactionType,
    order: PaymentOrder,
    unsignedTransactions: PaymentTransaction[],
    serializedSignedTransactions: string[],
    inputs: Array<string>,
    dataInputs: Array<string>
  ): Promise<PaymentTransaction[]> => {
    this.logger.debug(
      `Generating Ergo transaction for Order: ${JsonBigInt.stringify(order)}`
    );
    if (order.at(-1)?.address === this.configs.addresses.lock)
      throw new Error(
        `Last item on Order cannot be to lock address in ErgoChain`
      );
    // calculate required assets
    const orderRequiredAssets = order
      .map((order) => order.assets)
      .reduce(ChainUtils.sumAssetBalance, {
        nativeToken: 0n,
        tokens: [],
      });
    this.logger.debug(
      `Order required assets: ${JsonBigInt.stringify(orderRequiredAssets)}`
    );
    const inputAssets = inputs
      .map(
        (serializedBox) =>
          this.getBoxInfo(
            wasm.ErgoBox.sigma_parse_bytes(Buffer.from(serializedBox, 'hex'))
          ).assets
      )
      .map((balance) =>
        ChainUtils.wrapAssetBalance(
          balance,
          this.tokenMap,
          this.NATIVE_TOKEN_ID,
          this.CHAIN
        )
      )
      .reduce(ChainUtils.sumAssetBalance, { nativeToken: 0n, tokens: [] });
    this.logger.debug(
      `Pre-selected boxes assets: ${JsonBigInt.stringify(inputAssets)}`
    );
    const fee = this.configs.fee;
    const requiredAssets = ChainUtils.sumAssetBalance(
      ChainUtils.subtractAssetBalance(
        orderRequiredAssets,
        inputAssets,
        0n,
        true
      ),
      {
        nativeToken:
          2n * this.getMinimumNativeToken() +
          this.tokenMap.wrapAmount(this.NATIVE_TOKEN_ID, fee, this.CHAIN)
            .amount,
        tokens: [],
      }
    );
    this.logger.debug(
      `Required assets: ${JsonBigInt.stringify(requiredAssets)}`
    );

    // check if there are enough assets in address
    const unwrappedRequiredAssets = ChainUtils.unwrapAssetBalance(
      requiredAssets,
      this.tokenMap,
      this.NATIVE_TOKEN_ID,
      this.CHAIN
    );
    if (!(await this.hasLockAddressEnoughAssets(requiredAssets))) {
      const neededErgs = unwrappedRequiredAssets.nativeToken.toString();
      const neededTokens = JsonBI.stringify(unwrappedRequiredAssets.tokens);
      throw new NotEnoughAssetsError(
        `Locked assets cannot cover required assets. Erg: ${neededErgs}, Tokens: ${neededTokens}`
      );
    }

    // extract input boxIds from unsigned transactions to prevent double spend
    const forbiddenBoxIds = unsignedTransactions.flatMap((paymentTx) => {
      const tx = Serializer.deserialize(paymentTx.txBytes).unsigned_tx();
      const ids: string[] = [];
      const inputs = tx.inputs();
      for (let i = 0; i < inputs.len(); i++)
        ids.push(inputs.get(i).box_id().to_str());
      return ids;
    });

    // generate box tracking map from mempool and signed transactions
    const trackMap = this.getTransactionsBoxMapping(
      serializedSignedTransactions.map((serializedTx) =>
        Serializer.signedDeserialize(Buffer.from(serializedTx, 'hex'))
      ),
      this.configs.addresses.lock
    );
    (await this.getMempoolBoxMapping(this.configs.addresses.lock)).forEach(
      (value, key) => trackMap.set(key, value)
    );

    // call getCovering to get enough boxes
    const coveredBoxes = await this.getCoveringBoxes(
      this.configs.addresses.lock,
      unwrappedRequiredAssets,
      forbiddenBoxIds,
      trackMap
    );

    // check if boxes covered requirements
    if (!coveredBoxes.covered) {
      const neededErgs = unwrappedRequiredAssets.nativeToken.toString();
      const neededTokens = JsonBI.stringify(unwrappedRequiredAssets.tokens);
      throw new NotEnoughValidBoxesError(
        `Available boxes didn't cover required assets. Erg: ${neededErgs}, Tokens: ${neededTokens}`
      );
    }

    // add boxes to input list
    inputs.push(
      ...coveredBoxes.boxes.map((box) =>
        Buffer.from(box.sigma_serialize_bytes()).toString('hex')
      )
    );

    // generate input boxes objects
    let remainingAssets: AssetBalance = {
      nativeToken: 0n,
      tokens: [],
    };
    const inBoxes = inputs.map((serializedBox) =>
      wasm.ErgoBox.sigma_parse_bytes(Buffer.from(serializedBox, 'hex'))
    );
    const inErgoBoxes = wasm.ErgoBoxes.empty();
    inBoxes.forEach((box) => {
      inErgoBoxes.add(box);

      // add box assets to `remainingAssets`
      remainingAssets = ChainUtils.sumAssetBalance(
        remainingAssets,
        ErgoUtils.getBoxAssets(box)
      );
    });
    this.logger.debug(`Input assets: ${JsonBigInt.stringify(remainingAssets)}`);

    // generate data input boxes objects
    const dataInBoxes = dataInputs.map((serializedBox) =>
      wasm.ErgoBox.sigma_parse_bytes(Buffer.from(serializedBox, 'hex'))
    );
    const dataInErgoBoxes = wasm.ErgoBoxes.empty();
    dataInBoxes.forEach((box) => dataInErgoBoxes.add(box));
    const inData = new wasm.DataInputs();
    dataInBoxes.forEach((box) => inData.add(new wasm.DataInput(box.box_id())));

    // generate output boxes objects
    const outBoxCandidates = wasm.ErgoBoxCandidates.empty();
    const currentHeight = await this.network.getHeight();
    order.forEach((order) => {
      // create box
      const orderNanoErg = this.tokenMap.unwrapAmount(
        this.NATIVE_TOKEN_ID,
        order.assets.nativeToken,
        this.CHAIN
      ).amount;
      const boxBuilder = new wasm.ErgoBoxCandidateBuilder(
        wasm.BoxValue.from_i64(wasm.I64.from_str(orderNanoErg.toString())),
        wasm.Contract.new(
          wasm.Address.from_base58(order.address).to_ergo_tree()
        ),
        currentHeight
      );
      // add box tokens
      order.assets.tokens.forEach((token) =>
        boxBuilder.add_token(
          wasm.TokenId.from_str(token.id),
          wasm.TokenAmount.from_i64(
            wasm.I64.from_str(
              this.tokenMap
                .unwrapAmount(token.id, token.value, this.CHAIN)
                .amount.toString()
            )
          )
        )
      );
      // add extra data to box R4 as coll_coll_byte
      if (order.extra !== undefined)
        boxBuilder.set_register_value(
          4,
          wasm.Constant.from_byte_array(Buffer.from(order.extra, 'hex'))
        );

      // build and add box
      const box = boxBuilder.build();
      outBoxCandidates.add(box);

      // reduce box assets from `remainingAssets`
      remainingAssets = ChainUtils.subtractAssetBalance(
        remainingAssets,
        ErgoUtils.getBoxAssets(box),
        this.configs.minBoxValue
      );
    });
    this.logger.debug(
      `Remaining assets: ${JsonBigInt.stringify(remainingAssets)}`
    );

    // split remaining assets to each change box (also reduce fee from it)
    remainingAssets.nativeToken -= fee;
    const changeBox1Assets = structuredClone(remainingAssets);
    changeBox1Assets.nativeToken /= 2n;
    changeBox1Assets.tokens = changeBox1Assets.tokens
      .map((token) => {
        token.value /= 2n;
        return token;
      })
      .filter((token) => token.value !== 0n);
    this.logger.debug(
      `Change box 1 assets: ${JsonBigInt.stringify(changeBox1Assets)}`
    );
    const changeBox2Assets = ChainUtils.subtractAssetBalance(
      remainingAssets,
      changeBox1Assets,
      this.configs.minBoxValue
    );
    this.logger.debug(
      `Change box 2 assets: ${JsonBigInt.stringify(changeBox2Assets)}`
    );

    // create change box 1
    const changeBox1Builder = new wasm.ErgoBoxCandidateBuilder(
      wasm.BoxValue.from_i64(
        wasm.I64.from_str(changeBox1Assets.nativeToken.toString())
      ),
      wasm.Contract.new(
        wasm.Address.from_base58(this.configs.addresses.lock).to_ergo_tree()
      ),
      currentHeight
    );
    changeBox1Assets.tokens.forEach((token) =>
      changeBox1Builder.add_token(
        wasm.TokenId.from_str(token.id),
        wasm.TokenAmount.from_i64(wasm.I64.from_str(token.value.toString()))
      )
    );
    outBoxCandidates.add(changeBox1Builder.build());

    // create change box 2
    const changeBox2Builder = new wasm.ErgoBoxCandidateBuilder(
      wasm.BoxValue.from_i64(
        wasm.I64.from_str(changeBox2Assets.nativeToken.toString())
      ),
      wasm.Contract.new(
        wasm.Address.from_base58(this.configs.addresses.lock).to_ergo_tree()
      ),
      currentHeight
    );
    changeBox2Assets.tokens.forEach((token) =>
      changeBox2Builder.add_token(
        wasm.TokenId.from_str(token.id),
        wasm.TokenAmount.from_i64(wasm.I64.from_str(token.value.toString()))
      )
    );
    outBoxCandidates.add(changeBox2Builder.build());

    // create the box selector in tx builder
    const inBoxSelection = new wasm.BoxSelection(
      inErgoBoxes,
      new wasm.ErgoBoxAssetsDataList()
    );

    // create the transaction
    const txCandidate = wasm.TxBuilder.new(
      inBoxSelection,
      outBoxCandidates,
      currentHeight,
      wasm.BoxValue.from_i64(wasm.I64.from_str(fee.toString())),
      wasm.Address.from_base58(this.configs.addresses.lock)
    );
    txCandidate.set_data_inputs(inData);
    const tx = txCandidate.build();

    // create ReducedTransaction object
    const ctx = await this.network.getStateContext();
    const reducedTx = wasm.ReducedTransaction.from_unsigned_tx(
      tx,
      inErgoBoxes,
      dataInErgoBoxes,
      ctx
    );

    // create PaymentTransaction object
    const txBytes = Serializer.serialize(reducedTx);
    const txId = reducedTx.unsigned_tx().id().to_str();
    const ergoTx = new ErgoTransaction(
      txId,
      eventId,
      txBytes,
      txType,
      inputs.map((boxBytes) => Buffer.from(boxBytes, 'hex')),
      dataInputs.map((boxBytes) => Buffer.from(boxBytes, 'hex'))
    );

    this.logger.info(
      `Ergo transaction [${txId}] as type [${txType}] generated for event [${eventId}]`
    );
    return [ergoTx];
  };

  /**
   * gets input and output assets of a payment transaction
   * @param transaction the payment transaction
   * @returns true if the transaction verified
   */
  getTransactionAssets = async (
    transaction: PaymentTransaction
  ): Promise<TransactionAssetBalance> => {
    const ergoTx = transaction as ErgoTransaction;
    let inputAssets: AssetBalance = {
      nativeToken: 0n,
      tokens: [],
    };
    // extract input boxes assets
    ergoTx.inputBoxes.forEach((serializedBox) => {
      const boxAssets = this.getBoxInfo(
        wasm.ErgoBox.sigma_parse_bytes(serializedBox)
      ).assets;
      inputAssets = ChainUtils.sumAssetBalance(inputAssets, boxAssets);
    });

    const tx = Serializer.deserialize(transaction.txBytes).unsigned_tx();
    const outputAssets: AssetBalance = {
      nativeToken: 0n,
      tokens: [],
    };
    // extract output boxes assets
    const outputCandidates = tx.output_candidates();
    for (let i = 0; i < outputCandidates.len(); i++) {
      const output = outputCandidates.get(i);
      outputAssets.nativeToken += BigInt(output.value().as_i64().to_str());
      const outputTokens = output.tokens();
      for (let j = 0; j < outputTokens.len(); j++) {
        const targetToken = outputAssets.tokens.find(
          (item) => item.id === outputTokens.get(j).id().to_str()
        );
        if (targetToken)
          targetToken.value += BigInt(
            outputTokens.get(j).amount().as_i64().to_str()
          );
        else
          outputAssets.tokens.push({
            id: outputTokens.get(j).id().to_str(),
            value: BigInt(outputTokens.get(j).amount().as_i64().to_str()),
          });
      }
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
   * extracts payment order of a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns the transaction payment order (list of single payments)
   */
  extractTransactionOrder = (transaction: PaymentTransaction): PaymentOrder => {
    const tx = Serializer.deserialize(transaction.txBytes).unsigned_tx();
    const lockErgoTree = wasm.Address.from_base58(this.configs.addresses.lock)
      .to_ergo_tree()
      .to_base16_bytes();

    const order: PaymentOrder = [];
    const outputCandidates = tx.output_candidates();
    const outputCandidatesLength = outputCandidates.len();

    let addBox = false;
    for (let i = outputCandidatesLength - 1; i >= 0; i--) {
      const output = outputCandidates.get(i);
      // skip boxes until non-lock and non-fee box is seen
      if (
        output.ergo_tree().to_base16_bytes() !== ErgoChain.feeBoxErgoTree &&
        output.ergo_tree().to_base16_bytes() !== lockErgoTree
      )
        addBox = true;
      if (addBox === false) continue;

      const assets = ErgoUtils.getBoxAssets(output);
      const wrappedAssets = ChainUtils.wrapAssetBalance(
        assets,
        this.tokenMap,
        this.NATIVE_TOKEN_ID,
        this.CHAIN
      );
      const r4Value = output.register_value(4)?.to_byte_array();

      const payment: SinglePayment = {
        address: wasm.Address.recreate_from_ergo_tree(
          output.ergo_tree()
        ).to_base58(wasm.NetworkPrefix.Mainnet),
        assets: wrappedAssets,
      };
      if (r4Value !== undefined)
        payment.extra = Buffer.from(r4Value).toString('hex');
      order.push(payment);
    }

    // reverse result to keep order
    order.reverse();

    return order;
  };

  /**
   * verifies transaction fee for a payment transaction
   * @param transaction the payment transaction
   * @returns true if the transaction verified
   */
  verifyTransactionFee = async (
    transaction: PaymentTransaction
  ): Promise<boolean> => {
    const tx = Serializer.deserialize(transaction.txBytes).unsigned_tx();
    const outputBoxes = tx.output_candidates();
    for (let i = 0; i < outputBoxes.len(); i++) {
      const box = outputBoxes.get(i);
      if (box.ergo_tree().to_base16_bytes() === ErgoChain.feeBoxErgoTree) {
        if (BigInt(box.value().as_i64().to_str()) > this.configs.fee) {
          this.logger.warn(
            `Tx [${transaction.txId}] is not verified: Transaction fee [${box
              .value()
              .as_i64()
              .to_str()}] is more than maximum allowed fee [${
              this.configs.fee
            }]`
          );
          return false;
        } else return true;
      }
    }
    throw new ImpossibleBehavior(`No box matching fee box ergo tree found`);
  };

  /**
   * verifies additional conditions for a event lock transaction
   * @param transaction the lock transaction
   * @param blockInfo
   * @returns true if the transaction is verified
   */
  verifyLockTransactionExtraConditions = async (
    transaction: wasm.Transaction,
    blockInfo: BlockInfo
  ): Promise<boolean> => {
    const outputs = transaction.outputs();
    for (let i = 0; i < outputs.len(); i++) {
      const box = outputs.get(i);
      if (
        blockInfo.height - box.creation_height() >
        NUMBER_OF_BLOCKS_PER_YEAR
      ) {
        this.logger.error(
          `Lock tx [${transaction.id().to_str()}] is not verified, box [${box
            .box_id()
            .to_str()}] creation_height [${box.creation_height()}] is more than a year ago`
        );
        return false;
      }
    }
    return true;
  };

  /**
   * verifies additional conditions for a PaymentTransaction
   *   1. change boxes should not have register
   * @param transaction the PaymentTransaction
   * @returns true if the transaction verified
   */
  verifyTransactionExtraConditions = (
    transaction: PaymentTransaction
  ): boolean => {
    const tx = Serializer.deserialize(transaction.txBytes).unsigned_tx();
    const outputBoxes = tx.output_candidates();
    const lockErgoTree = wasm.Address.from_base58(this.configs.addresses.lock)
      .to_ergo_tree()
      .to_base16_bytes();

    for (let i = outputBoxes.len() - 1; i >= 0; i--) {
      const output = outputBoxes.get(i);
      // skip fee box
      if (output.ergo_tree().to_base16_bytes() === ErgoChain.feeBoxErgoTree)
        continue;
      // finish process if non-lock box is seen
      if (output.ergo_tree().to_base16_bytes() !== lockErgoTree) break;

      const r4Value = output.register_value(4);
      if (r4Value) {
        this.logger.warn(
          `Tx [${
            transaction.txId
          }] is not verified: Change box at index [${i}] has value [${r4Value.encode_to_base16()}] in R4`
        );
        return false;
      }
    }

    return true;
  };

  /**
   * checks if a transaction is still valid and can be sent to the network
   * @param transaction the transaction
   * @param signingStatus the signing status of transaction
   * @returns true if the transaction is still valid
   */
  isTxValid = async (
    transaction: PaymentTransaction,
    signingStatus: SigningStatus = SigningStatus.Signed
  ): Promise<ValidityStatus> => {
    // deserialize transaction
    let tx: wasm.Transaction | wasm.UnsignedTransaction;
    try {
      tx =
        signingStatus === SigningStatus.Signed
          ? Serializer.signedDeserialize(transaction.txBytes)
          : Serializer.deserialize(transaction.txBytes).unsigned_tx();
    } catch (e) {
      tx = Serializer.deserialize(transaction.txBytes).unsigned_tx();
    }
    // check if any input is spent or invalid
    const inputs = tx.inputs();
    for (let i = 0; i < inputs.len(); i++) {
      const boxId = inputs.get(i).box_id().to_str();
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
    return {
      isValid: true,
      details: undefined,
    };
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
    const ergoTx = transaction as ErgoTransaction;
    const txInputs = ergoTx.inputBoxes.map((boxBytes) =>
      wasm.ErgoBox.sigma_parse_bytes(boxBytes)
    );
    const txDataInputs = ergoTx.dataInputs.map((boxBytes) =>
      wasm.ErgoBox.sigma_parse_bytes(boxBytes)
    );

    return this.signFunction(tx, requiredSign, txInputs, txDataInputs).then(
      async (signedTx) => {
        const inputBoxes = wasm.ErgoBoxes.empty();
        txInputs.forEach((box) => inputBoxes.add(box));
        return new ErgoTransaction(
          ergoTx.txId,
          ergoTx.eventId,
          Serializer.signedSerialize(signedTx),
          ergoTx.txType,
          ergoTx.inputBoxes,
          ergoTx.dataInputs
        );
      }
    );
  };

  /**
   * @param transactionType type of the transaction
   * @returns required number of confirmation
   */
  override getTxRequiredConfirmation = (
    transactionType: TransactionType
  ): number => {
    switch (transactionType) {
      case TransactionType.payment:
      case TransactionType.reward:
        return this.configs.confirmations.payment;
      case TransactionType.coldStorage:
        return this.configs.confirmations.cold;
      case TransactionType.lock:
        return this.configs.confirmations.observation;
      case TransactionType.manual:
        return this.configs.confirmations.manual;
      case TransactionType.arbitrary:
        return this.configs.confirmations.arbitrary;
      default:
        throw Error(
          `Confirmation for type [${transactionType}] is not defined in Ergo chain`
        );
    }
  };

  /**
   * submits a transaction to the blockchain
   * @param transaction the transaction
   */
  submitTransaction = async (
    transaction: PaymentTransaction
  ): Promise<void> => {
    // deserialize transaction
    const tx = Serializer.signedDeserialize(transaction.txBytes);

    // send transaction
    try {
      const response = await this.network.submitTransaction(tx);
      this.logger.info(
        `Ergo Transaction [${transaction.txId}] submitted. Response: ${response}`
      );
    } catch (e) {
      this.logger.warn(
        `An error occurred while submitting Ergo transaction [${transaction.txId}]: ${e}`
      );
      if (e instanceof Error && e.stack) {
        this.logger.warn(e.stack);
      }
    }
  };

  /**
   * checks if a transaction is in mempool (returns false if the chain has no mempool)
   * @param transactionId the transaction id
   * @returns true if the transaction is in mempool
   */
  isTxInMempool = async (transactionId: string): Promise<boolean> => {
    const mempoolTxIds = (await this.network.getMempoolTransactions()).map(
      (tx) => tx.id().to_str()
    );
    return mempoolTxIds.includes(transactionId);
  };

  /**
   * gets the minimum amount of native token for assetTransfer
   * @returns the minimum amount
   */
  getMinimumNativeToken = (): bigint => {
    return this.tokenMap.wrapAmount(
      this.NATIVE_TOKEN_ID,
      this.configs.minBoxValue,
      this.CHAIN
    ).amount;
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
  ): Promise<Map<string, wasm.ErgoBox | undefined>> => {
    // iterate over mempool transactions
    const mempoolTxs = await this.network.getMempoolTransactions();
    const trackMap = this.getTransactionsBoxMapping(
      mempoolTxs,
      address,
      tokenId
    );

    return trackMap;
  };

  /**
   * extracts box id and assets of a box
   * Note: it returns the actual value
   * @param box the box
   * @returns an object containing the box id and assets
   */
  protected getBoxInfo = (box: wasm.ErgoBox): BoxInfo => {
    return {
      id: box.box_id().to_str(),
      assets: ErgoUtils.getBoxAssets(box),
    };
  };

  /**
   * extracts box height
   * @param serializedBox the serialized string of the box
   * @returns the box height
   */
  getBoxHeight = (serializedBox: string): number => {
    // deserialize box
    const box = wasm.ErgoBox.sigma_parse_bytes(
      Buffer.from(serializedBox, 'hex')
    );

    return box.creation_height();
  };

  /**
   * extracts watcher id from R4 of the box
   * @param serializedBox the serialized string of the box
   * @returns watcher id
   */
  getBoxWID = (serializedBox: string): string => {
    // deserialize box
    const box = wasm.ErgoBox.sigma_parse_bytes(
      Buffer.from(serializedBox, 'hex')
    );

    // extract wid
    const wid = box.register_value(4)?.to_byte_array();
    if (wid === undefined) {
      const boxId = box.box_id().to_str();
      throw new Error(`failed to read WID from register R4 of box [${boxId}]`);
    }
    return Buffer.from(wid).toString('hex');
  };

  /**
   * gets amount of rwt in the box
   * @param serializedBox the serialized string of the box
   * @returns rwt amount
   */
  getBoxRWT = (serializedBox: string): bigint => {
    // deserialize box
    const box = wasm.ErgoBox.sigma_parse_bytes(
      Buffer.from(serializedBox, 'hex')
    );

    // extract wid
    if (box.tokens().len() < 1) {
      const boxId = box.box_id().to_str();
      throw new Error(
        `failed to read amount of RWT from box [${boxId}]: Box has no token`
      );
    }
    const token = box.tokens().get(0);
    return this.tokenMap.wrapAmount(
      token.id().to_str(),
      BigInt(token.amount().as_i64().to_str()),
      this.CHAIN
    ).amount;
  };

  /**
   * gets box info from a serialized box
   * @param serializedBox the serialized string of the box
   * @returns box id and assets
   */
  getSerializedBoxInfo = (serializedBox: string): BoxInfo => {
    // deserialize box
    const box = wasm.ErgoBox.sigma_parse_bytes(
      Buffer.from(serializedBox, 'hex')
    );

    // get box info
    const info = this.getBoxInfo(box);
    info.assets = ChainUtils.wrapAssetBalance(
      info.assets,
      this.tokenMap,
      this.NATIVE_TOKEN_ID,
      this.CHAIN
    );
    return info;
  };

  /**
   * generates mapping from input box id to serialized string of output box (filtered by address, containing the token)
   * @param transactions list of transactions
   * @param address the address
   * @param tokenId the token id
   * @returns a Map from input box id to serialized string of output box
   */
  protected getTransactionsBoxMapping = (
    transactions: wasm.Transaction[],
    address: string,
    tokenId?: string
  ): Map<string, wasm.ErgoBox | undefined> => {
    // initialize variables
    const ergoTree = wasm.Address.from_base58(address)
      .to_ergo_tree()
      .to_base16_bytes();
    const trackMap = new Map<string, wasm.ErgoBox | undefined>();

    // iterate over mempool transactions
    transactions.forEach((tx) => {
      // deserialize transaction

      // iterate over tx inputs
      const inputs = tx.inputs();
      const outputs = tx.outputs();
      for (let i = 0; i < inputs.len(); i++) {
        let trackedBox: wasm.ErgoBox | undefined;
        // iterate over tx outputs
        for (let j = 0; j < outputs.len(); j++) {
          const output = outputs.get(j);
          // check if box satisfy conditions
          if (output.ergo_tree().to_base16_bytes() !== ergoTree) continue;
          if (tokenId) {
            const tokenIds: Array<string> = [];
            const outputTokens = output.tokens();
            for (let k = 0; k < outputTokens.len(); k++)
              tokenIds.push(outputTokens.get(k).id().to_str());

            if (!tokenIds.includes(tokenId)) continue;
          }

          // mark the tracked lock box
          trackedBox = output;
          break;
        }

        // add input box with serialized tracked box to trackMap
        const input = inputs.get(i);
        trackMap.set(input.box_id().to_str(), trackedBox);
      }
    });

    this.logger.debug(
      `Generated box mapping using [${
        transactions.length
      }] txs. Mapping: ${Array.from(trackMap.entries()).map(
        ([key, value]) => `${key}: ${value?.box_id().to_str()}`
      )}`
    );
    return trackMap;
  };

  /**
   * gets the guards config box which contains all guards public keys
   * @param guardNFT the guard NFT tokenId
   * @param address address containing guard config box
   * @return the serialized string of guard box
   */
  getGuardsConfigBox = async (
    guardNFT: string,
    address: string
  ): Promise<string> => {
    const guardBox = await this.network.getBoxesByTokenId(guardNFT, address);
    if (guardBox.length === 0)
      throw new Error(`no guards config box found with NFT [${guardNFT}]`);
    else if (guardBox.length > 1)
      throw new Error(
        `Found [${guardBox.length}] guards config box with NFT [${guardNFT}]`
      );
    else
      return Buffer.from(guardBox[0].sigma_serialize_bytes()).toString('hex');
  };

  /**
   * verifies rwt token of event box
   * @param eventSerializedBox serialized string of the event box
   * @param expectedRWT event fromChain RWT tokenId
   */
  verifyEventRWT = (
    eventSerializedBox: string,
    expectedRWT: string
  ): boolean => {
    const eventBox = wasm.ErgoBox.sigma_parse_bytes(
      Buffer.from(eventSerializedBox, 'hex')
    );
    return (
      eventBox.tokens().len() !== 0 &&
      eventBox.tokens().get(0).id().to_str() === expectedRWT
    );
  };

  /**
   * gets guards public keys and required signs from config box in the blockchain
   * @param guardNFT the guard NFT tokenId
   * @param address address containing guard config box
   */
  getGuardsPkConfig = async (
    guardNFT: string,
    address: string
  ): Promise<GuardsPkConfig> => {
    const guardBox = wasm.ErgoBox.sigma_parse_bytes(
      Buffer.from(await this.getGuardsConfigBox(guardNFT, address), 'hex')
    );
    try {
      const r4 = guardBox.register_value(4)?.to_coll_coll_byte();
      const r5 = guardBox.register_value(5)?.to_i32_array();

      if (r4 === undefined || r5 === undefined)
        throw Error(`R4 or R5 is empty`);

      return {
        publicKeys: r4.map((pk) => Buffer.from(pk).toString('hex')),
        requiredSigns: r5[0],
      };
    } catch (e) {
      this.logger.debug(
        `Cannot get guards pk config from box [${guardBox
          .box_id()
          .to_str()}]. R4 [${guardBox
          .register_value(4)
          ?.encode_to_base16()}], R5 [${guardBox
          .register_value(5)
          ?.encode_to_base16()}]`
      );
      throw Error(
        `Failed to get guards public keys from box [${guardBox
          .box_id()
          .to_str()}] due to invalid registers: ${e}`
      );
    }
  };

  /**
   * gets the context of blockchain using 10 last blocks
   * @returns the state context object
   */
  getStateContext = async (): Promise<wasm.ErgoStateContext> =>
    await this.network.getStateContext();

  /**
   * extracts payment order of a signed transaction
   * @param serializedTransaction hex representation of sigma-serialized-bytes of the transaction
   * @returns the transaction payment order (list of single payments)
   */
  extractSignedTransactionOrder = (
    serializedTransaction: string
  ): PaymentOrder => {
    const tx = Serializer.signedDeserialize(
      Buffer.from(serializedTransaction, 'hex')
    );
    const lockErgoTree = wasm.Address.from_base58(this.configs.addresses.lock)
      .to_ergo_tree()
      .to_base16_bytes();

    const order: PaymentOrder = [];
    const outputs = tx.outputs();
    const outputsLength = outputs.len();

    let addBox = false;
    for (let i = outputsLength - 1; i >= 0; i--) {
      const output = outputs.get(i);
      const boxErgoTree = output.ergo_tree().to_base16_bytes();

      // skip change box and fee box
      if (
        boxErgoTree !== ErgoChain.feeBoxErgoTree &&
        boxErgoTree !== lockErgoTree
      )
        addBox = true;
      if (addBox === false) continue;

      const assets = ErgoUtils.getBoxAssets(output);
      const wrappedAssets = ChainUtils.wrapAssetBalance(
        assets,
        this.tokenMap,
        this.NATIVE_TOKEN_ID,
        this.CHAIN
      );
      const r4Value = output.register_value(4)?.to_byte_array();

      const payment: SinglePayment = {
        address: wasm.Address.recreate_from_ergo_tree(
          output.ergo_tree()
        ).to_base58(wasm.NetworkPrefix.Mainnet),
        assets: wrappedAssets,
      };
      if (r4Value !== undefined)
        payment.extra = Buffer.from(r4Value).toString('hex');
      order.push(payment);
    }

    // reverse result to keep order
    order.reverse();

    return order;
  };

  /**
   * converts json representation of the payment transaction to ErgoTransaction
   * @returns ErgoTransaction object
   */
  PaymentTransactionFromJson = (jsonString: string): ErgoTransaction =>
    ErgoTransaction.fromJson(jsonString);

  /**
   * get a transaction by its id
   * returning serialized tx or throw an error
   * if the tx doesn't belong to the block
   * @param txId
   * @param blockId
   */
  getTransaction = async (txId: string, blockId: string): Promise<string> =>
    Buffer.from(
      Serializer.signedSerialize(
        await this.network.getTransaction(txId, blockId)
      )
    ).toString('hex');

  /**
   * generates PaymentTransaction object from raw tx json string
   * @param rawTxJsonString
   * @returns PaymentTransaction object
   */
  rawTxToPaymentTransaction = async (
    rawTxJsonString: string
  ): Promise<ErgoTransaction> => {
    const tx = wasm.UnsignedTransaction.from_json(rawTxJsonString);

    // get input boxes
    const inErgoBoxes = wasm.ErgoBoxes.empty();
    const serializedInputs: Array<Uint8Array> = [];
    const inputs = tx.inputs();
    for (let i = 0; i < inputs.len(); i++) {
      const box = await this.network.getBox(inputs.get(i).box_id().to_str());
      inErgoBoxes.add(box);
      serializedInputs.push(box.sigma_serialize_bytes());
    }

    // get data input boxes
    const dataInErgoBoxes = wasm.ErgoBoxes.empty();
    const serializedDataInputs: Array<Uint8Array> = [];
    const dataInputs = tx.data_inputs();
    for (let i = 0; i < dataInputs.len(); i++) {
      const box = await this.network.getBox(
        dataInputs.get(i).box_id().to_str()
      );
      dataInErgoBoxes.add(box);
      serializedDataInputs.push(box.sigma_serialize_bytes());
    }

    // create ReducedTransaction object
    const ctx = await this.network.getStateContext();
    const reducedTx = wasm.ReducedTransaction.from_unsigned_tx(
      tx,
      inErgoBoxes,
      dataInErgoBoxes,
      ctx
    );

    // create ErgoTransaction
    const txBytes = Serializer.serialize(reducedTx);
    const txId = reducedTx.unsigned_tx().id().to_str();
    const ergoTx = new ErgoTransaction(
      txId,
      '',
      txBytes,
      TransactionType.manual,
      serializedInputs,
      serializedDataInputs
    );

    this.logger.info(`Parsed Ergo transaction [${txId}] successfully`);
    return ergoTx;
  };

  /**
   * serializes the transaction of this chain into string
   */
  protected serializeTx = (tx: wasm.Transaction): string =>
    Buffer.from(tx.sigma_serialize_bytes()).toString('hex');
}

export default ErgoChain;
