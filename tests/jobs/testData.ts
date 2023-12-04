import { PaymentOrder } from '@rosen-chains/abstract-chain';
import GuardsErgoConfigs from '../../src/configs/GuardsErgoConfigs';

export const fraudTxOrder: PaymentOrder = [
  {
    address: GuardsErgoConfigs.ergoContractConfig.fraudAddress,
    assets: {
      nativeToken: 100n,
      tokens: [
        {
          id: 'id1',
          value: 10n,
        },
      ],
    },
  },
  {
    address: 'random-address',
    assets: {
      nativeToken: 200n,
      tokens: [
        {
          id: 'id1',
          value: 20n,
        },
      ],
    },
  },
];

export const rewardTxOrder: PaymentOrder = [
  {
    address: GuardsErgoConfigs.bridgeFeeRepoAddress,
    assets: {
      nativeToken: 100n,
      tokens: [
        {
          id: 'id1',
          value: 10n,
        },
      ],
    },
  },
  {
    address: GuardsErgoConfigs.rsnEmissionAddress,
    assets: {
      nativeToken: 200n,
      tokens: [
        {
          id: 'id2',
          value: 20n,
        },
      ],
    },
  },
  {
    address: GuardsErgoConfigs.networkFeeRepoAddress,
    assets: {
      nativeToken: 300n,
      tokens: [
        {
          id: 'id1',
          value: 30n,
        },
      ],
    },
  },
  {
    address: 'random-address',
    assets: {
      nativeToken: 400n,
      tokens: [
        {
          id: 'id4',
          value: 20n,
        },
      ],
    },
  },
];
