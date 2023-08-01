import { ERG } from '@rosen-chains/ergo';

import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import { revenueJobFunction } from '../../src/jobs/revenue';
import { insertRewardTxWithTimestamps } from './jobTestUtils';
import { DatabaseAction } from '../../src/db/DatabaseAction';
import ChainHandlerMock from '../handlers/ChainHandler.mock';
import GuardsErgoConfigs from '../../src/configs/GuardsErgoConfigs';

describe('DatabaseActions', () => {
  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
    ChainHandlerMock.resetMock();
  });

  describe('revenueJobFunction', () => {
    /**
     * @target revenueJobFunction should store new revenues
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock ChainHandler.ErgoChain `extractTransactionOrder`
     * - insert 3 new events with all required entities
     * - run test
     * - check if functions got called with required inputs
     * @expected
     * - `getTxsById` should got called with 3 inserted event reward tx
     * - `storeRevenue` should got called to store Erg revenues for each tx
     * - `storeRevenue` should got called to store token revenues for each tx
     */
    it('should store new revenues', async () => {
      ChainHandlerMock.mockErgoFunctionReturnValue('extractTransactionOrder', [
        {
          address: GuardsErgoConfigs.bridgeFeeRepoAddress,
          assets: {
            nativeToken: 10000000n,
            tokens: [{ id: 'tokenId', value: 20000n }],
          },
        },
      ]);
      await insertRewardTxWithTimestamps(3);
      const spiedTxsById = vi.spyOn(DatabaseAction.getInstance(), 'getTxsById');
      const spiedStoreRevenue = vi.spyOn(
        DatabaseAction.getInstance(),
        'storeRevenue'
      );
      await revenueJobFunction();
      const allTxs = await DatabaseActionMock.allTxRecords();
      expect(spiedTxsById).toHaveBeenCalledWith(allTxs.map((tx) => tx.txId));
      for (const tx of allTxs) {
        expect(spiedStoreRevenue).toHaveBeenCalledWith(ERG, 10000000n, {
          ...tx,
          event: undefined,
        });
        expect(spiedStoreRevenue).toHaveBeenCalledWith('tokenId', 20000n, {
          ...tx,
          event: undefined,
        });
      }
    });
  });
});
