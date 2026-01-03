import { SupportedChain } from '../types/config';

export interface ChainConfigs {
  addresses: {
    lock: string;
    cold: string;
    WatcherTriggerEvent: string;
    WatcherPermit: string;
    Fraud: string;
    Commitment: string;
    guardSign: string;
  };
  tokens: {
    RWTId: string;
    CleanupNFT: string;
  };
  cleanupConfirm: number;
}
export type AllChainsConfigs = {
  version: string;
  tokens: {
    RWTRepoNFT: string;
    RSN: string;
    GuardNFT: string;
    MinFeeNFT: string;
  };
} & {
  [K in SupportedChain]: ChainConfigs;
};
