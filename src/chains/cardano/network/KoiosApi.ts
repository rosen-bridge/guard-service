import axios from 'axios';
import {
  AddressAssets,
  AddressUtxo,
  KoiosAddressInfo,
  KoiosTransaction,
} from '../models/Interfaces';
import CardanoConfigs from '../helpers/CardanoConfigs';
import {
  FailedError,
  NetworkError,
  NotFoundError,
  UnexpectedApiError,
} from '../../../helpers/errors';
import { JsonBI } from '../../../network/NetworkModels';
import Utils from '../../../helpers/Utils';

class KoiosApi {
  static koios = axios.create({
    baseURL: CardanoConfigs.koios.url,
    timeout: CardanoConfigs.koios.timeout * 1000,
    headers: { 'Content-Type': 'application/json' },
  });

  /**
   * returns address assets
   * @param address
   */
  static getAddressInfo = (address: string): Promise<KoiosAddressInfo> => {
    return this.koios
      .post<KoiosAddressInfo[]>(
        '/address_info',
        { _addresses: [address] },
        {
          transformResponse: (data) => Utils.parseJson(data),
        }
      )
      .then((res) => ({
        ...res.data[0],
        utxo_set: res.data[0].utxo_set.map((utxo) => ({
          ...utxo,
          payment_addr: {
            bech32: address,
          },
        })),
      }))
      .catch((e) => {
        const baseError = `Failed to get address [${address}] info from Koios: `;
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
   * gets utxo boxes owned by the address
   * @param address
   */
  static getAddressBoxes = async (address: string): Promise<AddressUtxo[]> => {
    return (await this.getAddressInfo(address)).utxo_set;
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

  /**
   * returns address assets
   * @param address
   */
  static getAddressAssets = (address: string): Promise<AddressAssets> => {
    return this.koios
      .post<AddressAssets[]>(
        '/address_assets',
        { _addresses: [address] },
        {
          transformResponse: (data) => JsonBI.parse(data),
        }
      )
      .then((res) => res.data[0])
      .catch((e) => {
        const baseError = `Failed to get address [${address}] assets from Koios: `;
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
export default KoiosApi;
