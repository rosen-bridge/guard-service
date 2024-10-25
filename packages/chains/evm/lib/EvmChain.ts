import { RosenTokens } from '@rosen-bridge/tokens';
import JSONBigInt from '@rosen-bridge/json-bigint';
import {
  AbstractChain,
  ChainUtils,
  NotEnoughAssetsError,
  PaymentOrder,
  PaymentTransaction,
  SigningStatus,
  TransactionAssetBalance,
  TransactionType,
  PaymentTransactionJsonModel,
  AssetBalance,
  AssetNotSupportedError,
  BlockInfo,
  ImpossibleBehavior,
  TransactionFormatError,
  TokenInfo,
  ValidityStatus,
} from '@rosen-chains/abstract-chain';
import { EvmRosenExtractor } from '@rosen-bridge/rosen-extractor';
import AbstractEvmNetwork from './network/AbstractEvmNetwork';
import { EvmConfigs, EvmTxStatus, TssSignFunction } from './types';
import { Signature, Transaction } from 'ethers';
import Serializer from './Serializer';
import * as EvmUtils from './EvmUtils';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';

abstract class EvmChain extends AbstractChain<Transaction> {
  declare network: AbstractEvmNetwork;
  declare configs: EvmConfigs;
  abstract CHAIN_ID: bigint;
  extractor: EvmRosenExtractor | undefined;

  supportedTokens: Array<string>;
  protected signFunction: TssSignFunction;

  constructor(
    network: AbstractEvmNetwork,
    configs: EvmConfigs,
    tokens: RosenTokens,
    supportedTokens: Array<string>,
    signFunction: TssSignFunction,
    CHAIN: string,
    NATIVE_TOKEN_ID: string,
    logger?: AbstractLogger
  ) {
    super(network, configs, tokens, logger);
    this.supportedTokens = supportedTokens;
    this.signFunction = signFunction;
    this.extractor = new EvmRosenExtractor(
      this.configs.addresses.lock,
      tokens,
      CHAIN,
      NATIVE_TOKEN_ID,
      logger
    );
  }

