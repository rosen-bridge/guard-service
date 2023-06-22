import ChainHandlerMock from '../../handlers/ChainHandler.mock';
import { AssetBalance } from '@rosen-chains/abstract-chain';

export const mockCardanoNetwork = () => {
  ChainHandlerMock.mockGetCardanoNetwork(() => {
    return {
      getAddressAssets: (): AssetBalance => {
        return {
          nativeToken: 100n,
          tokens: [
            {
              id: '1',
              value: 200n,
            },
          ],
        };
      },
    };
  });
};
