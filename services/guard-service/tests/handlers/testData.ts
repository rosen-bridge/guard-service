import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';

import { AddressEntity } from '../../src/db/entities/addressEntity';
import { ChainAddressBalanceEntity } from '../../src/db/entities/chainAddressBalanceEntity';
import { AddressType } from '../../src/types/api';

// cardano tokenIds from test tokensMap
export const cardanoCometTokenId =
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

export const mockAddresses: AddressEntity[] = [
  {
    id: 0,
    chain: 'ergo',
    address: 'ergo_hot',
    type: AddressType.Hot,
  },
  {
    id: 1,
    chain: 'ergo',
    address: 'ergo_cold',
    type: AddressType.Cold,
  },
  {
    id: 2,
    chain: 'bitcoin',
    address: 'bitcoin_hot',
    type: AddressType.Hot,
  },
  {
    id: 3,
    chain: 'cardano',
    address: 'cardano_hot',
    type: AddressType.Hot,
  },
  {
    id: 4,
    chain: 'cardano',
    address: 'cardano_cold',
    type: AddressType.Cold,
  },
  {
    id: 5,
    chain: 'ethereum',
    address: 'ethereum_hot',
    type: AddressType.Hot,
  },
  {
    id: 6,
    chain: 'ethereum',
    address: 'ethereum_cold',
    type: AddressType.Cold,
  },
  {
    id: 7,
    chain: 'binance',
    address: 'binance_hot',
    type: AddressType.Hot,
  },
];

export const mockCardanoHotAddress = mockAddresses[3];
export const mockCardanoColdAddress = mockAddresses[4];
export const mockBitcoinHotAddress = mockAddresses[2];

export const mockBalances: Record<string, Array<ChainAddressBalanceEntity>> = {
  [BITCOIN_CHAIN]: [
    {
      addressId: mockBitcoinHotAddress.id,
      address: mockBitcoinHotAddress,
      tokenId: BTC,
      lastUpdate: '1643723400',
      balance: 100n,
    },
  ],
  [CARDANO_CHAIN]: [
    {
      addressId: mockCardanoColdAddress.id,
      address: mockCardanoColdAddress,
      tokenId: ADA,
      lastUpdate: '1643723422',
      balance: 50000n,
    },
    {
      addressId: mockCardanoColdAddress.id,
      address: mockCardanoColdAddress,
      tokenId: cardanoCometTokenId,
      lastUpdate: '1643723401',
      balance: 20000n,
    },
    {
      addressId: mockCardanoHotAddress.id,
      address: mockCardanoHotAddress,
      tokenId: cardanoCometTokenId,
      lastUpdate: '1643722301',
      balance: 6666666n,
    },
  ],
};

export const cardanoTokenIds = [
  cardanoErgTokenId,
  cardanoCometTokenId,
  cardanoHoskyTokenId,
  cardanoRSNTokenId,
  cardanoBTCTokenId,
  cardanoMDTokenTokenId,
];

export const mockCardanoBalances: ChainAddressBalanceEntity[] = [
  mockCardanoHotAddress,
  mockCardanoColdAddress,
].flatMap((address) =>
  cardanoTokenIds.map((token: string) => ({
    addressId: address.id,
    address: address,
    tokenId: token,
    lastUpdate: '1643723422',
    balance: 10000n,
  })),
);

export const mockPartialCardanoBalances = mockCardanoBalances.slice(0, 4);
