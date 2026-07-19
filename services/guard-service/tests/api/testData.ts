import z from 'zod';

import { HealthStatusLevel } from '@rosen-bridge/health-check';
import { BINANCE_CHAIN } from '@rosen-chains/binance';
import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { ETHEREUM_CHAIN } from '@rosen-chains/ethereum';

import { BalanceResponseSchema } from '../../src/api/schemas';
import GuardsErgoConfigs from '../../src/configs/guardsErgoConfigs';
import { rosenConfig } from '../../src/configs/rosenConfig';
import { AddressEntity } from '../../src/db/entities/addressEntity';
import { ChainAddressBalanceEntity } from '../../src/db/entities/chainAddressBalanceEntity';
import { AddressType } from '../../src/types/api';

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

export const mockAddresses: AddressEntity[] = [
  {
    id: 0,
    chain: ERGO_CHAIN,
    address: `${ERGO_CHAIN}_hot`,
    type: AddressType.Hot,
  },
  {
    id: 1,
    chain: ERGO_CHAIN,
    address: `${ERGO_CHAIN}_cold`,
    type: AddressType.Cold,
  },
  {
    id: 2,
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_hot`,
    type: AddressType.Hot,
  },
  {
    id: 3,
    chain: CARDANO_CHAIN,
    address: `${CARDANO_CHAIN}_hot`,
    type: AddressType.Hot,
  },
  {
    id: 4,
    chain: CARDANO_CHAIN,
    address: `${CARDANO_CHAIN}_cold`,
    type: AddressType.Cold,
  },
  {
    id: 5,
    chain: ETHEREUM_CHAIN,
    address: `${ETHEREUM_CHAIN}_hot`,
    type: AddressType.Hot,
  },
  {
    id: 6,
    chain: ETHEREUM_CHAIN,
    address: `${ETHEREUM_CHAIN}_cold`,
    type: AddressType.Cold,
  },
  {
    id: 7,
    chain: BINANCE_CHAIN,
    address: `${ETHEREUM_CHAIN}_hot`, // addresses can be duplicate
    type: AddressType.Hot,
  },
];

export const mockPartialAddresses: Omit<AddressEntity, 'id'>[] =
  mockAddresses.map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ id, ...record }) => record,
  );

const cardanoCometTokenId =
  'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432';
const cardanoErgTokenId =
  'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432';
const cardanoHoskyTokenId =
  'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59';
const cardanoRSNTokenId =
  '45fdcb56b039bfba0028f350aaabe0508e4bb4d8c4d7c3c7d481c235.48';
const cardanoBTCTokenId =
  '3122541486c983d637e7ed9330c94e490e1fe4a1758725fab7f6d9e0.72734254432d6c6f656e';
const cardanoMDTokenTokenId =
  'ac0a478c70238bff24e20107ebe399e7f3a3e854037622427206b024.72734d44546f6b656e2d6c6f656e';

export const mockBalances: ChainAddressBalanceEntity[] = [
  {
    addressId: mockAddresses[0].id,
    address: mockAddresses[0],
    tokenId: ERG,
    lastUpdate: '1700000000',
    balance: BigInt(10),
  },
  {
    addressId: mockAddresses[3].id,
    address: mockAddresses[3],
    tokenId: ADA,
    lastUpdate: '1700000000',
    balance: BigInt(20),
  },
  {
    addressId: mockAddresses[3].id,
    address: mockAddresses[3],
    tokenId: cardanoCometTokenId,
    lastUpdate: '1700037500',
    balance: BigInt(230),
  },
  {
    addressId: mockAddresses[3].id,
    address: mockAddresses[3],
    tokenId: cardanoErgTokenId,
    lastUpdate: '1700001540',
    balance: BigInt(2560),
  },
  {
    addressId: mockAddresses[3].id,
    address: mockAddresses[3],
    tokenId: cardanoHoskyTokenId,
    lastUpdate: '1700000330',
    balance: BigInt(1230),
  },
  {
    addressId: mockAddresses[3].id,
    address: mockAddresses[3],
    tokenId: cardanoRSNTokenId,
    lastUpdate: '1700000365',
    balance: BigInt(660),
  },
  {
    addressId: mockAddresses[4].id,
    address: mockAddresses[4],
    tokenId: cardanoErgTokenId,
    lastUpdate: '1700001541',
    balance: BigInt(2460),
  },
  {
    addressId: mockAddresses[4].id,
    address: mockAddresses[4],
    tokenId: cardanoHoskyTokenId,
    lastUpdate: '1700000331',
    balance: BigInt(530),
  },
  {
    addressId: mockAddresses[4].id,
    address: mockAddresses[4],
    tokenId: cardanoRSNTokenId,
    lastUpdate: '1700000361',
    balance: BigInt(630),
  },
  {
    addressId: mockAddresses[4].id,
    address: mockAddresses[4],
    tokenId: cardanoBTCTokenId,
    lastUpdate: '1700220361',
    balance: BigInt(6230),
  },
  {
    addressId: mockAddresses[4].id,
    address: mockAddresses[4],
    tokenId: cardanoMDTokenTokenId,
    lastUpdate: '1700220364',
    balance: BigInt(33),
  },
  {
    addressId: mockAddresses[2].id,
    address: mockAddresses[2],
    tokenId: BTC,
    lastUpdate: '1700000000',
    balance: BigInt(30),
  },
  {
    addressId: mockAddresses[1].id,
    address: mockAddresses[1],
    tokenId: ERG,
    lastUpdate: '1700000000',
    balance: BigInt(100),
  },
  {
    addressId: mockAddresses[4].id,
    address: mockAddresses[4],
    tokenId: ADA,
    lastUpdate: '1700000000',
    balance: BigInt(200),
  },
];

export const mockBalancesResponse: z.infer<typeof BalanceResponseSchema> = {
  items: [
    {
      chain: ERGO_CHAIN,
      token: {
        id: ERG,
        name: 'erg',
        decimals: 9,
        isNativeToken: true,
      },
      hot: {
        address: `${ERGO_CHAIN}_hot`,
        amount: '10',
      },
      cold: {
        address: `${ERGO_CHAIN}_cold`,
        amount: '100',
      },
    },
    {
      chain: CARDANO_CHAIN,
      token: {
        id: ADA,
        name: 'ADA',
        decimals: 6,
        isNativeToken: true,
      },
      hot: {
        address: `${CARDANO_CHAIN}_hot`,
        amount: '20',
      },
      cold: {
        address: `${CARDANO_CHAIN}_cold`,
        amount: '200',
      },
    },
    {
      chain: CARDANO_CHAIN,
      token: {
        id: cardanoCometTokenId,
        name: 'wrapped-comet',
        decimals: 0,
        isNativeToken: false,
      },
      hot: {
        address: `${CARDANO_CHAIN}_hot`,
        amount: '230',
      },
    },
    {
      chain: CARDANO_CHAIN,
      token: {
        id: cardanoErgTokenId,
        name: 'wrapped-erg',
        decimals: 9,
        isNativeToken: false,
      },
      hot: {
        address: `${CARDANO_CHAIN}_hot`,
        amount: '2560',
      },
      cold: {
        address: `${CARDANO_CHAIN}_cold`,
        amount: '2460',
      },
    },
    {
      chain: CARDANO_CHAIN,
      token: {
        id: cardanoHoskyTokenId,
        name: 'Hosky',
        decimals: 0,
        isNativeToken: true,
      },
      hot: {
        address: `${CARDANO_CHAIN}_hot`,
        amount: '1230',
      },
      cold: {
        address: `${CARDANO_CHAIN}_cold`,
        amount: '530',
      },
    },
    {
      chain: CARDANO_CHAIN,
      token: {
        id: cardanoRSNTokenId,
        name: 'H',
        decimals: 3,
        isNativeToken: false,
      },
      hot: {
        address: `${CARDANO_CHAIN}_hot`,
        amount: '660',
      },
      cold: {
        address: `${CARDANO_CHAIN}_cold`,
        amount: '630',
      },
    },
    {
      chain: CARDANO_CHAIN,
      token: {
        id: cardanoBTCTokenId,
        name: 'rsBTC-loen',
        decimals: 8,
        isNativeToken: false,
      },
      cold: {
        address: `${CARDANO_CHAIN}_cold`,
        amount: '6230',
      },
    },
    {
      chain: CARDANO_CHAIN,
      token: {
        id: cardanoMDTokenTokenId,
        name: 'rsMDToken-loen',
        decimals: 1,
        isNativeToken: false,
      },
      cold: {
        address: `${CARDANO_CHAIN}_cold`,
        amount: '33',
      },
    },
    {
      chain: BITCOIN_CHAIN,
      token: {
        id: BTC,
        name: 'BTC',
        decimals: 8,
        isNativeToken: true,
      },
      hot: {
        address: `${BITCOIN_CHAIN}_hot`,
        amount: '30',
      },
    },
  ].toSorted((a, b) => a.token.id.localeCompare(b.token.id)),
  total: 9,
};
