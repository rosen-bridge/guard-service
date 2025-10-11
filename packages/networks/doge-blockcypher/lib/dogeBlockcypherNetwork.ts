import axios, { AxiosInstance } from 'axios';
import rateLimit from 'axios-rate-limit';
import { Psbt } from 'bitcoinjs-lib';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import {
  AssetBalance,
  BlockInfo,
  FailedError,
  NetworkError,
  PaymentTransaction,
  TokenInfo,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import {
  PartialDogeNetwork,
  DogeNetworkFunction,
  DogeTx,
  DogeUtxo,
  DOGE_NETWORK,
} from '@rosen-chains/doge';

import {
  BlockCypherAddress,
  BlockCypherBlock,
  BlockCypherChain,
  BlockCypherTx,
} from './types';

class DogeBlockCypherNetwork extends PartialDogeNetwork {
  protected client: AxiosInstance;
  private getSavedTransactionById: (
    txId: string,
  ) => Promise<PaymentTransaction | undefined>;

  // Implement all DogeNetworkFunction functions
  readonly implements = [
    DogeNetworkFunction.getHeight,
    DogeNetworkFunction.getTxConfirmation,
    DogeNetworkFunction.getAddressAssets,
    DogeNetworkFunction.getBlockTransactionIds,
    DogeNetworkFunction.getBlockInfo,
    DogeNetworkFunction.getTransaction,
    DogeNetworkFunction.submitTransaction,
    DogeNetworkFunction.getAddressBoxes,
    DogeNetworkFunction.isBoxUnspentAndValid,
    DogeNetworkFunction.getUtxo,
    DogeNetworkFunction.getFeeRatio,
    DogeNetworkFunction.isTxInMempool,
    DogeNetworkFunction.getTransactionHex,
    DogeNetworkFunction.getActualTxId,
  ] as DogeNetworkFunction[];

  constructor(
    url: string,
    getSavedTransactionById: (
      txId: string,
    ) => Promise<PaymentTransaction | undefined>,
    logger?: AbstractLogger,
    maxRPS = 3,
  ) {
    super(logger);
    // Use axios-rate-limit to limit to 3 requests per second
    this.client = rateLimit(
      axios.create({
        baseURL: url,
      }),
      { maxRPS },
    );
    this.getSavedTransactionById = getSavedTransactionById;
  }

  /**
   * gets the blockchain height
   * @returns the blockchain height
   */
  getHeight = async (): Promise<number> => {
    return this.client
      .get<BlockCypherChain>('/v1/doge/main')
      .then((res) => res.data.height)
      .catch((e) => {
        const baseError = `Failed to fetch current height from BlockCypher: `;
        if (e.response) {
          throw new FailedError(
            baseError + `${JsonBigInt.stringify(e.response.data)}`,
          );
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
  protected getTxConfirmationSigned = async (
    transactionId: string,
  ): Promise<number> => {
    try {
      const txInfo = (
        await this.client.get<BlockCypherTx>(
          `/v1/doge/main/txs/${transactionId}`,
        )
      ).data;
      this.logger.debug(
        `requested 'tx' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
          txInfo,
        )}`,
      );
      if (txInfo.confirmations === 0) return -1;
      return txInfo.confirmations;
    } catch (e: any) {
      const baseError = `Failed to get confirmation for tx [${transactionId}] from BlockCypher: `;
      if (e.response && e.response.status === 404) {
        this.logger.debug(`tx [${transactionId}] is not found`);
        return -1;
      } else if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * gets confirmation for a transaction (returns -1 if tx is not mined or found)
   * @param transactionId the transaction id (supports both real signed tx id and unsigned tx id)
   * @returns the transaction confirmation (returns -1 if tx is not mined or found)
   */
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    const realTxId = await this.getActualTxId(transactionId);
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
      .get<BlockCypherAddress>(`/v1/doge/main/addrs/${address}/balance`)
      .then((res) => {
        this.logger.debug(
          `requested 'address' for address [${address}]. res: ${JsonBigInt.stringify(
            res.data,
          )}`,
        );
        nativeToken = BigInt(res.data.final_balance);
        return { nativeToken, tokens };
      })
      .catch((e) => {
        const baseError = `Failed to get address [${address}] assets from BlockCypher: `;
        if (e.response) {
          throw new FailedError(
            baseError + JsonBigInt.stringify(e.response.data),
          );
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
  getBlockTransactionIds = async (blockId: string): Promise<Array<string>> => {
    let allTxIds: Array<string> = [];
    const limit = 500;
    let txstart = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const url = `/v1/doge/main/blocks/${blockId}?limit=${limit}&txstart=${txstart}`;
        const res: { data: BlockCypherBlock } =
          await this.client.get<BlockCypherBlock>(url);
        this.logger.debug(
          `requested 'block/:hash/txids' for blockId [${blockId}]. received: ${JsonBigInt.stringify(
            res.data,
          )}`,
        );

        // Add the current batch of transaction IDs
        allTxIds = allTxIds.concat(res.data.txids);

        hasMore = res.data.txids.length === limit;
        txstart += limit;
      } catch (e: any) {
        const baseError = `Failed to get block [${blockId}] transaction ids from BlockCypher: `;
        if (e.response) {
          throw new FailedError(
            baseError + JsonBigInt.stringify(e.response.data),
          );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      }
    }

    return allTxIds;
  };

  /**
   * gets info of the given block
   * @param blockId the block id
   * @returns an object containing block info
   */
  getBlockInfo = (blockId: string): Promise<BlockInfo> => {
    return this.client
      .get<BlockCypherBlock>(`/v1/doge/main/blocks/${blockId}`)
      .then((res) => {
        this.logger.debug(
          `requested 'block' for blockId [${blockId}]. res: ${JsonBigInt.stringify(
            res.data,
          )}`,
        );
        const block = res.data;
        return {
          hash: block.hash,
          parentHash: block.prev_block,
          height: block.height,
        };
      })
      .catch((e) => {
        const baseError = `Failed to get block [${blockId}] info from BlockCypher: `;
        if (e.response) {
          throw new FailedError(
            baseError + JsonBigInt.stringify(e.response.data),
          );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets the transaction with the given id
   * @param transactionId the transaction id
   * @param blockId the block id
   * @returns the transaction
   */
  getTransaction = async (
    transactionId: string,
    blockId: string,
  ): Promise<DogeTx> => {
    let txInfo: BlockCypherTx;
    try {
      txInfo = (
        await this.client.get<BlockCypherTx>(
          `/v1/doge/main/txs/${transactionId}?limit=5000`,
        )
      ).data;
      this.logger.debug(
        `requested 'tx' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
          txInfo,
        )}`,
      );
    } catch (e: any) {
      const baseError = `Failed to get transaction [${transactionId}] from BlockCypher: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }

    if (txInfo.confirmations === 0) {
      throw new FailedError(`Tx [${transactionId}] is not confirmed`);
    }

    if (txInfo.block_hash !== blockId && blockId !== '')
      throw new FailedError(
        `Tx [${transactionId}] doesn't belong to block [${blockId}]`,
      );

    return {
      id: txInfo.hash,
      inputs: txInfo.inputs.map((input) => ({
        txId: input.prev_hash,
        index: input.output_index,
        scriptPubKey: input.script,
      })),
      outputs: txInfo.outputs.map((output) => ({
        scriptPubKey: output.script,
        value: BigInt(output.value),
      })),
    };
  };

  /**
   * submits a transaction to the network
   * @param transaction the transaction to submit
   * @returns the transaction id
   */
  submitTransaction = async (transaction: Psbt): Promise<void> => {
    return this.client
      .post<{ tx: { hash: string } }>('/v1/doge/main/txs/push', {
        tx: transaction.extractTransaction(true).toHex(),
      })
      .then((res) => {
        this.logger.debug(
          `submitted transaction. res: ${JsonBigInt.stringify(res.data)}`,
        );
      })
      .catch((e) => {
        const baseError = `Failed to submit transaction to BlockCypher: `;
        if (e.response) {
          throw new FailedError(
            baseError + JsonBigInt.stringify(e.response.data),
          );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets address boxes
   * @param address the address
   * @param offset the offset
   * @param limit the limit
   * @returns list of boxes
   */
  getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number,
  ): Promise<Array<DogeUtxo>> => {
    try {
      const currentHeight = await this.getHeight();
      const totalToFetch = offset + limit;
      let allUtxos: Array<DogeUtxo> = [];
      let beforeHeight = currentHeight + 1;
      const batchSize = Math.min(500, totalToFetch);

      while (allUtxos.length < totalToFetch) {
        const response = await this.client.get<BlockCypherAddress>(
          `/v1/doge/main/addrs/${address}?unspentOnly=true&before=${beforeHeight}&limit=${batchSize}`,
        );

        const txrefs = response.data.txrefs ?? [];
        const batchUtxos: Array<DogeUtxo> = [];
        let minHeight = beforeHeight;

        for (const txref of txrefs) {
          if (!txref.spent) {
            batchUtxos.push({
              txId: txref.tx_hash,
              index: txref.tx_output_n,
              value: BigInt(txref.value),
            });
            minHeight = Math.min(minHeight, txref.block_height);
          }
        }

        allUtxos = allUtxos.concat(batchUtxos);

        if (batchUtxos.length === 0 || allUtxos.length >= totalToFetch) {
          break;
        }

        beforeHeight = minHeight;
      }

      return allUtxos.slice(offset, offset + limit);
    } catch (e: any) {
      const baseError = `Failed to get address [${address}] boxes from BlockCypher: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
  };

  /**
   * checks if a box is unspent and valid
   * @param boxId the box id
   * @returns true if the box is unspent and valid
   */
  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    const [txId, index] = boxId.split('.');
    return this.client
      .get<BlockCypherTx>(`/v1/doge/main/txs/${txId}?limit=5000`)
      .then((res) => {
        this.logger.debug(
          `requested 'tx' for txId [${txId}]. res: ${JsonBigInt.stringify(
            res.data,
          )}`,
        );
        const tx = res.data;
        if (parseInt(index) >= tx.outputs.length) {
          return false;
        }
        const output = tx.outputs[parseInt(index)];
        return !output.spent_by;
      })
      .catch((e) => {
        const baseError = `Failed to check box [${boxId}] from BlockCypher: `;
        if (e.response && e.response.status === 404) {
          this.logger.debug(`Transaction [${txId}] is not found`);
          return false;
        } else if (e.response) {
          throw new FailedError(
            baseError + JsonBigInt.stringify(e.response.data),
          );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets a box by its id
   * @param boxId the box id
   * @returns the box
   */
  getUtxo = async (boxId: string): Promise<DogeUtxo> => {
    const [txId, index] = boxId.split('.');
    let txInfo: BlockCypherTx;

    try {
      txInfo = (
        await this.client.get<BlockCypherTx>(
          `/v1/doge/main/txs/${txId}?limit=5000`,
        )
      ).data;
      this.logger.debug(
        `requested 'tx' for tx [${txId}]. res: ${JsonBigInt.stringify(txInfo)}`,
      );
    } catch (e: any) {
      const baseError = `Failed to get tx [${txId}] Utxos status from BlockCypher: `;
      if (e.response && e.response.status === 404) {
        throw new FailedError(`Transaction [${txId}] is not found`);
      } else if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }

    if (txInfo.outputs.length <= Number(index)) {
      throw new FailedError(
        `Transaction [${txId}] doesn't have index [${index}]`,
      );
    }

    return {
      txId: txId,
      index: Number(index),
      value: BigInt(txInfo.outputs[Number(index)].value),
    };
  };

  /**
   * gets the current fee ratio
   * @returns the current fee ratio per byte
   */
  getFeeRatio = async (): Promise<number> => {
    return this.client
      .get<BlockCypherChain>('/v1/doge/main')
      .then((res) => {
        this.logger.debug(
          `requested 'chain' for fee ratio. res: ${JsonBigInt.stringify(
            res.data,
          )}`,
        );
        return res.data.medium_fee_per_kb / 1000;
      })
      .catch((e) => {
        const baseError = `Failed to get fee ratio from BlockCypher: `;
        if (e.response) {
          throw new FailedError(
            baseError + JsonBigInt.stringify(e.response.data),
          );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * checks if a transaction is in mempool
   * @param txId the transaction id
   * @returns true if the transaction is in mempool, false otherwise
   */
  isTxInMempool = async (txId: string): Promise<boolean> => {
    return this.client
      .get<BlockCypherTx>(`/v1/doge/main/txs/${txId}`)
      .then((res) => {
        this.logger.debug(
          `requested 'tx' for txId [${txId}]. res: ${JsonBigInt.stringify(
            res.data,
          )}`,
        );
        return res.data.confirmations === 0;
      })
      .catch((e) => {
        const baseError = `Failed to get mempool txids from BlockCypher: `;
        if (e.response && e.response.status === 404) {
          return false;
        } else if (e.response) {
          throw new FailedError(
            baseError + JsonBigInt.stringify(e.response.data),
          );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets the raw transaction hex
   * @param txId the transaction id
   * @returns the raw transaction hex
   */
  getTransactionHex = async (txId: string): Promise<string> => {
    return this.client
      .get<BlockCypherTx>(`/v1/doge/main/txs/${txId}?includeHex=true`)
      .then((res) => {
        this.logger.debug(
          `requested 'tx' for txId [${txId}]. res: ${JsonBigInt.stringify(
            res.data,
          )}`,
        );
        return res.data.hex!;
      })
      .catch((e) => {
        const baseError = `Failed to get transaction hex [${txId}] from BlockCypher: `;
        if (e.response) {
          throw new FailedError(
            baseError + JsonBigInt.stringify(e.response.data),
          );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets the transaction that spent a specific input
   * @param index the input index
   * @param txId the transaction id
   * @returns the transaction that spent the input
   */
  getSpentTransactionByInputId = async (
    index: number,
    txId: string,
  ): Promise<DogeTx | undefined> => {
    return this.client
      .get<BlockCypherTx>(`/v1/doge/main/txs/${txId}?limit=5000`)
      .then((res) => {
        this.logger.debug(
          `requested 'tx' for txId [${txId}]. res: ${JsonBigInt.stringify(
            res.data,
          )}`,
        );
        const tx = res.data;
        const output = tx.outputs[index];
        if (output.spent_by) {
          return this.getTransaction(output.spent_by, '');
        }
        return undefined;
      })
      .catch((e) => {
        const baseError = `Failed to get spent transaction for input [${txId}:${index}] from BlockCypher: `;
        if (e.response) {
          throw new FailedError(
            baseError + JsonBigInt.stringify(e.response.data),
          );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets the actual id of a transaction by its hash
   * @param hash
   */
  getActualTxId = async (hash: string): Promise<string> => {
    let actualTxId = hash;
    try {
      const realPaymentTx = await this.getSavedTransactionById(hash);

      if (realPaymentTx) {
        const realTx = Psbt.fromBuffer(Buffer.from(realPaymentTx.txBytes), {
          network: DOGE_NETWORK,
        });
        try {
          actualTxId = realTx.extractTransaction(true).getId();
        } catch {
          const spentTx = await this.getSpentTransactionByInputId(
            realTx.txInputs[0].index,
            Buffer.from(realTx.txInputs[0].hash.reverse()).toString('hex'),
          );
          if (spentTx) {
            const sameInputs = realTx.txInputs.every(
              (input, i) =>
                spentTx.inputs[i].txId ===
                  Buffer.from(input.hash.reverse()).toString('hex') &&
                spentTx.inputs[i].index === input.index,
            );
            const sameOutputs = realTx.txOutputs.every(
              (output, i) =>
                spentTx.outputs[i].scriptPubKey ===
                  Buffer.from(output.script).toString('hex') &&
                spentTx.outputs[i].value === BigInt(output.value),
            );
            if (sameInputs && sameOutputs) {
              actualTxId = spentTx.id;
            }
          }
        }
      }
    } catch (e: any) {
      const baseError = `Failed to get confirmation for tx [${hash}] which was found in the database: `;
      if (e.response) {
        throw new FailedError(
          baseError + JsonBigInt.stringify(e.response.data),
        );
      } else if (e.request) {
        throw new NetworkError(baseError + e.message);
      } else {
        throw new UnexpectedApiError(baseError + e.message);
      }
    }
    return actualTxId;
  };
}

export default DogeBlockCypherNetwork;
