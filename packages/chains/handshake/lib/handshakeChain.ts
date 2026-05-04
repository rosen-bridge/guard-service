import hsd from 'hsd';
import type {
  Address as HsdAddress,
  Coin as HsdCoin,
  Input as HsdInput,
  MTX as HsdMTX,
} from 'hsd';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  BitcoinBoxSelection,
  generateFeeEstimator,
} from '@rosen-bridge/bitcoin-utxo-selection';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { HandshakeRosenExtractor } from '@rosen-bridge/rosen-extractor';
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
  HANDSHAKE_CHAIN,
  HANDSHAKE_INPUT_SIZE,
  HANDSHAKE_OUTPUT_SIZE,
  HANDSHAKE_TX_BASE_SIZE,
  HNS,
  MINIMUM_UTXO_VALUE,
  TSS_SIGNATURE_SIZE,
  WITNESS_SIGNATURE_SIZE,
} from './constants';
import HandshakeTransaction from './handshakeTransaction';
import { estimateTxFee, getInputBoxId } from './handshakeUtils';
import AbstractHandshakeNetwork from './network/abstractHandshakeNetwork';
import Serializer from './serializer';
import { HandshakeConfigs, HandshakeTx, HandshakeUtxo } from './types';

const { Address, Coin, MTX, Script } = hsd;

class HandshakeChain extends AbstractUtxoChain<HandshakeTx, HandshakeUtxo> {
  declare network: AbstractHandshakeNetwork;
  declare configs: HandshakeConfigs;
  CHAIN = HANDSHAKE_CHAIN;
  NATIVE_TOKEN_ID = HNS;
  extractor: HandshakeRosenExtractor;
  protected boxSelection: BitcoinBoxSelection;
  protected signMediator: EcdsaSignMediator;
  protected lockAddress: HsdAddress;
  protected lockScript: Buffer;

