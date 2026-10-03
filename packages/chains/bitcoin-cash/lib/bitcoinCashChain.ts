import {
  binToHex,
  cashAddressToLockingBytecode,
  encodeTransactionBCH,
  hexToBin,
  lockingBytecodeToCashAddress,
  decodeTransactionBCH,
  hashTransaction,
} from '@bitauth/libauth';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { encodeAddress, decodeAddress } from '@rosen-bridge/address-codec';
import { AbstractRosenDataExtractor } from '@rosen-bridge/rosen-extractor';
import { BitcoinCashRosenExtractor } from '@rosen-bridge/rosen-extractor/dist/bitcoinCash.js';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  AbstractUtxoChain,
  BlockInfo,
  ConfirmationStatus,
  EcdsaSignMediator,
  GET_BOX_API_LIMIT,
  NotFoundError,
  PaymentOrder,
  PaymentTransaction,
  SigningStatus,
  TransactionAssetBalance,
  TransactionType,
  ValidityStatus,
} from '@rosen-chains/abstract-chain';

import BitcoinCashBoxSelection from './bitcoinCashBoxSelection';
import BitcoinCashTransaction from './bitcoinCashTransaction';
import {
  assertBchHex,
  bchP2pkhScriptFromPublicKey,
  decodeBchTransaction,
  getBchActualTxId,
  getBchOutpointId,
  getBchSigningDigest,
  getBchUnsignedBytes,
  isSameBchTransactionBody,
  validateBchNativeTransaction,
} from './bitcoinCashUtils';
import {
  BitcoinCashConfigs,
  BitcoinCashTx,
  BitcoinCashUtxo,
} from './chainTypes';
import {
  BCH,
  BCH_MAX_INPUTS,
  BCH_MAX_MONEY,
  BCH_MAX_OUTPUTS,
  BCH_MAX_PARENT_TRANSACTION_BYTES,
  BCH_MAX_TRANSACTION_BYTES,
  BITCOIN_CASH_CHAIN,
} from './constants';
import AbstractBitcoinCashNetwork from './network/abstractBitcoinCashNetwork';
import { BitcoinCashPrevout } from './types';

/**
 * Decode an ordinary canonical mainnet CashAddr with a codec round-trip check.
 * @param address - Prefixed lowercase native P2PKH or P2SH destination address
 * @returns Canonical hexadecimal locking bytecode
 * @throws When the address uses another network, token support or unsupported script form
 */
const outputScript = (address: string): string => {
  if (
    typeof address !== 'string' ||
    address.length > 128 ||
    address !== address.toLowerCase()
  )
    throw Error('Expected canonical mainnet CashAddr');
  const decoded = cashAddressToLockingBytecode(address);
  if (
    typeof decoded === 'string' ||
    decoded.prefix !== 'bitcoincash' ||
    decoded.tokenSupport
  )
    throw Error('Expected ordinary mainnet CashAddr');
  const script = binToHex(decoded.bytecode);
  if (!/^(76a914[0-9a-f]{40}88ac|a914[0-9a-f]{40}87)$/.test(script))
    throw Error('Only ordinary P2PKH and P2SH destinations are supported');
  const canonical = lockingBytecodeToCashAddress({
    bytecode: decoded.bytecode,
  });
  if (typeof canonical === 'string' || canonical.address !== address)
    throw Error('Expected canonical prefixed CashAddr');
  if (
    encodeAddress(BITCOIN_CASH_CHAIN, address) !== script ||
    decodeAddress(BITCOIN_CASH_CHAIN, script) !== address
  )
    throw Error('BCH address codec round-trip mismatch');
  return script;
};

/** Native BCH policy. Approval identity is deliberately distinct from chain identity. */
class BitcoinCashChain extends AbstractUtxoChain<
  BitcoinCashTx,
  BitcoinCashUtxo
