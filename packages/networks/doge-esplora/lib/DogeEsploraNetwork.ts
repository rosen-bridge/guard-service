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
import BitcoinEsploraNetwork from '@rosen-chains/bitcoin-esplora';

class DogeEsploraNetwork extends BitcoinEsploraNetwork {
  protected client: AxiosInstance;
  private getSavedTransactionById: (
    txId: string
  ) => Promise<DogeTx | undefined>;

  constructor(
    url: string,
    getSavedTransactionById: (txId: string) => Promise<DogeTx | undefined>,
    logger?: AbstractLogger
  ) {
    super(url, logger);
    this.client = axios.create({
      baseURL: url,
    });
    this.getSavedTransactionById = getSavedTransactionById;
  }

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

  // /**
  //  * gets a transaction (serialized in `DogeTx` format)
  //  * @param transactionId the transaction id
  //  * @param blockId the block id
  //  * @returns the transaction
  //  */
  // getTransaction = async (
  //   transactionId: string,
  //   blockId: string
  // ): Promise<DogeTx> => {
  //   let txInfo: EsploraTx;
  //   try {
  //     txInfo = (await this.client.get<EsploraTx>(`/api/tx/${transactionId}`))
  //       .data;
  //     this.logger.debug(
  //       `requested 'tx' for txId [${transactionId}]. res: ${JsonBigInt.stringify(
  //         txInfo
  //       )}`
  //     );
  //   } catch (e: any) {
  //     const baseError = `Failed to get transaction [${transactionId}] from Esplora: `;
  //     if (e.response) {
  //       throw new FailedError(baseError + e.response.data);
  //     } else if (e.request) {
  //       throw new NetworkError(baseError + e.message);
  //     } else {
  //       throw new UnexpectedApiError(baseError + e.message);
  //     }
  //   }
  //
  //   if (txInfo.status.block_hash !== blockId)
  //     throw new FailedError(
  //       `Tx [${transactionId}] doesn't belong to block [${blockId}]`
  //     );
  //
  //   const tx: DogeTx = {
  //     id: txInfo.txid,
  //     inputs: txInfo.vin.map((input) => ({
  //       txId: input.txid,
  //       index: input.vout,
  //       scriptPubKey: input.prevout.scriptpubkey,
  //     })),
  //     outputs: txInfo.vout.map((output) => ({
  //       scriptPubKey: output.scriptpubkey,
  //       value: BigInt(output.value),
  //     })),
  //   };
  //
  //   return tx;
  // };

  /**
   * submits a transaction
   * @param transaction the transaction
   */
  submitTransaction = async (transaction: Psbt): Promise<void> => {
    await this.client.post(`/api/tx`, transaction.extractTransaction().toHex());
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
