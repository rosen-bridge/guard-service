import ChainHandlerMock from '../../handlers/ChainHandler.mock';
import { AssetBalance } from '@rosen-chains/abstract-chain';

export const mockErgoNetwork = () => {
  ChainHandlerMock.mockGetErgoNetwork(() => {
    return {
      getAddressAssets: (): AssetBalance => {
        return {
          nativeToken: 10n,
          tokens: [
            {
              id: '1',
              value: 20n,
            },
          ],
        };
      },
    };
  });
};
