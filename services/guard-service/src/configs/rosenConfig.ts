import fs from 'fs';

import { AllChainsConfigs } from '../types/contract';
import { SUPPORTED_CHAINS } from '../utils/constants';
import Configs from './configs';

class RosenConfig {
  readonly guardSignAddress: string;
  readonly RSN: string;
  readonly guardNFT: string;
  readonly minFeeNFT: string;
  readonly contractVersion: string;

  readonly contract: AllChainsConfigs;

  constructor() {
    const rosenConfigPath = Configs.contractsPath;
    if (!fs.existsSync(rosenConfigPath)) {
      throw new Error(
        `rosenConfig file with path ${rosenConfigPath} doesn't exist`,
      );
    } else {
      const configJson = fs.readFileSync(rosenConfigPath, 'utf8');
      this.contract = JSON.parse(configJson) as AllChainsConfigs;
      const chainConfig = this.contract[SUPPORTED_CHAINS[0]];
      this.guardSignAddress = chainConfig.addresses.guardSign;
      this.RSN = this.contract.tokens.RSN;
      this.guardNFT = this.contract.tokens.GuardNFT;
      this.minFeeNFT = this.contract.tokens.MinFeeNFT;
      this.contractVersion = this.contract.version;
    }
  }

  /**
   * Returns the ContractConfig of the related network
   * @param network
   */
  contractReader = (network: string) => {
    const contracts = this.contract[network];
    if (!contracts) {
      throw Error(`${network} contracts and token config is not set`);
    }
    return contracts;
  };
}

export const rosenConfig = new RosenConfig();
export { RosenConfig };
