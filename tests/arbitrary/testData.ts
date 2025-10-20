import JsonBigInt from '@rosen-bridge/json-bigint';
import { PaymentOrder } from '@rosen-chains/abstract-chain';

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
export const orderJson = JsonBigInt.stringify(order);

export const disarrangedOrder: PaymentOrder = [
  {
    address: 'address-2',
    assets: {
      nativeToken: 200n,
      tokens: [
        {
          id: 'token-3',
          value: 10000n,
        },
        {
          id: 'token-1',
          value: 1000n,
        },
      ],
    },
  },
  {
    address: 'address-1',
    assets: {
      nativeToken: 100n,
      tokens: [
        {
          id: 'token-1',
          value: 10000n,
        },
        {
          id: 'token-2',
          value: 2000n,
        },
      ],
    },
  },
];
export const disarrangedOrderJson = JsonBigInt.stringify(disarrangedOrder);
export const arrangedOrder: PaymentOrder = [
  {
    address: 'address-2',
    assets: {
      nativeToken: 200n,
      tokens: [
        {
          id: 'token-1',
          value: 1000n,
        },
        {
          id: 'token-3',
          value: 10000n,
        },
      ],
    },
  },
  {
    address: 'address-1',
    assets: {
      nativeToken: 100n,
      tokens: [
        {
          id: 'token-1',
          value: 10000n,
        },
        {
          id: 'token-2',
          value: 2000n,
        },
      ],
    },
  },
];
export const arrangedOrderJson = JsonBigInt.stringify(arrangedOrder);
