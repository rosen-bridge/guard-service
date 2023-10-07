import { ERGO_CHAIN } from '@rosen-chains/ergo';
import Configs from '../configs/Configs';
import { RevenueEntity } from '../db/entities/revenueEntity';
import { RevenueView } from '../db/entities/revenueView';
import { RevenueHistory, TokenData } from '../types/api';
import { TokenInfo } from '@rosen-chains/abstract-chain';

/**
 * Extracts the revenue from the revenue view
 * @param events
 */
export const extractRevenueFromView = async (
  events: Array<RevenueView>,
  revenues: Array<RevenueEntity>
): Promise<Array<RevenueHistory>> => {
  const tokenMap = new Map<number, Array<TokenInfo>>();
  revenues.forEach((revenue) => {
    if (tokenMap.has(revenue.eventData.id)) {
      tokenMap
        .get(revenue.eventData.id)
        ?.push({ id: revenue.tokenId, value: BigInt(revenue.amount) });
    } else {
      tokenMap.set(revenue.eventData.id, [
        { id: revenue.tokenId, value: BigInt(revenue.amount) },
      ]);
    }
  });
  return Promise.all(
    events.map(async (event) => {
      const rowTokens = tokenMap.get(event.id) || [];
      return {
        ...event,
        revenues: fillTokensDetails(rowTokens),
      };
    })
  );
};

/**
 * fill token name and decimals for list of extracted tokens
 * @param tokens
 * @returns
 */
const fillTokensDetails = (tokens: Array<TokenInfo>): Array<TokenData> => {
  return tokens.map((token) => {
    const tokenInfo = Configs.tokenMap.search(ERGO_CHAIN, {
      [Configs.tokenMap.getIdKey(ERGO_CHAIN)]: token.id,
    });

    let name = 'Unsupported token';
    let decimals = 0;

    if (tokenInfo.length) {
      name = tokenInfo[0][ERGO_CHAIN].name;
      decimals = tokenInfo[0][ERGO_CHAIN].decimals;
    }

    return {
      tokenId: token.id,
      amount: Number(token.value),
      name: name,
      decimals: decimals,
    };
  });
};
