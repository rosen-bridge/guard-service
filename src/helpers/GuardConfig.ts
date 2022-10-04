import ExplorerApi from '../chains/ergo/network/ExplorerApi';
import { rosenConfig } from './RosenConfig';
import ErgoUtils from '../chains/ergo/helpers/ErgoUtils';
import { Buffer } from 'buffer';
import pkg from 'secp256k1';
import Configs from './Configs';
import { logger } from '../log/Logger';

class GuardConfig {
  publicKeys: Array<string>;
  requiredSign: number;
  guardsLen: number;
  guardId: number;

  /**
   * Sets the guard public keys and required sign config
   */
  setConfig = async () => {
    const guardBox = (await ExplorerApi.getBoxesByTokenId(rosenConfig.guardNFT))
      .items[0];
    if (guardBox) {
      try {
        const r4 = ErgoUtils.decodeCollColl(
          guardBox.additionalRegisters['R4'].serializedValue
        );
        const r5 = ErgoUtils.decodeCollInt(
          guardBox.additionalRegisters['R5'].serializedValue
        );
        this.publicKeys = r4.map((pk) => Buffer.from(pk).toString('hex'));
        this.guardsLen = r4.length;
        this.requiredSign = r5[0];
        const guardPk = Buffer.from(
          pkg.publicKeyCreate(Buffer.from(Configs.guardSecret, 'hex'))
        ).toString('hex');
        this.guardId = -1;
        for (const [i, value] of this.publicKeys.entries()) {
          if (guardPk == value) {
            this.guardId = i;
            break;
          }
        }
        if (this.guardId == -1)
          throw new Error(
            "The guard public key doesn't exist in current service guard config"
          );
        logger.info('Guard configs updated successfully');
        return;
      } catch (e) {
        logger.warn(`An error occurred while updating guard configs: ${e}`);
        throw new Error('Guard box format is incorrect');
      }
    }
    throw new Error(
      'Guard Sign box is not available, check the guard NFT to be correct'
    );
  };
}

const guardConfig = new GuardConfig();
export { guardConfig, GuardConfig };
