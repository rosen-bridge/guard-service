import * as runelib from '@magiceden-oss/runestone-lib';
import { Psbt, Transaction, address, payments, script } from 'bitcoinjs-lib';
import {
  AbstractUtxoChain,
  AssetBalance,
  BlockInfo,
  ChainUtils,
  GET_BOX_API_LIMIT,
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
import { BITCOIN_CHAIN, BTC, getPsbtTxInputBoxId } from '@rosen-chains/bitcoin';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { BitcoinRunesBoxSelection } from '@rosen-bridge/bitcoin-runes-utxo-selection';
import { BitcoinRunesRosenExtractor } from '@rosen-bridge/rosen-extractor';
import { RosenAmount, TokenMap } from '@rosen-bridge/tokens';
import BitcoinRunesTransaction from './bitcoinRunesTransaction';
import {
  BitcoinRunesConfigs,
  BitcoinRunesTx,
  BitcoinRunesUtxo,
  TssSignFunction,
} from './types';
import {
  BITCOIN_RUNES_CHAIN,
  MINIMUM_BTC_FOR_NATIVE_SEGWIT_OUTPUT,
  NATIVE_SEGWIT_SCRIPT_PREFIX,
  OP_RETURN_OPCODE,
} from './constants';
import Serializer from './serializer';
import AbstractBitcoinRunesNetwork from './network/abstractBitcoinRunesNetwork';
import {
  generateAssetId,
  generateBoxId,
  generateFeeEstimatorWithAssumptions,
  generateFeeEstimatorWithPsbt,
  splitPaymentOrders,
  sumBitcoinRunesUtxosBalance,
} from './utils';

class BitcoinRunesChain extends AbstractUtxoChain<
  BitcoinRunesTx,
  BitcoinRunesUtxo
> {
  declare network: AbstractBitcoinRunesNetwork;
  declare configs: BitcoinRunesConfigs;
  CHAIN = BITCOIN_RUNES_CHAIN;
  NATIVE_TOKEN_ID = BTC;
  extractor: BitcoinRunesRosenExtractor;
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
    this.extractor = new BitcoinRunesRosenExtractor(
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
   *
   * Note: **all items of order should have at least one token**
   *
   * Note: this function creates a transaction for each token (e.g., having two different
   * tokens in single order results in two transactions. also having the same token in
   * two items of the order results in two transactions)
   *
   * Note: the structure of each generated transaction is as follow:
   * - (optional) universal change (only if there are multiple tokens in the input)
   * - transferring rune change
   * - OP_RETURN
   * - order output
   * - BTC change
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

    // split the order
    const orders = splitPaymentOrders(order, this.getMinimumNativeToken());
    this.logger.debug(`Split order: ${JsonBigInt.stringify(orders)}`);

    // calculate required assets
    const requiredAssets = orders
      .map((order) => order.assets)
      .reduce(ChainUtils.sumAssetBalance, {
        // There are two additional utxos both into native-segwit output
        // (universal change, which may be omitted, and the transferring rune change)
        // these additional utxos are per each order item, as a separate transaction
        // will be generated for them
        nativeToken: this.wrapBtc(
          MINIMUM_BTC_FOR_NATIVE_SEGWIT_OUTPUT * 2n * BigInt(orders.length)
        ).amount,
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

    // generate a transaction for each item of order
    const transactions: BitcoinRunesTransaction[] = [];
    for (const order of orders) {
      // generate psbt and Runestone
      const psbt = new Psbt();
      const edicts: runelib.RunestoneSpec['edicts'] = [];
      const orderOutputs: Array<Parameters<typeof psbt.addOutput>[0]> = [];

      // check order
      if (order.extra) {
        throw Error(
          'Bitcoin Runes does not support extra data in payment order'
        );
      }
      const outputAddressPrefix = order.address.slice(0, 4);
      if (outputAddressPrefix !== 'bc1q' && outputAddressPrefix !== 'bc1p') {
        throw Error(
          'Bitcoin Runes supports payments only to native-segwit or taproot addresses'
        );
      }
      if (order.assets.tokens.length !== 1) {
        throw new ImpossibleBehavior(
          `Bitcoin Runes order should have exactly 1 token after split while order [${JsonBigInt.stringify(
            order
          )}] does not`
        );
      }

      // add runes transfer to edicts list
      const token = order.assets.tokens[0];
      const [blockId, txIndex] = token.id.split(':');
      edicts.push({
        id: {
          block: BigInt(blockId),
          tx: Number(txIndex),
        },
        amount: this.tokenMap.unwrapAmount(token.id, token.value, this.CHAIN)
          .amount,
        output: 3, // there are 3 UTxOs before order UTxOs
      });

      // create order output
      orderOutputs.push({
        script: address.toOutputScript(order.address),
        value: Number(this.unwrapBtc(order.assets.nativeToken).amount),
      });

      // generate runes data
      // in case that no transferring rune remains, the Runestone will be modified later
      // so the Runestone with biggest size is used for generating fee estimator
      // which should have two edicts (one for payment and one for change)
      const mockedChangeEdict = {
        id: {
          block: BigInt(blockId),
          tx: Number(txIndex),
        },
        amount: 1n, // the value does not matter here
        output: 1, // the transferring rune change box is the 2nd output
      };
      const draftRunestone = runelib.encodeRunestone({
        edicts: [...edicts, mockedChangeEdict],
        pointer: 0,
      });

      // generate fee estimator
      const isNativeSegwit = address
        .toOutputScript(order.address)
        .toString('hex')
        .startsWith(NATIVE_SEGWIT_SCRIPT_PREFIX);
      let nativeSegwitOutputCount: number;
      let taprootOutputCount: number;
      if (isNativeSegwit) {
        nativeSegwitOutputCount = 3;
        taprootOutputCount = 0;
      } else {
        // Universal change and transferring change boxes (the BTC change box will be considered by box-selection)
        nativeSegwitOutputCount = 2;
        taprootOutputCount = 1;
      }
      const feeEstimator = generateFeeEstimatorWithAssumptions(
        draftRunestone.encodedRunestone.length,
        feeRatio,
        0,
        nativeSegwitOutputCount,
        taprootOutputCount
      );

      // calculated required assets for this transaction
      const orderRequiredAssets = structuredClone(order.assets);
      orderRequiredAssets.nativeToken +=
        2n * MINIMUM_BTC_FOR_NATIVE_SEGWIT_OUTPUT; // Required BTC for Universal change and transferring Rune change boxes are considered here
      const unwrappedRequiredAssets =
        this.unwrapAssetBalance(orderRequiredAssets);

      // generate iterator for address boxes to cover required runes
      const getAddressRunesBoxes = this.network.getAddressRunesBoxes;
      const lockAddress = this.configs.addresses.lock;
      const runesUtxoIterator = async function* () {
        let offset = 0;
        const limit = GET_BOX_API_LIMIT;
        while (true) {
          const page = await getAddressRunesBoxes(
            lockAddress,
            token.id,
            offset,
            limit
          );
          if (page.length === 0) break;
          yield* page;
          offset += limit;
        }
        return undefined;
      };

      // fetch input boxes to cover required runes
      const selectedBoxes: BitcoinRunesUtxo[] = [];
      const coveredRunesBoxes = await this.boxSelection.getCoveringBoxes(
        {
          nativeToken: 0n,
          tokens: unwrappedRequiredAssets.tokens,
        },
        forbiddenBoxIds,
        trackMap,
        runesUtxoIterator(),
        0n,
        undefined,
        () => 0n
      );
      if (!coveredRunesBoxes.covered) {
        throw new NotEnoughValidBoxesError(
          `Available boxes didn't cover required Runes. Required Runes: ${JsonBigInt.stringify(
            unwrappedRequiredAssets.tokens
          )}`
        );
      }
      coveredRunesBoxes.boxes.forEach((box) => {
        selectedBoxes.push(box);
        // mark selected boxes as forbidden for next selection and transactions
        forbiddenBoxIds.push(generateBoxId(box.txId, box.index));
      });
      const preSelectedBtc = coveredRunesBoxes.boxes.reduce(
        (a, b) => a + b.value,
        0n
      );
      let estimatedFee = feeEstimator(coveredRunesBoxes.boxes, 1);
      const additionalAssets: AssetBalance = {
        nativeToken:
          preSelectedBtc - unwrappedRequiredAssets.nativeToken - estimatedFee,
        tokens: coveredRunesBoxes.additionalAssets.aggregated.tokens,
      };

      // check if selected boxes can cover required BTC
      if (additionalAssets.nativeToken < 0n) {
        this.logger.debug(
          `Selected Runes boxes cannot cover required amount of BTC [required at least ${
            additionalAssets.nativeToken * -1n
          } more]. Fetching BTC only boxes...`
        );
        const requiredBtc =
          unwrappedRequiredAssets.nativeToken - preSelectedBtc;

        // generate fee estimator for 2nd box selection
        const feeEstimator = generateFeeEstimatorWithAssumptions(
          draftRunestone.encodedRunestone.length,
          feeRatio,
          selectedBoxes.length,
          nativeSegwitOutputCount,
          taprootOutputCount
        );

        // generate iterator for address boxes to cover required runes
        const getAddressBtcBoxes = this.network.getAddressBtcBoxes;
        const getRemainingBoxes = this.network.getRemainingBoxes;
        const btcUtxoIterator = async function* () {
          const btcBoxes = await getAddressBtcBoxes(lockAddress);
          if (btcBoxes.length !== 0) yield* btcBoxes;

          selectedBoxes.push(...btcBoxes);
          const fetchedBoxIds = selectedBoxes.map((box) =>
            generateBoxId(box.txId, box.index)
          );
          const remainingBoxes = await getRemainingBoxes(
            fetchedBoxIds,
            lockAddress
          );
          if (remainingBoxes.length !== 0) yield* remainingBoxes;

          return undefined;
        };

        // fetch input boxes to cover required BTC
        const coveredBtcBoxes = await this.boxSelection.getCoveringBoxes(
          { nativeToken: requiredBtc, tokens: [] },
          forbiddenBoxIds,
          trackMap,
          btcUtxoIterator(),
          MINIMUM_BTC_FOR_NATIVE_SEGWIT_OUTPUT,
          undefined,
          feeEstimator
        );
        if (!coveredBtcBoxes.covered) {
          throw new NotEnoughValidBoxesError(
            `Available boxes didn't cover required BTC. Required BTC: ${JsonBigInt.stringify(
              unwrappedRequiredAssets.nativeToken
            )}`
          );
        }
        // add selected boxes
        coveredBtcBoxes.boxes.forEach((box) => {
          selectedBoxes.push(box);
          // mark selected boxes as forbidden for next transactions
          forbiddenBoxIds.push(generateBoxId(box.txId, box.index));
        });
        // the fee and additional BTC are only based on the additional assets of the 2nd selection
        additionalAssets.nativeToken =
          coveredBtcBoxes.additionalAssets.aggregated.nativeToken;
        estimatedFee = coveredBtcBoxes.additionalAssets.fee;
      } else {
        this.logger.debug(
          `Selected Runes boxes also covered required amount of BTC`
        );
      }

      // add inputs
      selectedBoxes.forEach((box) => {
        psbt.addInput({
          hash: box.txId,
          index: box.index,
          witnessUtxo: {
            script: Buffer.from(this.lockScript, 'hex'),
            value: Number(box.value),
          },
        });
      });

      let isUniversalChangeBoxPresent = true;
      if (additionalAssets.tokens.length === 0) {
        // no need to add the universal change box
        isUniversalChangeBoxPresent = false;
        additionalAssets.nativeToken += MINIMUM_BTC_FOR_NATIVE_SEGWIT_OUTPUT;
      } else {
        const otherRunes = additionalAssets.tokens.filter(
          (token) => token.id !== order.assets.tokens[0].id
        );
        if (otherRunes.length > 0) {
          // some other runes are transferred, so the universal change box is required
          psbt.addOutput({
            script: Buffer.from(this.lockScript, 'hex'),
            value: Number(MINIMUM_BTC_FOR_NATIVE_SEGWIT_OUTPUT),
          });
        } else {
          // no other runes is transferred, so no need to add the universal change box
          isUniversalChangeBoxPresent = false;
        }
        const remainingTransferringRune = additionalAssets.tokens.find(
          (token) => token.id === order.assets.tokens[0].id
        );
        if (remainingTransferringRune) {
          // some transferring rune is left, so the change edict is required
          edicts.push({
            id: {
              block: BigInt(blockId),
              tx: Number(txIndex),
            },
            amount: remainingTransferringRune.value,
            output: 1, // there is only 1 UTxO before transferring Rune change
          });
        }
      }

      // add transferring rune change UTxO
      psbt.addOutput({
        script: Buffer.from(this.lockScript, 'hex'),
        value: Number(MINIMUM_BTC_FOR_NATIVE_SEGWIT_OUTPUT),
      });

      // if universal change box is not present, the UTxOs are shifted one place
      // so all edict outputs should be decremented
      if (!isUniversalChangeBoxPresent)
        edicts.forEach((edict) => edict.output--);

      // add OP_RETURN output
      const runestone = runelib.encodeRunestone({
        edicts: edicts,
        pointer: 0, // the first UTxO is always targeted to the lock address
      });
      psbt.addOutput({
        script: runestone.encodedRunestone,
        value: 0,
      });

      // add order outputs
      orderOutputs.forEach((output) => psbt.addOutput(output));

      // calculate fee and remaining BTC
      const fee = generateFeeEstimatorWithPsbt(psbt, feeRatio)(
        selectedBoxes,
        1 // only 1 box is remained to be added to the transaction
      );
      this.logger.debug(
        `Fee related info: [is universal change box present: ${isUniversalChangeBoxPresent}, box-selection fee estimation: ${estimatedFee}, tx fee: ${fee}]`
      );
      const remainingBtc = additionalAssets.nativeToken + estimatedFee - fee;
      if (remainingBtc <= MINIMUM_BTC_FOR_NATIVE_SEGWIT_OUTPUT)
        throw new ImpossibleBehavior(
          `Remaining BTC does not reach minimum UTxO value [${remainingBtc} < ${MINIMUM_BTC_FOR_NATIVE_SEGWIT_OUTPUT}] while utxo selection covered`
        );

      // add BTC change output
      psbt.addOutput({
        script: Buffer.from(this.lockScript, 'hex'),
        value: Number(remainingBtc),
      });

      // create the transaction
      const txId = Transaction.fromBuffer(psbt.data.getTransaction()).getId();
      const txBytes = Serializer.serialize(psbt);
      const bitcoinTx = new BitcoinRunesTransaction(
        txId,
        eventId,
        txBytes,
        txType,
        selectedBoxes.map((box) => JsonBigInt.stringify(box))
      );

      transactions.push(bitcoinTx);
    }

    transactions.forEach((transaction) => {
      this.logger.info(
        `Bitcoin Runes transaction [${transaction.txId}] as type [${transaction.txType}] generated for event [${transaction.eventId}]`
      );
    });
    return transactions;
  };

  /**
   * gets input and output assets of a PaymentTransaction
   *
   * Note: this function is not used anywhere. Thus, is unnecessary
   * @param transaction the PaymentTransaction
   * @returns an object containing the amount of input and output assets
   */
  getTransactionAssets = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transaction: PaymentTransaction
  ): Promise<TransactionAssetBalance> => {
    throw Error(
      `The "getTransactionAssets" is not implemented for "BitcoinRunesChain" and should not be used!`
    );
  };

  /**
   * extracts payment order of a PaymentTransaction
   *
   * Note: **this function only includes boxes after OP_RETURN and before
   * lock address UTxO, meaning:**
   * - if there is an UTxO before OP_RETURN with another address, it is not included in order
   * - if there is an UTxO after lock address UTxO and OP_RETURN, it is not included either
   * @param transaction the PaymentTransaction
   * @returns the transaction payment order (list of single payments)
   */
  extractTransactionOrder = (transaction: PaymentTransaction): PaymentOrder => {
    const psbt = Serializer.deserialize(transaction.txBytes);
    const bitcoinTx = transaction as BitcoinRunesTransaction;

    // extract BTC transfer
    let opReturnIndex = -1;
    const order: PaymentOrder = [];
    for (let i = 0; i < psbt.txOutputs.length; i++) {
      const output = psbt.txOutputs[i];

      // skip OP_RETURN and next boxes
      if (output.script.toString('hex').startsWith(OP_RETURN_OPCODE)) {
        opReturnIndex = i;
        continue; // skip the OP_RETURN box
      }
      if (opReturnIndex === -1) continue; // skip all boxes before OP_RETURN
      if (output.script.toString('hex') === this.lockScript) break; // skip all boxes after lock address

      const payment: SinglePayment = {
        address: address.fromOutputScript(output.script),
        assets: {
          nativeToken: this.wrapBtc(BigInt(output.value)).amount,
          tokens: [],
        },
      };
      order.push(payment);
    }

    // parse Runestone
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
      const tokenId = generateAssetId(edict.id.block, edict.id.tx);

      // skip edict pointing to OP_RETURN
      const pointedOutputScript =
        psbt.txOutputs[edict.output].script.toString('hex');
      if (pointedOutputScript.startsWith(OP_RETURN_OPCODE)) {
        this.logger.debug(
          `Skipping edict [${JsonBigInt.stringify(
            edict
          )}] while extracting order: token [${tokenId}] is burned by edicting to OP_RETURN output`
        );
        continue;
      }

      // find remaining amount in the inputs
      const tokenIndexInInput = inputAssets.tokens.findIndex(
        (token) => token.id === tokenId
      );
      if (tokenIndexInInput === -1) {
        this.logger.debug(
          `Skipping edict [${JsonBigInt.stringify(
            edict
          )}] while extracting order: token [${tokenId}] is not found in input assets`
        );
        continue;
      } else {
        // extract amount of transfer based on remaining amount in the inputs
        let transferAmount = edict.amount;
        if (inputAssets.tokens[tokenIndexInInput].value < edict.amount) {
          this.logger.debug(
            `Overdrawn edict [${JsonBigInt.stringify(
              edict
            )}] is found while extracting order: token [${tokenId}] is edicted for [${
              edict.amount
            }] while only [${
              inputAssets.tokens[tokenIndexInInput].value
            }] is remained in input assets. Full edicts in the Runestone: ${JsonBigInt.stringify(
              stone.edicts
            )}`
          );
          transferAmount = inputAssets.tokens[tokenIndexInInput].value;
          inputAssets.tokens.splice(tokenIndexInInput, 1);
        } else if (
          inputAssets.tokens[tokenIndexInInput].value === edict.amount
        ) {
          inputAssets.tokens.splice(tokenIndexInInput, 1);
        } else {
          inputAssets.tokens[tokenIndexInInput].value -= edict.amount;
        }

        // add transfer amount to order
        const orderIndex = edict.output - opReturnIndex - 1; // the OP_RETURN and boxes before it are not included in order
        if (orderIndex < 0 || orderIndex >= order.length) continue; // skip edict pointing to boxes that are not included in order (which are supposed to be change boxes)
        const tokenIndexInOrder = order[orderIndex].assets.tokens.findIndex(
          (token) => token.id === tokenId
        );
        const value = this.tokenMap.wrapAmount(
          tokenId,
          transferAmount,
          this.CHAIN
        ).amount;
        if (tokenIndexInOrder === -1)
          order[orderIndex].assets.tokens.push({
            id: tokenId,
            value: value,
          });
        else order[orderIndex].assets.tokens[tokenIndexInOrder].value += value;
      }
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
      0 // all boxes are already added
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
   * - check transaction structure
   *   - if there are multiple tokens, there should be a universal change box
   *   - otherwise there should be no universal change box
   *   - the overall structure should be as follow
   *     - (optional) universal change
   *     - transferring rune change
   *     - OP_RETURN
   *     - order utxo
   *     - BTC change
   * - check Runestone
   *   - Runestone should be defined
   *   - Runestone should not be a cenotaph
   *   - pointer should be defined and zero
   *   - no edict should be redundant
   *   - edicts are only to order and transferring rune utxos
   * @param transaction the PaymentTransaction
   * @param signingStatus the signing status of transaction
   * @returns true if the transaction is verified
   */
  verifyTransactionExtraConditions = (
    transaction: PaymentTransaction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    signingStatus: SigningStatus = SigningStatus.UnSigned
  ): boolean => {
    const psbt = Serializer.deserialize(transaction.txBytes);
    const bitcoinTx = transaction as BitcoinRunesTransaction;
    const baseError = `Tx [${transaction.txId}] is not verified: `;

    // calculate input runes
    const inputAssets = sumBitcoinRunesUtxosBalance(
      bitcoinTx.inputUtxos.map(
        (utxo) => JsonBigInt.parse(utxo) as BitcoinRunesUtxo
      )
    );
    const utxoOffset = inputAssets.tokens.length > 1 ? 1 : 0;
    const universalChangeBoxStatusString = `universal change box should${
      utxoOffset ? '' : ' not'
    } be present`;

    if (psbt.txOutputs.length !== utxoOffset + 4) {
      this.logger.warn(
        baseError +
          `Transaction output count is incorrect [expected ${
            utxoOffset + 4
          } (${universalChangeBoxStatusString}), found ${
            psbt.txOutputs.length
          }]`
      );
      return false;
    }
    if (utxoOffset === 1) {
      // universal change box should be present (thus, 5 outputs) and its script should be verified to be the lock script
      if (psbt.txOutputs[0].script.toString('hex') !== this.lockScript) {
        this.logger.warn(
          baseError +
            `Universal change box has wrong script [expected ${
              this.lockScript
            }, found ${psbt.txOutputs[0].script.toString('hex')}]`
        );
        return false;
      }
    }

    // check script of OP_RETURN and change boxes
    let outputScript = psbt.txOutputs[0 + utxoOffset].script.toString('hex');
    if (outputScript !== this.lockScript) {
      this.logger.warn(
        baseError +
          `transferring rune change box has wrong script [expected ${this.lockScript}, found ${outputScript}]`
      );
      return false;
    }
    outputScript = psbt.txOutputs[1 + utxoOffset].script.toString('hex');
    if (!outputScript.startsWith(OP_RETURN_OPCODE)) {
      this.logger.warn(
        baseError +
          `Expected an OP_RETURN utxo but found script [${outputScript}]`
      );
      return false;
    }
    outputScript = psbt.txOutputs[3 + utxoOffset].script.toString('hex');
    if (outputScript !== this.lockScript) {
      this.logger.warn(
        baseError +
          `BTC rune change box has wrong script [expected ${this.lockScript}, found ${outputScript}]`
      );
      return false;
    }

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

    //-- pointer should be defined and zero
    const stone: runelib.RunestoneSpec = artifact;
    const pointer = stone.pointer;
    if (pointer !== 0) {
      this.logger.warn(baseError + `Unexpected Runestone pointer [${pointer}]`);
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

    //-- edicts are only to order and transferring rune utxos
    for (let i = 0; i < edictsLength; i++) {
      if (
        stone.edicts[i].output !== 0 + utxoOffset && // transferring run change index
        stone.edicts[i].output !== 2 + utxoOffset // order utxo index
      ) {
        this.logger.warn(
          baseError +
            `Runestone edict at index [${i}] is targeting an unexpected output [${stone.edicts[i].output}] (${universalChangeBoxStatusString})`
        );
        return false;
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transaction: BitcoinRunesTx,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    return await this.network.isTxInMempool(transactionId);
  };

  /**
   * gets the minimum amount of native token for transferring asset
   * @returns the minimum amount
   */
  getMinimumNativeToken = (): bigint => {
    return 330n; // only taproot and native-segwit are allowed, so minimum is 330 satoshi which is taproot smallest non-dust value
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    txs: Psbt[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
   * - verify that Runestone is not cenotaph (even though the protocol allows it)
   *
   * Note: Runestone can be null and the last two checks are skipped in this case
   *
   * Note: Since this function relies on network data for input runes, the transaction with invalid inputs cannot be verified by this function
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
          `Transaction id is inconsistent [expected ${txId}, found ${transaction.txId}]`
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
      const psbtInputId = generateBoxId(txId, input.index);
      const bitcoinInput = JsonBigInt.parse(
        bitcoinTx.inputUtxos[i]
      ) as BitcoinRunesUtxo;
      const expectedId = generateBoxId(bitcoinInput.txId, bitcoinInput.index);
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
        `Skipped Runestone check for tx [${transaction.txId}]: Runestone is null`
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