  /**
   * generates single or multiple unsigned PaymentTransactions for a payment order
   * performs the following checks before:
   * - in case of erc-20 transfer, the tokenId must be in our supported list
   * - number of pending transactions shouldn't exceed our maxParallelTx
   * - lock address should have enough balance
   * - nonces must be set in sequential order starting from next available nonce
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
  ): Promise<PaymentTransaction[]> => {
    // split orders and aggregate
    const orders = EvmUtils.splitPaymentOrders(order);
    let orderRequiredAssets: AssetBalance = {
      nativeToken: 0n,
      tokens: [],
    };
    orders.forEach((singleOrder) => {
      if (singleOrder.assets.tokens.length === 1) {
        const assetId = singleOrder.assets.tokens[0].id;
        if (!this.supportedTokens.includes(assetId)) {
          throw new AssetNotSupportedError(
            `Asset id [${assetId}] is not supported`
          );
        }
        orderRequiredAssets = ChainUtils.sumAssetBalance(
          orderRequiredAssets,
          singleOrder.assets
        );
      }
    });
    this.logger.debug(
      `Order required assets: ${JsonBigInt.stringify(orderRequiredAssets)}`
    );

    // check the number of parallel transactions won't be exceeded
    let nextNonce = await this.network.getAddressNextAvailableNonce(
      this.configs.addresses.lock
    );
    const nonceCount = new Map<number, number>();
    unsignedTransactions.map((tx) => {
      const nonce = Serializer.deserialize(tx.txBytes).nonce;
      const count = nonceCount.get(nonce);
      count !== undefined
        ? nonceCount.set(nonce, count + 1)
        : nonceCount.set(nonce, 1);
    });
    serializedSignedTransactions.map((tx) => {
      const nonce = Serializer.deserialize(
        Uint8Array.from(Buffer.from(tx, 'hex'))
      ).nonce;
      const count = nonceCount.get(nonce);
      count !== undefined
        ? nonceCount.set(nonce, count + 1)
        : nonceCount.set(nonce, 1);
    });
    while ((nonceCount.get(nextNonce) ?? 0) >= this.configs.maxParallelTx) {
      nextNonce++;
    }

    const gasPrice = await this.network.getMaxFeePerGas();

    // check the balance in the lock address
    const requiredAssets: AssetBalance = ChainUtils.sumAssetBalance(
      orderRequiredAssets,
      {
        nativeToken: this.tokenMap.wrapAmount(
          this.NATIVE_TOKEN_ID,
          this.configs.gasLimitCap * BigInt(orders.length) * gasPrice,
          this.CHAIN
        ).amount,
        tokens: [],
      }
    );
    this.logger.debug(
      `Required assets: ${JsonBigInt.stringify(requiredAssets)}`
    );

    if (!(await this.hasLockAddressEnoughAssets(requiredAssets))) {
      const neededETH = requiredAssets.nativeToken.toString();
      const neededTokens = JSONBigInt.stringify(requiredAssets.tokens);
      throw new NotEnoughAssetsError(
        `Locked assets cannot cover required assets. native: ${neededETH}, erc-20: ${neededTokens}`
      );
    }

    // try to generate transactions
    let totalGas = 0n;
    const maxPriorityFeePerGas = await this.network.getMaxPriorityFeePerGas();
    const evmTrxs: Array<PaymentTransaction> = [];
    for (const singleOrder of orders) {
      let trx;
      if (singleOrder.assets.nativeToken !== 0n) {
        const value = this.tokenMap.unwrapAmount(
          this.NATIVE_TOKEN_ID,
          singleOrder.assets.nativeToken,
          this.CHAIN
        ).amount;
        trx = Transaction.from({
          type: 2,
          to: singleOrder.address,
          nonce: nextNonce,
          maxPriorityFeePerGas: maxPriorityFeePerGas,
          maxFeePerGas: gasPrice,
          data: '0x' + eventId,
          value: value,
          chainId: this.CHAIN_ID,
        });
      } else {
        const token = singleOrder.assets.tokens[0];
        const tokenValue = this.tokenMap.unwrapAmount(
          token.id,
          token.value,
          this.CHAIN
        ).amount;
        const data = EvmUtils.encodeTransferCallData(
          token.id,
          singleOrder.address,
          tokenValue
        );

        trx = Transaction.from({
          type: 2,
          to: token.id,
          nonce: nextNonce,
          maxPriorityFeePerGas: maxPriorityFeePerGas,
          maxFeePerGas: gasPrice,
          data: data + eventId,
          value: 0n,
          chainId: this.CHAIN_ID,
        });
      }
      let estimatedRequiredGas = await this.network.getGasRequired(trx);
      if (estimatedRequiredGas > this.configs.gasLimitCap) {
        this.logger.warn(
          `Estimated required gas is more than gas limit cap config and cap is used for the tx [${estimatedRequiredGas} > ${this.configs.gasLimitCap}]`
        );
        estimatedRequiredGas = this.configs.gasLimitCap;
      }
      trx.gasLimit = estimatedRequiredGas * this.configs.gasLimitMultiplier;
      totalGas += trx.gasLimit;

      evmTrxs.push(
        new PaymentTransaction(
          this.CHAIN,
          trx.unsignedHash,
          eventId,
          Serializer.serialize(trx),
          txType
        )
      );
      nextNonce += 1;
    }

    // report result
    evmTrxs.forEach((trx) => {
      this.logger.info(
        `${this.CHAIN} transaction [${trx.txId}] as type [${trx.txType}] generated for event [${trx.eventId}]`
      );
    });

    return evmTrxs;
  };

  /**
   * gets input and output assets of a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns an object containing the amount of input and output assets
   */
  getTransactionAssets = async (
    transaction: PaymentTransaction
  ): Promise<TransactionAssetBalance> => {
    const tx = Serializer.deserialize(transaction.txBytes);

    if (tx.to === null) {
      throw new TransactionFormatError(
        `Transaction [${transaction.txId}] does not have \`to\``
      );
    }

    if (tx.type !== 2) {
      throw new TransactionFormatError(
        `Transaction [${transaction.txId}] is not of type 2`
      );
    }

    if (tx.maxFeePerGas === null) {
      throw new ImpossibleBehavior(
        'Type 2 transaction can not have null maxFeePerGas'
      );
    }

    const assets: AssetBalance = {
      nativeToken: 0n,
      tokens: [],
    };

    const networkFee = tx.maxFeePerGas * tx.gasLimit;
    assets.nativeToken = tx.value + networkFee;

    if (EvmUtils.isTransfer(tx.to, tx.data)) {
      const [_, amount] = EvmUtils.decodeTransferCallData(tx.to, tx.data);
      assets.tokens.push({
        id: tx.to.toLowerCase(),
        value: amount,
      });
    }

    const wrappedAssets = ChainUtils.wrapAssetBalance(
      assets,
      this.tokenMap,
      this.NATIVE_TOKEN_ID,
      this.CHAIN
    );
    // no need to calculate outputAssets separately, they are always equal in account-based
    return {
      inputAssets: wrappedAssets,
      outputAssets: structuredClone(wrappedAssets),
    };
  };

