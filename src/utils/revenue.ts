import { ERGO_CHAIN } from '@rosen-chains/ergo';
import { RevenueEntity } from '../db/entities/revenueEntity';
import { RevenueView } from '../db/entities/revenueView';
import { RevenueHistory, SingleRevenue, TokenData } from '../types/api';
import { TokenInfo } from '@rosen-chains/abstract-chain';
import { RevenueType } from './constants';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import { TokenHandler } from '../handlers/tokenHandler';
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
    events.map(async (event): Promise<RevenueHistory> => {
      const eventRevenues = eventRevenuesMap.get(event.id) || [];
      const token = TokenHandler.getInstance()
        .getTokenMap()
        .search(event.fromChain, {
          tokenId: event.lockTokenId,
        });

      // TODO: improve getting ergo side tokenId
      //  local:ergo/rosen-bridge/guard-service#332
      let ergoSideTokenId = 'Unsupported token id';
      let name = 'Unsupported token';
      let decimals = 0;
      let isNativeToken = false;

      if (token.length) {
        ergoSideTokenId = token[0][ERGO_CHAIN].tokenId;
        name = token[0][event.fromChain].name;
        decimals = TokenHandler.getInstance()
          .getTokenMap()
          .getSignificantDecimals(event.lockTokenId)!;
        isNativeToken = token[0][event.fromChain].type === 'native';
      }

      const tokenData: TokenData = {
        tokenId: event.lockTokenId,
        amount: Number(event.amount),
        name: name ?? 'Unsupported token',
        decimals: decimals ?? 0,
        isNativeToken: isNativeToken,
      };
      return {
        rewardTxId: event.rewardTxId,
        eventId: event.eventId,
        lockHeight: event.lockHeight,
        fromChain: event.fromChain,
        toChain: event.toChain,
        fromAddress: event.fromAddress,
        toAddress: event.toAddress,
        bridgeFee: event.bridgeFee,
        networkFee: event.networkFee,
        lockToken: tokenData,
        lockTxId: event.lockTxId,
        height: event.height,
        timestamp: event.timestamp,
        ergoSideTokenId: ergoSideTokenId,
        revenues: eventRevenues.map((eventRevenue) => ({
          revenueType: eventRevenue.revenueType,
          data: fillTokensDetails(eventRevenue.data),
        })),
      };
    })
  );
};

/**
 * fill token name and decimals for list of extracted tokens
 * @param revenues
 * @returns
 */
const fillTokensDetails = (token: TokenInfo): TokenData => {
  if (token.id === GuardsErgoConfigs.emissionTokenId) {
    return {
      tokenId: token.id,
      amount: Number(token.value),
      name: GuardsErgoConfigs.emissionTokenName,
      decimals: GuardsErgoConfigs.emissionTokenDecimal,
      isNativeToken: false,
    };
  }

  const tokenMap = TokenHandler.getInstance().getTokenMap();

  const tokenInfo = tokenMap.search(ERGO_CHAIN, {
    tokenId: token.id,
  });

  let name = 'Unsupported token';
  let decimals = 0;
  let isNativeToken = false;

  if (tokenInfo.length) {
    name = tokenInfo[0][ERGO_CHAIN].name;
    decimals = tokenMap.getSignificantDecimals(token.id)!;
    isNativeToken = tokenInfo[0][ERGO_CHAIN].type === 'native';
  }

  return {
    tokenId: token.id,
    amount: Number(token.value),
    name: name,
    decimals: decimals,
    isNativeToken: isNativeToken,
  };
};
