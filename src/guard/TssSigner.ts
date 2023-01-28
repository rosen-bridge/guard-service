import axios from 'axios';
import Configs from '../helpers/Configs';
import Utils from '../helpers/Utils';
import { loggerFactory } from '../log/Logger';

const logger = loggerFactory(import.meta.url);

class TssSigner {
  static tssApi = axios.create({
    baseURL: Configs.tssUrl + `:${Configs.tssPort}`,
    timeout: Configs.tssTimeout * 1000,
  });
  static tssCallBackUrl = Configs.tssCallBackUrl;

  /**
   * sends request to TSS service to sign a transaction
   * @param txHash
   * @return bytes of signed message
   */
  static signTxHash = async (txHash: Uint8Array) => {
    return this.tssApi
      .post('/sign', {
        crypto: 'eddsa',
        message: Utils.Uint8ArrayToHexString(txHash),
        callBackUrl: this.tssCallBackUrl,
      })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error(
            `Failed to connect to TSS service. Status code: [${res.status}]`
          );
        }
      });
  };
}

export default TssSigner;
