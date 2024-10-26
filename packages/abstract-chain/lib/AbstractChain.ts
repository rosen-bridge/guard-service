import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { AbstractRosenDataExtractor } from '@rosen-bridge/rosen-extractor';
import { RosenTokens, TokenMap } from '@rosen-bridge/tokens';
import { blake2b } from 'blakejs';
import ChainUtils from './ChainUtils';
import {
  FailedError,
  ImpossibleBehavior,
  NetworkError,
  NotFoundError,
  UnexpectedApiError,
  ValueError,
} from './errors';
import AbstractChainNetwork from './network/AbstractChainNetwork';
import {
  AssetBalance,
  BlockInfo,
  ChainConfigs,
  ConfirmationStatus,
  EventTrigger,
  PaymentOrder,
  SigningStatus,
  TokenDetail,
  TransactionAssetBalance,
  TransactionType,
  ValidityStatus,
} from './types';
import PaymentTransaction from './PaymentTransaction';

abstract class AbstractChain<TxType> {
  abstract readonly CHAIN: string;
  abstract readonly NATIVE_TOKEN_ID: string;
  protected abstract extractor: AbstractRosenDataExtractor<string> | undefined;
  protected network: AbstractChainNetwork<TxType>;
  protected configs: ChainConfigs;
  protected tokenMap: TokenMap;
  logger: AbstractLogger;

  constructor(
    network: AbstractChainNetwork<TxType>,
    configs: ChainConfigs,
    tokens: RosenTokens,
    logger?: AbstractLogger
  ) {
    this.network = network;
    this.configs = configs;
    this.tokenMap = new TokenMap(tokens);
    this.logger = logger ? logger : new DummyLogger();
  }

  /**
   * generates a single unsigned PaymentTransaction for payment order
   *  throws error if its not possible with single transaction
   * @param eventId the id of event
   * @param txType transaction type
   * @param order the payment order (list of single payments)
   * @param unsignedTransactions ongoing unsigned PaymentTransactions (used for preventing double spend)
   * @param serializedSignedTransactions the serialized string of ongoing signed transactions (used for chaining transaction)
   * @returns the generated PaymentTransaction
   */
  generateTransaction = async (
    eventId: string,
    txType: TransactionType,
    order: PaymentOrder,
    unsignedTransactions: PaymentTransaction[],
    serializedSignedTransactions: string[],
    ...extra: Array<any>
  ): Promise<PaymentTransaction> => {
    const txs = await this.generateMultipleTransactions(
      eventId,
      txType,
      order,
      unsignedTransactions,
      serializedSignedTransactions,
      ...extra
    );
    if (txs.length !== 1)
      throw Error(
        `Cannot generate single tx for given order. [${txs.length}] txs are generated`
      );
    return txs[0];
  };

  /**
   * generates single or multiple unsigned PaymentTransactions for a payment order
   * @param eventId the id of event
   * @param txType transaction type
   * @param order the payment order (list of single payments)
   * @param unsignedTransactions ongoing unsigned PaymentTransactions (used for preventing double spend)
   * @param serializedSignedTransactions the serialized string of ongoing signed transactions (used for chaining transaction)
   * @returns the generated PaymentTransaction
   */
  abstract generateMultipleTransactions: (
    eventId: string,
    txType: TransactionType,
    order: PaymentOrder,
    unsignedTransactions: PaymentTransaction[],
    serializedSignedTransactions: string[],
    ...extra: Array<any>
  ) => Promise<PaymentTransaction[]>;

  /**
   * gets input and output assets of a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns an object containing the amount of input and output assets
   */
  abstract getTransactionAssets: (
    transaction: PaymentTransaction
  ) => Promise<TransactionAssetBalance>;

  /**
   * extracts payment order of a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns the transaction payment order (list of single payments)
   */
  abstract extractTransactionOrder: (
    transaction: PaymentTransaction
  ) => PaymentOrder;

  /**
   * verifies transaction fee for a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns true if the transaction fee is verified
   */
  abstract verifyTransactionFee: (
    transaction: PaymentTransaction
  ) => Promise<boolean>;

  /**
   * verifies no token burned in a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns true if no token burned
   */
  verifyNoTokenBurned = async (
    transaction: PaymentTransaction
  ): Promise<boolean> => {
    const assets = await this.getTransactionAssets(transaction);
    return ChainUtils.isEqualAssetBalance(
      assets.inputAssets,
      assets.outputAssets
    );
  };

  /**
   * verifies additional conditions for a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns true if the transaction is verified
   */
  abstract verifyTransactionExtraConditions: (
    transaction: PaymentTransaction
  ) => boolean;

