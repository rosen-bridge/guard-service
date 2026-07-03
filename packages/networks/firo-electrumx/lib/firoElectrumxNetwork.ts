import { Psbt } from 'bitcoinjs-lib';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { ElectrumXSocket } from '@rosen-bridge/firo-scanner/dist/network/electrumXSocket';
import { TimeoutError } from '@rosen-bridge/firo-scanner/dist/network/types';
import {
  BlockInfo,
  FailedError,
  NetworkError,
  PaymentTransaction,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import {
  AbstractFiroNetwork,
  FiroTx,
  FiroUtxo,
  FIRO_NETWORK,
} from '@rosen-chains/firo';

import {
  addressToScripthash,
  parseBlockHeader,
  parseTransactionHex,
  scriptPubKeyToScripthash,
} from './parsers';
import {
  BlockchainHeaderSubscribeResult,
  FiroBalanceResponse,
  FiroUnspentOutput,
  FiroVerboseTransaction,
} from './types';

class FiroElectrumXNetwork extends AbstractFiroNetwork {
  protected client: ElectrumXSocket;

  private readonly getSavedTransactionById: (
    txId: string,
  ) => Promise<PaymentTransaction | undefined>;

  /**
   * Creates a Firo ElectrumX network provider.
   * @param host ElectrumX host
   * @param port ElectrumX port
   * @param getSavedTransactionById saved transaction lookup callback
   * @param reconnectDelay socket reconnect delay in seconds
   * @param timeout socket timeout in seconds
   * @param logger network logger
   */
  constructor(
    host: string,
    port: number,
    getSavedTransactionById: (
      txId: string,
    ) => Promise<PaymentTransaction | undefined>,
    reconnectDelay?: number,
    timeout?: number,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.getSavedTransactionById = getSavedTransactionById;
    this.client = new ElectrumXSocket(
      host,
      port,
      reconnectDelay,
      timeout,
      logger?.child('electrumXSocket'),
    );
    this.client.setupSocket();
  }

  /**
   * Fetches the current Firo block height from ElectrumX.
   * @returns current chain height
   */
  getHeight = async (): Promise<number> => {
    try {
      const result =
        await this.client.sendRequest<BlockchainHeaderSubscribeResult>(
          'blockchain.headers.subscribe',
          [],
        );
      return result.height;
    } catch (e) {
      throw this.wrapError(
        'Failed to fetch current height from Firo ElectrumX',
        e,
      );
    }
  };

  /**
   * Fetches transaction ids included in a block.
   * @param blockId block hash
   * @returns transaction ids in the requested block
   */
  getBlockTransactionIds = async (blockId: string): Promise<Array<string>> => {
    try {
      const height = await this.resolveHeight(blockId);
      const result = await this.client.sendRequest<Array<string>>(
        'blockchain.block.txids',
        [height],
      );
      return result;
    } catch (e) {
      throw this.wrapError(
        `Failed to get block [${blockId}] transaction ids from Firo ElectrumX`,
        e,
      );
    }
  };

  /**
   * Fetches block hash, parent hash and height for a block.
   * @param blockId block hash
   * @returns block info
   */
  getBlockInfo = async (blockId: string): Promise<BlockInfo> => {
    try {
      const height = await this.resolveHeight(blockId);
      const headerHex = await this.client.sendRequest<string>(
        'blockchain.block.header',
        [height],
      );
      const blockInfo = {
        ...parseBlockHeader(headerHex),
        height,
      };

      this.logger.debug(
        `Fetched and parsed block [${blockId}] at height [${height}] ` +
          `with hash [${blockInfo.hash}] and parent [${blockInfo.parentHash}]`,
      );

      return blockInfo;
    } catch (e) {
      throw this.wrapError(
        `Failed to get block [${blockId}] info from Firo ElectrumX`,
        e,
      );
    }
  };

  /**
   * Fetches and parses a Firo transaction.
   * @param transactionId transaction id
   * @param blockId expected block hash, or empty string to skip the block check
   * @returns parsed Firo transaction
   */
  getTransaction = async (
    transactionId: string,
    blockId: string,
  ): Promise<FiroTx> => {
    try {
      const tx = await this.client.sendRequest<FiroVerboseTransaction>(
        'blockchain.transaction.get',
        [transactionId, true],
      );
      if (!tx.hex) {
        throw new UnexpectedApiError(
          `Transaction [${transactionId}] has no raw hex`,
        );
      }
      if (blockId !== '' && tx.blockhash !== blockId) {
        throw new UnexpectedApiError(
          `Tx [${transactionId}] doesn't belong to block [${blockId}]`,
        );
      }

      return { id: transactionId, ...parseTransactionHex(tx.hex) };
    } catch (e) {
      throw this.wrapError(
        `Failed to get transaction [${transactionId}] from Firo ElectrumX`,
        e,
      );
    }
  };

  /**
   * Broadcasts a signed Firo transaction.
   * @param transaction signed payment transaction
   */
  submitTransaction = async (transaction: Psbt): Promise<void> => {
    const txHex = transaction.extractTransaction(true).toHex();
    try {
      const result = await this.client.sendRequest<string>(
        'blockchain.transaction.broadcast',
        [txHex],
      );
      this.logger.debug(`Submitted transaction. Result: ${result}`);
    } catch (e) {
      throw this.wrapError('Failed to submit transaction to Firo ElectrumX', e);
    }
  };

  /**
   * Returns mempool transactions.
   * @returns empty list because this provider does not expose full mempool parsing
   */
  getMempoolTransactions = async (): Promise<Array<FiroTx>> => {
    return [];
  };

  /**
   * Rejects token detail requests because Firo only supports the native token here.
   * @param tokenId token id
   */
  getTokenDetail = async (tokenId: string) => {
    throw new Error(
      `Firo network does not support token [${tokenId}]. ` +
        'Only native token is supported.',
    );
  };

  /**
   * Fetches confirmations for a transaction, resolving saved unsigned hashes first.
   * @param transactionId transaction id or saved unsigned transaction hash
   * @returns confirmation count, or -1 for unconfirmed/not found transactions
   */
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    const realTxId = await this.getActualTxId(transactionId);
    return await this.getTxConfirmationSigned(realTxId);
  };

  /**
   * Fetches the native Firo balance for an address.
   * @param address Firo address
   * @returns native token balance and an empty token list
   */
  getAddressAssets = async (
    address: string,
  ): Promise<{
    nativeToken: bigint;
    tokens: Array<{ id: string; value: bigint }>;
  }> => {
    try {
      const scripthash = addressToScripthash(address);
      const result = await this.client.sendRequest<FiroBalanceResponse>(
        'blockchain.scripthash.get_balance',
        [scripthash],
      );
      return {
        nativeToken: BigInt(result.confirmed),
        tokens: [],
      };
    } catch (e) {
      throw this.wrapError(
        `Failed to get address assets for [${address}] from Firo ElectrumX`,
        e,
      );
    }
  };

  /**
   * Fetches UTXOs for an address and applies offset/limit pagination.
   * @param address Firo address
   * @param offset number of UTXOs to skip
   * @param limit maximum number of UTXOs to return
   * @returns paginated Firo UTXOs
   */
  getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number,
  ): Promise<Array<FiroUtxo>> => {
    try {
      const scripthash = addressToScripthash(address);
      const utxos = await this.client.sendRequest<Array<FiroUnspentOutput>>(
        'blockchain.scripthash.listunspent',
        [scripthash],
      );

      const firoUtxos = utxos.slice(offset, offset + limit).map((utxo) => ({
        txId: utxo.tx_hash,
        index: utxo.tx_pos,
        value: BigInt(utxo.value),
      }));

      this.logger.debug(
        `Address [${address}] has ${utxos.length} UTXOs, ` +
          `returning ${firoUtxos.length} after pagination`,
      );
      return firoUtxos;
    } catch (e) {
      throw this.wrapError(
        `Failed to get address boxes for [${address}] from Firo ElectrumX`,
        e,
      );
    }
  };

  /**
   * Checks whether a transaction output is still unspent.
   * @param boxId box id in txId.index format
   * @returns true if the output is present in ElectrumX listunspent
   */
  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    const [txId, outputIndexStr] = boxId.split('.');
    const outputIndex = parseInt(outputIndexStr, 10);

    try {
      const txHex = await this.client.sendRequest<string>(
        'blockchain.transaction.get',
        [txId],
      );
      const tx = parseTransactionHex(txHex);

      if (Number.isNaN(outputIndex) || outputIndex >= tx.outputs.length) {
        return false;
      }

      const scriptPubKey = tx.outputs[outputIndex]!.scriptPubKey;
      const scripthash = scriptPubKeyToScripthash(scriptPubKey);

      const unspent = await this.client.sendRequest<
        Array<Pick<FiroUnspentOutput, 'tx_hash' | 'tx_pos'>>
      >('blockchain.scripthash.listunspent', [scripthash]);

      return unspent.some(
        (utxo) => utxo.tx_hash === txId && utxo.tx_pos === outputIndex,
      );
    } catch (e: unknown) {
      if (this.isNotFoundError(e)) {
        return false;
      }
      throw this.wrapError(
        `Failed to check if box [${boxId}] is unspent from Firo ElectrumX`,
        e,
      );
    }
  };

  /**
   * Fetches a single Firo UTXO by box id.
   * @param boxId box id in txId.index format
   * @returns UTXO data
   */
  getUtxo = async (boxId: string): Promise<FiroUtxo> => {
    const [txId, outputIndexStr] = boxId.split('.');
    const outputIndex = parseInt(outputIndexStr, 10);

    try {
      const txHex = await this.client.sendRequest<string>(
        'blockchain.transaction.get',
        [txId],
      );
      const tx = parseTransactionHex(txHex);

      if (Number.isNaN(outputIndex) || outputIndex >= tx.outputs.length) {
        throw new FailedError(`UTXO with boxId [${boxId}] not found`);
      }

      return {
        txId,
        index: outputIndex,
        value: tx.outputs[outputIndex]!.value,
      };
    } catch (e) {
      if (e instanceof FailedError) throw e;
      throw this.wrapError(
        `Failed to get UTXO [${boxId}] from Firo ElectrumX`,
        e,
      );
    }
  };

  /**
   * Estimates the Firo fee ratio in satoshis per byte.
   * @returns fee ratio
   */
  getFeeRatio = async (): Promise<number> => {
    try {
      const feeRate = await this.client.sendRequest<number>(
        'blockchain.estimatefee',
        [6],
      );
      if (feeRate <= 0) {
        this.logger.warn(
          `ElectrumX estimatefee returned ${feeRate}, ` +
            `using fallback 10 sat/byte`,
        );
        return 10;
      }
      const feeSatoshis = Math.ceil(feeRate * 100000000);
      const feePerByte = Math.ceil(feeSatoshis / 1000);
      this.logger.debug(`Fee ratio: ${feePerByte} sat/byte`);
      return feePerByte;
    } catch (e) {
      throw this.wrapError('Failed to get fee ratio from Firo ElectrumX', e);
    }
  };

  /**
   * Checks whether a transaction is currently unconfirmed in the mempool.
   * @param txId transaction id
   * @returns true when the transaction exists without confirmations
   */
  isTxInMempool = async (txId: string): Promise<boolean> => {
    try {
      const tx = await this.client.sendRequest<FiroVerboseTransaction>(
        'blockchain.transaction.get',
        [txId, true],
      );
      return (tx.confirmations ?? 0) <= 0;
    } catch (e) {
      if (this.isNotFoundError(e)) {
        this.logger.debug(`tx [${txId}] is not found`);
        return false;
      }
      throw this.wrapError(
        `Failed to check if tx [${txId}] is in mempool from Firo ElectrumX`,
        e,
      );
    }
  };

  /**
   * Fetches raw transaction hex.
   * @param txId transaction id
   * @returns hex-encoded transaction
   */
  getTransactionHex = async (txId: string): Promise<string> => {
    try {
      const txHex = await this.client.sendRequest<string>(
        'blockchain.transaction.get',
        [txId],
      );
      this.logger.debug(`Fetched transaction hex for txId [${txId}]`);
      return txHex;
    } catch (e) {
      throw this.wrapError(
        `Failed to get transaction hex [${txId}] from Firo ElectrumX`,
        e,
      );
    }
  };

  /**
   * Fetches confirmations for a signed transaction id.
   * @param transactionId signed transaction id
   * @returns confirmation count, or -1 for unconfirmed/not found transactions
   */
  protected getTxConfirmationSigned = async (
    transactionId: string,
  ): Promise<number> => {
    try {
      const tx = await this.client.sendRequest<FiroVerboseTransaction>(
        'blockchain.transaction.get',
        [transactionId, true],
      );
      const confirmations = tx.confirmations ?? 0;
      if (confirmations <= 0) {
        this.logger.debug(`tx [${transactionId}] has no confirmations`);
        return -1;
      }
      this.logger.debug(
        `tx [${transactionId}] has ${confirmations} confirmations`,
      );
      return confirmations;
    } catch (e) {
      if (this.isNotFoundError(e)) {
        this.logger.debug(`tx [${transactionId}] is not found`);
        return -1;
      }
      throw this.wrapError(
        `Failed to get tx [${transactionId}] confirmation from Firo ElectrumX`,
        e,
      );
    }
  };

  /* eslint-disable @typescript-eslint/no-unused-vars */
  /**
   * Gets a spent transaction by input id.
   * @returns undefined because ElectrumX has no equivalent getspentinfo API
   */
  protected getSpentTransactionByInputId = async (
    _index: number,
    _txId: string,
  ): Promise<FiroTx | undefined> => {
    return undefined;
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */

  /**
   * Resolves a saved unsigned transaction hash to its signed transaction id.
   * @param hash unsigned transaction hash or signed transaction id
   * @returns signed transaction id when the saved transaction is available
   */
  getActualTxId = async (hash: string): Promise<string> => {
    let actualTxId = hash;
    try {
      const realPaymentTx = await this.getSavedTransactionById(hash);

      if (realPaymentTx) {
        const realTx = Psbt.fromBuffer(Buffer.from(realPaymentTx.txBytes), {
          network: FIRO_NETWORK,
        });

        actualTxId = realTx.extractTransaction(true).getId();
      }
    } catch (e) {
      throw this.wrapError(
        `Failed to get actual txId for tx [${hash}] from database`,
        e,
      );
    }

    return actualTxId;
  };

  /**
   * Resolves a block hash to its height.
   * @param blockHash block hash
   * @returns block height
   */
  private resolveHeight = async (blockHash: string): Promise<number> => {
    return await this.client.sendRequest<number>('blockchain.block.height', [
      blockHash,
    ]);
  };

  /**
   * Checks whether an ElectrumX response means the target transaction is absent.
   * @param e thrown value
   * @returns true when the error text indicates a missing transaction
   */
  private isNotFoundError = (e: unknown): boolean => {
    const message = this.getErrorMessage(e).toLowerCase();
    return (
      message.includes('no such transaction') ||
      message.includes('not found') ||
      message.includes('not exist')
    );
  };

  /**
   * Extracts an error message from unknown thrown values.
   * @param e thrown value
   * @returns readable error text
   */
  private getErrorMessage = (e: unknown): string => {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    if (
      typeof e === 'object' &&
      e !== null &&
      'message' in e &&
      typeof e.message === 'string'
    ) {
      return e.message;
    }
    return 'Unknown error';
  };

  /**
   * Wraps provider and runtime failures into abstract-chain error classes.
   * @param baseMessage contextual failure message
   * @param e thrown value
   * @returns typed error
   */
  private wrapError = (baseMessage: string, e: unknown): Error => {
    if (
      e instanceof FailedError ||
      e instanceof NetworkError ||
      e instanceof UnexpectedApiError
    ) {
      return e;
    }
    if (e instanceof TimeoutError) {
      return new NetworkError(`${baseMessage}: ${e.message}`);
    }
    if (typeof e === 'string') {
      return new UnexpectedApiError(`${baseMessage}: ${e}`);
    }
    if (e instanceof Error) {
      return new UnexpectedApiError(`${baseMessage}: ${e.message}`);
    }
    if (
      typeof e === 'object' &&
      e !== null &&
      ('message' in e || 'code' in e)
    ) {
      return new FailedError(`${baseMessage}: ${this.getErrorMessage(e)}`);
    }
    return new UnexpectedApiError(`${baseMessage}: Unknown error`);
  };
}

export default FiroElectrumXNetwork;
