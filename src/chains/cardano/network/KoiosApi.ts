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

  /**
   * getting all address utxos and return minimum amount of required box to be in the input of transaction
   * @param addressBoxes all utxos of bankAddress
   * @param requiredAssets required assets to be in the input of transaction
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return minimum required box to be in the input of the transaction
   */
  static getCoveringUtxo = (
    addressBoxes: Array<Utxo>,
    requiredAssets: UtxoBoxesAssets
  ): Array<Utxo> => {
    const result: Array<Utxo> = [];
    let coveredLovelace = BigNum.from_str('0');
    const shuffleIndexes = [...Array(addressBoxes.length).keys()];
    for (let i = shuffleIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffleIndexes[i], shuffleIndexes[j]] = [
        shuffleIndexes[j],
        shuffleIndexes[i],
      ];
    }

    if (requiredAssets.assets.len() === 0) {
      const paymentAmount = requiredAssets.lovelace;
      for (
        let i = 0;
        paymentAmount.compare(coveredLovelace) > 0 && i < addressBoxes.length;
        i++
      ) {
        const uTxo = addressBoxes[shuffleIndexes[i]];
        coveredLovelace = coveredLovelace.checked_add(
          BigNum.from_str(uTxo.value)
        );
        result.push(uTxo);
      }
      if (paymentAmount.compare(coveredLovelace) > 0)
        throw new Error(
          `An error occurred, theres is no enough lovelace in the bank`
        );
    } else {
      const lovelacePaymentAmount =
        requiredAssets.lovelace > BigNum.zero()
          ? requiredAssets.lovelace
          : CardanoConfigs.txMinimumLovelace;
      const requiredMultiAssets = requiredAssets.assets;
      const requiredAssetsMap = new Map<AssetInfo, BigNum>();

      for (let i = 0; i < requiredMultiAssets.keys().len(); i++) {
        const policyId = requiredMultiAssets.keys().get(i);
        const assets = requiredMultiAssets.get(policyId)!;
        for (let j = 0; j < assets.keys().len(); j++) {
          const assetName = assets.keys().get(j);
          const assetAmount = assets.get(assetName)!;
          const assetInfo: AssetInfo = {
            assetName: assetName.name(),
            policyId: policyId.to_bytes(),
            fingerprint: '',
          };
          if (requiredAssetsMap.get(assetInfo) === undefined) {
            requiredAssetsMap.set(assetInfo, assetAmount);
          } else {
            requiredAssetsMap.set(
              assetInfo,
              requiredAssetsMap.get(assetInfo)!.checked_add(assetAmount)
            );
          }
        }
      }

      for (
        let i = 0;
        (requiredAssetsMap.size > 0 ||
          lovelacePaymentAmount.compare(coveredLovelace) > 0) &&
        i < addressBoxes.length;
        i++
      ) {
        let isAdded = false;
        const uTxo = addressBoxes[shuffleIndexes[i]];
        if (requiredAssetsMap.size > 0) {
          for (const assetPair of requiredAssetsMap) {
            const assetIndex = uTxo.asset_list.findIndex(
              (asset) =>
                asset.asset_name ===
                  Utils.Uint8ArrayToHexString(assetPair[0].assetName) &&
                asset.policy_id ===
                  Utils.Uint8ArrayToHexString(assetPair[0].policyId)
            );
            if (assetIndex !== -1) {
              const asset = uTxo.asset_list[assetIndex];
              if (BigNum.from_str(asset.quantity).compare(assetPair[1]) >= 0) {
                requiredAssetsMap.delete(assetPair[0]);
              } else {
                requiredAssetsMap.set(
                  assetPair[0],
                  assetPair[1].checked_sub(BigNum.from_str(asset.quantity))
                );
              }
              coveredLovelace = coveredLovelace.checked_add(
                BigNum.from_str(uTxo.value)
              );
              result.push(uTxo);
              isAdded = true;
            }
          }
        }
        if (!isAdded && lovelacePaymentAmount.compare(coveredLovelace) > 0) {
          coveredLovelace = coveredLovelace.checked_add(
            BigNum.from_str(uTxo.value)
          );
          result.push(uTxo);
        }
      }

      if (lovelacePaymentAmount.compare(coveredLovelace) > 0)
        throw new NotEnoughAssetsError(
          `Not enough lovelace in the bank. required: ${lovelacePaymentAmount.to_str()}, found ${coveredLovelace.to_str()}`
        );
      if (requiredAssetsMap.size > 0)
        throw new NotEnoughAssetsError(
          `Not enough asset in the bank. found ${JSON.stringify(
            result
          )} shortage ${JSON.stringify(Array.from(requiredAssetsMap))}`
        );
    }
    return result;
  };
}
export default KoiosApi;
