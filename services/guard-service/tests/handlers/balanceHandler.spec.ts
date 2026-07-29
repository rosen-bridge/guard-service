import { TokenMap } from '@rosen-bridge/tokens';
import { AssetBalance } from '@rosen-chains/abstract-chain';
import { BITCOIN_CHAIN } from '@rosen-chains/bitcoin';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { DOGE_CHAIN } from '@rosen-chains/doge';

import { TokenHandler } from '../../src/handlers/tokenHandler';
import { AddressType } from '../../src/types/api';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import ChainHandlerMock from './chainHandler.mock';
import TestBalanceHandler from './testBalanceHandler';
import {
  cardanoCometTokenId,
  cardanoTokenIds,
  mockBalances,
  mockCardanoBalances,
  mockCardanoHotAddress,
  mockCardanoColdAddress,
  mockPartialCardanoBalances,
  mockAddresses,
} from './testData';

describe('BalanceHandler', () => {
  const balanceHandler = new TestBalanceHandler();

  describe('getChainTokenIds', () => {
    /**
     * @target getChainTokenIds should return empty array when token map is empty
     * @dependencies
     * - TokensMap
     * @scenario
     * - stub TokenMap.getConfig to return empty array
     * - call getChainTokenIds with CARDANO_CHAIN
     * - check returned value
     * @expected
     * - result should have been an empty array
     */
    it('should return empty array when token map is empty', () => {
      // arrange
      vi.spyOn(TokenHandler.getInstance(), 'getTokenMap').mockReturnValueOnce({
        getConfig: () => [],
      } as unknown as TokenMap);

      // act
      const result = balanceHandler.callGetChainTokenIds(CARDANO_CHAIN);

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target getChainTokenIds should return empty array when no tokens exist for requested chain
     * @dependencies
     * - TokensMap
     * @scenario
     * - call getChainTokenIds with DOGE_CHAIN
     * - check returned value
     * @expected
     * - result should have been an empty array
     */
    it('should return empty array when no tokens exist for requested chain', () => {
      // act
      const result = balanceHandler.callGetChainTokenIds(DOGE_CHAIN);

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target getChainTokenIds should return non-native token ids of the requested chain when it has both native and non-native token types
     * @dependencies
     * - TokensMap
     * @scenario
     * - call getChainTokenIds with CARDANO_CHAIN
     * - check returned value
     * @expected
     * - result length should have been equal to 6
     * - result should have contained all the cardano tokens except ada
     */
    it('should return non-native token ids of the requested chain when it has both native and non-native token types', () => {
      // act
      const result = balanceHandler.callGetChainTokenIds(CARDANO_CHAIN);

      // assert
      expect(result).toHaveLength(6);
      expect(result).toContain(
        'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
      );
      expect(result).toContain(
        'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
      );
      expect(result).toContain(
        'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59',
      );
      expect(result).toContain(
        '45fdcb56b039bfba0028f350aaabe0508e4bb4d8c4d7c3c7d481c235.48',
      );
      expect(result).toContain(
        '3122541486c983d637e7ed9330c94e490e1fe4a1758725fab7f6d9e0.72734254432d6c6f656e',
      );
      expect(result).toContain(
        'ac0a478c70238bff24e20107ebe399e7f3a3e854037622427206b024.72734d44546f6b656e2d6c6f656e',
      );
      expect(result).not.toContain(ADA);
    });
  });

  describe('updateChainBatchBalances', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();

      await DatabaseActionMock.clearTables();
    });

    /**
     * @target updateChainBatchBalances should update batch balances successfully
     * @dependencies
     * - TokensMap
     * - DatabaseAction
     * @scenario
     * - populate database with mock address records
     * - populate database with 4 mock ChainAddressBalanceEntity objects
     * - stub ChainHandler.getAddressAssets to resolve to a AssetBalance object with a non-native token
     * - call updateChainBatchBalances with cardano hot address and comet tokenId
     * - check getAddressAssetsSpy
     * - check database records
     * @expected
     * - getAddressAssetsSpy should have been called once using cardano hot address and comet tokenId
     * - database should have contained 5 ChainAddressBalanceEntity objects (4 initial balances + 1 inserted and 1 updated balances)
     */
    it('should update batch balances successfully', async () => {
      // arrange
      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      for (const chain of Object.keys(mockBalances))
        for (const balance of mockBalances[chain])
          await DatabaseActionMock.insertChainAddressBalanceRecord(balance);

      const balance: AssetBalance = {
        nativeToken: 123n,
        tokens: [{ id: cardanoCometTokenId, value: 111n }],
      };

      ChainHandlerMock.mockChainName(CARDANO_CHAIN);
      ChainHandlerMock.mockChainFunction(
        CARDANO_CHAIN,
        'getAddressAssets',
        balance,
        true,
      );

      // act
      await balanceHandler.updateChainBatchBalances(mockCardanoHotAddress, [
        cardanoCometTokenId,
      ]);

      // assert
      const getAddressAssetsSpy = ChainHandlerMock.getChainMockedFunction(
        CARDANO_CHAIN,
        'getAddressAssets',
      );
      expect(getAddressAssetsSpy).toHaveBeenCalledExactlyOnceWith(
        mockCardanoHotAddress.address,
        [cardanoCometTokenId],
      );

      const balances = await DatabaseActionMock.allChainAddressBalanceRecords();
      expect(balances).toHaveLength(5);
      expect(balances[0]).toEqual(mockBalances[BITCOIN_CHAIN][0]);
      expect(balances[1]).toEqual(mockBalances[CARDANO_CHAIN][0]);
      expect(balances[2]).toEqual(mockBalances[CARDANO_CHAIN][1]);
      expect(balances[3]).toEqual({
        addressId: mockCardanoHotAddress.id,
        address: mockCardanoHotAddress,
        tokenId: cardanoCometTokenId,
        lastUpdate: expect.any(String),
        balance: 111n,
      });
      expect(balances[4]).toEqual({
        addressId: mockCardanoHotAddress.id,
        address: mockCardanoHotAddress,
        tokenId: ADA,
        lastUpdate: expect.any(String),
        balance: 123n,
      });
    });
  });

  describe('updateChainBalances', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();

      await DatabaseActionMock.clearTables();
    });

    /**
     * @target updateChainBalances should successfully update all balances of a chain
     * @dependencies
     * - TokensMap
     * - DatabaseAction
     * @scenario
     * - populate database with mock address records
     * - stub updateChainBatchBalances to resolve to an empty array
     * - call updateChainBalances
     * - check updateChainBatchBalancesSpy
     * @expected
     * - updateChainBatchBalances should have been called 12 times for 2 addresses and 6 tokens each
     */
    it('should successfully update all balances of a chain', async () => {
      // arrange
      const chain = CARDANO_CHAIN;

      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      const updateChainBatchBalancesSpy = vi
        .spyOn(balanceHandler, 'updateChainBatchBalances')
        .mockResolvedValue([]);

      balanceHandler['chainsTokensPerIteration'][chain] = 1;

      // act
      await balanceHandler.updateChainBalances(chain);

      // assert
      expect(updateChainBatchBalancesSpy).toHaveBeenCalledTimes(12);
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        1,
        mockCardanoHotAddress,
        [
          'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        2,
        mockCardanoHotAddress,
        [
          'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        3,
        mockCardanoHotAddress,
        ['a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59'],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        4,
        mockCardanoHotAddress,
        ['45fdcb56b039bfba0028f350aaabe0508e4bb4d8c4d7c3c7d481c235.48'],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        5,
        mockCardanoHotAddress,
        [
          '3122541486c983d637e7ed9330c94e490e1fe4a1758725fab7f6d9e0.72734254432d6c6f656e',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        6,
        mockCardanoHotAddress,
        [
          'ac0a478c70238bff24e20107ebe399e7f3a3e854037622427206b024.72734d44546f6b656e2d6c6f656e',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        7,
        mockCardanoColdAddress,
        [
          'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        8,
        mockCardanoColdAddress,
        [
          'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        9,
        mockCardanoColdAddress,
        ['a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59'],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        10,
        mockCardanoColdAddress,
        ['45fdcb56b039bfba0028f350aaabe0508e4bb4d8c4d7c3c7d481c235.48'],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        11,
        mockCardanoColdAddress,
        [
          '3122541486c983d637e7ed9330c94e490e1fe4a1758725fab7f6d9e0.72734254432d6c6f656e',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        12,
        mockCardanoColdAddress,
        [
          'ac0a478c70238bff24e20107ebe399e7f3a3e854037622427206b024.72734d44546f6b656e2d6c6f656e',
        ],
      );
    });

    /**
     * @target updateChainBalances should skip updating empty addresses
     * @dependencies
     * - TokensMap
     * - DatabaseAction
     * @scenario
     * - populate database with mock address records
     * - stub updateChainBatchBalances to resolve to an empty array
     * - call updateChainBalances with cardano chain
     * - check updateChainBatchBalancesSpy
     * @expected
     * - updateChainBatchBalances should have been called once for cardano hot address only
     */
    it('should skip updating empty addresses', async () => {
      // arrange
      const chain = CARDANO_CHAIN;

      for (const address of mockAddresses)
        if (address.chain !== chain || address.type !== AddressType.Cold)
          await DatabaseActionMock.insertAddressRecord(address);

      const updateChainBatchBalancesSpy = vi
        .spyOn(balanceHandler, 'updateChainBatchBalances')
        .mockResolvedValue([]);

      balanceHandler['chainsTokensPerIteration'][chain] = 100;

      // act
      await balanceHandler.updateChainBalances(chain);

      // assert
      expect(updateChainBatchBalancesSpy).toHaveBeenCalledExactlyOnceWith(
        mockCardanoHotAddress,
        cardanoTokenIds,
      );
    });

    /**
     * @target updateChainBalances should remove outdated balance records from database
     * @dependencies
     * - TokensMap
     * - DatabaseAction
     * @scenario
     * - spy on DatabaseAction.removeChainAddressBalances
     * - populate database with mock address records
     * - populate database with 12 mock balance objects for hot and cold addresses of cardano
     * - stub updateChainBatchBalances to resolve to 4 mock objects for hot address only
     * - call updateChainBalances with cardano chain
     * - check removeChainAddressBalances
     * - check database records
     * @expected
     * - DatabaseAction.removeChainAddressBalances should have been called once
     * - database should have contained the 4 mock objects
     */
    it('should remove outdated balance records from database', async () => {
      // arrange
      const chain = CARDANO_CHAIN;

      const removeSpy = vi.spyOn(
        DatabaseActionMock.testDatabase,
        'removeChainAddressBalances',
      );

      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      for (const balance of mockCardanoBalances) {
        await DatabaseActionMock.insertChainAddressBalanceRecord(balance);
      }

      vi.spyOn(balanceHandler, 'updateChainBatchBalances').mockImplementation(
        async (address) => {
          if (address.id === mockCardanoHotAddress.id)
            return mockPartialCardanoBalances;
          return [];
        },
      );

      balanceHandler['chainsTokensPerIteration'][chain] = 100;

      // act
      await balanceHandler.updateChainBalances(chain);

      // assert
      expect(removeSpy).toHaveBeenCalledOnce();
      const records = await DatabaseActionMock.allChainAddressBalanceRecords();
      expect(records).toEqual(mockPartialCardanoBalances);
    });
  });
});
