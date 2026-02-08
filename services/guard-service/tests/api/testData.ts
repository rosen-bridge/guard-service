import { HealthStatusLevel } from '@rosen-bridge/health-check';
import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';

import GuardsBitcoinConfigs from '../../src/configs/guardsBitcoinConfigs';
import GuardsCardanoConfigs from '../../src/configs/guardsCardanoConfigs';
import GuardsErgoConfigs from '../../src/configs/guardsErgoConfigs';
import { rosenConfig } from '../../src/configs/rosenConfig';
import { AddressBalance, Page } from '../../src/types/api';

export const guardInfo = {
  versions: {
    app: expect.any(String),
    contract: rosenConfig.contractVersion,
  },
  health: {
    status: HealthStatusLevel.HEALTHY,
    trialErrors: [],
  },
  rsnTokenId: rosenConfig.RSN,
  emissionTokenId: GuardsErgoConfigs.emissionTokenId,
};

export const invalidOrderJson =
  '[{"address":"address-1","assets":{"nativeToken":100,"tokens":[]}},{"address":"address-2","assets":{"nativeToken":200,"tokens":[{"id":"token-1","value":10000}]}]';

export const mockLockBalances: Page<AddressBalance> = {
  items: [
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
        tokenId: BTC,
        amount: 30,
        name: 'BTC',
        decimals: 8,
        isNativeToken: true,
      },
    },
  ],
  total: 3,
};

export const mockColdBalances: Page<AddressBalance> = {
  items: [
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
        tokenId: BTC,
        amount: 300,
        name: 'BTC',
        decimals: 8,
        isNativeToken: true,
      },
    },
  ],
  total: 3,
};

export const mockBalancesObj = {
  hot: {
    items: [
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
          tokenId: BTC,
          amount: 30,
          name: 'BTC',
          decimals: 8,
          isNativeToken: true,
        },
      },
    ],
    total: 3,
  },
  cold: {
    items: [
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
          tokenId: BTC,
          amount: 300,
          name: 'BTC',
          decimals: 8,
          isNativeToken: true,
        },
      },
    ],
    total: 3,
  },
};