  constructor(
    network: AbstractHandshakeNetwork,
    configs: HandshakeConfigs,
    tokens: TokenMap,
    signMediator: EcdsaSignMediator,
    logger?: AbstractLogger,
  ) {
    super(network, configs, tokens, logger);
    this.extractor = new HandshakeRosenExtractor(
      configs.addresses.lock,
      tokens,
      logger,
    );
    this.signMediator = signMediator;
    this.boxSelection = new BitcoinBoxSelection();
    this.lockAddress = Address.fromString(this.configs.addresses.lock);
    // For P2WPKH TSS: derive lock script from the lock address pubkeyhash
    this.lockScript = Script.fromPubkeyhash(this.lockAddress.hash).encode();
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
  ): Promise<HandshakeTransaction[]> => {
    this.logger.debug(
      `Generating Handshake transaction for Order: ${JsonBigInt.stringify(order)}`,
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
      `Required assets: ${JsonBigInt.stringify(requiredAssets)}`,
    );

    if (!(await this.hasLockAddressEnoughAssets(requiredAssets))) {
      const neededHns = this.unwrapHns(requiredAssets.nativeToken);
      throw new NotEnoughAssetsError(
        `Locked assets cannot cover required assets. HNS: ${neededHns.amount.toString()}`,
      );
    }

    const forbiddenBoxIds = unsignedTransactions.flatMap((paymentTx) => {
      const mtx = Serializer.deserialize(paymentTx.txBytes);
      const ids: string[] = [];
      for (let i = 0; i < mtx.inputs.length; i++)
        ids.push(getInputBoxId(mtx.inputs[i]));
      return ids;
    });

    const trackMap = this.getTransactionsBoxMapping(
      serializedSignedTransactions.map((serializedTx) =>
        Serializer.deserialize(Buffer.from(serializedTx, 'hex')),
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

    // generate fee estimator for box selection
    // Handshake: fee = virtualSize * feeRatio (uses SegWit-style witness discount)
    const estimateFee = generateFeeEstimator(
      1,
      HANDSHAKE_TX_BASE_SIZE,
      HANDSHAKE_INPUT_SIZE,
      HANDSHAKE_OUTPUT_SIZE,
      feeRatio,
      4, // Handshake uses witness discount like Bitcoin (WITNESS_SCALE_FACTOR = 4)
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
        `Available boxes didn't cover required assets. Uncovered HNS: ${coveredBoxes.uncoveredAssets?.nativeToken.toString()}`,
      );
    }

    // create MTX and add inputs
    const mtx = new MTX();
    coveredBoxes.boxes.forEach((box: HandshakeUtxo) => {
      const coin = Coin.fromJSON({
        version: 0,
        height: -1,
        value: Number(box.value),
        address: this.lockAddress.toString(),
        coinbase: false,
        hash: box.txId,
        index: Number(box.index),
      });
      mtx.addCoin(coin);
    });

    // Calculate total input
    let remainingHns = coveredBoxes.boxes.reduce(
      (a: bigint, b: HandshakeUtxo) => a + b.value,
      0n,
    );
    this.logger.debug(`Input HNS: ${remainingHns}`);

    // add outputs
    order.forEach((order) => {
      if (order.extra) {
        throw Error('Handshake does not support extra data in payment order');
      }
      if (order.assets.tokens.length) {
        throw Error('Handshake does not support tokens in payment order');
      }

      const orderHns = this.unwrapHns(order.assets.nativeToken).amount;
      remainingHns -= orderHns;

      const orderValue = Number(orderHns);

      // create order output
      const recipientAddress = Address.fromString(order.address);
      mtx.addOutput({
        address: recipientAddress,
        value: orderValue,
      });
    });

    // Add placeholder change output
    mtx.addOutput({
      address: this.lockAddress,
      value: 0,
    });

    // Estimate fee for final signed transaction with expected witness shape.
    const feeEstimationTx = this.withWitnessForFeeEstimation(mtx);
    const estimatedFee = estimateTxFee(feeEstimationTx, feeRatio);
    this.logger.debug(
      `Estimated Fee: ${estimatedFee} (tx size: ${feeEstimationTx.getSize()} bytes, fee ratio: ${feeRatio})`,
    );

    remainingHns -= estimatedFee;

    // IMPORTANT: Ensure remainingHns is positive and safe to convert to Number
    if (remainingHns < BigInt(MINIMUM_UTXO_VALUE)) {
      throw new Error(
        `Insufficient funds: remaining HNS cannot cover minimum UTxO value and estimated fee`,
      );
    }
    if (remainingHns > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(
        `Change amount too large for safe Number conversion: ${remainingHns}`,
      );
    }

    const changeValue = Number(remainingHns);
    this.logger.debug(`Change output: ${remainingHns} dollarydoos`);

    // Update change output with final amount
    mtx.outputs[mtx.outputs.length - 1].value = changeValue;

    // create the transaction
    const txId = mtx.txid();
    const txBytes = Serializer.serialize(mtx);

    const handshakeTx = new HandshakeTransaction(
      txId,
      eventId,
      txBytes,
      txType,
      coveredBoxes.boxes.map((box: HandshakeUtxo) => JsonBigInt.stringify(box)),
    );

    this.logger.info(
      `Handshake transaction [${txId}] as type [${txType}] generated for event [${eventId}]`,
    );
    return [handshakeTx];
  };

  /**
   * gets input and output assets of a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns an object containing the amount of input and output assets
   */
  getTransactionAssets = async (
    transaction: PaymentTransaction,
  ): Promise<TransactionAssetBalance> => {
    const handshakeTx = transaction as HandshakeTransaction;

    let txHns = 0n;
    const inputUtxos = Array.from(new Set(handshakeTx.inputUtxos));
    for (let i = 0; i < inputUtxos.length; i++) {
      const input = JsonBigInt.parse(inputUtxos[i]) as HandshakeUtxo;
      txHns += BigInt(input.value);
    }

    const wrappedValue = this.wrapHns(txHns).amount;
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
   * extracts payment order of a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns the transaction payment order (list of single payments)
   */
  extractTransactionOrder = (transaction: PaymentTransaction): PaymentOrder => {
    const mtx = Serializer.deserialize(transaction.txBytes);
    const order: PaymentOrder = [];

    for (let i = 0; i < mtx.outputs.length; i++) {
      const output = mtx.outputs[i];
      const outputAddress = output.getAddress();

      // skip change box (last box & address equal to lock address)
      if (
        i === mtx.outputs.length - 1 &&
        outputAddress &&
        outputAddress.toString() === this.lockAddress.toString()
      ) {
        continue;
      }

      if (!outputAddress) {
        throw new Error(
          `Handshake output at index [${i}] has no address and cannot be extracted into payment order`,
        );
      }

      const payment: SinglePayment = {
        address: outputAddress.toString(),
        assets: {
          nativeToken: this.wrapHns(BigInt(output.value)).amount,
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
    const mtx = Serializer.deserialize(transaction.txBytes);
    const handshakeTx = transaction as HandshakeTransaction;

    let inHns = 0n;
    const inputUtxos = Array.from(new Set(handshakeTx.inputUtxos));
    for (let i = 0; i < inputUtxos.length; i++) {
      const input = JsonBigInt.parse(inputUtxos[i]) as HandshakeUtxo;
      inHns += BigInt(input.value);
    }

    let outHns = 0n;
    for (let i = 0; i < mtx.outputs.length; i++) {
      const output = mtx.outputs[i];
      outHns += BigInt(output.value);
    }

    const fee = inHns - outHns;
    const estimatedFee = estimateTxFee(
      this.withWitnessForFeeEstimation(mtx),
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
    // Handshake has no token and HNS cannot be burned
    return true;
  };

  /**
   * verifies additional conditions for a HandshakeTransaction
   * - check all output covenants are NONE
   * - check change box
   * @param transaction the PaymentTransaction
   * @param signingStatus the signing status of transaction
   * @returns true if the transaction is verified
   */
  verifyTransactionExtraConditions = (
    transaction: PaymentTransaction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    signingStatus: SigningStatus = SigningStatus.UnSigned,
  ): boolean => {
    const mtx = Serializer.deserialize(transaction.txBytes);

    if (mtx.outputs.some((output) => output.covenant.type !== 0)) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: Output covenant is not NONE`,
      );
      return false;
    }

    // check change box
    const changeBoxIndex = mtx.outputs.length - 1;
    const changeBox = mtx.outputs[changeBoxIndex];
    const changeAddress = changeBox.getAddress();

    if (
      !changeAddress ||
      changeAddress.toString() !== this.lockAddress.toString()
    ) {
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
   * @param blockInfo
   * @returns true if the transaction is verified
   */
  verifyLockTransactionExtraConditions = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transaction: HandshakeTx,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blockInfo: BlockInfo,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    signingStatus: SigningStatus = SigningStatus.Signed,
  ): Promise<ValidityStatus> => {
    const mtx = Serializer.deserialize(transaction.txBytes);
    for (let i = 0; i < mtx.inputs.length; i++) {
      const boxId = getInputBoxId(mtx.inputs[i]);
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
   * requests the corresponding signer service to sign the transaction
   * @param transaction the transaction
   * @param requiredSign the required number of sign
   * @returns the signed transaction
   */
  signTransaction = async (
    transaction: PaymentTransaction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requiredSign: number,
  ): Promise<PaymentTransaction> => {
    const mtx = Serializer.deserialize(transaction.txBytes);
    const handshakeTx = transaction as HandshakeTransaction;

    // Add UTXO information to the MTX view for signature hash calculation
    const coins: HsdCoin[] = [];
    for (let i = 0; i < handshakeTx.inputUtxos.length; i++) {
      const input = JsonBigInt.parse(
        handshakeTx.inputUtxos[i],
      ) as HandshakeUtxo;
      const coin = Coin.fromJSON({
        version: 0,
        height: -1,
        value: Number(BigInt(input.value)),
        address: this.lockAddress.toString(),
        coinbase: false,
        hash: String(input.txId),
        index: Number(input.index),
      });
      mtx.view.addCoin(coin);
      coins.push(coin);
    }

    const signaturePromises: Promise<string>[] = [];
    for (let i = 0; i < handshakeTx.inputUtxos.length; i++) {
      // Create signing hash for this input
      const coin = coins[i];
      // For P2WPKH TSS, use the P2PKH script for signature hash calculation
      const scriptCode = Script.decode(this.lockScript);
      const value = coin.value;
      const type = 0x01; // SIGHASH_ALL

      const signMessage = mtx.signatureHash(i, scriptCode, value, type);

      const signatureHex = this.signMediator
        .sign(signMessage)
        .then((response) => {
          this.logger.debug(
            `Input [${i}] of tx [${handshakeTx.txId}] is signed. signature: ${response.signature}`,
          );
          return response.signature;
        });
      signaturePromises.push(signatureHex);
    }

    const signatures = await Promise.all(signaturePromises);
    const signedMtx = this.buildSignedTransaction(
      transaction.txBytes,
      signatures,
    );

    // generate PaymentTransaction with signed MTX
    return new HandshakeTransaction(
      handshakeTx.txId,
      handshakeTx.eventId,
      Serializer.serialize(signedMtx),
      handshakeTx.txType,
      handshakeTx.inputUtxos,
    );
  };

  /**
   * submits a transaction to the blockchain
   * @param transaction the transaction
   */
  submitTransaction = async (
    transaction: PaymentTransaction,
  ): Promise<void> => {
    const mtx = Serializer.deserialize(transaction.txBytes);

    try {
      await this.network.submitTransaction(mtx);
      this.logger.info(
        `Handshake Transaction [${transaction.txId}] submitted successfully`,
      );
    } catch (e) {
      this.logger.warn(
        `An error occurred while submitting Handshake transaction [${transaction.txId}]: ${e}`,
      );
      if (e instanceof Error && e.stack) {
        this.logger.warn(e.stack);
      }
    }
  };

  /**
   * checks if a transaction is currently being signed
   * @param transaction the transaction
   * @returns true if at least one input is being signed
   */
  isTransactionInSign = async (
    transaction: PaymentTransaction,
  ): Promise<boolean> => {
    const mtx = Serializer.deserialize(transaction.txBytes);
    const handshakeTx = transaction as HandshakeTransaction;

    const signStatuses: boolean[] = [];
    for (let i = 0; i < handshakeTx.inputUtxos.length; i++) {
      const input = JsonBigInt.parse(
        handshakeTx.inputUtxos[i],
      ) as HandshakeUtxo;

      // Recreate the coin for signature hash calculation
      const coin = Coin.fromJSON({
        version: 0,
        height: -1,
        value: Number(input.value),
        address: this.lockAddress.toString(),
        coinbase: false,
        hash: input.txId,
        index: Number(input.index),
      });

      // For P2WPKH TSS, use the P2PKH script for signature hash calculation
      const scriptCode = Script.decode(this.lockScript);
      const value = coin.value;
      const type = 0x01; // SIGHASH_ALL

      const signMessage = mtx.signatureHash(i, scriptCode, value, type);

      const isInSign = await this.signMediator.isInSign(signMessage);
      signStatuses.push(isInSign);
    }

    return signStatuses.some((status) => status);
  };

  /**
   * checks if a transaction is in mempool
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
  PaymentTransactionFromJson = (jsonString: string): HandshakeTransaction =>
    HandshakeTransaction.fromJson(jsonString);

  /**
   * generates PaymentTransaction object from raw MTX hex string
   * @param mtxHex
   * @returns PaymentTransaction object
   */
  rawTxToPaymentTransaction = async (
    mtxHex: string,
  ): Promise<PaymentTransaction> => {
    const mtx = MTX.fromRaw(Buffer.from(mtxHex, 'hex'));
    const txBytes = Serializer.serialize(mtx);
    const txId = mtx.txid();

    const inputBoxes: Array<HandshakeUtxo> = [];
    const inputs = mtx.inputs;
    for (let i = 0; i < inputs.length; i++) {
      const boxId = getInputBoxId(inputs[i]);
      inputBoxes.push(await this.network.getUtxo(boxId));
    }

    const handshakeTx = new HandshakeTransaction(
      txId,
      '',
      txBytes,
      TransactionType.manual,
      inputBoxes.map((box) => JsonBigInt.stringify(box)),
    );

    this.logger.info(`Parsed Handshake transaction [${txId}] successfully`);
    return handshakeTx;
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
  ): Promise<Map<string, HandshakeUtxo | undefined>> => {
    // chaining transaction won't be done in HandshakeChain
    // due to heavy size of transactions in mempool
    return new Map<string, HandshakeUtxo | undefined>();
  };

  /**
   * generates mapping from input box id to serialized string of output box (filtered by address, containing the token)
   * @param txs list of transactions
   * @param address the address
   * @returns a Map from input box id to output box
   */
  protected getTransactionsBoxMapping = (
    txs: HsdMTX[],
    address: string,
  ): Map<string, HandshakeUtxo | undefined> => {
    const trackMap = new Map<string, HandshakeUtxo | undefined>();

    txs.forEach((mtx) => {
      const txId = mtx.txid();
      mtx.inputs.forEach((input: HsdInput) => {
        let trackedBox: HandshakeUtxo | undefined = undefined;
        let index = 0;
        for (index = 0; index < mtx.outputs.length; index++) {
          const output = mtx.outputs[index];
          const outputAddress = output.getAddress();
          // check if box satisfies address condition
          if (!outputAddress || outputAddress.toString() !== address) continue;

          trackedBox = {
            txId: txId,
            index: index,
            value: BigInt(output.value),
          };
          break;
        }

        const boxId = getInputBoxId(input);
        trackMap.set(boxId, trackedBox);
      });
    });

    return trackMap;
  };

  /**
   * Adds a deterministic dummy witness for unsigned inputs so fee estimation
   * reflects post-signing virtual size.
   */
  protected withWitnessForFeeEstimation = (mtx: HsdMTX): HsdMTX => {
    const feeMtx = mtx.clone();
    const dummyWitness = new Script();

    // TSS signature (64) + SIGHASH_ALL (1) => 65 bytes.
    dummyWitness.pushData(Buffer.alloc(WITNESS_SIGNATURE_SIZE, 0));
    dummyWitness.pushData(Buffer.from(this.configs.aggregatedPublicKey, 'hex'));
    dummyWitness.compile();

    const witnessStack = dummyWitness.toStack();
    for (let i = 0; i < feeMtx.inputs.length; i++) {
      feeMtx.inputs[i].witness.fromStack(witnessStack);
    }

    return feeMtx;
  };

  /**
   * inserts signatures into MTX using TSS aggregated signature
   *
   * Uses threshold signature scheme (TSS) similar to Doge/Bitcoin chains:
   * - Single aggregated signature per input (not multiple individual signatures)
   * - Signature validates against the aggregated public key
   * - Witness structure: [signature, publicKey] for P2WPKH-like validation
   *
   * @param txBytes serialized transaction
   * @param signatures generated signatures by signer service (one aggregated signature per input from TSS)
   * @returns a signed transaction (in MTX format)
   */
  protected buildSignedTransaction = (
    txBytes: Uint8Array,
    signatures: string[], // one aggregated signature per input
  ): HsdMTX => {
    const mtx = MTX.fromRaw(Buffer.from(txBytes));

    for (let i = 0; i < signatures.length; i++) {
      const sigHex = signatures[i];

      if (
        sigHex.length !== TSS_SIGNATURE_SIZE * 2 ||
        sigHex.length % 2 !== 0 ||
        !/^[0-9a-fA-F]+$/.test(sigHex)
      ) {
        throw new Error(
          `Invalid TSS signature format for input [${i}]: expected ${TSS_SIGNATURE_SIZE}-byte hex signature.`,
        );
      }

      const signatureBody = Buffer.from(sigHex, 'hex');
      if (signatureBody.length !== TSS_SIGNATURE_SIZE) {
        throw new Error(
          `Invalid TSS signature size for input [${i}]: expected ${TSS_SIGNATURE_SIZE} bytes, got ${signatureBody.length}.`,
        );
      }

      const witness = new Script();

      // Append SIGHASH_ALL (0x01) to the aggregated signature
      const signature = Buffer.concat([signatureBody, Buffer.from([0x01])]);

      // Push aggregated signature
      witness.pushData(signature);

      // Push aggregated public key (from TSS)
      witness.pushData(Buffer.from(this.configs.aggregatedPublicKey, 'hex'));

      witness.compile();

      mtx.inputs[i].witness.fromStack(witness.toStack());
    }

    return mtx;
  };

  /**
   * serializes the transaction of this chain into string
   */
  protected serializeTx = (tx: HandshakeTx): string => JsonBigInt.stringify(tx);

  /**
   * wraps hns amount
   * @param amount
   */
  protected wrapHns = (amount: bigint): RosenAmount =>
    this.tokenMap.wrapAmount(this.NATIVE_TOKEN_ID, amount, this.CHAIN);

  /**
   * unwraps hns amount
   * @param amount
   */
  protected unwrapHns = (amount: bigint): RosenAmount =>
    this.tokenMap.unwrapAmount(this.NATIVE_TOKEN_ID, amount, this.CHAIN);

  /**
   * verifies consistency within the PaymentTransaction object
   * @param transaction the PaymentTransaction
   * @returns true if the transaction is verified
   */
  verifyPaymentTransaction = async (
    transaction: PaymentTransaction,
  ): Promise<boolean> => {
    const mtx = Serializer.deserialize(transaction.txBytes);
    const handshakeTx = transaction as HandshakeTransaction;
    const baseError = `Tx [${transaction.txId}] is not verified: `;

    // verify txId
    const txId = mtx.txid();
    if (transaction.txId !== txId) {
      this.logger.warn(
        baseError +
          `Transaction id is inconsistent (expected [${transaction.txId}] found [${txId}])`,
      );
      return false;
    }

    // verify inputUtxos
    if (handshakeTx.inputUtxos.length !== mtx.inputs.length) {
      this.logger.warn(
        baseError +
          `HandshakeTransaction object input counts is inconsistent [${handshakeTx.inputUtxos.length} != ${mtx.inputs.length}]`,
      );
      return false;
    }
    for (let i = 0; i < mtx.inputs.length; i++) {
      const input = mtx.inputs[i];
      const actualInputId = getInputBoxId(input);
      const handshakeInput = JsonBigInt.parse(
        handshakeTx.inputUtxos[i],
      ) as HandshakeUtxo;
      const expectedId = `${handshakeInput.txId}.${handshakeInput.index}`;
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
}

export default HandshakeChain;
