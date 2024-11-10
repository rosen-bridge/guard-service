import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AssetBalance,
  BlockInfo,
  FailedError,
  NetworkError,
  TokenInfo,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import JsonBigInt from '@rosen-bridge/json-bigint';
import {
  AbstractDogeNetwork,
  DogeTx,
  DogeUtxo,
  CONFIRMATION_TARGET,
} from '@rosen-chains/doge';
import axios, { AxiosInstance } from 'axios';
import { Psbt } from 'bitcoinjs-lib';
import {
  EsploraAddress,
  EsploraBlock,
  EsploraTx,
  EsploraUtxo,
  EsploraUtxoInfo,
} from './types';

class DogeEsploraNetwork extends AbstractDogeNetwork {
  protected client: AxiosInstance;
  private getSavedTransactionById: (
    txId: string
  ) => Promise<DogeTx | undefined>;

  constructor(
    url: string,
    getSavedTransactionById: (txId: string) => Promise<DogeTx | undefined>,
    logger?: AbstractLogger
  ) {
    super(logger);
    this.client = axios.create({
      baseURL: url,
    });
    this.getSavedTransactionById = getSavedTransactionById;
  }

  /**
   * gets the blockchain height
   * @returns the blockchain height
   */
  getHeight = async (): Promise<number> => {
    return this.client
      .get<number>(`/api/blocks/tip/height`)
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
   * @param transactionId the transaction id (only supports real signed tx id)
   * @returns the transaction confirmation
   */
  getTxConfirmationSigned = async (transactionId: string): Promise<number> => {
    const currentHeight = await this.getHeight();
    let txHeight = -1;
    try {
      const txInfo = (
        await this.client.get<EsploraTx>(`/api/tx/${transactionId}`)
      ).data;
      this.logger.debug(
        `requested 'tx' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
          txInfo
        )}`
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
   * gets confirmation for a transaction (returns -1 if tx is not mined or found)
   * @param transactionId the transaction id (supports both real signed tx id and unsigned tx id)
   * @returns the transaction confirmation (returns -1 if tx is not mined or found)
   */
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    let realTxId = transactionId;
    try {
      const realTx = await this.getSavedTransactionById(transactionId);
      if (realTx) {
        const firstInputId = `${realTx?.inputs[0].txId}.${realTx?.inputs[0].index}`;
        const spentTx = await this.getSpentTransactionByInputId(firstInputId);
        if (spentTx) {
          const sameInputs = realTx.inputs.every(
            (input, i) =>
              spentTx.inputs[i].txId === input.txId &&
              spentTx.inputs[i].index === input.index
          );
          const sameOutputs = realTx.outputs.every(
            (output, i) =>
              spentTx.outputs[i].scriptPubKey === output.scriptPubKey &&
              spentTx.outputs[i].value === output.value
          );
          if (sameInputs && sameOutputs) {
            realTxId = spentTx.id;
          }
        }
      }
    } catch (e) {
      this.logger.debug(`tx [${transactionId}] is not found in DB`);
    }

    return await this.getTxConfirmationSigned(realTxId);
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
      .get<EsploraAddress>(`/api/address/${address}`)
      .then((res) => {
        this.logger.debug(
          `requested 'address' for address [${address}]. res: ${JsonBigInt.stringify(
            res.data
          )}`
        );
        const chainStat = res.data.chain_stats;
        nativeToken = BigInt(
          chainStat.funded_txo_sum - chainStat.spent_txo_sum
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
      .get<Array<string>>(`/api/block/${blockId}/txids`)
      .then((res) => {
        this.logger.debug(
          `requested 'block/:hash/txids' for blockId [${blockId}]. received: ${JsonBigInt.stringify(
            res.data
          )}`
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
      .get<EsploraBlock>(`/api/block/${blockId}`)
      .then((res) => {
        this.logger.debug(
          `requested 'block' for blockId [${blockId}]. res: ${JsonBigInt.stringify(
            res.data
          )}`
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
   * gets a transaction (serialized in `DogeTx` format)
   * @param transactionId the transaction id
   * @param blockId the block id
   * @returns the transaction
   */
  getTransaction = async (
    transactionId: string,
    blockId: string
  ): Promise<DogeTx> => {
    let txInfo: EsploraTx;
    try {
      txInfo = (await this.client.get<EsploraTx>(`/api/tx/${transactionId}`))
        .data;
      this.logger.debug(
        `requested 'tx' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
          txInfo
        )}`
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
        `Tx [${transactionId}] doesn't belong to block [${blockId}]`
      );

    const tx: DogeTx = {
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
    await this.client.post(`/api/tx`, transaction.extractTransaction().toHex());
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
    limit: number
  ): Promise<Array<DogeUtxo>> => {
    const boxes = await this.client
      .get<Array<EsploraUtxo>>(`/api/address/${address}/utxo`)
      .then((res) => {
        this.logger.debug(
          `requested 'address/:address/utxo' for address [${address}]. res: ${JsonBigInt.stringify(
            res.data
          )}`
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
          `/api/tx/${txId}/outspends`
        )
      ).data;
      this.logger.debug(
        `requested 'tx/:txid/outspends' for tx [${txId}]. res: ${JsonBigInt.stringify(
          utxosInfo
        )}`
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
        `Utxo [${boxId}] is invalid: Transaction [${txId}] doesn't have index [${index}]`
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
  getUtxo = async (boxId: string): Promise<DogeUtxo> => {
    const [txId, index] = boxId.split('.');
    let txInfo: EsploraTx;

    try {
      txInfo = (await this.client.get<EsploraTx>(`/api/tx/${txId}`)).data;
      this.logger.debug(
        `requested 'tx' for tx [${txId}]. res: ${JsonBigInt.stringify(txInfo)}`
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
        `Transaction [${txId}] doesn't have index [${index}]`
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
    if (target > 25)
      throw new UnexpectedApiError(
        `Esplora does not support target [${CONFIRMATION_TARGET}] for fee estimation`
      );

    return this.client
      .get<Record<string, number>>(`/api/fee-estimates`)
      .then((res) => {
        this.logger.debug(
          `requested 'fee-estimates'. res: ${JsonBigInt.stringify(res.data)}`
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
      .get<Array<string>>(`/api/mempool/txids`)
      .then((res) => {
        this.logger.debug(
          `requested 'mempool/txids'. received [${res.data.length}] txs`
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

  /**
   * gets a transaction hex string
   * @param txId the transaction id (only supports real signed tx id)
   * @returns hex string of the transaction
   */
  getTransactionHex = async (txId: string): Promise<string> => {
    return this.client
      .get<string>(`/api/tx/${txId}/hex`)
      .then((res) => res.data);
  };

  getSpentTransactionByInputId = async (
    boxId: string
  ): Promise<DogeTx | undefined> => {
    const [txId, index] = boxId.split('.');
    const box = (
      await this.client.get<EsploraUtxoInfo>(
        `/api/tx/${txId}/outspends/${index}`
      )
    ).data;
    if (!box.spent) return undefined;
    return this.getTransaction(box.txid!, box.status!.block_hash!);
  };
}

export default DogeEsploraNetwork;
