import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractUtxoChain,
  AssetBalance,
  BlockInfo,
  BoxInfo,
  ChainUtils,
  CoveringBoxes,
  GET_BOX_API_LIMIT,
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
import AbstractDogeNetwork from './network/AbstractDogeNetwork';
import DogeTransaction from './DogeTransaction';
import { DogeConfigs, DogeTx, DogeUtxo, TssSignFunction } from './types';
import Serializer from './Serializer';
import { Psbt, Transaction, address, payments, script } from 'bitcoinjs-lib'; // Adjust if necessary for Dogecoin
import JsonBigInt from '@rosen-bridge/json-bigint';
import { estimateTxFee, getInputBoxId } from './dogeUtils'; // Adjust if necessary for Dogecoin
import {
  DOGE_CHAIN,
  DOGE,
  MINIMUM_UTXO_VALUE,
  DOGE_NETWORK,
} from './constants';
import { DogeRosenExtractor } from '@rosen-bridge/rosen-extractor'; // Adjust if necessary for Dogecoin
import { RosenAmount, RosenTokens } from '@rosen-bridge/tokens';
import { selectDogeUtxos } from './dogeUtils';

class DogeChain extends AbstractUtxoChain<DogeTx, DogeUtxo> {
  declare network: AbstractDogeNetwork;
  declare configs: DogeConfigs;
  CHAIN = DOGE_CHAIN;
  NATIVE_TOKEN_ID = DOGE;
  extractor: DogeRosenExtractor;
  protected signFunction: TssSignFunction;
  protected lockScript: string;
  protected signingScript: Buffer;

  constructor(
    network: AbstractDogeNetwork,
    configs: DogeConfigs,
    tokens: RosenTokens,
    signFunction: TssSignFunction,
    logger?: AbstractLogger
  ) {
    super(network, configs, tokens, logger);
    this.extractor = new DogeRosenExtractor(
      configs.addresses.lock,
      tokens,
      logger
    );
    this.signFunction = signFunction;
    this.lockScript = address
      .toOutputScript(this.configs.addresses.lock)
      .toString('hex');
    this.signingScript = payments.p2pkh({
      hash: Buffer.from(this.lockScript, 'hex').subarray(2),
    }).output!;
  }

