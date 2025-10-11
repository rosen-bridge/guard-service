import { Psbt } from 'bitcoinjs-lib';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import {
  AssetBalance,
  BlockInfo,
  FailedError,
  NetworkError,
  TokenInfo,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import {
  AbstractBitcoinNetwork,
  BitcoinTx,
  BitcoinUtxo,
  CONFIRMATION_TARGET,
} from '@rosen-chains/bitcoin';
import RateLimitedAxios from '@rosen-clients/rate-limited-axios';

import {
  EsploraAddress,
  EsploraBlock,
  EsploraTx,
  EsploraUtxo,
  EsploraUtxoInfo,
} from './types';

class BitcoinEsploraNetwork extends AbstractBitcoinNetwork {
  protected client; // TODO: specify the type (local:ergo/rosen-bridge/network-clients#26)
  private apiPrefix: string;

  constructor(url: string, logger?: AbstractLogger, apiPrefix?: string) {
    super(logger);
    this.client = RateLimitedAxios.create({
      baseURL: url,
    });
    this.apiPrefix = apiPrefix || '/api';
  }

  /**
   * gets the blockchain height
   * @returns the blockchain height
   */
  getHeight = async (): Promise<number> => {
    return this.client
      .get<number>(`${this.apiPrefix}/blocks/tip/height`)
      .then((res) => Number(res.data))
      .catch((e) => {
        const baseError = `Failed to fetch current height from Esplora: `;
        if (e.response) {
          throw new FailedError(baseError + `${e.response.data}`);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets confirmation for a transaction (returns -1 if tx is not mined or found)
   * @param transactionId the transaction id
   * @returns the transaction confirmation
   */
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    const currentHeight = await this.getHeight();
    let txHeight = -1;
    try {
      const txInfo = (
        await this.client.get<EsploraTx>(
          `${this.apiPrefix}/tx/${transactionId}`,
        )
      ).data;
      this.logger.debug(
        `requested 'tx' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
          txInfo,
        )}`,
      );
      if (txInfo.status.confirmed && txInfo.status.block_height)
        txHeight = txInfo.status.block_height;
    } catch (e: any) {
      const baseError = `Failed to get confirmation for tx [${transactionId}] from Esplora: `;
      if (e.response && e.response.status === 404) {
        this.logger.debug(`tx [${transactionId}] is not found`);
        return -1;
      } else if (e.response) {
        throw new FailedError(baseError + e.response.data);
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
    if (txHeight === -1) return txHeight;
    return currentHeight - txHeight;
  };

  /**
   * gets the amount of each asset in an address
   * @param address the address
   * @returns an object containing the amount of each asset
   */
  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    let nativeToken = 0n;
    const tokens: Array<TokenInfo> = [];

    return this.client
      .get<EsploraAddress>(`${this.apiPrefix}/address/${address}`)
      .then((res) => {
        this.logger.debug(
          `requested 'address' for address [${address}]. res: ${JsonBigInt.stringify(
            res.data,
          )}`,
        );
        const chainStat = res.data.chain_stats;
        nativeToken = BigInt(
          chainStat.funded_txo_sum - chainStat.spent_txo_sum,
        );
        return { nativeToken, tokens };
      })
      .catch((e) => {
        const baseError = `Failed to get address [${address}] assets from Esplora: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets id of all transactions in the given block
   * @param blockId the block id
   * @returns list of the transaction ids in the block
   */
  getBlockTransactionIds = (blockId: string): Promise<Array<string>> => {
    return this.client
      .get<Array<string>>(`${this.apiPrefix}/block/${blockId}/txids`)
      .then((res) => {
        this.logger.debug(
          `requested 'block/:hash/txids' for blockId [${blockId}]. received: ${JsonBigInt.stringify(
            res.data,
          )}`,
        );
        return res.data;
      })
      .catch((e) => {
        const baseError = `Failed to get block [${blockId}] transaction ids from Esplora: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets info of the given block
   * @param blockId the block id
   * @returns an object containing block info
   */
  getBlockInfo = (blockId: string): Promise<BlockInfo> => {
    return this.client
      .get<EsploraBlock>(`${this.apiPrefix}/block/${blockId}`)
      .then((res) => {
        this.logger.debug(
          `requested 'block' for blockId [${blockId}]. res: ${JsonBigInt.stringify(
            res.data,
          )}`,
        );
        const block = res.data;
        return {
          hash: block.id,
          parentHash: block.previousblockhash,
          height: Number(block.height),
        };
      })
      .catch((e) => {
        const baseError = `Failed to get block [${blockId}] info from Esplora: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets a transaction (serialized in `BitcoinTx` format)
   * @param transactionId the transaction id
   * @param blockId the block id
   * @returns the transaction
   */
  getTransaction = async (
    transactionId: string,
    blockId: string,
  ): Promise<BitcoinTx> => {
    let txInfo: EsploraTx;
    try {
      txInfo = (
        await this.client.get<EsploraTx>(
          `${this.apiPrefix}/tx/${transactionId}`,
        )
      ).data;
      this.logger.debug(
        `requested 'tx' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
          txInfo,
        )}`,
      );
    } catch (e: any) {
      const baseError = `Failed to get transaction [${transactionId}] from Esplora: `;
      if (e.response) {
        throw new FailedError(baseError + e.response.data);
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }

    if (txInfo.status.block_hash !== blockId)
      throw new FailedError(
        `Tx [${transactionId}] doesn't belong to block [${blockId}]`,
      );

    const tx: BitcoinTx = {
      id: txInfo.txid,
      inputs: txInfo.vin.map((input) => ({
        txId: input.txid,
        index: input.vout,
        scriptPubKey: input.prevout.scriptpubkey,
      })),
      outputs: txInfo.vout.map((output) => ({
        scriptPubKey: output.scriptpubkey,
        value: BigInt(output.value),
      })),
    };

    return tx;
  };

  /**
   * submits a transaction
   * @param transaction the transaction
   */
  submitTransaction = async (transaction: Psbt): Promise<void> => {
    await this.client.post(
      `${this.apiPrefix}/tx`,
      transaction.extractTransaction().toHex(),
    );
  };

  /**
   * gets confirmed and unspent boxes of an address
   * @param address the address
   * @param offset
   * @param limit
   * @returns list of boxes
   */
  getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number,
  ): Promise<Array<BitcoinUtxo>> => {
    const boxes = await this.client
      .get<Array<EsploraUtxo>>(`${this.apiPrefix}/address/${address}/utxo`)
      .then((res) => {
        this.logger.debug(
          `requested 'address/:address/utxo' for address [${address}]. res: ${JsonBigInt.stringify(
            res.data,
          )}`,
        );
        return res.data.map((utxo) => ({
          txId: utxo.txid,
          index: utxo.vout,
          value: BigInt(utxo.value),
        }));
      })
      .catch((e) => {
        const baseError = `Failed to get address [${address}] Utxos from Esplora: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
    // sort boxes to keep consistency between calls
    boxes.sort((a, b) => {
      if (a.txId < b.txId) return -1;
      else if (a.txId === b.txId && a.index < b.index) return -1;
      else if (a.txId === b.txId && a.index === b.index) return 0;
      else return 1;
    });
    return boxes.slice(offset, offset + limit);
  };

  /**
   * checks if a box is still unspent and valid
   * @param boxId the box id (txId + . + index)
   * @returns true if the box is unspent and valid
   */
  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    const [txId, index] = boxId.split('.');
    let utxosInfo: Array<EsploraUtxoInfo>;

    try {
      utxosInfo = (
        await this.client.get<Array<EsploraUtxoInfo>>(
          `${this.apiPrefix}/tx/${txId}/outspends`,
        )
      ).data;
      this.logger.debug(
        `requested 'tx/:txid/outspends' for tx [${txId}]. res: ${JsonBigInt.stringify(
          utxosInfo,
        )}`,
      );
    } catch (e: any) {
      const baseError = `Failed to get tx [${txId}] Utxos status from Esplora: `;
      if (e.response && e.response.status === 404) {
        this.logger.debug(`tx [${txId}] is not found`);
        return false;
      } else if (e.response) {
        throw new FailedError(baseError + e.response.data);
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }

    if (utxosInfo.length <= Number(index)) {
      this.logger.debug(
        `Utxo [${boxId}] is invalid: Transaction [${txId}] doesn't have index [${index}]`,
      );
      return false;
    }

    const box = utxosInfo[Number(index)];
    if (!box.spent) return true;
    this.logger.debug(`box [${boxId}] is spent in tx [${box.txid}]`);
    return false;
  };

  /**
   * gets an utxo from the network
   * @param boxId the id of Utxo (txId + . + index)
   * @returns the utxo
   */
  getUtxo = async (boxId: string): Promise<BitcoinUtxo> => {
    const [txId, index] = boxId.split('.');
    let txInfo: EsploraTx;

    try {
      txInfo = (
        await this.client.get<EsploraTx>(`${this.apiPrefix}/tx/${txId}`)
      ).data;
      this.logger.debug(
        `requested 'tx' for tx [${txId}]. res: ${JsonBigInt.stringify(txInfo)}`,
      );
    } catch (e: any) {
      const baseError = `Failed to get tx [${txId}] Utxos status from Esplora: `;
      if (e.response) {
        throw new FailedError(baseError + e.response.data);
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }

    if (txInfo.vout.length <= Number(index)) {
      throw new FailedError(
        `Transaction [${txId}] doesn't have index [${index}]`,
      );
    }

    return {
      txId: txId,
      index: Number(index),
      value: BigInt(txInfo.vout[Number(index)].value),
    };
  };

  /**
   * gets current fee ratio of the network
   * @returns
   */
  getFeeRatio = async (): Promise<number> => {
    const target: number = CONFIRMATION_TARGET;
    if (target > 25 && target !== 144 && target !== 504 && target !== 1008)
      throw new UnexpectedApiError(
        `Esplora does not support target [${CONFIRMATION_TARGET}] for fee estimation`,
      );

    return this.client
      .get<Record<string, number>>(`${this.apiPrefix}/fee-estimates`)
      .then((res) => {
        this.logger.debug(
          `requested 'fee-estimates'. res: ${JsonBigInt.stringify(res.data)}`,
        );
        return res.data[CONFIRMATION_TARGET];
      })
      .catch((e) => {
        const baseError = `Failed to fetch fee estimation from Esplora: `;
        if (e.response) {
          throw new FailedError(baseError + `${e.response.data}`);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets id of transactions in mempool
   * @returns
   */
  getMempoolTxIds = async (): Promise<Array<string>> => {
    return this.client
      .get<Array<string>>(`${this.apiPrefix}/mempool/txids`)
      .then((res) => {
        this.logger.debug(
          `requested 'mempool/txids'. received [${res.data.length}] txs`,
        );
        return res.data;
      })
      .catch((e) => {
        const baseError = `Failed to get mempool transaction ids from Esplora: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };
}

export default BitcoinEsploraNetwork;
