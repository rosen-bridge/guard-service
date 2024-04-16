import fs from 'fs';
import Configs from './Configs';
import { SUPPORTED_CHAINS } from '../utils/constants';

class ContractConfig {
  readonly cleanupNFT: string;
  readonly cleanupConfirm: number;
  readonly permitAddress: string;
  readonly eventTriggerAddress: string;
  readonly commitmentAddress: string;
  readonly lockAddress: string;
  readonly fraudAddress: string;
  readonly RepoNFT: string;
  readonly RWTId: string;

  constructor(path: string) {
    if (!fs.existsSync(path)) {
      throw new Error(`networkConfig file with path ${path} doesn't exist`);
    } else {
      const configJson: string = fs.readFileSync(path, 'utf8');
      const config = JSON.parse(configJson);
      this.cleanupNFT = config.tokens.CleanupNFT;
      this.cleanupConfirm = config.cleanupConfirm;
      this.permitAddress = config.addresses.WatcherPermit;
      this.eventTriggerAddress = config.addresses.WatcherTriggerEvent;
      this.commitmentAddress = config.addresses.Commitment;
      this.lockAddress = config.addresses.lock;
      this.fraudAddress = config.addresses.Fraud;
      this.RepoNFT = config.tokens.RepoNFT;
      this.RWTId = config.tokens.RWTId;
    }
  }
}

class RosenConfig {
  readonly guardSignAddress: string;
  readonly minimumFeeAddress: string;
  readonly RSN: string;
  readonly guardNFT: string;
  readonly rsnRatioNFT: string;
  readonly contracts: Map<string, ContractConfig>;

  constructor() {
    const supportingNetworks = SUPPORTED_CHAINS.map(
      (network, index) => `${network}-${Configs.networksType[index]}`
    );
    this.contracts = new Map<string, ContractConfig>();
    const rosenConfigPath = this.getAddress(supportingNetworks[0]);
    if (!fs.existsSync(rosenConfigPath)) {
      throw new Error(
        `rosenConfig file with path ${rosenConfigPath} doesn't exist`
      );
    } else {
      const configJson: string = fs.readFileSync(rosenConfigPath, 'utf8');
      const config = JSON.parse(configJson);
      this.guardSignAddress = config.addresses.guardSign;
      this.minimumFeeAddress = config.addresses.MinimumFeeAddress;
      this.RSN = config.tokens.RSN;
      this.guardNFT = config.tokens.GuardNFT;
      this.rsnRatioNFT = config.tokens.RSNRatioNFT;
    }
    supportingNetworks.forEach((network) => {
      const networkName = network.split('-')[0].toLowerCase();
      const contractConfig = new ContractConfig(this.getAddress(network));
      this.contracts.set(networkName, contractConfig);
    });
  }

  /**
   * returns the address of contractConfig for the related network
   * @param network
   */
  getAddress = (network: string) => {
    return Configs.addressesBasePath + `contracts-${network}.json`;
  };

  /**
   * Returns the ContractConfig of the related network
   * @param network
   */
  contractReader = (network: string) => {
    const contracts = this.contracts.get(network);
    if (!contracts) {
      throw Error(`${network} contracts and token config is not set`);
    }
    return contracts;
  };
}

export const rosenConfig = new RosenConfig();
export { ContractConfig, RosenConfig };