  /**
   * generates unsigned PaymentTransaction for payment order
   * @param eventId the id of event
   * @param txType transaction type
   * @param order the payment order (list of single payments)
   * @param unsignedTransactions ongoing unsigned PaymentTransactions (used for preventing double spend)
   * @param serializedSignedTransactions the serialized string of ongoing signed transactions (used for chaining transaction)
   * @returns the generated PaymentTransaction
   */
  generateMultipleTransactions = async (
    eventId: string,
    txType: TransactionType,
    order: PaymentOrder,
    unsignedTransactions: PaymentTransaction[],
    serializedSignedTransactions: string[]
  ): Promise<DogeTransaction[]> => {
    this.logger.debug(
      `Generating Dogecoin transaction for Order: ${JsonBigInt.stringify(
        order
      )}`
    );
    const feeRatio = await this.network.getFeeRatio();

    // calculate required assets
    const minUtxoValue = this.getMinimumNativeToken();
    const requiredAssets = order
      .map((order) => order.assets)
      .reduce(ChainUtils.sumAssetBalance, {
        nativeToken: minUtxoValue,
        tokens: [],
      });
    this.logger.debug(
      `Required assets: ${JsonBigInt.stringify(requiredAssets)}`
    );

    if (!(await this.hasLockAddressEnoughAssets(requiredAssets))) {
      const neededDoge = this.unwrapDoge(requiredAssets.nativeToken);
      throw new NotEnoughAssetsError(
        `Locked assets cannot cover required assets. DOGE: ${neededDoge.amount.toString()}`
      );
    }

    const forbiddenBoxIds = unsignedTransactions.flatMap((paymentTx) => {
      const inputs = Serializer.deserialize(paymentTx.txBytes).txInputs;
      const ids: string[] = [];
      for (let i = 0; i < inputs.length; i++)
        ids.push(
          getInputBoxId(inputs[i].hash.toString('hex'), inputs[i].index)
        );

      return ids;
    });
    const trackMap = this.getTransactionsBoxMapping(
      serializedSignedTransactions.map((serializedTx) =>
        Psbt.fromHex(serializedTx)
      ),
      this.configs.addresses.lock
    );

    // fetch input boxes
    const unwrappedRequiredAssets = ChainUtils.unwrapAssetBalance(
      requiredAssets,
      this.tokenMap,
      this.NATIVE_TOKEN_ID,
      this.CHAIN
    );
    const coveredBoxes = await this.getCoveringBoxes(
      this.configs.addresses.lock,
      unwrappedRequiredAssets,
      forbiddenBoxIds,
      trackMap
    );
    if (!coveredBoxes.covered) {
      const neededDoge = unwrappedRequiredAssets.nativeToken;
      throw new NotEnoughValidBoxesError(
        `Available boxes didn't cover required assets. DOGE: ${neededDoge.toString()}`
      );
    }

    // add inputs
    const psbt = new Psbt({ network: DOGE_NETWORK });
    coveredBoxes.boxes.forEach((box) => {
      psbt.addInput({
        hash: box.txId,
        index: box.index,
        witnessUtxo: {
          script: Buffer.from(this.lockScript, 'hex'),
          value: Number(box.value),
        },
      });
    });
    // calculate input boxes assets
    let remainingDoge = coveredBoxes.boxes.reduce((a, b) => a + b.value, 0n);
    this.logger.debug(`Input DOGE: ${remainingDoge}`);

    // add outputs
    order.forEach((order) => {
      if (order.extra) {
        throw Error('Dogecoin does not support extra data in payment order');
      }
      if (order.assets.tokens.length) {
        throw Error('Dogecoin does not support tokens in payment order');
      }
      const orderDoge = this.unwrapDoge(order.assets.nativeToken).amount;

      // reduce order value from remaining assets
      remainingDoge -= orderDoge;

      // create order output
      psbt.addOutput({
        address: order.address,
        value: Number(orderDoge),
      });
    });

    // create change output
    this.logger.debug(`Remaining DOGE: ${remainingDoge}`);
    const estimatedFee = estimateTxFee(
      psbt.txInputs.length,
      psbt.txOutputs.length + 1,
      feeRatio
    );
    this.logger.debug(`Estimated Fee: ${estimatedFee}`);
    remainingDoge -= estimatedFee;
    psbt.addOutput({
      script: Buffer.from(this.lockScript, 'hex'),
      value: Number(remainingDoge),
    });

    // create the transaction
    const txId = Transaction.fromBuffer(psbt.data.getTransaction()).getId();
    const txBytes = Serializer.serialize(psbt);

    const dogeTx = new DogeTransaction(
      txId,
      eventId,
      txBytes,
      txType,
      coveredBoxes.boxes.map((box) => JsonBigInt.stringify(box))
    );

    this.logger.info(
      `Dogecoin transaction [${txId}] as type [${txType}] generated for event [${eventId}]`
    );
    return [dogeTx];
  };

  /**
   * gets input and output assets of a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns an object containing the amount of input and output assets
   */
  getTransactionAssets = async (
    transaction: PaymentTransaction
  ): Promise<TransactionAssetBalance> => {
    const dogeTx = transaction as DogeTransaction;

    let txDoge = 0n;
    const inputUtxos = Array.from(new Set(dogeTx.inputUtxos));
    for (let i = 0; i < inputUtxos.length; i++) {
      const input = JsonBigInt.parse(inputUtxos[i]) as DogeUtxo;
      txDoge += input.value;
    }

    // no need to calculate outDoge, because: inDoge = outDoge + fee
    const wrappedValue = this.wrapDoge(txDoge).amount;
    return {
      inputAssets: {
        nativeToken: wrappedValue,
        tokens: [],
      },
      outputAssets: {
        nativeToken: wrappedValue,
        tokens: [],
      },
    };
  };

