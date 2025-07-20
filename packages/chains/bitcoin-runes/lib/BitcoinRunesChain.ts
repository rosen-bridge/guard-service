import * as runelib from '@magiceden-oss/runestone-lib';
import { Psbt, Transaction, address, payments, script } from 'bitcoinjs-lib';
import {
  AbstractUtxoChain,
  AssetBalance,
  BlockInfo,
  ChainUtils,
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
  BITCOIN_CHAIN,
  BTC,
  getPsbtTxInputBoxId,
  SEGWIT_INPUT_WEIGHT_UNIT,
} from '@rosen-chains/bitcoin';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { BitcoinRunesBoxSelection } from '@rosen-bridge/bitcoin-runes-utxo-selection';
import { RunesRosenExtractor } from '@rosen-bridge/rosen-extractor';
import { RosenAmount, TokenMap } from '@rosen-bridge/tokens';
import BitcoinRunesTransaction from './BitcoinRunesTransaction';
import {
  BitcoinRunesConfigs,
  BitcoinRunesTx,
  BitcoinRunesUtxo,
  TssSignFunction,
} from './types';
import { BITCOIN_RUNES_CHAIN, OP_RETURN_OPCODE } from './constants';
import Serializer from './Serializer';
import AbstractBitcoinRunesNetwork from './network/AbstractBitcoinRunesNetwork';
import {
  generateAssetId,
  generateFeeEstimatorWithAssumptions,
  generateFeeEstimatorWithPsbt,
} from './utils';

class BitcoinRunesChain extends AbstractUtxoChain<
  BitcoinRunesTx,
  BitcoinRunesUtxo
