import axios from 'axios';
import { KoiosTransaction, Utxo } from '../models/Interfaces';
import CardanoConfigs from '../helpers/CardanoConfigs';
import { logger } from '../../../log/Logger';

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
      .post<{ utxo_set: Utxo[] }[]>('/address_info', { _address: address })
      .then((res) => res.data[0].utxo_set)
      .catch((e) => {
        logger.error(
          `An error occurred while getting address [${address}] boxes from Koios: ${e}`
        );
        throw e;
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
        logger.error(
          `An error occurred while getting confirmation for tx [${txId}] from Koios: ${e}`
        );
        throw e;
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
        logger.warn(
          `An error occurred while getting information of txs [${JSON.stringify(
            txHashes
          )}] from Koios: ${e}`
        );
        return [];
      });
  };
}

export default KoiosApi;
