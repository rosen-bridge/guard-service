import { RosenTokens } from '@rosen-bridge/tokens';
import { BINANCE_CHAIN } from '@rosen-chains/binance';
import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { ETHEREUM_CHAIN } from '@rosen-chains/ethereum';

import { AddressEntity } from '../../src/db/entities/addressEntity';
import { ChainAddressBalanceEntity } from '../../src/db/entities/chainAddressBalanceEntity';
import { TokenEntity } from '../../src/db/entities/tokenEntity';
import { AddressType } from '../../src/types/api';
import { SupportedChain } from '../../src/types/config';
import tokenMapJson from '../resources/tokens.test.json';

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

const tokensDict = (tokenMapJson.tokens as RosenTokens).reduce(
  (agg, tokenSet) => {
    const significantDecimals = Math.min(
      ...Object.keys(tokenSet).map((chain) => tokenSet[chain].decimals),
    );

    Object.keys(tokenSet).forEach((chain) => {
      const { tokenId, extra, ...rest } = tokenSet[chain];
      agg[tokenId] = {
        ...rest,
        id: tokenId,
        chain: chain as SupportedChain,
        significantDecimals,
        extra: JSON.stringify(extra),
      };
    });
    return agg;
  },
  {} as Record<string, TokenEntity>,
);

export const getTokenName = (tokenId: string) => tokensDict[tokenId].name;

export const cardanoCometTokenId =
  'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432';
export const cardanoErgTokenId =
  'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432';
export const cardanoHoskyTokenId =
  'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59';
export const cardanoRSNTokenId =
  '45fdcb56b039bfba0028f350aaabe0508e4bb4d8c4d7c3c7d481c235.48';
export const cardanoBTCTokenId =
  '3122541486c983d637e7ed9330c94e490e1fe4a1758725fab7f6d9e0.72734254432d6c6f656e';
export const cardanoMDTokenTokenId =
  'ac0a478c70238bff24e20107ebe399e7f3a3e854037622427206b024.72734d44546f6b656e2d6c6f656e';

export const mockBalances: (ChainAddressBalanceEntity & {
  token: TokenEntity;
})[] = [
  {
    addressId: mockAddresses[0].id,
    address: mockAddresses[0],
    tokenId: ERG,
    token: tokensDict[ERG],
    lastUpdate: '1700000000',
    balance: BigInt(10),
  },
  {
    addressId: mockAddresses[3].id,
    address: mockAddresses[3],
    tokenId: ADA,
    token: tokensDict[ADA],
    lastUpdate: '1700000000',
    balance: BigInt(20),
  },
  {
    addressId: mockAddresses[3].id,
    address: mockAddresses[3],
    tokenId: cardanoCometTokenId,
    token: tokensDict[cardanoCometTokenId],
    lastUpdate: '1700037500',
    balance: BigInt(230),
  },
  {
    addressId: mockAddresses[3].id,
    address: mockAddresses[3],
    tokenId: cardanoErgTokenId,
    token: tokensDict[cardanoErgTokenId],
    lastUpdate: '1700001540',
    balance: BigInt(2560),
  },
  {
    addressId: mockAddresses[3].id,
    address: mockAddresses[3],
    tokenId: cardanoHoskyTokenId,
    token: tokensDict[cardanoHoskyTokenId],
    lastUpdate: '1700000330',
    balance: BigInt(1230),
  },
  {
    addressId: mockAddresses[3].id,
    address: mockAddresses[3],
    tokenId: cardanoRSNTokenId,
    token: tokensDict[cardanoRSNTokenId],
    lastUpdate: '1700000365',
    balance: BigInt(660),
  },
  {
    addressId: mockAddresses[4].id,
    address: mockAddresses[4],
    tokenId: cardanoErgTokenId,
    token: tokensDict[cardanoErgTokenId],
    lastUpdate: '1700001541',
    balance: BigInt(2460),
  },
  {
    addressId: mockAddresses[4].id,
    address: mockAddresses[4],
    tokenId: cardanoHoskyTokenId,
    token: tokensDict[cardanoHoskyTokenId],
    lastUpdate: '1700000331',
    balance: BigInt(530),
  },
  {
    addressId: mockAddresses[4].id,
    address: mockAddresses[4],
    tokenId: cardanoRSNTokenId,
    token: tokensDict[cardanoRSNTokenId],
    lastUpdate: '1700000361',
    balance: BigInt(630),
  },
  {
    addressId: mockAddresses[4].id,
    address: mockAddresses[4],
    tokenId: cardanoBTCTokenId,
    token: tokensDict[cardanoBTCTokenId],
    lastUpdate: '1700220361',
    balance: BigInt(6230),
  },
  {
    addressId: mockAddresses[4].id,
    address: mockAddresses[4],
    tokenId: cardanoMDTokenTokenId,
    token: tokensDict[cardanoMDTokenTokenId],
    lastUpdate: '1700220364',
    balance: BigInt(33),
  },
  {
    addressId: mockAddresses[2].id,
    address: mockAddresses[2],
    tokenId: BTC,
    token: tokensDict[BTC],
    lastUpdate: '1700000000',
    balance: BigInt(30),
  },
  {
    addressId: mockAddresses[1].id,
    address: mockAddresses[1],
    tokenId: ERG,
    token: tokensDict[ERG],
    lastUpdate: '1700000000',
    balance: BigInt(100),
  },
  {
    addressId: mockAddresses[4].id,
    address: mockAddresses[4],
    tokenId: ADA,
    token: tokensDict[ADA],
    lastUpdate: '1700000000',
    balance: BigInt(200),
  },
].toSorted((a, b) => a.tokenId.localeCompare(b.tokenId));