  /**
   * extracts payment order of a PaymentTransaction
   * @param transaction the PaymentTransaction
   * @returns the transaction payment order (list of single payments)
   */
  extractTransactionOrder = (transaction: PaymentTransaction): PaymentOrder => {
    const tx = Serializer.deserialize(transaction.txBytes);

    if (tx.to === null) {
      throw new TransactionFormatError(
        `Transaction [${transaction.txId}] does not have \`to\``
      );
    }

    const payment: PaymentOrder = [];
    // native-token transfer
    if (tx.value !== 0n) {
      payment[0] = {
        address: tx.to.toLowerCase(),
        assets: {
          nativeToken: tx.value,
          tokens: [],
        },
      };
    }

    if (EvmUtils.isTransfer(tx.to, tx.data)) {
      // erc-20 transfer
      const [to, amount] = EvmUtils.decodeTransferCallData(tx.to, tx.data);
      if (amount !== 0n) {
        if (payment.length === 1 && to.toLowerCase() === tx.to.toLowerCase()) {
          payment[0].assets.tokens = [
            {
              id: to.toLowerCase(),
              value: amount,
            },
          ];
        } else {
          payment.push({
            address: to.toLowerCase(),
            assets: {
              nativeToken: 0n,
              tokens: [
                {
                  id: tx.to.toLowerCase(),
                  value: amount,
                },
              ],
            },
          });
        }
      }
    }
    return payment.map((singleOrder) => {
      singleOrder.assets = ChainUtils.wrapAssetBalance(
        singleOrder.assets,
        this.tokenMap,
        this.NATIVE_TOKEN_ID,
        this.CHAIN
      );
      return singleOrder;
    });
  };

