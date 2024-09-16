import { HealthStatusLevel } from '@rosen-bridge/health-check';
import GuardsErgoConfigs from '../../src/configs/GuardsErgoConfigs';
import GuardsCardanoConfigs from '../../src/configs/GuardsCardanoConfigs';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { rosenConfig } from '../../src/configs/RosenConfig';
import GuardsBitcoinConfigs from '../../src/configs/GuardsBitcoinConfigs';
import { BITCOIN_CHAIN } from '@rosen-chains/bitcoin';

export const guardInfo = {
  version: expect.any(String),
  health: {
    status: HealthStatusLevel.HEALTHY,
    trialErrors: [],
  },
  balances: {
    hot: [
      {
        address: GuardsErgoConfigs.chainConfigs.addresses.lock,
        chain: ERGO_CHAIN,
        balance: {
          tokenId: ERG,
          amount: 10,
          name: 'ERG',
          decimals: 9,
          isNativeToken: true,
        },
      },
      {
        address: GuardsCardanoConfigs.chainConfigs.addresses.lock,
        chain: CARDANO_CHAIN,
        balance: {
          tokenId: ADA,
          amount: 20,
          name: 'ADA',
          decimals: 6,
          isNativeToken: true,
        },
      },
      {
        address: GuardsBitcoinConfigs.chainConfigs.addresses.lock,
        chain: BITCOIN_CHAIN,
        balance: {
          tokenId: 'btc',
          amount: 30,
          name: 'BTC',
          decimals: 8,
          isNativeToken: true,
        },
      },
    ],
    cold: [
      {
        address: GuardsErgoConfigs.chainConfigs.addresses.cold,
        chain: ERGO_CHAIN,
        balance: {
          tokenId: ERG,
          amount: 100,
          name: 'ERG',
          decimals: 9,
          isNativeToken: true,
        },
      },
      {
        address: GuardsCardanoConfigs.chainConfigs.addresses.cold,
        chain: CARDANO_CHAIN,
        balance: {
          tokenId: ADA,
          amount: 200,
          name: 'ADA',
          decimals: 6,
          isNativeToken: true,
        },
      },
      {
        address: GuardsBitcoinConfigs.chainConfigs.addresses.cold,
        chain: BITCOIN_CHAIN,
        balance: {
          tokenId: 'btc',
          amount: 300,
          name: 'BTC',
          decimals: 8,
          isNativeToken: true,
        },
      },
    ],
  },
  rsnTokenId: rosenConfig.RSN,
  emissionTokenId: GuardsErgoConfigs.emissionTokenId,
};
