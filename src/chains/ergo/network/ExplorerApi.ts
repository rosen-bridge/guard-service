import axios from 'axios';
import {
  AddressBalance,
  Boxes,
  ExplorerTransaction,
  MempoolTransactions,
} from '../models/Interfaces';
import { JsonBI } from '../../../network/NetworkModels';
import ErgoConfigs from '../helpers/ErgoConfigs';
import { loggerFactory } from '../../../log/Logger';
import {
  NetworkError,
  FailedError,
  UnexpectedApiError,
  NotFoundError,
} from '../../../helpers/errors';

const logger = loggerFactory(import.meta.url);

class ExplorerApi {
  static explorerApi = axios.create({
    baseURL: ErgoConfigs.explorer.url + '/api',
    timeout: ErgoConfigs.explorer.timeout * 1000,
  });

  /**
   * gets boxes of an ergoTree
   * @param ergoTree the address ergoTree
   * @param offset
   * @param limit
   */
  static getBoxesForErgoTree = (
    ergoTree: string,
    offset = 0,
    limit = 100
  ): Promise<Boxes> => {
    return this.explorerApi
      .get<Boxes>(
        `/v1/boxes/unspent/byErgoTree/${ergoTree}?offset=${offset}&limit=${limit}`,
        {
          transformResponse: (data) => JsonBI.parse(data),
        }
      )
      .then((res) => res.data)
      .catch((e) => {
        const baseError = `Failed to get boxes for ErgoTree [${ergoTree}] from Ergo Explorer: `;
        if (e.response) {
          if (e.response.status === 404)
            return {
              items: [],
              total: 0,
            };
          else
            throw new FailedError(
              baseError + `${e.response.status}: ${e.response.data.reason}`
            );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets boxes containing tokenId
   * @param tokenId the address ergoTree
   */
  static getBoxesByTokenId = (tokenId: string): Promise<Boxes> => {
    return this.explorerApi
      .get<Boxes>(`/v1/boxes/unspent/byTokenId/${tokenId}`)
      .then((res) => res.data)
      .catch((e) => {
        const baseError = `Failed to get boxes containing token [${tokenId}] from Ergo Explorer: `;
        if (e.response) {
          if (e.response.status === 404)
            return {
              items: [],
              total: 0,
            };
          else
            throw new FailedError(
              baseError + `${e.response.status}: ${e.response.data.reason}`
            );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets tx confirmation (returns -1 if tx not found)
   * @param txId
   */
  static getTxConfirmation = (txId: string): Promise<number> => {
    return this.explorerApi
      .get<{ numConfirmations: number }>(`/v1/transactions/${txId}`)
      .then((res) => res.data.numConfirmations)
      .catch((e) => {
        const baseError = `Failed to get tx [${txId}] from Ergo Explorer: `;
        if (e.response) {
          if (e.response.status === 404) return -1;
          else
            throw new FailedError(
              baseError + `${e.response.status}: ${e.response.data.reason}`
            );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * checks if tx is in mempool
   * @param txId
   */
  static isTxInMempool = (txId: string): Promise<boolean> => {
    return this.explorerApi
      .get(`/v0/transactions/unconfirmed/${txId}`)
      .then(() => true)
      .catch((e) => {
        const baseError = `Failed to get tx [${txId}] from mempool of Ergo Explorer: `;
        if (e.response) {
          if (e.response.status === 404) return false;
          else
            throw new FailedError(
              baseError + `${e.response.status}: ${e.response.data.reason}`
            );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * checks if box is in network and unspent
   * @param boxId
   */
  static isBoxUnspentAndValid = (boxId: string): Promise<boolean> => {
    return this.explorerApi
      .get(`/v1/boxes/${boxId}`)
      .then((res) => res.data.spentTransactionId === null)
      .catch((e) => {
        const baseError = `Failed to get box [${boxId}] from Ergo Explorer: `;
        if (e.response) {
          if (e.response.status === 404) return false;
          else
            throw new FailedError(
              baseError + `${e.response.status}: ${e.response.data.reason}`
            );
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * Searches for a confirmed tx with the specified txId
   * @param txId, the requested txId
   */
  static getConfirmedTx = (txId: string): Promise<ExplorerTransaction> => {
    return this.explorerApi
      .get<ExplorerTransaction>(`/v1/transactions/${txId}`)
      .then((res) => {
        return res.data;
      })
      .catch((e) => {
        const baseError = `Failed to get confirmed tx [${txId}]: `;
        if (e.response) {
          if (e.response.status === 404)
            throw new NotFoundError(baseError + e.response.data.reason);
          else throw new FailedError(baseError + e.response.data.reason);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets amount of erg and tokens in an address
   * @param address the address
   */
  static getAddressAssets = (address: string): Promise<AddressBalance> => {
    return this.explorerApi
      .get<AddressBalance>(`/v1/addresses/${address}/balance/confirmed`, {
        transformResponse: (data) => JsonBI.parse(data),
      })
      .then((res) => {
        return res.data;
      })
      .catch((e) => {
        const baseError = `Failed to get address [${address}] assets: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data.reason);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets tx confirmation (returns -1 if tx not found)
   * @param address
   */
  static getMempoolTxsForAddress = (
    address: string
  ): Promise<MempoolTransactions> => {
    return this.explorerApi
      .get<MempoolTransactions>(`/v1/mempool/transactions/byAddress/${address}`)
      .then((res) => res.data)
      .catch((e) => {
        const baseError = `Failed to get mempool txs for address [${address}] from Ergo Explorer: `;
        if (e.response) {
          throw new FailedError(baseError + e.response.data.reason);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };
}

export default ExplorerApi;
