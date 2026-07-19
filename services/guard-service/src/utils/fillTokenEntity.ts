import { DataSource } from '@rosen-bridge/extended-typeorm';
import { RosenTokens } from '@rosen-bridge/tokens';
import { BTC } from '@rosen-chains/bitcoin';

import GuardsErgoConfigs from '../configs/guardsErgoConfigs';
import { TokenEntity } from '../db/entities/tokenEntity';
import { SupportedChain } from '../types/config';

export const fillTokenEntity = async (
  dataSource: DataSource,
  tokens: RosenTokens,
) => {
  const tokenRepository = dataSource.getRepository(TokenEntity);

  // add emissionTokenId
  await tokenRepository.upsert(
    {
      id: GuardsErgoConfigs.emissionTokenId,
      chain: 'ergo',
      name: GuardsErgoConfigs.emissionTokenName,
      decimals: GuardsErgoConfigs.emissionTokenDecimal,
      significantDecimals: GuardsErgoConfigs.emissionTokenDecimal,
      residency: 'wrapped',
      type: 'EIP-004',
      extra: '{}',
    },
    ['id', 'chain'],
  );

  // add Bitcoin for bitcoin-runes chain
  await tokenRepository.upsert(
    {
      id: BTC,
      chain: 'bitcoin-runes',
      name: 'BTC',
      decimals: 8,
      significantDecimals: 8,
      residency: 'native',
      type: 'Runes',
      extra: '{}',
    },
    ['id', 'chain'],
  );

  for (const tokenSet of tokens) {
    const significantDecimals = Math.min(
      ...Object.keys(tokenSet).map((chain) => tokenSet[chain].decimals),
    );

    for (const chain of Object.keys(tokenSet)) {
      const { tokenId, extra, ...rest } = tokenSet[chain];

      let token: TokenEntity = {
        ...rest,
        id: tokenId,
        chain: chain as SupportedChain,
        significantDecimals,
        extra: JSON.stringify(extra),
      };

      // since adding new tokens to a tokenSet can affect
      // significantDecimals, upsert is used instead of insert
      await tokenRepository.upsert(token, ['id', 'chain']);
    }
  }
};
