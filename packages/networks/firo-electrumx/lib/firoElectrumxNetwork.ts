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
  BASE58_REGEX,
  BlockchainHeaderSubscribeResult,
  ElectrumXError,
  FiroBalanceResponse,
  FiroUnspentOutput,
  FiroVerboseTransaction,
} from './types';

class FiroElectrumXNetwork extends AbstractFiroNetwork {
  protected client: ElectrumXSocket;

  private readonly getSavedTransactionById: (
    txId: string,
  ) => Promise<PaymentTransaction | undefined>;

  private hashToHeight = new Map<string, number>();
  private lastKnownHeight = 0;

  constructor(
    host: string,
    port: number,
    getSavedTransactionById: (
      txId: string,
    ) => Promise<PaymentTransaction | undefined>,
    logger?: AbstractLogger,
    timeout = 30,
    reconnectDelay = 5,
  ) {
    super(logger);
    this.getSavedTransactionById = getSavedTransactionById;
    this.client = new ElectrumXSocket(
      host,
      port,
      reconnectDelay,
      timeout,
      logger?.child('ElectrumXSocket') ?? logger,
    );
    this.client.setupSocket();
  }

  getHeight = async (): Promise<number> => {
    try {
      const result =
        await this.client.sendRequest<BlockchainHeaderSubscribeResult>(
          'blockchain.headers.subscribe',
          [],
        );
      this.lastKnownHeight = result.height;
      this.logger.debug(`Current height: ${result.height}`);
      return result.height;
    } catch (e) {
      throw this.wrapError(
        'Failed to fetch current height from Firo ElectrumX',
        e,
      );
    }
  };

  getBlockTransactionIds = async (blockId: string): Promise<Array<string>> => {
    try {
      const height = await this.resolveHeight(blockId);
      const result = await this.client.sendRequest<Array<string>>(
        'blockchain.block.txids',
        [height],
      );
      this.logger.debug(
        `Block [${blockId}] at height [${height}] has ` +
          `${result.length} transactions`,
      );
      return result;
    } catch (e) {
      throw this.wrapError(
        `Failed to get block [${blockId}] transaction ids from Firo ElectrumX`,
        e,
      );
    }
  };

