import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractUtxoChain,
  AssetBalance,
  BlockInfo,
  PaymentOrder,
  PaymentTransaction,
  SigningStatus,
  TransactionAssetBalance,
  TransactionType,
  ValidityStatus,
} from '@rosen-chains/abstract-chain';
import AbstractBitcoinRunesNetwork from './network/AbstractBitcoinRunesNetwork';
import BitcoinRunesTransaction from './BitcoinRunesTransaction';
import {
  BitcoinRunesConfigs,
  BitcoinRunesTx,
  BitcoinRunesUtxo,
  TssSignFunction,
} from './types';
import { Psbt, address, payments } from 'bitcoinjs-lib';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { BITCOIN_RUNES_CHAIN } from './constants';
import { BitcoinRunesBoxSelection } from '@rosen-bridge/bitcoin-runes-utxo-selection';
import { RunesRosenExtractor } from '@rosen-bridge/rosen-extractor';
import { TokenMap } from '@rosen-bridge/tokens';
import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';

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
    throw Error(`not implemented`);
  };

  /**
   * gets input and output assets of a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns an object containing the amount of input and output assets
   */
  getTransactionAssets = async (
    transaction: PaymentTransaction
  ): Promise<TransactionAssetBalance> => {
    throw Error(`not implemented`);
  };

  /**
   * extracts payment order of a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns the transaction payment order (list of single payments)
   */
  extractTransactionOrder = (transaction: PaymentTransaction): PaymentOrder => {
    throw Error(`not implemented`);
  };

  /**
   * verifies transaction fee for a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns true if the transaction fee is verified
   */
  verifyTransactionFee = async (
    transaction: PaymentTransaction
  ): Promise<boolean> => {
    throw Error(`not implemented`);
  };

  /**
   * verifies no token burned in a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns true if no token burned
   */
  verifyNoTokenBurned = async (
    transaction: PaymentTransaction
  ): Promise<boolean> => {
    throw Error(`not implemented`);
  };

  /**
   * verifies additional conditions for a BitcoinTransaction
   * - check change box
   * @param transaction the PaymentTransaction
   * @param signingStatus the signing status of transaction
   * @returns true if the transaction is verified
   */
  verifyTransactionExtraConditions = (
    transaction: PaymentTransaction,
    signingStatus: SigningStatus = SigningStatus.UnSigned
  ): boolean => {
    throw Error(`not implemented`);
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
    throw Error(`not implemented`);
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
    throw Error(`not implemented`);
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
    throw Error(`not implemented`);
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
    const wrappedNativeToken = this.tokenMap.wrapAmount(
      this.NATIVE_TOKEN_ID, // BTC
      rawBalance.nativeToken,
      BITCOIN_CHAIN
    ).amount;
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
    throw Error(`not implemented`);
  };

  /**
   * checks if a transaction is in mempool (returns false if the chain has no mempool)
   * @param transactionId the transaction id
   * @returns true if the transaction is in mempool
   */
  isTxInMempool = async (transactionId: string): Promise<boolean> => {
    throw Error(`not implemented`);
  };

  /**
   * gets the minimum amount of native token for transferring asset
   * @returns the minimum amount
   */
  getMinimumNativeToken = (): bigint => {
    throw Error(`not implemented`);
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
    throw Error(`not implemented`);
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
    throw Error(`not implemented`);
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
    throw Error(`not implemented`);
  };

  /**
   * gets the minimum amount of satoshi for a utxo that can cover
   * additional fee for adding it to a tx
   * Note: it returns the actual value
   * @returns the minimum amount
   */
  minimumMeaningfulSatoshi = (feeRatio: number): bigint => {
    throw Error(`not implemented`);
  };

  /**
   * serializes the transaction of this chain into string
   */
  protected serializeTx = (tx: BitcoinRunesTx): string =>
    JsonBigInt.stringify(tx);

  /**
   * verifies consistency within the PaymentTransaction object
   * @param transaction the PaymentTransaction
   * @returns true if the transaction is verified
   */
  verifyPaymentTransaction = async (
    transaction: PaymentTransaction
  ): Promise<boolean> => {
    throw Error(`not implemented`);
  };
}

export default BitcoinRunesChain;