  /**
   * verifies an event data with its corresponding lock transaction
   * @param event the event trigger model
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @returns true if the event verified
   */
  verifyEvent = async (
    event: EventTrigger,
    feeConfig: ChainMinimumFee
  ): Promise<boolean> => {
    if (!this.extractor)
      throw new ImpossibleBehavior(
        `rosen-extractor is not defined for chain [${this.CHAIN}]`
      );

    const eventId = Buffer.from(
      blake2b(event.sourceTxId, undefined, 32)
    ).toString('hex');

    try {
      const blockTxs = await this.network.getBlockTransactionIds(
        event.sourceBlockId
      );
      if (!blockTxs.includes(event.sourceTxId)) {
        this.logger.info(
          `Event [${eventId}] is not valid, lock tx [${event.sourceTxId}] is not in event source block [${event.sourceBlockId}]`
        );
        return false;
      }
      const tx = await this.network.getTransaction(
        event.sourceTxId,
        event.sourceBlockId
      );
      const blockInfo = await this.network.getBlockInfo(event.sourceBlockId);
      const data = this.extractor.get(this.serializeTx(tx));
      if (!data) {
        this.logger.info(
          `Event [${eventId}] is not valid, failed to extract rosen data from lock transaction`
        );
        return false;
      }
      if (
        event.fromChain == this.CHAIN &&
        event.toChain == data.toChain &&
        event.networkFee == data.networkFee &&
        event.bridgeFee == data.bridgeFee &&
        event.amount == data.amount &&
        event.sourceChainTokenId == data.sourceChainTokenId &&
        event.targetChainTokenId == data.targetChainTokenId &&
        event.toAddress == data.toAddress &&
        event.fromAddress == data.fromAddress &&
        event.sourceChainHeight == blockInfo.height
      ) {
        try {
          // check if amount is more than fees
          const eventAmount = BigInt(event.amount);
          let bridgeFee = BigInt(event.bridgeFee);
          if (feeConfig.bridgeFee > bridgeFee) bridgeFee = feeConfig.bridgeFee;
          const transferringAmountFee =
            (eventAmount * feeConfig.feeRatio) / feeConfig.feeRatioDivisor;
          if (transferringAmountFee > bridgeFee)
            bridgeFee = transferringAmountFee;
          const networkFee =
            BigInt(event.networkFee) > feeConfig.networkFee
              ? BigInt(event.networkFee)
              : feeConfig.networkFee;
          if (eventAmount < bridgeFee + networkFee) {
            this.logger.info(
              `Event [${eventId}] is not valid, event amount [${eventAmount}] is less than sum of bridgeFee [${bridgeFee}] and networkFee [${networkFee}]`
            );
            return false;
          }
        } catch (e) {
          throw new UnexpectedApiError(
            `Failed in comparing event amount to fees: ${e}`
          );
        }
        if (await this.verifyLockTransactionExtraConditions(tx, blockInfo)) {
          this.logger.info(
            `Event [${eventId}] has been successfully validated`
          );
          return true;
        } else {
          this.logger.info(
            `Event [${eventId}] is not valid, lock tx [${event.sourceTxId}] is not verified`
          );
          return false;
        }
      } else {
        this.logger.info(
          `Event [${eventId}] is not valid, event data does not match with lock tx [${event.sourceTxId}]`
        );
        return false;
      }
    } catch (e) {
      if (e instanceof NotFoundError) {
        this.logger.info(
          `Event [${eventId}] is not valid, lock tx [${event.sourceTxId}] is not available in network`
        );
        return false;
      } else if (
        e instanceof FailedError ||
        e instanceof NetworkError ||
        e instanceof UnexpectedApiError
      ) {
        throw Error(`Skipping event [${eventId}] validation: ${e}`);
      } else {
        this.logger.warn(`Event [${eventId}] validation failed: ${e}`);
        return false;
      }
    }
  };

  /**
   * verifies additional conditions for a event lock transaction
   * @param transaction the lock transaction
   * @param blockInfo
   * @returns true if the transaction is verified
   */
  verifyLockTransactionExtraConditions = async (
    transaction: TxType,
    blockInfo: BlockInfo
  ): Promise<boolean> => {
    throw Error(
      `You must implement 'verifyLockTransactionExtraConditions' or override 'verifyEvent' implementation`
    );
  };

  /**
   * checks if a transaction is still valid and can be sent to the network
   * Note: the `unexpected` field of the details should be true when reason of
   * being invalid is unexpected and repetition should be prevented
   * @param transaction the transaction
   * @param signingStatus
   * @returns true if the transaction is still valid
   */
  abstract isTxValid: (
    transaction: PaymentTransaction,
    signingStatus: SigningStatus
  ) => Promise<ValidityStatus>;

  /**
   * requests the corresponding signer service to sign the transaction
   * @param transaction the transaction
   * @param requiredSign the required number of sign
   * @returns the signed transaction
   */
  abstract signTransaction: (
    transaction: PaymentTransaction,
    requiredSign: number
  ) => Promise<PaymentTransaction>;

