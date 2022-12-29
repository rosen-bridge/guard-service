import axios from 'axios';
import {
  AddressAssets,
  AddressInfo,
  AssetInfo,
  KoiosTransaction,
  Utxo,
  UtxoBoxesAssets,
} from '../models/Interfaces';
import CardanoConfigs from '../helpers/CardanoConfigs';
import {
  FailedError,
  NetworkError,
  NotEnoughAssetsError,
  NotFoundError,
  UnexpectedApiError,
} from '../../../helpers/errors';
import { JsonBI } from '../../../network/NetworkModels';
import { Fee } from '@rosen-bridge/minimum-fee';
import {
  Assets,
  BigNum,
  ScriptHash,
} from '@emurgo/cardano-serialization-lib-nodejs';
import CardanoUtils from '../helpers/CardanoUtils';
import Utils from '../../../helpers/Utils';
import CardanoChain from '../CardanoChain';

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
  static getAddressInfo = (address: string): Promise<AddressInfo> => {
    return this.koios
      .post<AddressInfo[]>('/address_info', { _addresses: [address] })
      .then((res) => res.data[0])
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
  static getAddressBoxes = async (address: string): Promise<Utxo[]> => {
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
