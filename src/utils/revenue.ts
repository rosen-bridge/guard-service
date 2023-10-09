import { ERGO_CHAIN } from '@rosen-chains/ergo';
import Configs from '../configs/Configs';
import { RevenueEntity } from '../db/entities/revenueEntity';
import { RevenueView } from '../db/entities/revenueView';
import { RevenueHistory, SingleRevenue, TokenData } from '../types/api';
import { TokenInfo } from '@rosen-chains/abstract-chain';
import { RevenueType } from './constants';

/**
 * Extracts the revenue from the revenue view
 * @param events
 */
export const extractRevenueFromView = async (
  events: Array<RevenueView>,
  revenues: Array<RevenueEntity>
): Promise<Array<RevenueHistory>> => {
  const eventRevenuesMap = new Map<
    number,
    Array<{
      revenueType: RevenueType;
      data: TokenInfo;
    }>
  >();
  revenues.forEach((revenue) => {
    if (eventRevenuesMap.has(revenue.eventData.id)) {
      eventRevenuesMap.get(revenue.eventData.id)?.push({
        revenueType: revenue.revenueType as RevenueType,
        data: { id: revenue.tokenId, value: BigInt(revenue.amount) },
      });
    } else {
      eventRevenuesMap.set(revenue.eventData.id, [
        {
          revenueType: revenue.revenueType as RevenueType,
          data: { id: revenue.tokenId, value: BigInt(revenue.amount) },
        },
      ]);
    }
  });
  return Promise.all(
    events.map(async (event) => {
      const eventRevenues = eventRevenuesMap.get(event.id) || [];
      return {
        ...event,
        revenues: fillTokensDetails(eventRevenues),
      };
    })
  );
};

/**
 * fill token name and decimals for list of extracted tokens
 * @param revenues
 * @returns
 */
const fillTokensDetails = (
  revenues: Array<{
    revenueType: RevenueType;
    data: TokenInfo;
  }>
): Array<SingleRevenue> => {
  return revenues.map((revenue) => {
    const tokenInfo = Configs.tokenMap.search(ERGO_CHAIN, {
      [Configs.tokenMap.getIdKey(ERGO_CHAIN)]: revenue.data.id,
    });

    let name = 'Unsupported token';
    let decimals = 0;
    let isNativeToken = false;

    if (tokenInfo.length) {
      name = tokenInfo[0][ERGO_CHAIN].name;
      decimals = tokenInfo[0][ERGO_CHAIN].decimals;
      isNativeToken = tokenInfo[0][ERGO_CHAIN].metaData.type === 'native';
    }

    return {
      revenueType: revenue.revenueType,
      data: {
        tokenId: revenue.data.id,
        amount: Number(revenue.data.value),
        name: name,
        decimals: decimals,
        isNativeToken: isNativeToken,
      },
    };
  });
};