  /**
   * @param transactionType type of the transaction
   * @returns required number of confirmation
   */
  getTxRequiredConfirmation = (transactionType: TransactionType): number => {
    switch (transactionType) {
      case TransactionType.payment:
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
          `Confirmation for type [${transactionType}] is not defined in abstract chain`
        );
    }
  };

  /**
   * extracts confirmation status for a transaction
   * @param transactionId the transaction id
   * @param transactionType type of the transaction
   * @returns the transaction confirmation status
   */
  getTxConfirmationStatus = async (
    transactionId: string,
    transactionType: TransactionType
  ): Promise<ConfirmationStatus> => {
    const requiredConfirmation =
      this.getTxRequiredConfirmation(transactionType);
    const confirmation = await this.network.getTxConfirmation(transactionId);
    if (confirmation >= requiredConfirmation)
      return ConfirmationStatus.ConfirmedEnough;
    else if (confirmation === -1) return ConfirmationStatus.NotFound;
    else return ConfirmationStatus.NotConfirmedEnough;
  };

  /**
   * gets the amount of each asset in the address
   * @param address
   * @returns an object containing the amount of each asset
   */
  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    if (address === '') {
      this.logger.debug(`returning empty assets for address [${address}]`);
      return { nativeToken: 0n, tokens: [] };
    }
    const rawBalance = await this.network.getAddressAssets(address);
    const wrappedNativeToken = this.tokenMap.wrapAmount(
      this.NATIVE_TOKEN_ID,
      rawBalance.nativeToken,
      this.CHAIN
    ).amount;
    const wrappedAssets = rawBalance.tokens.map((token) => ({
      id: token.id,
      value: this.tokenMap.wrapAmount(token.id, token.value, this.CHAIN).amount,
    }));
    return {
      nativeToken: wrappedNativeToken,
      tokens: wrappedAssets,
    };
  };

  /**
   * gets the amount of each asset in the lock address
   * @returns an object containing the amount of each asset
   */
  getLockAddressAssets = async (): Promise<AssetBalance> =>
    await this.getAddressAssets(this.configs.addresses.lock);

  /**
   * gets the amount of each asset in the cold storage address
   * @returns an object containing the amount of each asset
   */
  getColdAddressAssets = async (): Promise<AssetBalance> =>
    await this.getAddressAssets(this.configs.addresses.cold);

  /**
   * gets the blockchain height
   * @returns the blockchain height
   */
  getHeight = async (): Promise<number> => await this.network.getHeight();

  /**
   * submits a transaction to the blockchain
   * @param transaction the transaction
   */
  abstract submitTransaction: (
    transaction: PaymentTransaction
  ) => Promise<void>;

  /**
   * checks if a transaction is in mempool (returns false if the chain has no mempool)
   * @param transactionId the transaction id
   * @returns true if the transaction is in mempool
   */
  abstract isTxInMempool: (transactionId: string) => Promise<boolean>;

  /**
   * checks if lock address assets are more than required assets or not
   * @param required required amount of assets
   * @returns true if lock assets are more than required assets
   */
  hasLockAddressEnoughAssets = async (
    required: AssetBalance
  ): Promise<boolean> => {
    const lockAssets = await this.getLockAddressAssets();
    try {
      ChainUtils.subtractAssetBalance(lockAssets, required);
    } catch (e) {
      if (e instanceof ValueError) {
        this.logger.warn(e.message);
        return false;
      } else throw e;
    }
    return true;
  };

  /**
   * gets the minimum amount of native token for transferring asset
   * @returns the minimum amount
   */
  abstract getMinimumNativeToken: () => bigint;

  /**
   * gets the RWT token id
   * @returns RWT token id
   */
  getRWTToken = (): string => {
    return this.configs.rwtId;
  };

  /**
   * converts json representation of the payment transaction to PaymentTransaction
   * @returns PaymentTransaction object
   */
  abstract PaymentTransactionFromJson: (
    jsonString: string
  ) => PaymentTransaction;

  /**
   * generates PaymentTransaction object from raw tx json string
   * @param rawTxJsonString
   * @returns PaymentTransaction object
   */
  abstract rawTxToPaymentTransaction: (
    rawTxJsonString: string
  ) => Promise<PaymentTransaction>;

  /**
   * returns chain config
   * @assetId
   */
  getChainConfigs = (): ChainConfigs => this.configs;

  /**
   * gets token details (name, decimals)
   * @param tokenId
   */
  getTokenDetail = (tokenId: string): Promise<TokenDetail> =>
    this.network.getTokenDetail(tokenId);

  /**
   * serializes the transaction of this chain into string
   */
  protected abstract serializeTx: (tx: TxType) => string;
}

export default AbstractChain;