> {
  readonly CHAIN = BITCOIN_CASH_CHAIN;
  readonly NATIVE_TOKEN_ID = BCH;
  declare network: AbstractBitcoinCashNetwork;
  declare protected configs: BitcoinCashConfigs;
  protected extractor: AbstractRosenDataExtractor<string> | undefined;
  protected readonly lockScript: string;
  protected readonly signMediator: EcdsaSignMediator;
  protected readonly boxSelection: BitcoinCashBoxSelection;

  /**
   * Freeze and validate native treasury configuration before attaching provider/signing seams.
   * @param network - BCH provider implementing bounded native output and recovery queries
   * @param suppliedConfigs - Required fee, output, selection, confirmation and treasury policy
   * @param tokens - Native BCH and destination asset mappings
   * @param signMediator - ECDSA mediator for the aggregate treasury key
   * @param logger - Optional diagnostics; omission uses the inherited DummyLogger
   * @throws When policy fields or the treasury address/key relationship are invalid
   */
  constructor(
    network: AbstractBitcoinCashNetwork,
    suppliedConfigs: BitcoinCashConfigs,
    tokens: TokenMap,
    signMediator: EcdsaSignMediator,
    logger?: AbstractLogger,
  ) {
    const configs: BitcoinCashConfigs = Object.freeze({
      ...suppliedConfigs,
      addresses: Object.freeze({ ...suppliedConfigs.addresses }),
      confirmations: Object.freeze({ ...suppliedConfigs.confirmations }),
    });
    super(network, configs, tokens, logger);
    const confirmationKeys = [
      'observation',
      'payment',
      'cold',
      'manual',
      'arbitrary',
    ] as const;
    if (
      !configs.confirmations ||
      confirmationKeys.some(
        (key) =>
          !Object.hasOwn(configs.confirmations, key) ||
          !Number.isSafeInteger(configs.confirmations[key]) ||
          configs.confirmations[key] < 1,
      )
    )
      throw Error('BCH confirmations must be positive safe integers');
    if (
      !Number.isSafeInteger(configs.feeRate) ||
      configs.feeRate <= 0 ||
      typeof configs.maxFee !== 'bigint' ||
      configs.maxFee <= 0n ||
      configs.maxFee > BCH_MAX_MONEY ||
      typeof configs.minimumUtxoValue !== 'bigint' ||
      configs.minimumUtxoValue < 546n ||
      configs.minimumUtxoValue > BCH_MAX_MONEY ||
      !Number.isSafeInteger(configs.maxUtxoPages) ||
      configs.maxUtxoPages < 1 ||
      configs.maxUtxoPages > 100
    )
      throw Error('Invalid bounded BCH fee or selection policy');
    this.configs = configs;
    this.lockScript = bchP2pkhScriptFromPublicKey(configs.aggregatedPublicKey);
    if (outputScript(configs.addresses.lock) !== this.lockScript)
      throw Error('Treasury CashAddr does not match aggregate P2PKH key');
    this.signMediator = signMediator;
    this.boxSelection = new BitcoinCashBoxSelection(
      logger?.child('bitcoinCashBoxSelection'),
    );
    this.extractor = new BitcoinCashRosenExtractor(
      configs.addresses.lock,
      tokens,
      logger,
    );
  }

  /**
   * Revalidate a concrete BCH envelope against the configured aggregate key.
   * @param transaction - Candidate Rosen payment envelope
   * @returns The validated BCH envelope
   * @throws When the envelope type, mutable fields or aggregate key are inconsistent
   */
  private envelope = (
    transaction: PaymentTransaction,
  ): BitcoinCashTransaction => {
    if (!(transaction instanceof BitcoinCashTransaction))
      throw Error('Foreign BCH envelope');
    transaction.validate();
    if (transaction.publicKey !== this.configs.aggregatedPublicKey)
      throw Error('Foreign aggregate key');
    return transaction;
  };

  /**
   * Convert a positive Rosen amount into bounded satoshis with an exact round trip.
   * @param amount - Native asset amount in Rosen units
   * @returns Exact positive raw BCH satoshis
   * @throws When conversion is invalid, exceeds maximum money or changes the Rosen amount
   */
  private unwrapExact = (amount: bigint): bigint => {
    if (typeof amount !== 'bigint' || amount <= 0n)
      throw Error('Invalid Rosen amount');
    const raw = this.tokenMap.unwrapAmount(BCH, amount, this.CHAIN).amount;
    if (
      typeof raw !== 'bigint' ||
      raw <= 0n ||
      raw > BCH_MAX_MONEY ||
      this.tokenMap.wrapAmount(BCH, raw, this.CHAIN).amount !== amount
    )
      throw Error('Rosen amount cannot round-trip exactly to satoshis');
    return raw;
  };

  /**
   * Convert a raw payout into Rosen units only when native precision is preserved.
   * @param raw - Payout value in satoshis
   * @returns The exactly reversible Rosen native amount
   * @throws When token-map conversion cannot restore the same satoshi value
   */
  private wrapExact = (raw: bigint): bigint => {
    const amount = this.tokenMap.wrapAmount(BCH, raw, this.CHAIN).amount;
    if (
      typeof amount !== 'bigint' ||
      this.tokenMap.unwrapAmount(BCH, amount, this.CHAIN).amount !== raw
    )
      throw Error('Satoshi amount cannot round-trip exactly');
    return amount;
  };

  // Counts are <253, hence one-byte CompactSize. 149 bytes conservatively covers
  // the largest compressed-key legacy P2PKH input; no Segwit weight is involved.
  /**
   * Calculate the fixed fee policy using conservative legacy serialized byte counts.
   * @param inputs - Selected input count within the bounded transaction policy
   * @param scripts - Ordered hexadecimal output scripts, including treasury change
   * @returns The configured satoshis-per-byte fee
   * @throws When the computed fee is nonpositive or exceeds the configured cap
   */
  private estimateFee = (
    inputs: number,
    scripts: readonly string[],
  ): bigint => {
    const bytes =
      10 +
      149 * inputs +
      scripts.reduce((n, script) => n + 9 + script.length / 2, 0);
    const fee = BigInt(bytes) * BigInt(this.configs.feeRate);
    if (fee <= 0n || fee > this.configs.maxFee)
      throw Error('BCH fee exceeds policy cap');
    return fee;
  };

  /**
   * Cross-check a treasury row against its exact parent output and coinbase bytes.
   * @param utxo - Provider row with current status and retained parent transaction hex
   * @returns The unchanged row after native parent/value/script checks succeed
   * @throws When reported metadata conflicts with the canonical parent or treasury policy
   */
  private authenticate = (utxo: BitcoinCashUtxo): BitcoinCashUtxo => {
    if (
      !utxo ||
      !Number.isSafeInteger(utxo.confirmations) ||
      utxo.confirmations < 0 ||
      typeof utxo.coinbase !== 'boolean'
    )
      throw Error('Malformed network UTXO status');
    const parent = decodeBchTransaction(
      hexToBin(
        assertBchHex(
          utxo.parentTransactionHex,
          BCH_MAX_PARENT_TRANSACTION_BYTES,
        ),
      ),
      BCH_MAX_PARENT_TRANSACTION_BYTES,
    );
    const coinbase =
      parent.inputs.length === 1 &&
      parent.inputs[0].outpointIndex === 0xffffffff &&
      parent.inputs[0].outpointTransactionHash.every((byte) => byte === 0);
    if (coinbase !== utxo.coinbase)
      throw Error('Unauthenticated coinbase status');
    getBchOutpointId(utxo.txId, utxo.index);
    if (typeof utxo.value !== 'bigint' || utxo.value <= 1n)
      throw Error('Invalid treasury UTXO value');
    const bytes = encodeTransactionBCH({
      version: 2,
      locktime: 0,
      inputs: [
        {
          outpointTransactionHash: hexToBin(utxo.txId),
          outpointIndex: utxo.index,
          sequenceNumber: 0xffffffff,
          unlockingBytecode: new Uint8Array(),
        },
      ],
      outputs: [
        {
          lockingBytecode: hexToBin(this.lockScript),
          valueSatoshis: utxo.value - 1n,
        },
      ],
    });
    validateBchNativeTransaction(bytes, [utxo], this.lockScript);
    return utxo;
  };

  /**
   * Apply the ordinary confirmation or coinbase maturity selection boundary.
   * @param utxo - Parent-checked row with validated confirmation and coinbase status
   * @returns Whether confirmations are at least one, or at least 100 for coinbase
   */
  private mature = (utxo: BitcoinCashUtxo): boolean =>
    utxo.confirmations >= (utxo.coinbase ? 100 : 1);

  /**
   * Recheck every retained input against its current confirmed native output context.
   * @param transaction - Validated BCH envelope with ordered prevout context
   * @returns Whether all inputs remain mature, unchanged and explicitly unspent/valid
   * @throws When the provider or parent-validation seam fails
   */
  private currentInputs = async (
    transaction: BitcoinCashTransaction,
  ): Promise<boolean> => {
    for (const prevout of transaction.prevouts) {
      const id = getBchOutpointId(prevout.txId, prevout.index);
      const current = await this.network.getUtxo(id);
      if (!current) return false;
      this.authenticate(current);
      if (
        !this.mature(current) ||
        current.txId !== prevout.txId ||
        current.index !== prevout.index ||
        current.value !== prevout.value ||
        current.scriptPubKey !== prevout.scriptPubKey ||
        current.parentTransactionHex !== prevout.parentTransactionHex ||
        (await this.network.isBoxUnspentAndValid(id)) !== true
      )
        return false;
    }
    return true;
  };

  /**
   * Enforce native treasury body, payout, change, fee and optional signing-state policy.
   * @param transaction - Candidate Rosen payment envelope
   * @param status - Optional required signed/unsigned state; omission accepts either valid state
   * @returns The envelope after all applicable fixed-body policy checks
   * @throws When envelope identity, state, outputs, conversion or fee policy is invalid
   */
  private policy = (
    transaction: PaymentTransaction,
    status?: SigningStatus,
  ): BitcoinCashTransaction => {
    const envelope = this.envelope(transaction);
    const tx = validateBchNativeTransaction(
      envelope.txBytes,
      envelope.prevouts,
      this.lockScript,
    );
    if (
      status !== undefined &&
      status !== SigningStatus.Signed &&
      status !== SigningStatus.UnSigned
    )
      throw Error('Unknown signing status');
    if (
      status !== undefined &&
      envelope.isSigned() !== (status === SigningStatus.Signed)
    )
      throw Error('Incorrect signing state');
    if (
      tx.version !== 2 ||
      tx.locktime !== 0 ||
      tx.inputs.some((input) => input.sequenceNumber !== 0xffffffff) ||
      tx.outputs.length < 2
    )
      throw Error('Invalid BCH transaction body policy');
    const scripts = tx.outputs.map((output) =>
      binToHex(output.lockingBytecode),
    );
    if (
      scripts.some(
        (script) =>
          !/^(76a914[0-9a-f]{40}88ac|a914[0-9a-f]{40}87)$/.test(script),
      ) ||
      scripts[scripts.length - 1] !== this.lockScript ||
      scripts.slice(0, -1).includes(this.lockScript) ||
      tx.outputs.some(
        (output) => output.valueSatoshis < this.configs.minimumUtxoValue,
      )
    )
      throw Error('Invalid BCH payout or treasury change');
    const fee =
      envelope.prevouts.reduce((sum, input) => sum + input.value, 0n) -
      tx.outputs.reduce((sum, output) => sum + output.valueSatoshis, 0n);
    if (fee !== this.estimateFee(tx.inputs.length, scripts))
      throw Error('BCH fee does not match fixed byte policy');
    // Payouts cross the Rosen amount boundary. Treasury change remains raw BCH.
    tx.outputs
      .slice(0, -1)
      .forEach((output) => this.wrapExact(output.valueSatoshis));
    return envelope;
  };

  /**
   * Build one bounded unsigned native payment without using reserved or chained outputs.
   * @param eventId - Rosen event identifier retained in the envelope
   * @param txType - Supported Rosen transaction type
   * @param order - Token-free ordinary native payments in Rosen units
   * @param unsignedTransactions - Validated unsigned envelopes whose inputs are reserved
   * @param serializedSignedTransactions - Signed raw transactions whose inputs are reserved
   * @returns A one-element array containing the generated unsigned BCH envelope
   * @throws When order/reservations are invalid or bounded confirmed funding is insufficient
   */
  generateMultipleTransactions = async (
    eventId: string,
    txType: TransactionType,
    order: PaymentOrder,
    unsignedTransactions: PaymentTransaction[],
    serializedSignedTransactions: string[],
  ): Promise<BitcoinCashTransaction[]> => {
    if (
      !Array.isArray(order) ||
      !order.length ||
      order.length + 1 > BCH_MAX_OUTPUTS
    )
      throw Error('Invalid bounded payment order');
    const outputs = order.map((payment) => {
      if (
        !payment ||
        Object.keys(payment).sort().join(',') !== 'address,assets' ||
        !payment.assets ||
        Object.keys(payment.assets).sort().join(',') !== 'nativeToken,tokens' ||
        !Array.isArray(payment.assets.tokens) ||
        payment.assets.tokens.length
      )
        throw Error('Native BCH rejects tokens and extra order metadata');
      const script = outputScript(payment.address);
      if (script === this.lockScript)
        throw Error('Treasury payout is ambiguous with change');
      const value = this.unwrapExact(payment.assets.nativeToken);
      if (value < this.configs.minimumUtxoValue)
        throw Error('Payment is below minimum output value');
      return { lockingBytecode: hexToBin(script), valueSatoshis: value };
    });
    const scripts = outputs
      .map((output) => binToHex(output.lockingBytecode))
      .concat(this.lockScript);
    const required = outputs.reduce(
      (sum, output) => sum + output.valueSatoshis,
      0n,
    );
    if (required > BCH_MAX_MONEY)
      throw Error('Payment value exceeds BCH money limit');
    if (
      !Array.isArray(unsignedTransactions) ||
      !Array.isArray(serializedSignedTransactions) ||
      unsignedTransactions.length > 1000 ||
      serializedSignedTransactions.length > 1000
    )
      throw Error('Invalid reservation sets');
    const forbidden = new Set<string>();
    /**
     * Reserve every input of an already policy-validated pending envelope.
     * @param envelope - Pending unsigned or signed treasury transaction
     */
    const reserve = (envelope: BitcoinCashTransaction) =>
      envelope.prevouts.forEach((input) =>
        forbidden.add(getBchOutpointId(input.txId, input.index)),
      );
    unsignedTransactions.forEach((transaction) =>
      reserve(this.policy(transaction, SigningStatus.UnSigned)),
    );
    for (const hex of serializedSignedTransactions) {
      const bytes = hexToBin(assertBchHex(hex, BCH_MAX_TRANSACTION_BYTES));
      const tx = decodeBchTransaction(bytes);
      if (
        tx.inputs.length > BCH_MAX_INPUTS ||
        tx.outputs.length > BCH_MAX_OUTPUTS
      )
        throw Error('Reservation cardinality exceeded');
      const parents = await Promise.all(
        tx.inputs.map((input) =>
          this.network.getPrevout(
            getBchOutpointId(
              binToHex(input.outpointTransactionHash),
              input.outpointIndex,
            ),
          ),
        ),
      );
      const reservation = new BitcoinCashTransaction(
        '',
        bytes,
        TransactionType.manual,
        parents,
        this.configs.aggregatedPublicKey,
      );
      reserve(this.policy(reservation, SigningStatus.Signed));
    }
    const selected: BitcoinCashPrevout[] = [];
    const seen = new Set<string>();
    let value = 0n;
    for (let page = 0; page < this.configs.maxUtxoPages; page++) {
      const boxes = await this.network.getAddressBoxes(
        this.configs.addresses.lock,
        page * GET_BOX_API_LIMIT,
        GET_BOX_API_LIMIT,
      );
      if (!Array.isArray(boxes) || boxes.length > GET_BOX_API_LIMIT)
        throw Error('Malformed bounded UTXO page');
      for (const box of boxes) {
        const id = getBchOutpointId(box.txId, box.index);
        if (seen.has(id)) throw Error('Duplicate network UTXO');
        seen.add(id);
        if (forbidden.has(id)) continue;
        const authenticated = this.authenticate(box);
        const assets = this.boxSelection.getBoxInfo(authenticated).assets;
        if (!this.mature(authenticated)) continue;
        if ((await this.network.isBoxUnspentAndValid(id)) !== true) continue;
        if (selected.length === BCH_MAX_INPUTS)
          throw Error('BCH input limit exceeded');
        selected.push({
          txId: box.txId,
          index: box.index,
          value: box.value,
          scriptPubKey: box.scriptPubKey,
          parentTransactionHex: box.parentTransactionHex,
        });
        value += assets.nativeToken;
        const fee = this.estimateFee(selected.length, scripts);
        if (value - required - fee >= this.configs.minimumUtxoValue) {
          const bytes = encodeTransactionBCH({
            version: 2,
            locktime: 0,
            inputs: selected.map((input) => ({
              outpointTransactionHash: hexToBin(input.txId),
              outpointIndex: input.index,
              sequenceNumber: 0xffffffff,
              unlockingBytecode: new Uint8Array(),
            })),
            outputs: [
              ...outputs,
              {
                lockingBytecode: hexToBin(this.lockScript),
                valueSatoshis: value - required - fee,
              },
            ],
          });
          const result = new BitcoinCashTransaction(
            eventId,
            bytes,
            txType,
            selected,
            this.configs.aggregatedPublicKey,
          );
          this.policy(result, SigningStatus.UnSigned);
          if (!(await this.currentInputs(result)))
            throw Error('Selected treasury inputs are no longer valid');
          return [result];
        }
      }
      if (boxes.length < GET_BOX_API_LIMIT) break;
    }
    throw Error(
      'Insufficient confirmed unreserved BCH within selection bounds',
    );
  };

  /**
   * Map validated raw input/output totals to Rosen native asset units.
   * @param transaction - BCH payment envelope under the configured treasury policy
   * @returns Token-free input and output balances converted by the TokenMap
   */
  getTransactionAssets = async (
    transaction: PaymentTransaction,
  ): Promise<TransactionAssetBalance> => {
    const envelope = this.policy(transaction);
    const tx = decodeBchTransaction(envelope.txBytes);
    return {
      inputAssets: {
        nativeToken: this.tokenMap.wrapAmount(
          BCH,
          envelope.prevouts.reduce((sum, input) => sum + input.value, 0n),
          this.CHAIN,
        ).amount,
        tokens: [],
      },
      outputAssets: {
        nativeToken: this.tokenMap.wrapAmount(
          BCH,
          tx.outputs.reduce((sum, output) => sum + output.valueSatoshis, 0n),
          this.CHAIN,
        ).amount,
        tokens: [],
      },
    };
  };

  /**
   * Reconstruct native payment recipients while excluding the final treasury change.
   * @param transaction - BCH payment envelope under the configured treasury policy
   * @returns Ordered ordinary CashAddr payments with exactly reversible Rosen amounts
   */
  extractTransactionOrder = (transaction: PaymentTransaction): PaymentOrder => {
    const tx = decodeBchTransaction(this.policy(transaction).txBytes);
    return tx.outputs.slice(0, -1).map((output) => {
      const address = lockingBytecodeToCashAddress({
        bytecode: output.lockingBytecode,
      });
      if (typeof address === 'string') throw Error('Invalid output address');
      return {
        address: address.address,
        assets: {
          nativeToken: this.wrapExact(output.valueSatoshis),
          tokens: [],
        },
      };
    });
  };

  /**
   * Map the configured raw minimum output value into Rosen native units.
   * @returns The minimum native amount represented by the configured TokenMap
   */
  getMinimumNativeToken = (): bigint =>
    this.tokenMap.wrapAmount(BCH, this.configs.minimumUtxoValue, this.CHAIN)
      .amount;
  /**
   * Check the complete fixed native spending policy for a payment envelope.
   * @param transaction - Candidate Rosen payment envelope
   * @returns Whether envelope, body, payouts, change, conversion and fee checks all succeed
   */
  verifyPaymentTransaction = async (
    transaction: PaymentTransaction,
  ): Promise<boolean> => {
    try {
      this.policy(transaction);
      return true;
    } catch {
      return false;
    }
  };
  /**
   * Check the fixed fee together with the complete native payment policy.
   * @param transaction - Candidate Rosen payment envelope
   * @returns The same policy result as verifyPaymentTransaction
   */
  verifyTransactionFee = this.verifyPaymentTransaction;
  /**
   * Validate native parent/output context without accepting token-bearing spending.
   * @param transaction - Candidate Rosen payment envelope
   * @returns Whether concrete envelope and native-only transaction checks succeed
   */
  verifyNoTokenBurned = async (
    transaction: PaymentTransaction,
  ): Promise<boolean> => {
    try {
      const envelope = this.envelope(transaction);
      validateBchNativeTransaction(
        envelope.txBytes,
        envelope.prevouts,
        this.lockScript,
      );
      return true;
    } catch {
      return false;
    }
  };
  /**
   * Check fixed native spending policy with a required signing state.
   * @param transaction - Candidate Rosen payment envelope
   * @param signingStatus - Required Signed or UnSigned state
   * @returns Whether the complete policy and required state both hold
   */
  verifyTransactionExtraConditions = (
    transaction: PaymentTransaction,
    signingStatus: SigningStatus,
  ): boolean => {
    try {
      this.policy(transaction, signingStatus);
      return true;
    } catch {
      return false;
    }
  };
  /**
   * Validate spending policy and current input usability with diagnostic status.
   * @param transaction - Candidate Rosen payment envelope
   * @param status - Required signing state; defaults to SigningStatus.Signed
   * @returns Validity and failure details distinguishing unavailable unsigned inputs
   */
  isTxValid = async (
    transaction: PaymentTransaction,
    status = SigningStatus.Signed,
  ): Promise<ValidityStatus> => {
    try {
      const envelope = this.policy(transaction, status);
      if (!(await this.currentInputs(envelope)))
        return {
          isValid: false,
          details: {
            reason:
              'Input is absent, immature or spent; signed recovery is required before retry',
            unexpected: status === SigningStatus.UnSigned,
          },
        };
      return { isValid: true, details: undefined };
    } catch {
      return {
        isValid: false,
        details: {
          reason: 'Invalid BCH envelope or network context',
          unexpected: true,
        },
      };
    }
  };
  /**
   * Sign a retained approval snapshot and independently verify its completed witnesses.
   * @param transaction - Policy-valid unsigned BCH envelope with currently usable inputs
   * @returns A new signed envelope preserving the exact approved body and approval identity
   * @throws When inputs, mediator results, signatures or caller snapshot consistency fail
   */
  signTransaction = async (
    transaction: PaymentTransaction,
  ): Promise<BitcoinCashTransaction> => {
    const original = this.policy(transaction, SigningStatus.UnSigned);
    const snapshot = original.toJson();
    const envelope = BitcoinCashTransaction.fromJson(snapshot);
    if (!(await this.currentInputs(envelope)))
      throw Error('Cannot sign invalid treasury inputs');
    const signatures: string[] = [];
    for (let i = 0; i < envelope.prevouts.length; i++) {
      if (original.toJson() !== snapshot)
        throw Error('Approval envelope changed during signing');
      const response = await this.signMediator.sign(
        getBchSigningDigest(
          envelope.txBytes,
          envelope.prevouts,
          this.lockScript,
          i,
        ),
      );
      if (!response || typeof response.signature !== 'string')
        throw Error('Malformed ECDSA mediator response');
      signatures.push(response.signature);
    }
    if (original.toJson() !== snapshot)
      throw Error('Approval envelope changed during signing');
    const result = envelope.withSignatures(signatures);
    this.policy(result, SigningStatus.Signed);
    if (
      result.txId !== envelope.txId ||
      !isSameBchTransactionBody(envelope.txBytes, result.txBytes)
    )
      throw Error('Signed approval body mismatch');
    return result;
  };
  /**
   * Query the mediator for active requests covering the approval's ordered input digests.
   * @param transaction - Policy-valid unsigned BCH envelope
   * @returns Whether any input digest has an active signing request
   * @throws When mediator status is nonboolean or envelope policy is invalid
   */
  isTransactionInSign = async (
    transaction: PaymentTransaction,
  ): Promise<boolean> => {
    const envelope = this.policy(transaction, SigningStatus.UnSigned);
    for (let i = 0; i < envelope.prevouts.length; i++) {
      const status = await this.signMediator.isInSign(
        getBchSigningDigest(
          envelope.txBytes,
          envelope.prevouts,
          this.lockScript,
          i,
        ),
      );
      if (typeof status !== 'boolean')
        throw Error('Malformed signing request status');
      if (status) return true;
    }
    return false;
  };
  /**
   * Recheck a signed snapshot and current treasury inputs before provider submission.
   * @param transaction - Policy-valid fully signed BCH envelope
   * @returns Completion after the provider accepts submission
   * @throws When signing state, inputs, signed identity or caller snapshot consistency fail
   */
  submitTransaction = async (
    transaction: PaymentTransaction,
  ): Promise<void> => {
    const original = this.policy(transaction, SigningStatus.Signed);
    const snapshot = original.toJson();
    const envelope = BitcoinCashTransaction.fromJson(snapshot);
    const actualId = this.getSignedTransactionId(envelope);
    if (!(await this.currentInputs(envelope)))
      throw Error('Cannot submit invalid treasury inputs');
    if (
      original.toJson() !== snapshot ||
      this.getSignedTransactionId(envelope) !== actualId
    )
      throw Error('Signed envelope changed before submission');
    await this.network.submitTransaction(envelope);
  };
  /**
   * Resolve exact signed chain identity after full signed-envelope policy validation.
   * @param transaction - Fully signed BCH payment envelope
   * @returns The actual hash matching its exact signed bytes
   * @throws When the envelope is unsigned or its reported signed identity is inconsistent
   */
  getSignedTransactionId = (transaction: PaymentTransaction): string => {
    const envelope = this.policy(transaction, SigningStatus.Signed);
    const id = envelope.getActualTxId();
    if (!id || id !== getBchActualTxId(envelope.txBytes))
      throw Error('Invalid signed BCH chain identity');
    return id;
  };
  /**
   * Restore a signed envelope from retained approval context and bounded wallet history.
   * @param transaction - Persisted unsigned or already signed BCH payment envelope
   * @returns The signed envelope, or undefined after a complete scan finds no candidate
   * @throws When history, approved body, caller snapshot or recovered signature checks fail
   */
  getRecoveredTransaction = async (
    transaction: PaymentTransaction,
  ): Promise<BitcoinCashTransaction | undefined> => {
    const envelope = this.policy(transaction);
    if (envelope.isSigned()) return this.policy(envelope, SigningStatus.Signed);
    this.policy(envelope, SigningStatus.UnSigned);
    const snapshot = envelope.toJson();
    const bytes = await this.network.findSignedTransaction(
      getBchUnsignedBytes(envelope.txBytes),
    );
    if (envelope.toJson() !== snapshot)
      throw Error('Approval envelope changed during recovery');
    if (!bytes) return undefined;
    if (!isSameBchTransactionBody(envelope.txBytes, bytes))
      throw Error('Recovered BCH approval body mismatch');
    return this.policy(
      new BitcoinCashTransaction(
        envelope.eventId,
        bytes,
        envelope.txType,
        envelope.prevouts,
        envelope.publicKey,
      ),
      SigningStatus.Signed,
    );
  };
  /**
   * Resolve signed identity using a persisted approval envelope and recovery when needed.
   * @param approvalId - Exact unsigned-body approval hash
   * @param transaction - Persisted approval envelope; omission is rejected despite the base signature
   * @returns The verified actual signed transaction hash
   * @throws NotFoundError when no signed body is found and the unsigned inputs remain usable
   * @throws When context is absent/inconsistent, recovery fails or unmatched inputs are unavailable
   */
  getActualTxId = async (
    approvalId: string,
    transaction?: PaymentTransaction,
  ): Promise<string> => {
    if (!transaction)
      throw Error('BCH approval ID lookup requires a persisted envelope');
    const envelope = this.policy(transaction);
    if (envelope.txId !== approvalId)
      throw Error('BCH approval context mismatch');
    if (envelope.isSigned()) return this.getSignedTransactionId(envelope);
    const recovered = await this.getRecoveredTransaction(envelope);
    if (recovered) return this.getSignedTransactionId(recovered);
    if (!(await this.currentInputs(envelope)))
      throw Error(
        'BCH recovery found no signed body and approval inputs are unavailable',
      );
    throw new NotFoundError(
      'No signed BCH transaction found for persisted approval body',
    );
  };
  /**
   * Compare an actual source or recovered signed transaction's confirmations with policy.
   * @param approvalId - Actual hash for lock deposits, or approval hash for spending transactions
   * @param txType - Transaction type selecting the confirmation threshold and identity route
   * @param transaction - Required persisted spending envelope; must be omitted for lock deposits
   * @returns NotFound, NotConfirmedEnough or ConfirmedEnough from validated confirmation data
   * @throws When identity context, recovery or the provider confirmation count is malformed
   */
  getTxConfirmationStatus = async (
    approvalId: string,
    txType: TransactionType,
    transaction?: PaymentTransaction,
  ): Promise<ConfirmationStatus> => {
    let actualId: string;
    if (txType === TransactionType.lock) {
      // Source-deposit observers already hold an actual on-chain transaction ID.
      // Payment envelopes belong to the approval/recovery path exclusively.
      if (
        transaction !== undefined ||
        typeof approvalId !== 'string' ||
        !/^[0-9a-f]{64}$/.test(approvalId)
      )
        throw Error('Invalid BCH source-deposit confirmation context');
      actualId = approvalId;
    } else {
      try {
        actualId = await this.getActualTxId(approvalId, transaction);
      } catch (error) {
        if (error instanceof NotFoundError) return ConfirmationStatus.NotFound;
        throw error;
      }
    }
    const confirmations = await this.network.getTxConfirmation(actualId);
    if (!Number.isSafeInteger(confirmations) || confirmations < -1)
      throw Error('Malformed BCH confirmation status');
    if (confirmations === -1) return ConfirmationStatus.NotFound;
    return confirmations >= this.getTxRequiredConfirmation(txType)
      ? ConfirmationStatus.ConfirmedEnough
      : ConfirmationStatus.NotConfirmedEnough;
  };
  /**
   * Query mempool membership only after resolving a verified signed chain identity.
   * @param approvalId - Exact unsigned-body approval hash
   * @param transaction - Required persisted approval envelope; omission is rejected
   * @returns Provider membership, or false after a complete lookup establishes no signed body
   * @throws When context/recovery fails or provider membership is nonboolean
   */
  isTxInMempool = async (
    approvalId: string,
    transaction?: PaymentTransaction,
  ): Promise<boolean> => {
    try {
      const status = await this.network.isTxInMempool(
        await this.getActualTxId(approvalId, transaction),
      );
      if (typeof status !== 'boolean')
        throw Error('Malformed BCH mempool status');
      return status;
    } catch (error) {
      if (error instanceof NotFoundError) return false;
      throw error;
    }
  };
  /**
   * Restore canonical persisted JSON and apply this treasury's spending policy.
   * @param json - Bounded canonical BCH envelope JSON
   * @returns The validated unsigned or signed payment envelope
   */
  PaymentTransactionFromJson = (json: string): BitcoinCashTransaction =>
    this.policy(BitcoinCashTransaction.fromJson(json));
  /**
   * Import bounded raw bytes using currently usable parent context for every input.
   * @param hex - Canonical unsigned or signed native transaction hexadecimal bytes
   * @returns A validated manual-payment envelope for the configured treasury key
   * @throws When bytes, spending policy or current parent availability/maturity fail
   */
  rawTxToPaymentTransaction = async (
    hex: string,
  ): Promise<BitcoinCashTransaction> => {
    const bytes = hexToBin(assertBchHex(hex, BCH_MAX_TRANSACTION_BYTES));
    const tx = decodeBchTransaction(bytes);
    if (
      tx.inputs.length > BCH_MAX_INPUTS ||
      tx.outputs.length > BCH_MAX_OUTPUTS
    )
      throw Error('Raw transaction cardinality limit exceeded');
    const prevouts: BitcoinCashPrevout[] = [];
    for (const input of tx.inputs) {
      const current = await this.network.getUtxo(
        getBchOutpointId(
          binToHex(input.outpointTransactionHash),
          input.outpointIndex,
        ),
      );
      if (!current) throw Error('Raw transaction input unavailable');
      this.authenticate(current);
      if (!this.mature(current))
        throw Error('Raw transaction input is immature');
      prevouts.push({
        txId: current.txId,
        index: current.index,
        value: current.value,
        scriptPubKey: current.scriptPubKey,
        parentTransactionHex: current.parentTransactionHex,
      });
    }
    const envelope = new BitcoinCashTransaction(
      '',
      bytes,
      TransactionType.manual,
      prevouts,
      this.configs.aggregatedPublicKey,
    );
    this.policy(envelope);
    if (!(await this.currentInputs(envelope)))
      throw Error('Raw transaction input is spent');
    return envelope;
  };
  /**
   * Track spent outpoints from bounded current mempool transactions for the native treasury.
   * @param address - Exact configured treasury address
   * @param tokenId - Must be omitted; token-specific mempool tracking is unsupported
   * @returns A map marking consumed outpoints with undefined; new outputs are not chained
   * @throws When the target, transaction identity or mempool/cardinality bound is invalid
   */
  getMempoolBoxMapping = async (
    address: string,
    tokenId?: string,
  ): Promise<Map<string, BitcoinCashUtxo | undefined>> => {
    if (tokenId !== undefined || outputScript(address) !== this.lockScript)
      throw Error('Unsupported BCH mempool tracking target');
    const result = new Map<string, BitcoinCashUtxo | undefined>();
    const txs = await this.network.getMempoolTransactions();
    if (!Array.isArray(txs) || txs.length > 1000)
      throw Error('Mempool scan bound exceeded');
    for (const transaction of txs) {
      const bytes = hexToBin(
        assertBchHex(transaction.hex, BCH_MAX_TRANSACTION_BYTES),
      );
      if (getBchActualTxId(bytes) !== transaction.txid)
        throw Error('Mempool transaction identity mismatch');
      const tx = decodeBchTransaction(bytes);
      if (
        tx.inputs.length > BCH_MAX_INPUTS ||
        tx.outputs.length > BCH_MAX_OUTPUTS
      )
        throw Error('Mempool transaction cardinality exceeded');
      tx.inputs.forEach((input) =>
        result.set(
          getBchOutpointId(
            binToHex(input.outpointTransactionHash),
            input.outpointIndex,
          ),
          undefined,
        ),
      );
    }
    return result;
  };
  /**
   * Decode bounded source-deposit bytes and cross-check identity and RPC cardinalities.
   * @param transaction - Verbose source transaction retaining exact raw hexadecimal bytes
   * @returns Canonical decoded source fields under the independent 4096-element source limits
   * @throws When bytes, identity or RPC input/output counts are inconsistent
   */
  private sourceTransaction = (transaction: BitcoinCashTx) => {
    const bytes = hexToBin(
      assertBchHex(transaction.hex, BCH_MAX_PARENT_TRANSACTION_BYTES),
    );
    const tx = decodeTransactionBCH(Uint8Array.from(bytes));
    if (
      typeof tx === 'string' ||
      binToHex(encodeTransactionBCH(tx)) !== transaction.hex ||
      hashTransaction(bytes) !== transaction.txid ||
      !tx.inputs.length ||
      tx.inputs.length > 4096 ||
      tx.outputs.length < 2 ||
      tx.outputs.length > 4096 ||
      !Array.isArray(transaction.vin) ||
      transaction.vin.length !== tx.inputs.length ||
      !Array.isArray(transaction.vout) ||
      transaction.vout.length !== tx.outputs.length
    )
      throw Error('Invalid source-deposit transaction');
    return tx;
  };
  /**
   * Validate and serialize source-deposit transport for the shared universal extractor.
   * @param transaction - Verbose source transaction with canonical raw bytes
   * @returns JSON within the 16000000-character metadata bound
   * @throws When source validation or the serialized metadata size limit fails
   */
  protected serializeTx = (transaction: BitcoinCashTx): string => {
    this.sourceTransaction(transaction);
    const json = JSON.stringify(transaction);
    if (json.length > 16_000_000)
      throw Error('Source-deposit metadata size limit exceeded');
    return json;
  };
  /**
   * Require one positive token-free treasury output in validated source bytes.
   * @param transaction - Verbose source-deposit transaction with exact raw bytes
   * @param _block - Interface block context; membership checks belong to the provider
   * @returns Whether source validation and the unique native lock-output condition hold
   */
  verifyLockTransactionExtraConditions = async (
    transaction: BitcoinCashTx,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Preserve the abstract lock-verification signature.
    _block: BlockInfo,
  ): Promise<boolean> => {
    try {
      const tx = this.sourceTransaction(transaction);
      const locks = tx.outputs.filter(
        (output) => binToHex(output.lockingBytecode) === this.lockScript,
      );
      return (
        locks.length === 1 &&
        locks[0].token === undefined &&
        locks[0].valueSatoshis > 0n
      );
    } catch {
      return false;
    }
  };
}

export default BitcoinCashChain;
