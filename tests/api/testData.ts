import { HealthStatusLevel } from '@rosen-bridge/health-check';
import GuardsErgoConfigs from '../../src/configs/GuardsErgoConfigs';
import GuardsCardanoConfigs from '../../src/configs/GuardsCardanoConfigs';
import { ERG } from '@rosen-chains/ergo';
import { ADA } from '@rosen-chains/cardano';

export const guardInfo = {
  health: HealthStatusLevel.HEALTHY,
  balances: {
    hot: [
      {
        address: GuardsErgoConfigs.chainConfigs.addresses.lock,
        balance: {
          tokenId: ERG,
          amount: '10',
          name: 'erg',
          decimals: 9,
        },
      },
      {
        address: GuardsCardanoConfigs.chainConfigs.addresses.lock,
        balance: {
          tokenId: ADA,
          amount: '20',
          name: 'ada',
          decimals: 6,
        },
      },
    ],
    cold: [
      {
        address: GuardsErgoConfigs.chainConfigs.addresses.cold,
        balance: {
          tokenId: ERG,
          amount: '100',
          name: 'erg',
          decimals: 9,
        },
      },
      {
        address: GuardsCardanoConfigs.chainConfigs.addresses.cold,
        balance: {
          tokenId: ADA,
          amount: '200',
          name: 'ada',
          decimals: 6,
        },
      },
    ],
  },
};