> {
  declare network: AbstractBitcoinRunesNetwork;
  declare configs: BitcoinRunesConfigs;
  CHAIN = BITCOIN_RUNES_CHAIN;
  NATIVE_TOKEN_ID = BTC;
  extractor: RunesRosenExtractor;
  protected boxSelection: BitcoinRunesBoxSelection;
  protected signFunction: TssSignFunction;
  protected lockScript: string;
  protected signingScript: Buffer;

  constructor(
    network: AbstractBitcoinRunesNetwork,
    configs: BitcoinRunesConfigs,
    tokens: TokenMap,
    signFunction: TssSignFunction,
    logger?: AbstractLogger
  ) {
    super(network, configs, tokens, logger);
    this.extractor = new RunesRosenExtractor(
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
    this.boxSelection = new BitcoinRunesBoxSelection();
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
  ): Promise<BitcoinRunesTransaction[]> => {
    this.logger.debug(
      `Generating Bitcoin Runes transaction for Order: ${JsonBigInt.stringify(
        order
      )}`
    );
    const feeRatio = await this.network.getFeeRatio();

    // calculate required assets
    const minUtxoValue = this.wrapBtc(
      this.minimumMeaningfulSatoshi(feeRatio)
    ).amount;
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
      // values are wrapped here (TODO: local:ergo/rosen-bridge/rosen-chains#169)
      const neededBtc = requiredAssets.nativeToken;
      const neededRunes = JsonBigInt.stringify(requiredAssets.tokens);
      throw new NotEnoughAssetsError(
        `Locked assets cannot cover required assets. BTC: ${neededBtc}, Runes: ${neededRunes}`
      );
    }

    // generate psbt and runestone
    const psbt = new Psbt();
    const edicts: runelib.RunestoneSpec['edicts'] = [];

    // check order
    if (order.length > 1) {
      throw Error(`Bitcoin Runes currently supports single payment only`);
    }
    const isFirstOutputNativeSegwit = address
      .toOutputScript(order[0].address)
      .toString('hex')
      .startsWith('0014');

    // add outputs
    for (let i = 0; i < order.length; i++) {
      const payment = order[i];
      if (payment.extra) {
        throw Error(
          'Bitcoin Runes does not support extra data in payment order'
        );
      }
      const outputAddressPrefix = payment.address.slice(0, 4);
      if (outputAddressPrefix !== 'bc1q' && outputAddressPrefix !== 'bc1p') {
        throw Error(
          'Bitcoin Runes supports payments only to native-segwit or taproot addresses'
        );
      }

      // create order output
      psbt.addOutput({
        script: address.toOutputScript(payment.address),
        value: Number(this.unwrapBtc(payment.assets.nativeToken).amount),
      });

      // add runes transfer to edicts list
      payment.assets.tokens.forEach((token) => {
        const [blockId, txIndex] = token.id.split(':');
        edicts.push({
          id: {
            block: BigInt(blockId),
            tx: Number(txIndex),
          },
          amount: this.tokenMap.unwrapAmount(token.id, token.value, this.CHAIN)
            .amount,
          output: i,
        });
      });
    }

    // generate runes data and add OP_RETURN output
    // TODO: the runestone will be modified later and new edicts will be added (local:ergo/rosen-bridge/rosen-chains#170)
    const draftRunestone = runelib.encodeRunestone({
      edicts: edicts,
      pointer: order.length + 1, // the 2nd output after the last target output (1st one is OP_RETURN)
    });

    // generate utxo-selection parameters
    const forbiddenBoxIds = unsignedTransactions.flatMap((paymentTx) =>
      Serializer.deserialize(paymentTx.txBytes).txInputs.map(
        getPsbtTxInputBoxId
      )
    );
    // since the input utxo should be confirmed for the purpose of runes verification, the transaction chaining is disabled
    const trackMap = new Map();
    // also all inputs of signed transaction are also marked as forbidden boxes
    forbiddenBoxIds.push(
      ...serializedSignedTransactions.flatMap((serializedSignedTx) =>
        Psbt.fromHex(serializedSignedTx).txInputs.map(getPsbtTxInputBoxId)
      )
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
    const estimateFee = generateFeeEstimatorWithAssumptions(
      isFirstOutputNativeSegwit,
      draftRunestone.encodedRunestone.length,
      feeRatio
    );

    // fetch input boxes
    const unwrappedRequiredAssets = this.unwrapAssetBalance(requiredAssets);
    const coveredBoxes = await this.boxSelection.getCoveringBoxes(
      unwrappedRequiredAssets,
      forbiddenBoxIds,
      trackMap,
      utxoIterator,
      this.minimumMeaningfulSatoshi(feeRatio),
      this.configs.maxRunesPerUtxo,
      estimateFee
    );
    if (!coveredBoxes.covered) {
      throw new NotEnoughValidBoxesError(
        `Available boxes didn't cover required assets. Required assets: ${JsonBigInt.stringify(
          unwrappedRequiredAssets
        )}`
      );
    }

    // add inputs
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

    const changeOutputs: Array<Parameters<typeof psbt.addOutput>[0]> = [];
    const firstChangeOutputIndex = order.length + 1;
    for (let i = 0; i < coveredBoxes.additionalAssets.list.length; i++) {
      const balance = coveredBoxes.additionalAssets.list[i];
      // generate change output
      changeOutputs.push({
        script: Buffer.from(this.lockScript, 'hex'),
        value: Number(balance.nativeToken),
      });
      // add change runes to edicts list
      balance.tokens.forEach((token) => {
        const [blockId, txIndex] = token.id.split(':');
        edicts.push({
          id: {
            block: BigInt(blockId),
            tx: Number(txIndex),
          },
          amount: this.tokenMap.unwrapAmount(token.id, token.value, this.CHAIN)
            .amount,
          output: firstChangeOutputIndex + i,
        });
      });
    }

    // add OP_RETURN output
    const runestone = runelib.encodeRunestone({
      edicts: edicts,
      pointer: order.length + 1, // the 2nd output after the last target output (1st one is OP_RETURN)
    });
    psbt.addOutput({
      script: runestone.encodedRunestone,
      value: 0,
    });

    // add change outputs
    changeOutputs.forEach((output) => psbt.addOutput(output));

    // log fee data
    const usedFee = coveredBoxes.additionalAssets.fee;
    const estimatedFee = generateFeeEstimatorWithPsbt(psbt, feeRatio)(
      coveredBoxes.boxes,
      changeOutputs.length
    );
    const txId = Transaction.fromBuffer(psbt.data.getTransaction()).getId();
    this.logger.debug(
      `Fee data for tx [${txId}]: [used: ${usedFee}, estimated: ${estimatedFee}]`
    );

    // create the transaction
    const txBytes = Serializer.serialize(psbt);
    const bitcoinTx = new BitcoinRunesTransaction(
      txId,
      eventId,
      txBytes,
      txType,
      coveredBoxes.boxes.map((box) => JsonBigInt.stringify(box))
    );

    this.logger.info(
      `Bitcoin Runes transaction [${txId}] as type [${txType}] generated for event [${eventId}]`
    );
    return [bitcoinTx];
  };

  /**
   * gets input and output assets of a PaymentTransaction
   *
   * Note: this function is not used anywhere. Thus, is unnecessary
   * @param transaction the PaymentTransaction
   * @returns an object containing the amount of input and output assets
   */
  getTransactionAssets = async (
    transaction: PaymentTransaction
  ): Promise<TransactionAssetBalance> => {
    throw Error(
      `The "getTransactionAssets" is not implemented for "BitcoinRunesChain" and should not be used!`
    );
  };

  /**
   * extracts payment order of a PaymentTransaction
   *
   * Note: this function assumes that input and edicted runes are equal (make sure to call `verifyPaymentTransaction` before calling this function as it does this verification)
   *
   * Note: **this function only includes the edicts in the order and skips the Runes transferred by Runestone pointer**
   *
   * Note: **this function assumes all boxes after OP_RETURN are change box and does not include them in the order**
   * @param transaction the PaymentTransaction
   * @returns the transaction payment order (list of single payments)
   */
  extractTransactionOrder = (transaction: PaymentTransaction): PaymentOrder => {
    const psbt = Serializer.deserialize(transaction.txBytes);
    const bitcoinTx = transaction as BitcoinRunesTransaction;

    // extract BTC transfer
    const order: PaymentOrder = [];
    for (let i = 0; i < psbt.txOutputs.length; i++) {
      const output = psbt.txOutputs[i];

      // skip OP_RETURN and next boxes
      if (output.script.toString('hex').startsWith(OP_RETURN_OPCODE)) break;

      const payment: SinglePayment = {
        address: address.fromOutputScript(output.script),
        assets: {
          nativeToken: this.wrapBtc(BigInt(output.value)).amount,
          tokens: [],
        },
      };
      order.push(payment);
    }

    // parse runestone
    const rawTx = psbt.data.getTransaction();
    const artifact = runelib.tryDecodeRunestone({
      vout: Transaction.fromBuffer(rawTx).outs.map((out) => ({
        scriptPubKey: { hex: out.script.toString('hex') },
      })),
    });

    if (artifact === null) {
      this.logger.warn(
        `Skipping Runes transfer of tx [${transaction.txId}] while extracting order: Runestone is null`
      );
      return order;
    }

    if (!runelib.isRunestone(artifact)) {
      const cenotaph: runelib.Cenotaph = artifact;
      this.logger.warn(
        `no Runes is transferred in tx [${
          transaction.txId
        }] since Runestone is cenotaph! Flaws: ${JSON.stringify(
          cenotaph.flaws
        )}`
      );
      return order;
    }
    const stone: runelib.RunestoneSpec = artifact;

    // calculate input assets
    let inputAssets: AssetBalance = {
      nativeToken: 0n,
      tokens: [],
    };
    const inputUtxos = Array.from(new Set(bitcoinTx.inputUtxos));
    for (let i = 0; i < inputUtxos.length; i++) {
      const input = JsonBigInt.parse(inputUtxos[i]) as BitcoinRunesUtxo;
      const inputBalance: AssetBalance = {
        nativeToken: input.value,
        tokens: input.runes.map((rune) => ({
          id: rune.runeId,
          value: rune.quantity,
        })),
      };
      inputAssets = ChainUtils.sumAssetBalance(inputAssets, inputBalance);
    }

    // extract runes transfer (parse edicts)
    for (const edict of stone.edicts ?? []) {
      // skip edict with invalid output index or pointing to change box
      if (edict.output > order.length) continue;

      // skip edict pointing to OP_RETURN
      const pointedOutputScript =
        psbt.txOutputs[edict.output].script.toString('hex');
      if (pointedOutputScript.startsWith(OP_RETURN_OPCODE)) continue;

      const tokenId = generateAssetId(edict.id.block, edict.id.tx);
      const tokenIndex = order[edict.output].assets.tokens.findIndex(
        (token) => token.id === tokenId
      );
      const value = this.tokenMap.wrapAmount(
        tokenId,
        edict.amount,
        this.CHAIN
      ).amount;
      if (tokenIndex === -1)
        order[edict.output].assets.tokens.push({
          id: tokenId,
          value: value,
        });
      else order[edict.output].assets.tokens[tokenIndex].value += value;
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
    const bitcoinTx = transaction as BitcoinRunesTransaction;

    const inputUtxos = Array.from(new Set(bitcoinTx.inputUtxos)).map(
      (serializedUtxo) => JsonBigInt.parse(serializedUtxo) as BitcoinRunesUtxo
    );
    const inBtc = inputUtxos
      .map((input) => input.value)
      .reduce((sum, value) => sum + value, 0n);

    let outBtc = 0n;
    for (let i = 0; i < tx.txOutputs.length; i++) {
      const output = tx.txOutputs[i];
      outBtc += BigInt(output.value);
    }

    const fee = inBtc - outBtc;
    const estimateFee = generateFeeEstimatorWithPsbt(
      tx,
      await this.network.getFeeRatio()
    );
    const estimatedFee = estimateFee(
      inputUtxos, // selected inputs
      tx.txOutputs.length - 2 // 1 OP_RETURN + 1 target utxo, others are change boxes
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
   * - Runestone should not be cenotaph
   * - Runestone pointer should not point to OP_RETURN
   * - No Runes should be edicted to OP_RETURN
   * @param transaction the PaymentTransaction
   * @returns true if no token burned
   */
  verifyNoTokenBurned = async (
    transaction: PaymentTransaction
  ): Promise<boolean> => {
    const psbt = Serializer.deserialize(transaction.txBytes);
    const rawTx = psbt.data.getTransaction();
    const artifact = runelib.tryDecodeRunestone({
      vout: Transaction.fromBuffer(rawTx).outs.map((out) => ({
        scriptPubKey: { hex: out.script.toString('hex') },
      })),
    });

    if (artifact === null) {
      this.logger.warn(
        `Skipping "NoTokenBurned" verification for tx [${transaction.txId}]: Runestone is null`
      );
      return true;
    }
    const baseError = `Tx [${transaction.txId}] is not verified: `;

    if (!runelib.isRunestone(artifact)) {
      const cenotaph: runelib.Cenotaph = artifact;
      this.logger.warn(
        baseError +
          `Runestone is cenotaph! Flaws: ${JSON.stringify(cenotaph.flaws)}`
      );
      return false;
    }
    // Runestone pointer should not point to OP_RETURN
    const stone: runelib.RunestoneSpec = artifact;
    const pointer = stone.pointer;
    if (pointer !== undefined) {
      if (pointer < psbt.txOutputs.length) {
        const pointedOutputScript =
          psbt.txOutputs[pointer].script.toString('hex');
        if (pointedOutputScript.startsWith(OP_RETURN_OPCODE)) {
          this.logger.warn(
            baseError +
              `Runestone points to index [${pointer}] which is OP_RETURN with script [${pointedOutputScript}]`
          );
          return false;
        }
      } else {
        this.logger.warn(
          baseError +
            `Runestone is cenotaph, since pointer is out of bound [${psbt.txOutputs.length} <= ${pointer}]`
        );
        return false;
      }
    }

    if (stone.edicts === undefined) {
      this.logger.warn(
        `Skipping "NoTokenBurned" verification for tx [${transaction.txId}]: Runestone has no edicts`
      );
      return true;
    }

    // No Runes should be edicted to OP_RETURN
    for (let i = 0; i < stone.edicts.length; i++) {
      const edict = stone.edicts[i];
      if (edict.output < psbt.txOutputs.length) {
        const pointedOutputScript =
          psbt.txOutputs[edict.output].script.toString('hex');
        if (pointedOutputScript.startsWith(OP_RETURN_OPCODE)) {
          this.logger.warn(
            baseError +
              `Runestone edicts to index [${edict.output}] which is OP_RETURN with script [${pointedOutputScript}]`
          );
          return false;
        }
      } else {
        this.logger.warn(
          baseError +
            `Runestone is cenotaph, since edict[${i}] output is out of bound [${psbt.txOutputs.length} <= ${edict.output}]`
        );
        return false;
      }
    }

    return true;
  };

  /**
   * verifies additional conditions for a BitcoinRunesTransaction
   * - check change box
   * - check Runestone
   *   - Runestone should be defined
   *   - Runestone should not be a cenotaph
   *   - pointer should be defined and point to the changebox
   *   - no edict should be redundant
   * @param transaction the PaymentTransaction
   * @param signingStatus the signing status of transaction
   * @returns true if the transaction is verified
   */
  verifyTransactionExtraConditions = (
    transaction: PaymentTransaction,
    signingStatus: SigningStatus = SigningStatus.UnSigned
  ): boolean => {
    const psbt = Serializer.deserialize(transaction.txBytes);
    const baseError = `Tx [${transaction.txId}] is not verified: `;

    // check change boxes
    let i = 0;
    for (i = psbt.txOutputs.length - 1; i >= 0; i--) {
      // change and payment utxos are splitted by an OP_RETURN box
      if (psbt.txOutputs[i].script.toString('hex').startsWith(OP_RETURN_OPCODE))
        break;

      const changeBox = psbt.txOutputs[i];
      if (changeBox.script.toString('hex') !== this.lockScript) {
        this.logger.warn(
          baseError + `Address of change box at index [${i}] is wrong`
        );
        return false;
      }
    }
    const firstChangeBoxIndex = i + 1;

    // check Runestone
    const rawTx = psbt.data.getTransaction();
    const artifact = runelib.tryDecodeRunestone({
      vout: Transaction.fromBuffer(rawTx).outs.map((out) => ({
        scriptPubKey: { hex: out.script.toString('hex') },
      })),
    });

    //-- Runestone should be defined
    if (artifact === null) {
      this.logger.warn(baseError + `Runestone is null`);
      return false;
    }

    //-- Runestone should not be a cenotaph
    if (!runelib.isRunestone(artifact)) {
      const cenotaph: runelib.Cenotaph = artifact;
      this.logger.warn(
        baseError +
          `Runestone is cenotaph! Flaws: ${JSON.stringify(cenotaph.flaws)}`
      );
      return false;
    }

    //-- pointer should be defined and point to the changebox
    const stone: runelib.RunestoneSpec = artifact;
    const pointer = stone.pointer;
    if (pointer === undefined) {
      this.logger.warn(baseError + `Runestone pointer is undefined`);
      return false;
    }
    if (pointer !== firstChangeBoxIndex) {
      this.logger.warn(
        baseError +
          `Runestone pointer is not pointing to the first changebox [expected ${firstChangeBoxIndex}, found ${pointer}]`
      );
      return false;
    }

    //-- no edict should be redundant
    if (stone.edicts === undefined) {
      this.logger.warn(baseError + `Runestone edicts is undefined`);
      return false;
    }
    const edictsLength = stone.edicts.length;
    for (let i = 0; i < edictsLength - 1; i++) {
      for (let j = i + 1; j < edictsLength; j++) {
        if (
          stone.edicts[i].id.block === stone.edicts[j].id.block &&
          stone.edicts[i].id.tx === stone.edicts[j].id.tx &&
          stone.edicts[i].output === stone.edicts[j].output
        ) {
          this.logger.warn(
            baseError +
              `Runestone has redundant edict: edicts at [${i}] and [${j}] can be merged since they are both Rune [${stone.edicts[i].id.block}:${stone.edicts[i].id.tx}] targeted to output [${stone.edicts[i].output}]`
          );
          return false;
        }
      }
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
    transaction: BitcoinRunesTx,
    blockInfo: BlockInfo
  ): Promise<boolean> => {
    // no extra condition for runes lock transactions
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
      const boxId = getPsbtTxInputBoxId(tx.txInputs[i]);
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
    transaction: PaymentTransaction,
    requiredSign: number
  ): Promise<PaymentTransaction> => {
    const psbt = Serializer.deserialize(transaction.txBytes);
    const tx = Transaction.fromBuffer(psbt.data.getTransaction());
    const bitcoinTx = transaction as BitcoinRunesTransaction;

    const signaturePromises: Promise<string>[] = [];
    for (let i = 0; i < bitcoinTx.inputUtxos.length; i++) {
      const input = JsonBigInt.parse(
        bitcoinTx.inputUtxos[i]
      ) as BitcoinRunesUtxo;
      const signMessage = tx.hashForWitnessV0(
        i,
        this.signingScript,
        Number(input.value),
        Transaction.SIGHASH_ALL
      );

      const signatureHex = this.signFunction(signMessage).then((response) => {
        this.logger.debug(
          `Input [${i}] of tx [${bitcoinTx.txId}] is signed. signature: ${response.signature}`
        );
        return response.signature;
      });
      signaturePromises.push(signatureHex);
    }

    return Promise.all(signaturePromises).then((signatures) => {
      const signedPsbt = this.buildSignedTransaction(
        bitcoinTx.txBytes,
        signatures
      );
      // check if transaction can be finalized
      signedPsbt.finalizeAllInputs().extractTransaction();

      // generate PaymentTransaction with signed Psbt
      return new BitcoinRunesTransaction(
        bitcoinTx.txId,
        bitcoinTx.eventId,
        Serializer.serialize(signedPsbt),
        bitcoinTx.txType,
        bitcoinTx.inputUtxos
      );
    });
  };

  /**
   * gets the amount of each asset in the address
   *
   * Note: Overriding `AbstractChain.getAddressAssets`, since native token is BTC and
   * should wrap it with BITCOIN_CHAIN
   * @param address
   * @param tokenIds
   * @returns an object containing the amount of each asset
   */
  getAddressAssets = async (
    address: string,
    tokenIds?: string[]
  ): Promise<AssetBalance> => {
    if (address === '') {
      this.logger.debug(`returning empty assets for address [${address}]`);
      return { nativeToken: 0n, tokens: [] };
    }
    const rawBalance = await this.network.getAddressAssets(address);
    const wrappedNativeToken = this.wrapBtc(rawBalance.nativeToken).amount;
    const targetAssets =
      tokenIds === undefined
        ? rawBalance.tokens
        : rawBalance.tokens.filter((token) => tokenIds.includes(token.id));
    const wrappedAssets = targetAssets.map((token) => ({
      id: token.id,
      value: this.tokenMap.wrapAmount(token.id, token.value, this.CHAIN).amount,
    }));
    return {
      nativeToken: wrappedNativeToken,
      tokens: wrappedAssets,
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
      await this.network.submitTransaction(tx);
      this.logger.info(
        `Bitcoin Runes Transaction [${transaction.txId}] is submitted`
      );
    } catch (e) {
      this.logger.warn(
        `An error occurred while submitting Bitcoin Runes transaction [${transaction.txId}]: ${e}`
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
   * gets the minimum amount of native token for transferring asset
   * @returns the minimum amount
   */
  getMinimumNativeToken = (): bigint => {
    return 546n; // smallest non-dust value
  };

  /**
   * converts json representation of the payment transaction to PaymentTransaction
   * @returns PaymentTransaction object
   */
  PaymentTransactionFromJson = (jsonString: string): BitcoinRunesTransaction =>
    BitcoinRunesTransaction.fromJson(jsonString);

  /**
   * generates PaymentTransaction object from psbt hex string
   * @param psbtHex
   * @returns PaymentTransaction object
   */
  rawTxToPaymentTransaction = async (
    psbtHex: string
  ): Promise<PaymentTransaction> => {
    const psbt = Psbt.fromHex(psbtHex);
    const txBytes = Serializer.serialize(psbt);
    const txId = Transaction.fromBuffer(psbt.data.getTransaction()).getId();

    const inputBoxes: Array<BitcoinRunesUtxo> = [];
    const inputs = psbt.txInputs;
    for (let i = 0; i < inputs.length; i++) {
      const boxId = getPsbtTxInputBoxId(inputs[i]);
      inputBoxes.push(await this.network.getUtxo(boxId));
    }

    const bitcoinTx = new BitcoinRunesTransaction(
      txId,
      '',
      txBytes,
      TransactionType.manual,
      inputBoxes.map((box) => JsonBigInt.stringify(box))
    );

    this.logger.info(`Parsed Bitcoin Runes transaction [${txId}] successfully`);
    return bitcoinTx;
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
  ): Promise<Map<string, BitcoinRunesUtxo | undefined>> => {
    // chaining transaction won't be done in BitcoinChain
    // due to heavy size of transactions in mempool
    return new Map<string, BitcoinRunesUtxo | undefined>();
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
  ): Map<string, BitcoinRunesUtxo | undefined> => {
    // its not possible to get runes of a utxo from a transaction
    // even though data is written in OP_RETURN, it can be less than that
    return new Map<string, BitcoinRunesUtxo | undefined>();
  };

  /**
   * returns box id
   * @param box
   */
  protected getBoxId = (box: BitcoinRunesUtxo): string =>
    box.txId + '.' + box.index;

  /**
   * inserts signatures into psbt
   * @param txBytes
   * @param signatures generated signature by signer service
   * @returns a signed transaction (in Psbt format)
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
   * gets the minimum amount of satoshi for a utxo that can cover
   * additional fee for adding it to a tx
   * Note: it returns the actual value
   * @returns the minimum amount
   */
  minimumMeaningfulSatoshi = (feeRatio: number): bigint => {
    return BigInt(
      Math.max(
        Math.ceil(
          (feeRatio * SEGWIT_INPUT_WEIGHT_UNIT) / 4 // estimate fee per weight and convert to virtual size
        ),
        Number(this.getMinimumNativeToken())
      )
    );
  };

  /**
   * serializes the transaction of this chain into string
   */
  protected serializeTx = (tx: BitcoinRunesTx): string =>
    JsonBigInt.stringify(tx);

  /**
   * verifies consistency within the PaymentTransaction object
   * - verify txId
   * - verify inputUtxos
   *   - verify input box id
   *   - verify input box value
   *   - verify input box runes
   * - verify that runestone is not cenotaph (even though the protocol allows it)
   * - verify equality of input runes and edicted ones (even though the protocol allows it)
   *
   * Note: Runestone can be null and the last two checks are skipped in this case
   *
   * Note: Since this functions relies on network data for input runes, the transaction with invalid inputs cannot be verified by this function
   * @param transaction the PaymentTransaction
   * @returns true if the transaction is verified
   */
  verifyPaymentTransaction = async (
    transaction: PaymentTransaction
  ): Promise<boolean> => {
    const psbt = Serializer.deserialize(transaction.txBytes);
    const bitcoinTx = transaction as BitcoinRunesTransaction;
    const baseError = `Tx [${transaction.txId}] is not verified: `;

    // verify txId
    const txId = Transaction.fromBuffer(psbt.data.getTransaction()).getId();
    if (transaction.txId !== txId) {
      this.logger.warn(
        baseError +
          `Transaction id is inconsistent (expected [${txId}] found [${transaction.txId}])`
      );
      return false;
    }

    // verify inputUtxos
    if (bitcoinTx.inputUtxos.length !== psbt.inputCount) {
      this.logger.warn(
        baseError +
          `BitcoinRunesTransaction object input counts is inconsistent [${bitcoinTx.inputUtxos.length} != ${psbt.inputCount}]`
      );
      return false;
    }

    const totalInputRunes = new Map<string, bigint>();
    for (let i = 0; i < psbt.inputCount; i++) {
      //-- verify input box id
      const input = psbt.txInputs[i];
      const txId = Buffer.from(input.hash).reverse().toString('hex');
      const psbtInputId = `${txId}.${input.index}`;
      const bitcoinInput = JsonBigInt.parse(
        bitcoinTx.inputUtxos[i]
      ) as BitcoinRunesUtxo;
      const expectedId = `${bitcoinInput.txId}.${bitcoinInput.index}`;
      if (expectedId !== psbtInputId) {
        this.logger.warn(
          baseError +
            `Utxo id for input at index [${i}] is inconsistent [expected ${expectedId} found ${psbtInputId}]`
        );
        return false;
      }

      const baseAssetError =
        baseError + `Utxo [${psbtInputId}] at index [${i}] `;
      //-- verify input BTC
      const utxo = await this.network.getUtxo(psbtInputId);
      if (bitcoinInput.value !== utxo.value) {
        this.logger.warn(
          baseAssetError +
            `has incorrect BTC value [expected ${bitcoinInput.value} found ${utxo.value}]`
        );
        return false;
      }

      //-- verify input Runes
      const receivedRunes = bitcoinInput.runes;
      const expectedRunes = utxo.runes;

      if (expectedRunes.length !== receivedRunes.length) {
        this.logger.warn(
          baseAssetError +
            `has incorrect Runes count [expected ${expectedRunes.length} found ${receivedRunes.length}]`
        );
        return false;
      }

      const expectedRunesMap = new Map(
        expectedRunes.map((rune) => [rune.runeId, rune.quantity])
      );
      for (const actualRune of receivedRunes) {
        // verify this input's runes match expected
        const expectedQuantity = expectedRunesMap.get(actualRune.runeId);
        if (
          expectedQuantity === undefined ||
          expectedQuantity !== actualRune.quantity
        ) {
          this.logger.warn(
            baseAssetError +
              `has incorrect Rune [${actualRune.runeId}] value [expected ${expectedQuantity} found ${actualRune.quantity}]`
          );
          return false;
        }

        // track total input runes across all inputs
        const currentTotal = totalInputRunes.get(actualRune.runeId) || 0n;
        totalInputRunes.set(
          actualRune.runeId,
          currentTotal + actualRune.quantity
        );
      }
    }

    // Runestone definition checks
    const rawTx = psbt.data.getTransaction();
    const artifact = runelib.tryDecodeRunestone({
      vout: Transaction.fromBuffer(rawTx).outs.map((out) => ({
        scriptPubKey: { hex: out.script.toString('hex') },
      })),
    });

    //-- skip if Runestone is null
    if (artifact === null) {
      this.logger.info(
        `Skipped equality check of input and edicted runes for tx [${transaction.txId}]: Runestone is null`
      );
      return true;
    }

    // verify Runestone is not cenotaph
    if (!runelib.isRunestone(artifact)) {
      const cenotaph: runelib.Cenotaph = artifact;
      this.logger.warn(
        baseError +
          `Runestone is cenotaph (even though the protocol allows it, the PaymentTransaction does not allow Cenotaph)! Flaws: ${JSON.stringify(
            cenotaph.flaws
          )}`
      );
      return false;
    }
    const stone: runelib.RunestoneSpec = artifact;
    const edictedRunes = new Map<string, bigint>();

    // verify equality of input and edicted runes
    const baseRunesError =
      baseError +
      `Edicted runes are not equal to input runes (even though the protocol allows it, the PaymentTransaction does not allow it): `;
    //-- sum edicted runes
    for (const edict of stone.edicts ?? []) {
      const tokenId = generateAssetId(edict.id.block, edict.id.tx);
      const current = edictedRunes.get(tokenId) || 0n;
      edictedRunes.set(tokenId, current + edict.amount);
    }

    // compare input and edicted runes
    if (totalInputRunes.size !== edictedRunes.size) {
      this.logger.warn(
        baseRunesError +
          `Mismatch in number of rune types between inputs and edicts ([${totalInputRunes.size}] in inputs vs [${edictedRunes.size}] in edicts)`
      );
      return false;
    }

    for (const [runeId, inputQuantity] of totalInputRunes.entries()) {
      const edictedQuantity = edictedRunes.get(runeId);
      if (edictedQuantity === undefined || edictedQuantity !== inputQuantity) {
        this.logger.warn(
          baseRunesError +
            `Mismatch in Rune ${runeId} quantity ([${inputQuantity}] in inputs vs [${edictedQuantity}] in edicts)`
        );
        return false;
      }
    }

    return true;
  };

  /**
   * wraps btc amount
   * @param amount
   */
  protected wrapBtc = (amount: bigint): RosenAmount =>
    this.tokenMap.wrapAmount(this.NATIVE_TOKEN_ID, amount, BITCOIN_CHAIN);

  /**
   * unwraps btc amount
   * @param amount
   */
  protected unwrapBtc = (amount: bigint): RosenAmount =>
    this.tokenMap.unwrapAmount(this.NATIVE_TOKEN_ID, amount, BITCOIN_CHAIN);

  /**
   * unwraps amount of the native token and all tokens in AssetBalance
   * @param balance the AssetBalance object
   */
  protected unwrapAssetBalance = (balance: AssetBalance): AssetBalance => {
    const result = structuredClone(balance);
    result.nativeToken = this.tokenMap.unwrapAmount(
      this.NATIVE_TOKEN_ID,
      result.nativeToken,
      BITCOIN_CHAIN
    ).amount;
    result.tokens.forEach(
      (token) =>
        (token.value = this.tokenMap.unwrapAmount(
          token.id,
          token.value,
          this.CHAIN
        ).amount)
    );
    return result;
  };
}

export default BitcoinRunesChain;
