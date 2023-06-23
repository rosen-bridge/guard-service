import ChainHandlerMock from '../../handlers/ChainHandler.mock';
import { AssetBalance } from '@rosen-chains/abstract-chain';

export const mockGetChain = () => {
  ChainHandlerMock.mockGetChainImplementation(() => {
    return {
      getLockAddressAssets: (): AssetBalance => ({
        nativeToken: 10n,
        tokens: [
          {
            id: '1',
            value: 20n,
          },
        ],
      }),
    };
  });
};
