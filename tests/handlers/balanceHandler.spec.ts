import { TokenMap } from '@rosen-bridge/tokens';
import { AssetBalance } from '@rosen-chains/abstract-chain';
import { BITCOIN_CHAIN } from '@rosen-chains/bitcoin';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { DOGE_CHAIN } from '@rosen-chains/doge';

import Configs from '../../src/configs/configs';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import { SUPPORTED_CHAINS } from '../../src/utils/constants';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import ChainHandlerMock from './chainHandler.mock';
import TestBalanceHandler from './testBalanceHandler';
import {
  cardanoCometTokenId,
  cardanoLockAddress,
  mockBalances,
} from './testData';

describe('BalanceHandler', () => {
  const balanceHandler = new TestBalanceHandler();

  describe('getNativeTokenBalances', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target getNativeTokenBalances should return an empty array when database is empty
     * @dependencies
     * - DatabaseAction
     * @scenario
     * - call getNativeTokenBalances
     * @expected
     * - getNativeTokenBalances should have resolved to an empty array
     */
    it('should return an empty array when database is empty', async () => {
      // act
      const result = await balanceHandler.getNativeTokenBalances();

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target getNativeTokenBalances should return balances when database is not empty
     * @dependencies
     * - DatabaseAction
     * @scenario
     * - populate database with 4 mock ChainAddressBalanceEntity objects
     * - call getNativeTokenBalances
     * @expected
     * - getNativeTokenBalances should have resolved to an array of 2 native token balances for bitcoin and cardano
     */
    it('should return balances when database is not empty', async () => {
      // arrange
      // populate database with mock balance records
      for (const chain of Object.keys(mockBalances)) {
        for (const balance of mockBalances[chain]) {
          await DatabaseActionMock.insertChainAddressBalanceRecord(balance);
        }
      }

      // act
      const result = await balanceHandler.getNativeTokenBalances();

      // assert
      expect(result).toEqual([
        balanceHandler.callBalanceEntityToAddressBalance(
          mockBalances[BITCOIN_CHAIN][0],
        ),
        balanceHandler.callBalanceEntityToAddressBalance(
          mockBalances[CARDANO_CHAIN][0],
        ),
      ]);
    });
  });

  describe('getChainTokens', () => {
    /**
     * @target getChainTokens should return empty array when token map is empty
     * @scenario
     * - stub TokenMap.getConfig to return empty array
     * - call getChainTokens with CARDANO_CHAIN
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
     * @target getChainTokens should return empty array when no tokens exist for specified chain
     * @dependencies
     * - TokensMap
     * @scenario
     * - call getChainTokens with DOGE_CHAIN
     * @expected
     * - result should have been an empty array
     */
    it('should return empty array when no tokens exist for specified chain', () => {
      // act
      const result = balanceHandler.callGetChainTokenIds(DOGE_CHAIN);

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target getChainTokens should return non-native token ids of chain when it has both of the token types
     * @dependencies
     * - TokensMap
     * @scenario
     * - call getChainTokens with CARDANO_CHAIN
     * @expected
     * - result length should have been equal to 6
     * - result should have contained all the other 6 tokens of tokensMap that cardano supports except ada
     */
    it('should return non-native token ids of chain when it has both of the token types', () => {
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

  describe('getAddressAssets', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();

      await DatabaseActionMock.clearTables();

      // populate database with mock balance records
      for (const chain of Object.keys(mockBalances)) {
        for (const balance of mockBalances[chain]) {
          await DatabaseActionMock.insertChainAddressBalanceRecord(balance);
        }
      }
    });

    /**
     * @target getAddressAssets should successfully read balance records of cold addresses from database
     * @dependencies
     * - TokensMap
     * - ChainHandler
     * - DatabaseAction
     * @scenario
     * - stub ChainHandler getChainConfigs to return a mock chainConfig for supported chains
     * - populate database with 4 mock ChainAddressBalanceEntity objects for lock and cold addresses
     * - call getAddressAssets
     * @expected
     * - getAddressAssets should have resolved to an array of 3 AddressBalance objects corresponding to cold addresses of cardano and bitcoin
     */
    it('should successfully read balance records of cold addresses from database', async () => {
      // arrange
      for (const chain of SUPPORTED_CHAINS) {
        ChainHandlerMock.mockChainName(chain);
        ChainHandlerMock.mockChainFunction(
          chain,
          'getChainConfigs',
          {
            addresses: {
              lock: `${chain}_mock_lock_address`,
              cold: `${chain}_mock_cold_address`,
            },
          },
          false,
        );
      }

      // act
      const result = await balanceHandler.getAddressAssets(
        'cold',
        undefined, // chain,
        undefined, // tokenId,
        0, // offset,
        10, // limit
      );

      // assert
      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(3);
      expect(result.items).toEqual([
        balanceHandler.callBalanceEntityToAddressBalance(
          mockBalances[BITCOIN_CHAIN][0],
        ),
        balanceHandler.callBalanceEntityToAddressBalance(
          mockBalances[CARDANO_CHAIN][0],
        ),
        balanceHandler.callBalanceEntityToAddressBalance(
          mockBalances[CARDANO_CHAIN][1],
        ),
      ]);
    });

    /**
     * @target getAddressAssets should successfully read balance records of lock addresses from database
     * @dependencies
     * - TokensMap
     * - ChainHandler
     * - DatabaseAction
     * @scenario
     * - stub ChainHandler getChainConfigs to return a mock chainConfig for supported chains
     * - populate database with 4 mock ChainAddressBalanceEntity objects for lock and cold addresses
     * - call getAddressAssets
     * @expected
     * - getAddressAssets should have resolved to an array of 1 AddressBalance object corresponding to lockAddress
     */
    it('should successfully read balance records of lock addresses from database', async () => {
      // arrange
      for (const chain of SUPPORTED_CHAINS) {
        ChainHandlerMock.mockChainName(chain);
        ChainHandlerMock.mockChainFunction(
          chain,
          'getChainConfigs',
          {
            addresses: {
              lock: `${chain}_mock_lock_address`,
              cold: `${chain}_mock_cold_address`,
            },
          },
          false,
        );
      }

      // act
      const result = await balanceHandler.getAddressAssets(
        'lock',
        undefined, // chain
        undefined, // tokenId
        0, // offset
        10, // limit
      );

      // assert
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items).toEqual([
        balanceHandler.callBalanceEntityToAddressBalance(
          mockBalances[CARDANO_CHAIN][2],
        ),
      ]);
    });
  });

  describe('updateChainBatchBalances', () => {
    beforeEach(() => {
      ChainHandlerMock.resetMock();
    });

    /**
     * @target updateChainBatchBalances should update batch balances successfully
     * @dependencies
     * - TokensMap
     * - ChainHandler
     * - DatabaseAction
     * @scenario
     * - populate database with 4 mock ChainAddressBalanceEntity objects
     * - stub ChainHandler.getAddressAssets to resolve to a AssetBalance object with a non-native token
     * - call updateChainBatchBalances
     * @expected
     * - database should have contained 5 ChainAddressBalanceEntity objects (4 initial balances + 1 inserted and 1 updated balances)
     */
    it('should update batch balances successfully', async () => {
      // arrange
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
      await balanceHandler.updateChainBatchBalances(
        CARDANO_CHAIN,
        cardanoLockAddress,
        [cardanoCometTokenId],
      );

      // assert
      const mockGetAddressAssets = ChainHandlerMock.getChainMockedFunction(
        CARDANO_CHAIN,
        'getAddressAssets',
      );
      expect(mockGetAddressAssets).toHaveBeenCalledExactlyOnceWith(
        cardanoLockAddress,
        [cardanoCometTokenId],
      );

      const balances = await DatabaseActionMock.allChainAddressBalanceRecords();
      expect(balances).toHaveLength(5);
      expect(balances[0]).toEqual(mockBalances[BITCOIN_CHAIN][0]);
      expect(balances[1]).toEqual(mockBalances[CARDANO_CHAIN][0]);
      expect(balances[2]).toEqual(mockBalances[CARDANO_CHAIN][1]);
      expect(balances[3]).toEqual({
        chain: CARDANO_CHAIN,
        address: cardanoLockAddress,
        tokenId: cardanoCometTokenId,
        lastUpdate: expect.any(String),
        balance: 111n,
      });
      expect(balances[4]).toEqual({
        chain: CARDANO_CHAIN,
        address: cardanoLockAddress,
        tokenId: ADA,
        lastUpdate: expect.any(String),
        balance: 123n,
      });
    });
  });

  describe('updateChainBalances', () => {
    beforeEach(() => {
      ChainHandlerMock.resetMock();
    });

    /**
     * @target updateChainBalances should successfully update all balances of a chain
     * @dependencies
     * - TokensMap
     * - ChainHandler
     * - DatabaseAction
     * @scenario
     * - stub ChainHandler getChainConfigs to return a mock chainConfig
     * - stub updateChainBatchBalances to resolve
     * - call updateChainBalances
     * @expected
     * - updateChainBatchBalances should have been called 12 times for 2 addresses and 6 tokens each
     */
    it('should successfully update all balances of a chain', async () => {
      // arrange
      const chain = CARDANO_CHAIN;
      const lockAddress = `${chain}_mock_lock_address`;
      const coldAddress = `${chain}_mock_cold_address`;

      ChainHandlerMock.mockChainName(chain);
      ChainHandlerMock.mockChainFunction(
        chain,
        'getChainConfigs',
        {
          addresses: {
            lock: lockAddress,
            cold: coldAddress,
          },
        },
        false,
      );

      const updateChainBatchBalancesSpy = vi
        .spyOn(balanceHandler as any, 'updateChainBatchBalances') // eslint-disable-line @typescript-eslint/no-explicit-any
        .mockResolvedValue(null);

      balanceHandler['chainsTokensPerIteration'][chain] = 1;
      Configs.balanceHandler[chain].updateBatchInterval = 0;

      // act
      await balanceHandler.updateChainBalances(chain);

      // assert
      expect(updateChainBatchBalancesSpy).toHaveBeenCalledTimes(12);
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        1,
        chain,
        lockAddress,
        [
          'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        2,
        chain,
        lockAddress,
        [
          'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        3,
        chain,
        lockAddress,
        ['a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59'],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        4,
        chain,
        lockAddress,
        ['45fdcb56b039bfba0028f350aaabe0508e4bb4d8c4d7c3c7d481c235.48'],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        5,
        chain,
        lockAddress,
        [
          '3122541486c983d637e7ed9330c94e490e1fe4a1758725fab7f6d9e0.72734254432d6c6f656e',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        6,
        chain,
        lockAddress,
        [
          'ac0a478c70238bff24e20107ebe399e7f3a3e854037622427206b024.72734d44546f6b656e2d6c6f656e',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        7,
        chain,
        coldAddress,
        [
          'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        8,
        chain,
        coldAddress,
        [
          'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        9,
        chain,
        coldAddress,
        ['a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59'],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        10,
        chain,
        coldAddress,
        ['45fdcb56b039bfba0028f350aaabe0508e4bb4d8c4d7c3c7d481c235.48'],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        11,
        chain,
        coldAddress,
        [
          '3122541486c983d637e7ed9330c94e490e1fe4a1758725fab7f6d9e0.72734254432d6c6f656e',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        12,
        chain,
        coldAddress,
        [
          'ac0a478c70238bff24e20107ebe399e7f3a3e854037622427206b024.72734d44546f6b656e2d6c6f656e',
        ],
      );
    });
  });
});
