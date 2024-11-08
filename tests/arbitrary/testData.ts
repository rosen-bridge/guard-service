import { PaymentOrder } from '@rosen-chains/abstract-chain';
import { JsonBI } from '../../src/network/NetworkModels';

export const order: PaymentOrder = [
  {
    address: 'address-1',
    assets: {
      nativeToken: 100n,
      tokens: [],
    },
  },
  {
    address: 'address-2',
    assets: {
      nativeToken: 200n,
      tokens: [
        {
          id: 'token-1',
          value: 10000n,
        },
      ],
    },
  },
];
export const orderJson = JsonBI.stringify(order);
