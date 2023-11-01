import MultiSigHandler from '../guard/multisig/MultiSigHandler';
import Configs from '../configs/Configs';
import { rosenConfig } from '../configs/RosenConfig';
import ChainHandler from './ChainHandler';
import pkg from 'secp256k1';
import { winstonLogger } from '../log/Logger';

const logger = winstonLogger.getLogger(import.meta.url);

class GuardPkHandler {
  private static instance: GuardPkHandler;
  publicKeys: Array<string>;
  requiredSign: number;
  guardsLen: number;
  guardId: number;
  dependentModuleUpdateFunctions: Array<(pks: Array<string>) => any>;

  private constructor() {
    this.dependentModuleUpdateFunctions = [
      MultiSigHandler.getInstance().handlePublicKeysChange,
    ];
  }

  /**
   * generates a GuardPkHandler object if it doesn't exist
   * @returns GuardPkHandler instance
   */
  public static getInstance = () => {
    if (!GuardPkHandler.instance) {
      logger.debug("GuardPkHandler instance didn't exist. Creating a new one");
      GuardPkHandler.instance = new GuardPkHandler();
    }
    return GuardPkHandler.instance;
  };

  /**
   * updates the guard public keys and required sign config
   */
  update = async () => {
    logger.info('Updating guards public keys and required signs');
    const guardPkConfig = await ChainHandler.getInstance()
      .getErgoChain()
      .getGuardsPkConfig(rosenConfig.guardNFT, rosenConfig.guardSignAddress);
    this.publicKeys = guardPkConfig.publicKeys;
    this.guardsLen = guardPkConfig.publicKeys.length;
    this.requiredSign = guardPkConfig.requiredSigns;

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
    logger.info('Guards public keys and required signs updated successfully');
    return;
  };

  /**
   * updates public keys in all dependent modules
   */
  updateDependentModules = () => {
    this.dependentModuleUpdateFunctions.forEach((update) =>
      update(this.publicKeys)
    );
  };
}

export default GuardPkHandler;
