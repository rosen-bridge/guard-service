import { Psbt, Transaction, address, script } from 'bitcoinjs-lib';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  BitcoinBoxSelection,
  generateFeeEstimator,
} from '@rosen-bridge/bitcoin-utxo-selection';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { FiroRosenExtractor } from '@rosen-bridge/rosen-extractor';
import { RosenAmount, TokenMap } from '@rosen-bridge/tokens';
import {
  AbstractUtxoChain,
  BlockInfo,
  ChainUtils,
  EcdsaSignMediator,
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

import {
  FIRO_CHAIN,
  FIRO,
  MINIMUM_UTXO_VALUE,
  FIRO_NETWORK,
  FIRO_INPUT_SIZE,
  FIRO_OUTPUT_SIZE,
  FIRO_TX_BASE_SIZE,
} from './constants';
import FiroTransaction from './firoTransaction';
import {
  estimateTxFee,
  getPsbtTxInputBoxId,
  isPsbtFinalized,
} from './firoUtils';
import AbstractFiroNetwork from './network/abstractFiroNetwork';
import Serializer from './serializer';
import { FiroConfigs, FiroTx, FiroUtxo } from './types';

class FiroChain extends AbstractUtxoChain<FiroTx, FiroUtxo> {
  declare network: AbstractFiroNetwork;
  declare configs: FiroConfigs;
  CHAIN = FIRO_CHAIN;
  NATIVE_TOKEN_ID = FIRO;
  extractor: FiroRosenExtractor;
  protected boxSelection: BitcoinBoxSelection;
  protected signMediator: EcdsaSignMediator;
  protected lockScript: string;

  constructor(
    network: AbstractFiroNetwork,
    configs: FiroConfigs,
    tokens: TokenMap,
    signMediator: EcdsaSignMediator,
    logger?: AbstractLogger,
  ) {
    super(network, configs, tokens, logger);
    this.extractor = new FiroRosenExtractor(
      configs.addresses.lock,
      tokens,
      logger?.child('FiroRosenExtractor'),
    );
    this.signMediator = signMediator;
    this.lockScript = address
      .toOutputScript(this.configs.addresses.lock, FIRO_NETWORK)
      .toString('hex');
    this.boxSelection = new BitcoinBoxSelection();
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
    serializedSignedTransactions: string[],
  ): Promise<FiroTransaction[]> => {
    this.logger.debug(
      `Generating Firo transaction for Order: ${JsonBigInt.stringify(order)}`,
    );
    const feeRatio = await this.network.getFeeRatio();

    // calculate required assets
    const requiredAssets = order
      .map((order) => order.assets)
      .reduce(ChainUtils.sumAssetBalance, {
        nativeToken: 0n, // the min FIRO for change output is considered by the selection package
        tokens: [],
      });
    this.logger.debug(
      `Required assets: ${JsonBigInt.stringify(requiredAssets)}`,
    );

    if (!(await this.hasLockAddressEnoughAssets(requiredAssets))) {
      const neededFiro = this.unwrapFiro(requiredAssets.nativeToken);
      throw new NotEnoughAssetsError(
        `Locked assets cannot cover required assets. FIRO: ${neededFiro.amount.toString()}`,
      );
    }

    const forbiddenBoxIds = unsignedTransactions.flatMap((paymentTx) => {
      const inputs = Serializer.deserialize(paymentTx.txBytes).txInputs;
      const ids: string[] = [];
      for (let i = 0; i < inputs.length; i++)
        ids.push(getPsbtTxInputBoxId(inputs[i]));

      return ids;
    });

    // we chain the signed transactions
    // we avoid using the unsigned transactions' inputs
    const finalizedSignedTransactions = serializedSignedTransactions.filter(
      (serializedTx) => {
        if (
          isPsbtFinalized(Psbt.fromHex(serializedTx, { network: FIRO_NETWORK }))
        ) {
          return true;
        } else {
          const unsignedPsbt = Psbt.fromHex(serializedTx, {
            network: FIRO_NETWORK,
          });
          for (let i = 0; i < unsignedPsbt.txInputs.length; i++) {
            forbiddenBoxIds.push(getPsbtTxInputBoxId(unsignedPsbt.txInputs[i]));
          }
          return false;
        }
      },
    );

    // Save the hex bytes of the signed transaction in case their utxos are going to be spent in this transaction
    const txToHex: Record<string, string> = {};
    for (const serializedTx of finalizedSignedTransactions) {
      const psbt = Psbt.fromHex(serializedTx, { network: FIRO_NETWORK });
      const tx = psbt.extractTransaction(true);
      txToHex[tx.getId()] = tx.toHex();
    }
    const trackMap = this.getTransactionsBoxMapping(
      finalizedSignedTransactions.map((serializedTx) =>
        Psbt.fromHex(serializedTx, { network: FIRO_NETWORK }),
      ),
      this.configs.addresses.lock,
    );

    // generate iterator for address boxes
    const getAddressBoxes = this.network.getAddressBoxes;
    const lockAddress = this.configs.addresses.lock;
    async function* generator() {
      let offset = 0;
      const limit = GET_BOX_API_LIMIT;
      while (true) {
        const page = await getAddressBoxes(lockAddress, offset, limit);
        if (page.length === 0) break;
        yield* page;
        offset += limit;
      }
      return undefined;
    }
    const utxoIterator = generator();

    // generate fee estimator
    const estimateFee = generateFeeEstimator(
      1,
      FIRO_TX_BASE_SIZE,
      FIRO_INPUT_SIZE,
      FIRO_OUTPUT_SIZE,
      feeRatio,
      1, // the virtual size matters for fee estimation of native-segwit transactions
    );

    // fetch input boxes
    const unwrappedRequiredAssets = ChainUtils.unwrapAssetBalance(
      requiredAssets,
      this.tokenMap,
      this.NATIVE_TOKEN_ID,
      this.CHAIN,
    );
    const coveredBoxes = await this.boxSelection.getCoveringBoxes(
      unwrappedRequiredAssets,
      forbiddenBoxIds,
      trackMap,
      utxoIterator,
      BigInt(MINIMUM_UTXO_VALUE),
      undefined,
      estimateFee,
    );
    if (!coveredBoxes.covered) {
      throw new NotEnoughValidBoxesError(
        `Available boxes didn't cover required assets. Uncovered FIRO: ${coveredBoxes.uncoveredAssets?.nativeToken.toString()}`,
      );
    }

    // Fetch transaction hex for boxes not in txToHex map
    for (const box of coveredBoxes.boxes) {
      if (!txToHex[box.txId]) {
        txToHex[box.txId] = await this.network.getTransactionHex(box.txId);
      }
    }

    // Add inputs
    const txInputs = coveredBoxes.boxes.map((box) => ({
      hash: box.txId,
      index: box.index,
      nonWitnessUtxo: Buffer.from(txToHex[box.txId], 'hex'),
    }));

    // Calculate total FIRO available from inputs
    const totalFiro = coveredBoxes.boxes.reduce(
      (sum, box) => sum + box.value,
      0n,
    );
    let remainingFiro = totalFiro;

    this.logger.debug(`Input FIRO: ${remainingFiro}`);

    // Add outputs
    const txOutputs = order.map((order) => {
      if (order.extra) {
        throw Error('Firo does not support extra data in payment order');
      }
      if (order.assets.tokens.length) {
        throw Error('Firo does not support tokens in payment order');
      }
      const orderFiro = this.unwrapFiro(order.assets.nativeToken).amount;

      // reduce order value from remaining assets
      remainingFiro -= orderFiro;

      // create order output
      return {
        script: address.toOutputScript(order.address, FIRO_NETWORK),
        value: Number(orderFiro),
      };
    });

    this.logger.debug(`Remaining FIRO: ${remainingFiro}`);

    // Add change output
    const estimatedFee = estimateTxFee(
      txInputs.length,
      txOutputs.length + 1,
      feeRatio,
    );

    this.logger.debug(`Estimated fee: ${estimatedFee}`);

    remainingFiro -= estimatedFee;

    // Create PSBT
    const psbt = new Psbt({ network: FIRO_NETWORK });

    // Add inputs to PSBT
    for (const input of txInputs) {
      psbt.addInput({
        hash: input.hash,
        index: input.index,
        nonWitnessUtxo: input.nonWitnessUtxo,
      });
    }

    // Add outputs to PSBT
    for (const output of txOutputs) {
      psbt.addOutput({
        script: output.script,
        value: output.value,
      });
    }

    // create change output
    psbt.addOutput({
      script: Buffer.from(this.lockScript, 'hex'),
      value: Number(remainingFiro),
    });

    // Serialize PSBT
    const txBytes = Serializer.serialize(psbt);
    const txId = Transaction.fromBuffer(psbt.data.getTransaction()).getId();

    const firoTx = new FiroTransaction(
      txId,
      eventId,
      txBytes,
      txType,
      coveredBoxes.boxes.map((box) => JsonBigInt.stringify(box)),
    );

    this.logger.info(
      `Firo transaction [${txId}] as type [${txType}] generated for event [${eventId}]`,
    );
    return [firoTx];
  };

  /**
   * requests the corresponding transaction of the payment in the chain
   * @param transaction the transaction
   * @returns the requested transaction assets
   */
  getTransactionAssets = async (
    transaction: PaymentTransaction,
  ): Promise<TransactionAssetBalance> => {
    const firoTx = transaction as FiroTransaction;

    let txFiro = 0n;
    const inputUtxos = Array.from(new Set(firoTx.inputUtxos));
    for (let i = 0; i < inputUtxos.length; i++) {
      const input = JsonBigInt.parse(inputUtxos[i]) as FiroUtxo;
      txFiro += input.value;
    }

    // no need to calculate outFiro, because: inFiro = outFiro + fee
    const wrappedValue = this.wrapFiro(txFiro).amount;
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

  /**
   * checks if a transaction is still valid and can be sent to the network
   * @param transaction the transaction
   * @param signingStatus the signing status of the transaction
   * @returns the validity status of the transaction
   */
  isTxValid = async (
    transaction: PaymentTransaction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    signingStatus: SigningStatus = SigningStatus.Signed,
  ): Promise<ValidityStatus> => {
    const tx = Serializer.deserialize(transaction.txBytes);
    for (let i = 0; i < tx.txInputs.length; i++) {
      const boxId = getPsbtTxInputBoxId(tx.txInputs[i]);
      if (!(await this.network.isBoxUnspentAndValid(boxId))) {
        this.logger.info(
          `Tx [${transaction.txId}] is invalid due to spending invalid input box [${boxId}] at index [${i}]`,
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
        address: address.fromOutputScript(output.script, FIRO_NETWORK),
        assets: {
          nativeToken: this.wrapFiro(BigInt(output.value)).amount,
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
    transaction: PaymentTransaction,
  ): Promise<boolean> => {
    const tx = Serializer.deserialize(transaction.txBytes);
    const firoTx = transaction as FiroTransaction;

    let inFiro = 0n;
    const inputUtxos = Array.from(new Set(firoTx.inputUtxos));
    for (let i = 0; i < inputUtxos.length; i++) {
      const input = JsonBigInt.parse(inputUtxos[i]) as FiroUtxo;
      inFiro += input.value;
    }

    let outFiro = 0n;
    for (let i = 0; i < tx.txOutputs.length; i++) {
      const output = tx.txOutputs[i];
      outFiro += BigInt(output.value);
    }

    const fee = inFiro - outFiro;
    const estimatedFee = estimateTxFee(
      tx.txInputs.length,
      tx.txOutputs.length,
      await this.network.getFeeRatio(),
    );

    const feeDifferencePercent = Math.abs(
      (Number(fee - estimatedFee) * 100) / Number(fee),
    );
    if (feeDifferencePercent > this.configs.txFeeSlippage) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: Fee difference is too high. Slippage is higher than allowed value [${feeDifferencePercent} > ${this.configs.txFeeSlippage}]. fee: ${fee}, estimated fee: ${estimatedFee}`,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transaction: PaymentTransaction,
  ): Promise<boolean> => {
    // Firo has no tokens and FIRO cannot be burned
    return true;
  };

  /**
   * submits a transaction to the blockchain
   * @param transaction the transaction
   */
  submitTransaction = async (
    transaction: PaymentTransaction,
  ): Promise<void> => {
    // deserialize transaction
    const tx = Serializer.deserialize(transaction.txBytes);

    // send transaction
    try {
      const response = await this.network.submitTransaction(tx);
      this.logger.info(
        `Firo Transaction [${transaction.txId}] submitted. Response: ${response}`,
      );
    } catch (e) {
      this.logger.warn(
        `An error occurred while submitting Firo transaction [${transaction.txId}]: ${e}`,
      );
      if (e instanceof Error && e.stack) {
        this.logger.warn(e.stack);
      }
    }
  };

  /**
   * requests the corresponding signer service to sign the transaction
   * @param transaction the transaction
   * @returns the signed transaction
   */
  signTransaction = (
    transaction: PaymentTransaction,
  ): Promise<PaymentTransaction> => {
    const psbt = Serializer.deserialize(transaction.txBytes);
    const tx = Transaction.fromBuffer(psbt.data.getTransaction());
    const firoTx = transaction as FiroTransaction;

    const signaturePromises: Promise<string>[] = [];
    for (let i = 0; i < firoTx.inputUtxos.length; i++) {
      const signMessage = tx.hashForSignature(
        i,
        Buffer.from(this.lockScript, 'hex'),
        Transaction.SIGHASH_ALL,
      );

      const signatureHex = this.signMediator
        .sign(signMessage)
        .then((response) => {
          this.logger.debug(
            `Input [${i}] of tx [${firoTx.txId}] is signed. signature: ${response.signature}`,
          );
          return response.signature;
        });
      signaturePromises.push(signatureHex);
    }

    return Promise.all(signaturePromises).then((signatures) => {
      const signedPsbt = this.buildSignedTransaction(
        firoTx.txBytes,
        signatures,
      );
      // check if transaction can be finalized
      signedPsbt.finalizeAllInputs().extractTransaction(true);

      // generate PaymentTransaction with signed Psbt
      return new FiroTransaction(
        firoTx.txId,
        firoTx.eventId,
        Serializer.serialize(signedPsbt),
        firoTx.txType,
        firoTx.inputUtxos,
      );
    });
  };

  /**
   * checks if the corresponding signer service is signing the transaction or not
   * @param transaction the transaction
   * @returns true if the signer is still signing at least one input, otherwise false
   */
  isTransactionInSign = async (
    transaction: PaymentTransaction,
  ): Promise<boolean> => {
    const psbt = Serializer.deserialize(transaction.txBytes);
    const tx = Transaction.fromBuffer(psbt.data.getTransaction());
    const firoTx = transaction as FiroTransaction;

    const signStatuses: boolean[] = [];
    for (let i = 0; i < firoTx.inputUtxos.length; i++) {
      const signMessage = tx.hashForSignature(
        i,
        Buffer.from(this.lockScript, 'hex'),
        Transaction.SIGHASH_ALL,
      );

      const isInSign = await this.signMediator.isInSign(signMessage);
      signStatuses.push(isInSign);
    }

    return signStatuses.some((status) => status);
  };

  /**
   * gets the minimum amount of native token for transferring asset
   * @returns the minimum amount
   */
  getMinimumNativeToken = (): bigint => {
    return this.tokenMap.wrapAmount(
      this.NATIVE_TOKEN_ID,
      BigInt(MINIMUM_UTXO_VALUE),
      this.CHAIN,
    ).amount;
  };

  /**
   * generates mapping from input box id to serialized string of output box (filtered by address, containing the token)
   * @param address the address
   * @param tokenId the token id
   * @returns a Map from input box id to serialized string of output box
   */
  getMempoolBoxMapping = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tokenId?: string,
  ): Promise<Map<string, FiroUtxo | undefined>> => {
    // chaining transaction won't be done in FiroChain
    // due to redundant complexity
    return new Map<string, FiroUtxo | undefined>();
  };

  /**
   * verifies additional conditions for a FiroTransaction
   * - check change box
   * @param transaction the PaymentTransaction
   * @returns true if the transaction is verified
   */
  verifyTransactionExtraConditions = (
    transaction: PaymentTransaction,
  ): boolean => {
    const tx = Serializer.deserialize(transaction.txBytes);

    // check change box
    const changeBoxIndex = tx.txOutputs.length - 1;
    const changeBox = tx.txOutputs[changeBoxIndex];
    if (changeBox.script.toString('hex') !== this.lockScript) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: Change box address is wrong`,
      );
      return false;
    }

    return true;
  };

  /**
   * verifies additional conditions for a event lock transaction
   * @param transaction the lock transaction
   * @param blockInfo the block info
   * @returns true if the transaction is verified
   * @note Firo follows Bitcoin's approach and does not require timestamp validation
   * for lock transactions. Unlike Ergo which validates box age, UTXO chains like
   * Bitcoin and Firo rely on standard transaction validation only.
   */
  verifyLockTransactionExtraConditions = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transaction: FiroTx,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blockInfo: BlockInfo,
  ): Promise<boolean> => {
    return true;
  };

  /**
   * checks if a transaction is in mempool
   * @param txId the transaction id
   * @returns true if the transaction is in mempool
   */
  isTxInMempool = async (txId: string): Promise<boolean> => {
    return this.network.isTxInMempool(txId);
  };

  /**
   * creates a PaymentTransaction from JSON
   * @param txJson the transaction JSON string
   * @returns the PaymentTransaction instance
   */
  PaymentTransactionFromJson = (txJson: string): PaymentTransaction => {
    return FiroTransaction.fromJson(txJson);
  };

  /**
   * generates PaymentTransaction object from psbt hex string
   * @param psbtHex the psbt hex string
   * @returns PaymentTransaction object
   */
  rawTxToPaymentTransaction = async (
    psbtHex: string,
  ): Promise<PaymentTransaction> => {
    const tx = Psbt.fromHex(psbtHex, { network: FIRO_NETWORK });
    const txBytes = Serializer.serialize(tx);
    const txId = Transaction.fromBuffer(tx.data.getTransaction()).getId();

    const inputBoxes: Array<FiroUtxo> = [];
    const inputs = tx.txInputs;
    for (let i = 0; i < inputs.length; i++) {
      const boxId = getPsbtTxInputBoxId(inputs[i]);
      const curUtxo = await this.network.getUtxo(boxId);
      inputBoxes.push(curUtxo);
    }

    const firoTx = new FiroTransaction(
      txId,
      '',
      txBytes,
      TransactionType.manual,
      inputBoxes.map((box) => JsonBigInt.stringify(box)),
    );

    this.logger.info(`Parsed Firo transaction [${txId}] successfully`);
    return firoTx;
  };

  /**
   * verifies consistency within the PaymentTransaction object
   * @param transaction the PaymentTransaction
   * @returns true if the transaction is verified
   */
  verifyPaymentTransaction = async (
    transaction: PaymentTransaction,
  ): Promise<boolean> => {
    const psbt = Serializer.deserialize(transaction.txBytes);
    const firoTx = transaction as FiroTransaction;
    const baseError = `Tx [${transaction.txId}] is not verified: `;

    // verify txId
    const txId = Transaction.fromBuffer(psbt.data.getTransaction()).getId();
    if (transaction.txId !== txId) {
      this.logger.warn(
        baseError +
          `Transaction id is inconsistent (expected [${transaction.txId}] found [${txId}])`,
      );
      return false;
    }

    // verify inputUtxos
    if (firoTx.inputUtxos.length !== psbt.inputCount) {
      this.logger.warn(
        baseError +
          `FiroTransaction object input counts is inconsistent [${firoTx.inputUtxos.length} != ${psbt.inputCount}]`,
      );
      return false;
    }
    for (let i = 0; i < psbt.inputCount; i++) {
      const input = psbt.txInputs[i];
      const txId = Buffer.from(input.hash).reverse().toString('hex');
      const actualInputId = `${txId}.${input.index}`;
      const firoInput = JsonBigInt.parse(firoTx.inputUtxos[i]) as FiroUtxo;
      const expectedId = `${firoInput.txId}.${firoInput.index}`;
      if (expectedId !== actualInputId) {
        this.logger.warn(
          baseError +
            `Utxo id for input at index [${i}] is inconsistent [expected ${expectedId} found ${actualInputId}]`,
        );
        return false;
      }
    }

    return true;
  };

  /**
   * serializes a FiroTx to string
   * @param tx the Firo transaction
   * @returns the serialized transaction string
   */
  protected serializeTx = (tx: FiroTx): string => {
    return JsonBigInt.stringify(tx);
  };

  /**
   * wraps firo amount
   * @param amount
   */
  protected wrapFiro = (amount: bigint): RosenAmount =>
    this.tokenMap.wrapAmount(this.NATIVE_TOKEN_ID, amount, this.CHAIN);

  /**
   * gets the box id
   * @param box the box
   * @returns the box id
   */
  protected getBoxId = (box: FiroUtxo): string => box.txId + '.' + box.index;

  /**
   * unwraps firo amount
   * @param amount
   */
  protected unwrapFiro = (amount: bigint): RosenAmount =>
    this.tokenMap.unwrapAmount(this.NATIVE_TOKEN_ID, amount, this.CHAIN);

  /**
   * builds a signed transaction
   * @param txBytes
   * @param signatures
   * @returns a signed transaction
   */
  protected buildSignedTransaction = (
    txBytes: Uint8Array,
    signatures: string[],
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
   * generates mapping from input box id to serialized string of output box (filtered by address, containing the token)
   * @param txs list of transactions
   * @param address the address
   * @returns a Map from input box id to output box
   */
  protected getTransactionsBoxMapping = (
    txs: Psbt[],
    address: string,
  ): Map<string, FiroUtxo | undefined> => {
    const trackMap = new Map<string, FiroUtxo | undefined>();

    txs.forEach((tx) => {
      const txId = tx.extractTransaction(true).getId();
      // iterate over tx inputs
      tx.txInputs.forEach((input) => {
        let trackedBox: FiroUtxo | undefined = undefined;
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
        const boxId = getPsbtTxInputBoxId(input);
        trackMap.set(boxId, trackedBox);
      });
    });

    return trackMap;
  };
}

export default FiroChain;