  getMinimumNativeToken = (): bigint => {
    return BigInt(MINIMUM_UTXO_VALUE);
  };

  /**
   * extracts payment order of a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns the transaction payment order (list of single payments)
   */
  extractTransactionOrder = (transaction: PaymentTransaction): PaymentOrder => {
    const tx = Serializer.deserialize(transaction.txBytes);

    const order: PaymentOrder = [];
    for (let i = 0; i < tx.txOutputs.length; i++) {
      const output = tx.txOutputs[i];

      // skip change box (last box & address equal to bank address)
      if (
        i === tx.txOutputs.length - 1 &&
        output.script.toString('hex') === this.lockScript
      )
        continue;

      const payment: SinglePayment = {
        address: address.fromOutputScript(output.script),
        assets: {
          nativeToken: this.wrapDoge(BigInt(output.value)).amount,
          tokens: [],
        },
      };
      order.push(payment);
    }
    return order;
  };

  /**
   * verifies transaction fee for a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns true if the transaction fee is verified
   */
  verifyTransactionFee = async (
    transaction: PaymentTransaction
  ): Promise<boolean> => {
    const tx = Serializer.deserialize(transaction.txBytes);
    const dogeTx = transaction as DogeTransaction;

    let inDoge = 0n;
    const inputUtxos = Array.from(new Set(dogeTx.inputUtxos));
    for (let i = 0; i < inputUtxos.length; i++) {
      const input = JsonBigInt.parse(inputUtxos[i]) as DogeUtxo;
      inDoge += input.value;
    }

    let outDoge = 0n;
    for (let i = 0; i < tx.txOutputs.length; i++) {
      const output = tx.txOutputs[i];
      outDoge += BigInt(output.value);
    }

    const fee = inDoge - outDoge;
    const estimatedFee = estimateTxFee(
      tx.txInputs.length,
      tx.txOutputs.length,
      await this.network.getFeeRatio()
    );

    const feeDifferencePercent = Math.abs(
      (Number(fee - estimatedFee) * 100) / Number(fee)
    );
    if (feeDifferencePercent > this.configs.txFeeSlippage) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: Fee difference is too high. Slippage is higher than allowed value [${feeDifferencePercent} > ${this.configs.txFeeSlippage}]. fee: ${fee}, estimated fee: ${estimatedFee}`
      );
      return false;
    }
    return true;
  };

  /**
   * verifies no token burned in a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns true if no token burned
   */
  verifyNoTokenBurned = async (
    transaction: PaymentTransaction
  ): Promise<boolean> => {
    // Dogecoin has no tokens and DOGE cannot be burned
    return true;
  };

  /**
   * verifies additional conditions for a DogeTransaction
   * - check change box
   * @param transaction the PaymentTransaction
   * @returns true if the transaction is verified
   */
  verifyTransactionExtraConditions = (
    transaction: PaymentTransaction
  ): boolean => {
    const tx = Serializer.deserialize(transaction.txBytes);

    // check change box
    const changeBoxIndex = tx.txOutputs.length - 1;
    const changeBox = tx.txOutputs[changeBoxIndex];
    if (changeBox.script.toString('hex') !== this.lockScript) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: Change box address is wrong`
      );
      return false;
    }

    return true;
  };

  /**
   * verifies additional conditions for a event lock transaction
   * @param transaction the lock transaction
   * @param blockInfo
   * @returns true if the transaction is verified
   */
  verifyLockTransactionExtraConditions = async (
    transaction: DogeTx,
    blockInfo: BlockInfo
  ): Promise<boolean> => {
    return true;
  };

  /**
   * checks if a transaction is still valid and can be sent to the network
   * @param transaction the transaction
   * @param signingStatus
   * @returns true if the transaction is still valid
   */
  isTxValid = async (
    transaction: PaymentTransaction,
    signingStatus: SigningStatus = SigningStatus.Signed
  ): Promise<ValidityStatus> => {
    const tx = Serializer.deserialize(transaction.txBytes);
    for (let i = 0; i < tx.txInputs.length; i++) {
      const boxId = getInputBoxId(
        tx.txInputs[i].hash.toString('hex'),
        tx.txInputs[i].index
      );
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
   * @returns the signed transaction
   */
  signTransaction = (
    transaction: PaymentTransaction
  ): Promise<PaymentTransaction> => {
    const psbt = Serializer.deserialize(transaction.txBytes);
    const tx = Transaction.fromBuffer(psbt.data.getTransaction());
    const dogeTx = transaction as DogeTransaction;

    const signaturePromises: Promise<string>[] = [];
    for (let i = 0; i < dogeTx.inputUtxos.length; i++) {
      const signMessage = tx.hashForSignature(
        i,
        this.signingScript,
        Transaction.SIGHASH_ALL
      );

      const signatureHex = this.signFunction(signMessage).then((response) => {
        this.logger.debug(
          `Input [${i}] of tx [${dogeTx.txId}] is signed. signature: ${response.signature}`
        );
        return response.signature;
      });
      signaturePromises.push(signatureHex);
    }

    return Promise.all(signaturePromises).then((signatures) => {
      const signedPsbt = this.buildSignedTransaction(
        dogeTx.txBytes,
        signatures
      );
      // check if transaction can be finalized
      signedPsbt.finalizeAllInputs().extractTransaction();

      // generate PaymentTransaction with signed Psbt
      return new DogeTransaction(
        dogeTx.txId,
        dogeTx.eventId,
        Serializer.serialize(signedPsbt),
        dogeTx.txType,
        dogeTx.inputUtxos
      );
    });
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
        `Dogecoin Transaction [${transaction.txId}] submitted. Response: ${response}`
      );
    } catch (e) {
      this.logger.warn(
        `An error occurred while submitting Dogecoin transaction [${transaction.txId}]: ${e}`
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
    return (await this.network.getMempoolTxIds()).includes(transactionId);
  };

  /**
   * converts json representation of the payment transaction to PaymentTransaction
   * @returns PaymentTransaction object
   */
  PaymentTransactionFromJson = (jsonString: string): DogeTransaction =>
    DogeTransaction.fromJson(jsonString);

  /**
   * generates PaymentTransaction object from psbt hex string
   * @param psbtHex
   * @returns PaymentTransaction object
   */
  rawTxToPaymentTransaction = async (
    psbtHex: string
  ): Promise<PaymentTransaction> => {
    const tx = Psbt.fromHex(psbtHex);
    const txBytes = Serializer.serialize(tx);
    const txId = Transaction.fromBuffer(tx.data.getTransaction()).getId();

    const inputBoxes: Array<DogeUtxo> = [];
    const inputs = tx.txInputs;
    for (let i = 0; i < inputs.length; i++) {
      const boxId = getInputBoxId(
        inputs[i].hash.toString('hex'),
        inputs[i].index
      );
      inputBoxes.push(await this.network.getUtxo(boxId));
    }

    const dogeTx = new DogeTransaction(
      txId,
      '',
      txBytes,
      TransactionType.manual,
      inputBoxes.map((box) => JsonBigInt.stringify(box))
    );

    this.logger.info(`Parsed Dogecoin transaction [${txId}] successfully`);
    return dogeTx;
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
  ): Promise<Map<string, DogeUtxo | undefined>> => {
    // chaining transaction won't be done in DogeChain
    // due to heavy size of transactions in mempool
    return new Map<string, DogeUtxo | undefined>();
  };

  protected getBoxId = (box: DogeUtxo): string => box.txId + '.' + box.index;

  /**
   * extracts box id and assets of a box
   * Note: it returns the actual value
   * @param box the box
   * @returns an object containing the box id and assets
   */
  protected getBoxInfo = (box: DogeUtxo): BoxInfo => {
    return {
      id: this.getBoxId(box),
      assets: {
        nativeToken: box.value,
        tokens: [],
      },
    };
  };

  /**
   * generates mapping from input box id to serialized string of output box (filtered by address, containing the token)
   * @param txs list of transactions
   * @param address the address
   * @returns a Map from input box id to output box
   */
  protected getTransactionsBoxMapping = (
    txs: Psbt[],
    address: string
  ): Map<string, DogeUtxo | undefined> => {
    const trackMap = new Map<string, DogeUtxo | undefined>();

    txs.forEach((tx) => {
      const txId = Transaction.fromBuffer(tx.data.getTransaction()).getId();
      // iterate over tx inputs
      tx.txInputs.forEach((input) => {
        let trackedBox: DogeUtxo | undefined = undefined;
        // iterate over tx outputs
        let index = 0;
        for (index = 0; index < tx.txOutputs.length; index++) {
          const output = tx.txOutputs[index];
          // check if box satisfy conditions
          if (output.address !== address) continue;

          // mark the tracked box
          trackedBox = {
            txId: txId,
            index: index,
            value: BigInt(output.value),
          };
          break;
        }

        // add input box to trackMap
        const boxId = getInputBoxId(txId, input.index);
        trackMap.set(boxId, trackedBox);
      });
    });

    return trackMap;
  };

  /**
   * builds a signed transaction
   * @param txBytes
   * @param signatures
   * @returns a signed transaction
   */
  protected buildSignedTransaction = (
    txBytes: Uint8Array,
    signatures: string[]
  ): Psbt => {
    const psbt = Serializer.deserialize(txBytes);
    for (let i = 0; i < signatures.length; i++) {
      const signature = Buffer.from(signatures[i], 'hex');
      psbt.updateInput(i, {
        partialSig: [
          {
            pubkey: Buffer.from(this.configs.aggregatedPublicKey, 'hex'),
            signature: script.signature.encode(signature, 1),
          },
        ],
      });
    }
    return psbt;
  };

  /**
   * serializes the transaction of this chain into string
   */
  protected serializeTx = (tx: DogeTx): string => JsonBigInt.stringify(tx);

  /**
   * wraps doge amount
   * @param amount
   */
  protected wrapDoge = (amount: bigint): RosenAmount =>
    this.tokenMap.wrapAmount(this.NATIVE_TOKEN_ID, amount, this.CHAIN);

  /**
   * unwraps doge amount
   * @param amount
   */
  protected unwrapDoge = (amount: bigint): RosenAmount =>
    this.tokenMap.unwrapAmount(this.NATIVE_TOKEN_ID, amount, this.CHAIN);

  /**
   * gets useful, allowable and last boxes for an address until required assets are satisfied
   * Note: it returns the actual value
   * @param address the address
   * @param requiredAssets the required assets (actual values)
   * @param forbiddenBoxIds the id of forbidden boxes
   * @param trackMap the mapping of a box id to it's next box
   * @returns an object containing the selected boxes with a boolean showing if requirements covered or not
   */
  protected getCoveringBoxes = async (
    address: string,
    requiredAssets: AssetBalance,
    forbiddenBoxIds: Array<string>,
    trackMap: Map<string, DogeUtxo | undefined>
  ): Promise<CoveringBoxes<DogeUtxo>> => {
    const getAddressBoxes = this.network.getAddressBoxes;
    async function* generator() {
      let offset = 0;
      const limit = GET_BOX_API_LIMIT;
      while (true) {
        const page = await getAddressBoxes(address, offset, limit);
        if (page.length === 0) break;
        yield* page;
        offset += limit;
      }
      return undefined;
    }
    const utxoIterator = generator();

    const feeRatio = await this.network.getFeeRatio();
    return selectDogeUtxos(
      requiredAssets.nativeToken,
      forbiddenBoxIds,
      trackMap,
      utxoIterator,
      feeRatio
    );
  };
}
