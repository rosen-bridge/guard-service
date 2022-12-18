import { Buffer } from 'buffer';
import pkg from 'secp256k1';

import { loggerFactory } from '../log/Logger';

import ErgoUtils from '../chains/ergo/helpers/ErgoUtils';
import ExplorerApi from '../chains/ergo/network/ExplorerApi';
import MultiSigHandler from '../guard/multisig/MultiSig';

import Configs from './Configs';
import { rosenConfig } from './RosenConfig';

const logger = loggerFactory(import.meta.url);

class GuardConfig {
  publicKeys: Array<string>;
  requiredSign: number;
  guardsLen: number;
  guardId: number;

  /**
   * Apply required changes to multi sig as a result of changes in public keys
   */
  private handleMultiSigPublicKeysChange = () => {
    const multiSig = MultiSigHandler.getInstance();
    multiSig.handlePublicKeysChange(this.publicKeys);
  };

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

        this.handleMultiSigPublicKeysChange();

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