  /**
   * verifies transaction fee for a PaymentTransaction
   * - `to` shouldn't be null
   * - transaction must of of type 2
   * - gasLimit must be as expected
   * - maxFeePerGas shouldn't be different than current network condition by more than slippage
   * - maxPriorityFeePerGas shouldn't be different than current network condition by more than slippage
   * @param transaction the PaymentTransaction
   * @returns true if the transaction fee is verified
   */
  verifyTransactionFee = async (
    transaction: PaymentTransaction
  ): Promise<boolean> => {
    let tx: Transaction;
    try {
      tx = Serializer.deserialize(transaction.txBytes);
    } catch (error) {
      this.logger.warn(
        `Failed to deserialize tx [${transaction.txId}]: ${error}`
      );
      return false;
    }

    if (tx.to === null) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: does not have \`to\``
      );
      return false;
    }

    if (tx.type !== 2) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: is not of type 2`
      );
      return false;
    }

    if (tx.maxFeePerGas === null) {
      throw new ImpossibleBehavior(
        "Type 2 transaction can't have null maxFeePerGas"
      );
    }

    if (tx.maxPriorityFeePerGas === null) {
      throw new ImpossibleBehavior(
        "Type 2 transaction can't have null maxPriorityFeePerGas"
      );
    }

    // check gas limit
    let estimatedRequiredGas = await this.network.getGasRequired(tx);
    if (estimatedRequiredGas > this.configs.gasLimitCap) {
      this.logger.info(
        `Estimated required gas is more than gas limit cap config and cap is used for verification [${estimatedRequiredGas} > ${this.configs.gasLimitCap}]`
      );
      estimatedRequiredGas = this.configs.gasLimitCap;
    }
    const gasRequired = estimatedRequiredGas * this.configs.gasLimitMultiplier;
    const gasLimitSlippage =
      (gasRequired * BigInt(this.configs.gasLimitSlippage)) / 100n;
    const gasDifference =
      tx.gasLimit >= gasRequired
        ? tx.gasLimit - gasRequired
        : gasRequired - tx.gasLimit;

    if (gasDifference > gasLimitSlippage) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: Transaction gas limit [${tx.gasLimit}] is too far from calculated gas limit [${gasRequired}]`
      );
      return false;
    }

    // check fees
    const networkMaxFee = await this.network.getMaxFeePerGas();
    const maxFeeSlippage =
      (networkMaxFee * this.configs.gasPriceSlippage) / 100n;
    const maxFeeDifference =
      tx.maxFeePerGas >= networkMaxFee
        ? tx.maxFeePerGas - networkMaxFee
        : networkMaxFee - tx.maxFeePerGas;

    if (maxFeeDifference > maxFeeSlippage) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: Transaction max fee [${tx.maxFeePerGas}] is too far from network's max fee [${networkMaxFee}]`
      );
      return false;
    }

    const networkMaxPriorityFee = await this.network.getMaxPriorityFeePerGas();
    const priorityFeeSlippage =
      (networkMaxPriorityFee * this.configs.gasPriceSlippage) / 100n;
    const maxPriorityFeeDifference =
      tx.maxPriorityFeePerGas >= networkMaxPriorityFee
        ? tx.maxPriorityFeePerGas - networkMaxPriorityFee
        : networkMaxPriorityFee - tx.maxPriorityFeePerGas;

    if (maxPriorityFeeDifference > priorityFeeSlippage) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified: Transaction max priority fee [${tx.maxPriorityFeePerGas}] is too far from network's max priority fee [${networkMaxPriorityFee}]`
      );
      return false;
    }
    return true;
  };

  /**
   * checks if a transaction is still valid and can be sent to the network
   * - transaction should not be failed in blockchain
   * - transaction's nonce should be still available
   * @param transaction the transaction
   * @param signingStatus
   * @returns true if the transaction is still valid
   */
  isTxValid = async (
    transaction: PaymentTransaction,
    signingStatus: SigningStatus
  ): Promise<ValidityStatus> => {
    let trx: Transaction;

    try {
      trx = Serializer.deserialize(transaction.txBytes);
    } catch (error) {
      this.logger.warn(
        `Tx [${transaction.txId}] is invalid: failed to deserialized due to error: ${error}`
      );
      return {
        isValid: false,
        details: {
          reason: `failed to deserialize tx`,
          unexpected: false,
        },
      };
    }

    // check if tx is failed
    const txStatus = await this.network.getTransactionStatus(transaction.txId);
    if (txStatus === EvmTxStatus.failed) {
      this.logger.info(
        `Tx [${transaction.txId}] is invalid: tx is failed in blockchain`
      );
      return {
        isValid: false,
        details: {
          reason: `tx is failed in blockchain`,
          unexpected: true,
        },
      };
    }

    // check the nonce wasn't increased
    const nextNonce = await this.network.getAddressNextAvailableNonce(
      this.configs.addresses.lock
    );
    if (nextNonce > trx.nonce) {
      const hashes = this.network.getTransactionByNonce(trx.nonce);
      if ((await hashes).unsignedHash === trx.unsignedHash) {
        return {
          isValid: true,
          details: undefined,
        };
      }
      this.logger.info(
        `Tx [${transaction.txId}] is invalid: Transaction's nonce [${trx.nonce}] is not available anymore according to address's current nonce [${nextNonce}]`
      );
      return {
        isValid: false,
        details: {
          reason: `nonce [${trx.nonce}] is not available anymore`,
          unexpected: false,
        },
      };
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
    requiredSign: number
  ): Promise<PaymentTransaction> => {
    const tx = Serializer.deserialize(transaction.txBytes);
    const hash =
      tx.unsignedHash.slice(0, 2) === '0x'
        ? tx.unsignedHash.slice(2)
        : tx.unsignedHash;
    return this.signFunction(Uint8Array.from(Buffer.from(hash, 'hex'))).then(
      (res) => {
        const r = '0x' + res.signature.slice(0, 64);
        const s = '0x' + res.signature.slice(64, 128);
        const yParity = Number(res.signatureRecovery);
        if (yParity !== 0 && yParity !== 1)
          throw new ImpossibleBehavior(
            `non-binary signature recovery: ${res.signatureRecovery}`
          );
        const signature = Signature.from({
          r,
          s,
          yParity: yParity,
        });
        tx.signature = signature;
        return new PaymentTransaction(
          transaction.network,
          transaction.txId,
          transaction.eventId,
          Serializer.signedSerialize(tx),
          transaction.txType
        );
      }
    );
  };

  /**
   * submits a transaction to the blockchain
   * checks the following conditions before:
   * - transaction must of of type 2
   * - fees are set appropriately according to the current network's condition
   * - lock address still have enough funds
   * @param transaction the transaction
   */
  submitTransaction = async (
    transaction: PaymentTransaction
  ): Promise<void> => {
    // deserialize transaction
    let tx: Transaction;
    try {
      tx = Serializer.deserialize(transaction.txBytes);
    } catch (error) {
      this.logger.warn(
        `Failed to deserialize tx [${transaction.txId}]: ${error}`
      );
      return;
    }

    try {
      // check type
      if (tx.type !== 2) {
        this.logger.warn(
          `Cannot submit transaction [${transaction.txId}]: Transaction is not of type 2`
        );
        return;
      }

      // check fees
      const gasRequired = await this.network.getGasRequired(tx);
      if (gasRequired > tx.gasLimit) {
        this.logger.warn(
          `Cannot submit transaction [${transaction.txId}]: Transaction gas limit [${tx.maxFeePerGas}] is less than the required gas [${gasRequired}]`
        );
        return;
      }

      // check lock still has enough assets
      const txAssets = await this.getTransactionAssets(transaction);
      if (!(await this.hasLockAddressEnoughAssets(txAssets.inputAssets))) {
        this.logger.warn(
          `Cannot submit transaction [${
            transaction.txId
          }]: Locked assets cannot cover transaction assets: ${JSONBigInt.stringify(
            txAssets.inputAssets
          )}`
        );
        return;
      }
    } catch (e) {
      this.logger.warn(
        `An error occurred while checking transaction [${transaction.txId}] for submission: ${e}`
      );
      if (e instanceof Error && e.stack) {
        this.logger.warn(e.stack);
      }
      return;
    }

    // send transaction
    try {
      const response = await this.network.submitTransaction(tx);
      this.logger.info(
        `${this.CHAIN} Transaction [${transaction.txId}] submitted. Response: ${response}`
      );
    } catch (e) {
      this.logger.warn(
        `An error occurred while submitting ${this.CHAIN} transaction [${transaction.txId}]: ${e}`
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
    // we ignore mempool as it doesn't affect us
    return false;
  };

  /**
   * gets the minimum amount of native token for transferring asset
   * @returns the minimum amount
   */
  getMinimumNativeToken = (): bigint => 0n;

  /**
   * converts json representation of the payment transaction to PaymentTransaction
   * @param jsonString the payment transaction's json representation
   * @returns PaymentTransaction object
   */
  PaymentTransactionFromJson = (jsonString: string): PaymentTransaction => {
    const obj = JSON.parse(jsonString) as PaymentTransactionJsonModel;
    return new PaymentTransaction(
      this.CHAIN,
      obj.txId,
      obj.eventId,
      Uint8Array.from(Buffer.from(obj.txBytes, 'hex')),
      obj.txType as TransactionType
    );
  };

  /**
   * generates PaymentTransaction object from raw tx json string
   * checks the transaction is of type 2
   * @param rawTxJsonString
   * @returns PaymentTransaction object
   */
  rawTxToPaymentTransaction = async (
    rawTxJsonString: string
  ): Promise<PaymentTransaction> => {
    const trx = Transaction.from(JSON.parse(rawTxJsonString));
    if (trx.type !== 2) {
      throw new TransactionFormatError(
        `Only transaction of type 2 is supported while parsing raw transaction`
      );
    }
    const evmTx = new PaymentTransaction(
      this.CHAIN,
      trx.unsignedHash,
      '',
      Serializer.serialize(trx),
      TransactionType.manual
    );

    this.logger.info(
      `Parsed ${this.CHAIN} transaction [${trx.unsignedHash}] successfully`
    );
    return evmTx;
  };

  /**
   * verifies additional conditions for a PaymentTransaction
   * - `to` shouldn't be null
   * - `data` shouldn't be null
   * - transaction must be of type 2
   * - `data` length must be either:
   *     native-token transfer: 2 (0x) + eventId.length
   *     erc-20 transfer: 2 (0x) + 136 (`transfer` data) + eventId.length
   * - eventId must be at the end of the `data`
   * - multiple payments are not allowed in one transaction
   * - in case of erc-20 transfer, `data` must be appropriately parsed with the `transfer` ABI
   * @param transaction the PaymentTransaction
   * @returns true if the transaction is verified
   */
  verifyTransactionExtraConditions = (
    transaction: PaymentTransaction
  ): boolean => {
    const tx = Serializer.deserialize(transaction.txBytes);

    if (tx.to === null) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified. \`to\` is null`
      );
      return false;
    }

    if (tx.data === null) {
      throw new ImpossibleBehavior('Transaction `data` can not be null');
    }

    const eidlen = transaction.eventId.length;

    // only type 2 transactions are allowed
    if (tx.type !== 2) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified. It is not of type 2`
      );
      return false;
    }

    // tx data must have correct length
    if (![eidlen + 2, eidlen + 2 + 136].includes(tx.data.length)) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified. Unexpected \`data\` bytes length [${tx.data.length}]`
      );
      return false;
    }

    // eventId must be at the end of `data`
    const eventId = tx.data.substring(tx.data.length - eidlen);
    if (eventId !== transaction.eventId) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified. Encoded eventId [${eventId}] does not match with the expected one [${transaction.eventId}]`
      );
      return false;
    }

    // must be a single payment
    if (
      (tx.value === 0n && tx.data.length === eidlen + 2) ||
      (tx.value !== 0n && tx.data.length === 136 + eidlen + 2)
    ) {
      this.logger.warn(
        `Tx [${transaction.txId}] is not verified. It both transfers native-token and has extra data.`
      );
      return false;
    }

    // only erc-20 `transfer` is allowed
    if (tx.value === 0n) {
      if (!EvmUtils.isTransfer(tx.to, tx.data)) {
        this.logger.warn(
          `Tx [${transaction.txId}] is not verified. \`data\` field [${tx.data}] can not be parsed with 'transfer' ABI.`
        );
        return false;
      }
    }

    return true;
  };

  /**
   * verifies additional conditions for a event lock transaction
   * - the lock transaction should not be failed in the blockchain
   * @param transaction the lock transaction
   * @param blockInfo
   * @returns true if the transaction is verified
   */
  verifyLockTransactionExtraConditions = async (
    transaction: Transaction,
    blockInfo: BlockInfo
  ): Promise<boolean> => {
    // check if tx is failed
    if (!transaction.hash)
      throw new ImpossibleBehavior(
        `failed to get txId of the lock transaction while verifying the event`
      );
    const txStatus = await this.network.getTransactionStatus(transaction.hash);
    if (txStatus !== EvmTxStatus.succeed) {
      this.logger.error(
        `Lock tx [${transaction.hash}] is not succeed (failed or unexpected status)`
      );
      return false;
    }
    return true;
  };

  /**
   * serializes the transaction of this chain into string
   */
  protected serializeTx = (tx: Transaction): string =>
    tx.serialized.substring(2);

  /**
   * gets the address balance for native token and all supported tokens
   * @param address
   * @returns an object containing the amount of each asset
   */
  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    if (address === '') {
      this.logger.debug(`returning empty assets for empty address`);
      return { nativeToken: 0n, tokens: [] };
    }
    const nativeTokenBalance =
      await this.network.getAddressBalanceForNativeToken(address);
    const tokens: Array<TokenInfo> = await Promise.all(
      this.supportedTokens.map(async (tokenId) => {
        const balance = await this.network.getAddressBalanceForERC20Asset(
          address,
          tokenId
        );
        return {
          id: tokenId,
          value: balance,
        };
      })
    );
    const wrappedAssets = ChainUtils.wrapAssetBalance(
      {
        nativeToken: nativeTokenBalance,
        tokens: tokens,
      },
      this.tokenMap,
      this.NATIVE_TOKEN_ID,
      this.CHAIN
    );
    return wrappedAssets;
  };
}

export default EvmChain;
