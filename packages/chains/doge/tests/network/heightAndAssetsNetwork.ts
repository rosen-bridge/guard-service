import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AssetBalance } from '@rosen-chains/abstract-chain';

import PartialDogeNetwork from '../../lib/network/partialDogeNetwork';
import { DogeNetworkFunction } from '../../lib/types';

/**
 * A test implementation of PartialDogeNetwork that only implements height and assets
 */
export class HeightAndAssetsNetwork extends PartialDogeNetwork {
  readonly implements = [
    DogeNetworkFunction.getHeight,
    DogeNetworkFunction.getAddressAssets,
  ];

  mockHeight = 123456;
  mockAssets = {
    nativeToken: 1000n,
    tokens: [],
  };

  constructor(logger?: AbstractLogger) {
    super(logger);
  }

  getHeight = async (): Promise<number> => {
    return this.mockHeight;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAddressAssets = async (_address: string): Promise<AssetBalance> => {
    return this.mockAssets;
  };
}
