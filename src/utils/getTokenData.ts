import Configs from '../configs/Configs';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import { TokenData } from '../types/api';
import { TokensConfig } from '../configs/tokensConfig';

/**
 * gets token data from tokenMap
 *  returns UnsupportedToken with 0 decimal if token is not found
 *  reads emission token data from config
 * @param sourceChain
 * @param sourceChainTokenId
 * @param targetChain
 * @param returnSignificantDecimal if true, returns tokens significant decimals instead of the actual decimals
 */
export const getTokenData = (
  sourceChain: string,
  sourceChainTokenId: string,
  targetChain: string,
  returnSignificantDecimal = false
): TokenData => {
  if (sourceChainTokenId === GuardsErgoConfigs.emissionTokenId) {
    return {
      tokenId: sourceChainTokenId,
      name: GuardsErgoConfigs.emissionTokenName,
      decimals: GuardsErgoConfigs.emissionTokenDecimal,
      isNativeToken: false,
      amount: 0,
    };
  }

  const tokenMapRes = TokensConfig.getInstance()
    .getTokenMap()
    .search(sourceChain, {
      tokenId: sourceChainTokenId,
    });
  if (tokenMapRes.length === 0) {
    // token is not found in token map
    if (sourceChain === targetChain) {
      // source and target chain are same, return unsupported token
      return {
        tokenId: sourceChainTokenId,
        name: 'Unsupported token',
        decimals: 0,
        isNativeToken: false,
        amount: 0,
      };
    } else {
      // cannot fetch token data of another chain if token is not found
      throw Error(
        `token [${sourceChainTokenId}] of chain [${sourceChain}] is not found in TokenMap`
      );
    }
  } else {
    const tokenData = tokenMapRes[0][targetChain];
    const significantDecimals = TokensConfig.getInstance()
      .getTokenMap()
      .getSignificantDecimals(sourceChainTokenId);
    const decimals =
      returnSignificantDecimal && significantDecimals !== undefined
        ? significantDecimals
        : tokenData.decimals;
    return {
      tokenId: tokenData.tokenId,
      name: tokenData.name,
      amount: 0,
      decimals: decimals,
      isNativeToken: tokenData.type === 'native',
    };
  }
};
