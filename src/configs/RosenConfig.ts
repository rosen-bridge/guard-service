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
  readonly coldAddress: string;
  readonly fraudAddress: string;
  readonly RepoNFT: string;
  readonly RWTId: string;

  constructor(path: string, contractVersion: string) {
    if (!fs.existsSync(path)) {
      throw new Error(`networkConfig file with path ${path} doesn't exist`);
    } else {
      const configJson: string = fs.readFileSync(path, 'utf8');
      const config = JSON.parse(configJson);
      if (config.version !== contractVersion)
        throw new Error(
          `The contract version of the networkConfig file located at ${path} with version ${config.version} is incompatible with the following contract versions: ${contractVersion}.`
        );
      this.cleanupNFT = config.tokens.CleanupNFT;
      this.cleanupConfirm = config.cleanupConfirm;
      this.permitAddress = config.addresses.WatcherPermit;
      this.eventTriggerAddress = config.addresses.WatcherTriggerEvent;
      this.commitmentAddress = config.addresses.Commitment;
      this.lockAddress = config.addresses.lock;
      this.coldAddress = config.addresses.cold;
      this.fraudAddress = config.addresses.Fraud;
      this.RepoNFT = config.tokens.RepoNFT;
      this.RWTId = config.tokens.RWTId;
    }
  }
}

class RosenConfig {
  readonly guardSignAddress: string;
  readonly RSN: string;
  readonly guardNFT: string;
  readonly rsnRatioNFT: string;
  readonly contractVersion: string;
  readonly contracts: Map<string, ContractConfig>;

  constructor() {
    const firstSupportedNetwork = `${SUPPORTED_CHAINS[0]}-${Configs.networksType[0]}`;
    this.contracts = new Map<string, ContractConfig>();
    const rosenConfigPath = this.getAddress(firstSupportedNetwork);
    if (!fs.existsSync(rosenConfigPath)) {
      throw new Error(
        `rosenConfig file with path ${rosenConfigPath} doesn't exist`
      );
    } else {
      const configJson: string = fs.readFileSync(rosenConfigPath, 'utf8');
      const config = JSON.parse(configJson);
      this.guardSignAddress = config.addresses.guardSign;
      this.RSN = config.tokens.RSN;
      this.guardNFT = config.tokens.GuardNFT;
      this.rsnRatioNFT = config.tokens.RSNRatioNFT;
      this.contractVersion = config.version;
    }
    SUPPORTED_CHAINS.forEach((networkName, index) => {
      const network =
        `${networkName}-${Configs.networksType[index]}`.toLowerCase();
      const contractConfig = new ContractConfig(
        this.getAddress(network),
        this.contractVersion
      );
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
