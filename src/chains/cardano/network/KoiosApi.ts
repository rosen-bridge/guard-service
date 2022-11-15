import axios from 'axios';
import { KoiosTransaction, Utxo } from '../models/Interfaces';
import CardanoConfigs from '../helpers/CardanoConfigs';
import { logger } from '../../../log/Logger';
import {
  FailedError,
  NetworkError,
  NotFoundError,
  UnexpectedApiError,
} from '../../../helpers/errors';

class KoiosApi {
  static koios = axios.create({
    baseURL: CardanoConfigs.koios.url,
    timeout: CardanoConfigs.koios.timeout * 1000,
    headers: { 'Content-Type': 'application/json' },
  });

  /**
   * gets utxo boxes owned by the address
   * @param address
   */
  static getAddressBoxes = (address: string): Promise<Utxo[]> => {
    return this.koios
      .post<{ utxo_set: Utxo[] }[]>('/address_info', { _addresses: [address] })
      .then((res) => res.data[0].utxo_set)
      .catch((e) => {
        const baseError = `Failed to get address [${address}] boxes from Koios: `;
        if (e.response) {
          throw new FailedError(baseError + `${e.response.data.reason}`);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * gets tx confirmation
   * @param txId
   */
  static getTxConfirmation = (txId: string): Promise<number | null> => {
    return this.koios
      .post<{ num_confirmations: number }[]>('/tx_status', {
        _tx_hashes: [txId],
      })
      .then((res) => res.data[0].num_confirmations)
      .catch((e) => {
        const baseError = `Failed to get confirmation for tx [${txId}] from Koios: `;
        if (e.response) {
          throw new FailedError(baseError + `${e.response.data.reason}`);
        } else if (e.request) {
          throw new NetworkError(baseError + e.message);
        } else {
          throw new UnexpectedApiError(baseError + e.message);
        }
      });
  };

  /**
   * returns tx meta data
   * @param txHashes
   */
  static getTxInformation = (
    txHashes: Array<string>
  ): Promise<Array<KoiosTransaction>> => {
    return this.koios
      .post<KoiosTransaction[]>('/tx_info', { _tx_hashes: txHashes })
      .then((res) => res.data)
      .catch((e) => {
        const baseError = `Failed to get information of txs [${JSON.stringify(
          txHashes
        )}] from Koios: `;
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
}

export default KoiosApi;