  getBlockInfo = async (blockId: string): Promise<BlockInfo> => {
    try {
      const height = await this.resolveHeight(blockId);
      const headerHex = await this.client.sendRequest<string>(
        'blockchain.block.header',
        [height],
      );
      const blockInfo = parseBlockHeader(headerHex, height);
      this.hashToHeight.set(blockInfo.hash, height);

      this.logger.debug(
        `Block [${blockId}] at height [${height}]: ` +
          `hash=${blockInfo.hash}, parent=${blockInfo.parentHash}`,
      );

      return blockInfo;
    } catch (e) {
      throw this.wrapError(
        `Failed to get block [${blockId}] info from Firo ElectrumX`,
        e,
      );
    }
  };

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
        throw new FailedError(`Transaction [${transactionId}] is not found`);
      }
      if (blockId !== '' && tx.blockhash !== blockId) {
        throw new FailedError(
          `Tx [${transactionId}] doesn't belong to block [${blockId}]`,
        );
      }

      const firoTx = parseTransactionHex(tx.hex, transactionId);
      this.logger.debug(`Fetched transaction [${transactionId}]`);
      return firoTx;
    } catch (e) {
      throw this.wrapError(
        `Failed to get transaction [${transactionId}] from Firo ElectrumX`,
        e,
      );
    }
  };

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

  getMempoolTransactions = async (): Promise<Array<FiroTx>> => {
    return [];
  };

  getTokenDetail = async (tokenId: string) => {
    throw new Error(
      `Firo network does not support token [${tokenId}]. ` +
        'Only native token is supported.',
    );
  };

  getTxConfirmation = async (transactionId: string): Promise<number> => {
    const realTxId = await this.getActualTxId(transactionId);
    return await this.getTxConfirmationSigned(realTxId);
  };

  getAddressAssets = async (
    address: string,
  ): Promise<{
    nativeToken: bigint;
    tokens: Array<{ id: string; value: bigint }>;
  }> => {
    try {
      if (!BASE58_REGEX.test(address)) {
        return { nativeToken: 0n, tokens: [] };
      }
      const scripthash = addressToScripthash(address);
      const result = await this.client.sendRequest<FiroBalanceResponse>(
        'blockchain.scripthash.get_balance',
        [scripthash],
      );
      this.logger.debug(
        `Address [${address}] balance: confirmed=${result.confirmed}, ` +
          `unconfirmed=${result.unconfirmed}`,
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

  getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number,
  ): Promise<Array<FiroUtxo>> => {
    try {
      if (!BASE58_REGEX.test(address)) {
        return [];
      }
      const scripthash = addressToScripthash(address);
      const utxos = await this.client.sendRequest<Array<FiroUnspentOutput>>(
        'blockchain.scripthash.listunspent',
        [scripthash],
      );

      const firoUtxos = utxos
        .filter((utxo) => utxo.height > 0)
        .slice(offset, offset + limit)
        .map((utxo) => ({
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

  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    const [txId, outputIndexStr] = boxId.split('.');
    const outputIndex = parseInt(outputIndexStr, 10);

    try {
      const txHex = await this.client.sendRequest<string>(
        'blockchain.transaction.get',
        [txId],
      );
      const tx = parseTransactionHex(txHex, txId);

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

  getUtxo = async (boxId: string): Promise<FiroUtxo> => {
    const [txId, outputIndexStr] = boxId.split('.');
    const outputIndex = parseInt(outputIndexStr, 10);

    try {
      const txHex = await this.client.sendRequest<string>(
        'blockchain.transaction.get',
        [txId],
      );
      const tx = parseTransactionHex(txHex, txId);

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

  isTxInMempool = async (txId: string): Promise<boolean> => {
    try {
      const tx = await this.client.sendRequest<FiroVerboseTransaction>(
        'blockchain.transaction.get',
        [txId, true],
      );
      return (tx.confirmations ?? 0) <= 0;
    } catch {
      return false;
    }
  };

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
      this.logger.debug(
        `tx [${transactionId}] verbose lookup failed, ` +
          `assuming unconfirmed: ${this.errorMessage(e)}`,
      );
      return -1;
    }
  };

  /* eslint-disable @typescript-eslint/no-unused-vars */
  protected getSpentTransactionByInputId = async (
    _index: number,
    _txId: string,
  ): Promise<FiroTx | undefined> => {
    return undefined;
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */

  protected extractActualTxIdFromPsbt = async (
    psbt: Psbt,
  ): Promise<string | undefined> => {
    try {
      return psbt.extractTransaction(true).getId();
    } catch (error) {
      this.logger.debug(
        `Failed to extract signed transaction ID from PSBT: ${error}`,
      );
      return undefined;
    }
  };

  /* eslint-disable @typescript-eslint/no-unused-vars */
  protected extractActualTxIdWithRpcLookup = async (
    _psbt: Psbt,
  ): Promise<string | undefined> => {
    return undefined;
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */

  getActualTxId = async (hash: string): Promise<string> => {
    let actualTxId = hash;
    try {
      const realPaymentTx = await this.getSavedTransactionById(hash);

      if (realPaymentTx) {
        const realTx = Psbt.fromBuffer(Buffer.from(realPaymentTx.txBytes), {
          network: FIRO_NETWORK,
        });

        const directExtraction = await this.extractActualTxIdFromPsbt(realTx);
        if (directExtraction) {
          actualTxId = directExtraction;
        } else {
          this.logger.debug(
            `Direct PSBT extraction failed for hash [${hash}]. ` +
              'RPC lookup not available with ElectrumX.',
          );
        }
      }
    } catch (e) {
      throw this.wrapError(
        `Failed to get actual txId for tx [${hash}] from database`,
        e,
      );
    }

    return actualTxId;
  };

  private resolveHeight = async (blockHash: string): Promise<number> => {
    const cached = this.hashToHeight.get(blockHash);
    if (cached !== undefined) return cached;

    const searchStart =
      this.lastKnownHeight > 0
        ? this.lastKnownHeight
        : (
            await this.client.sendRequest<BlockchainHeaderSubscribeResult>(
              'blockchain.headers.subscribe',
              [],
            )
          ).height;
    this.lastKnownHeight = searchStart;

    for (let h = searchStart; h > searchStart - 1000 && h > 0; h--) {
      const headerHex = await this.client.sendRequest<string>(
        'blockchain.block.header',
        [h],
      );
      const blockInfo = parseBlockHeader(headerHex, h);
      this.hashToHeight.set(blockInfo.hash, h);
      if (blockInfo.hash === blockHash) return h;
    }

    throw new FailedError(
      `Block [${blockHash}] not found within 1000 blocks ` +
        `of height ${searchStart}`,
    );
  };

  private isNotFoundError = (e: unknown): boolean => {
    const message = this.errorMessage(e).toLowerCase();
    return (
      message.includes('no such transaction') ||
      message.includes('not found') ||
      message.includes('not exist')
    );
  };

  private errorMessage = (e: unknown): string => {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    if (this.isElectrumXError(e)) return e.message ?? JSON.stringify(e);
    return 'Unknown error';
  };

  private isElectrumXError = (e: unknown): e is ElectrumXError => {
    return (
      typeof e === 'object' && e !== null && ('message' in e || 'code' in e)
    );
  };

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
      return new NetworkError(`${baseMessage}: ${e}`);
    }
    if (e instanceof Error) {
      return new NetworkError(`${baseMessage}: ${e.message}`);
    }
    if (this.isElectrumXError(e)) {
      return new FailedError(
        `${baseMessage}: ${e.message ?? JSON.stringify(e)}`,
      );
    }
    return new UnexpectedApiError(`${baseMessage}: Unknown error`);
  };
}

export default FiroElectrumXNetwork;
