import { describe, it, expect, vi } from 'vitest';
import { ETH, ETHEREUM_CHAIN } from '@rosen-chains/ethereum';
import { BINANCE_CHAIN } from '@rosen-chains/binance';
import { BITCOIN_CHAIN } from '@rosen-chains/bitcoin';
import { AssetBalance } from '@rosen-chains/abstract-chain';

import Configs from '../../src/configs/Configs';
import { SUPPORTED_CHAINS } from '../../src/utils/constants';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import { TokenData } from '../../src/types/api';
import TestBalanceHandler from './TestBalanceHandler';
import ChainHandlerMock from './ChainHandler.mock';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import * as testData from './testData';

describe('BalanceHandler', () => {
  const balanceHandler = new TestBalanceHandler();

  describe('getNativeTokenBalances', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target getNativeTokenBalances should return an empty array when repository returns no balances
     * @scenario
     * - call getNativeTokenBalances
     * @expected
     * - getNativeTokenBalances should have resolved to an empty array
     */
    it('should return an empty array when repository returns no balances', async () => {
      // act
      const result = await balanceHandler.getNativeTokenBalances();

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target getNativeTokenBalances should return balances when repository returns a non empty array
     * @scenario
     * - stub getTokenData to return a mock TokenData
     * - stub TokenMap.getConfig to return 2 token objects
     * - insert two balance objects into database
     * - call getNativeTokenBalances
     * @expected
     * - getNativeTokenBalances should have resolved to the mock balance array
     */
    it('should return balances when repository returns a non empty array', async () => {
      // arrange
      vi.mock('../../src/utils/getTokenData', () => ({
        getTokenData: (
          sourceChain: string,
          sourceChainTokenId: string,
          targetChain: string,
          returnSignificantDecimal = false
        ): TokenData => ({
          tokenId: sourceChainTokenId,
          name: sourceChainTokenId.toUpperCase(),
          amount: 0,
          decimals: 8,
          isNativeToken: true,
        }),
      }));

      vi.spyOn(TokenHandler, 'getInstance').mockReturnValue({
        getTokenMap: () => ({
          getConfig: () => [
            testData.mockTokenMap[ETHEREUM_CHAIN],
            testData.mockTokenMap[BINANCE_CHAIN],
          ],
        }),
      } as any);

      await DatabaseActionMock.insertChainAddressBalanceRecord(
        testData.mockBalances.eth
      );
      await DatabaseActionMock.insertChainAddressBalanceRecord(
        testData.mockBalances.bnb
      );

      // act
      const result = await balanceHandler.getNativeTokenBalances();

      // assert
      expect(result).toEqual([
        {
          address: testData.mockBalances.eth.address,
          chain: testData.mockBalances.eth.chain,
          balance: {
            tokenId: testData.mockBalances.eth.tokenId,
            amount: Number(testData.mockBalances.eth.balance),
            name: testData.mockBalances.eth.tokenId.toUpperCase(),
            decimals: 8,
            isNativeToken: true,
          },
        },
        {
          address: testData.mockBalances.bnb.address,
          chain: testData.mockBalances.bnb.chain,
          balance: {
            tokenId: testData.mockBalances.bnb.tokenId,
            amount: Number(testData.mockBalances.bnb.balance),
            name: testData.mockBalances.bnb.tokenId.toUpperCase(),
            decimals: 8,
            isNativeToken: true,
          },
        },
      ]);
    });
  });

  describe('getChainTokens', () => {
    /**
     * @target getChainTokens should return empty array when token map is empty
     * @scenario
     * - stub TokenMap.getConfig to return empty array
     * - call getChainTokens with ETHEREUM_CHAIN
     * @expected
     * - result should have been an empty array
     */
    it('should return empty array when token map is empty', () => {
      // arrange
      vi.spyOn(TokenHandler, 'getInstance').mockReturnValue({
        getTokenMap: () => ({
          getConfig: () => [],
        }),
      } as any);

      // act
      const result = balanceHandler.callGetChainTokenIds(ETHEREUM_CHAIN);

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target getChainTokens should return empty array when no tokens exist for specified chain
     * @scenario
     * - stub TokenMap.getConfig to return a token for BITCOIN_CHAIN
     * - call getChainTokens with ETHEREUM_CHAIN
     * @expected
     * - result should have been an empty array
     */
    it('should return empty array when no tokens exist for specified chain', () => {
      // arrange
      vi.spyOn(TokenHandler, 'getInstance').mockReturnValue({
        getTokenMap: () => ({
          getConfig: () => [testData.mockTokenMap[BITCOIN_CHAIN]],
        }),
      } as any);

      // act
      const result = balanceHandler.callGetChainTokenIds(ETHEREUM_CHAIN);

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target getChainTokens should return non-native token ids when chain has mixed native and non-native tokens
     * @scenario
     * - stub TokenMap.getConfig to return a native and 2 non-native tokens
     * - call getChainTokens with ETHEREUM_CHAIN
     * @expected
     * - result length should have been equal to 2
     * - result should have contained 'id2'
     * - result should have contained 'id3'
     * - result should not have contained ETH
     */
    it('should return non-native token ids when chain has mixed native and non-native tokens', () => {
      // arrange
      vi.spyOn(TokenHandler, 'getInstance').mockReturnValue({
        getTokenMap: () => ({
          getConfig: () => [
            testData.mockTokenMap[ETHEREUM_CHAIN],
            {
              [ETHEREUM_CHAIN]: {
                tokenId: 'id2',
                type: 'ERC20',
                name: '',
                decimals: 0,
                residency: '',
                extra: {},
              },
            },
            {
              [ETHEREUM_CHAIN]: {
                tokenId: 'id3',
                type: 'ERC20',
                name: '',
                decimals: 0,
                residency: '',
                extra: {},
              },
            },
          ],
        }),
      } as any);

      // act
      const result = balanceHandler.callGetChainTokenIds(ETHEREUM_CHAIN);

      // assert
      expect(result).toHaveLength(2);
      expect(result).toContain('id2');
      expect(result).toContain('id3');
      expect(result).not.toContain(ETH);
    });

    /**
     * @target getChainTokens should only return tokens for specified chain when multiple chains exist in token map
     * @scenario
     * - stub TokenMap.getConfig to return a non native token for ETHEREUM_CHAIN and BITCOIN_CHAIN
     * - call getChainTokens with ETHEREUM_CHAIN
     * @expected
     * - result length should have been equal to 1
     * - result should have contained 'id1'
     * - result should not have contained 'id2'
     */
    it('should only return tokens for specified chain when multiple chains exist in token map', () => {
      // arrange
      vi.spyOn(TokenHandler, 'getInstance').mockReturnValue({
        getTokenMap: () => ({
          getConfig: () => [
            {
              [ETHEREUM_CHAIN]: {
                tokenId: 'id1',
                type: 'ERC20',
                name: 'id1',
                decimals: 0,
                residency: '',
                extra: {},
              },
            },
            {
              [BINANCE_CHAIN]: {
                tokenId: 'id2',
                type: 'native',
                name: '1d2',
                decimals: 0,
                residency: '',
                extra: {},
              },
            },
          ],
        }),
      } as any);

      // act
      const result = balanceHandler.callGetChainTokenIds(ETHEREUM_CHAIN);

      // assert
      expect(result).toHaveLength(1);
      expect(result).toContain('id1');
      expect(result).not.toContain('id2');
    });
  });

  describe('getAddressAssets', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
    });

    /**
     * @target getAddressAssets should successfully read balance records of cold addresses from database
     * @scenario
     * - stub ChainHandler getChainConfigs to return a mock chainConfig for supported chains
     * - insert 2 ChainAddressBalanceEntity objects into database for lock and cold addresses
     * - stub balanceEntityToAddressBalance to return a mock object
     * - call getAddressAssets
     * @expected
     * - getAddressAssets should have resolved to an array of one AddressBalance object corresponding to coldAddress
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
              cold: `${chain}_mock_cold_address`,
              lock: `${chain}_mock_lock_address`,
            },
          },
          false
        );
      }

      await DatabaseActionMock.insertChainAddressBalanceRecord(
        testData.mockColdBalance
      );
      await DatabaseActionMock.insertChainAddressBalanceRecord(
        testData.mockLockBalance
      );

      vi.spyOn(
        balanceHandler as any,
        'balanceEntityToAddressBalance'
      ).mockImplementation((balance: any) => {
        return {
          address: balance.address,
          chain: balance.chain,
          balance: {
            tokenId: balance.tokenId,
            amount: Number(balance.balance),
            name: 'name',
            decimals: 8,
            isNativeToken: true,
          },
        };
      });

      // act
      const result = await balanceHandler.getAddressAssets('cold');

      // assert
      expect(result).toEqual([
        {
          address: testData.mockColdBalance.address,
          chain: testData.mockColdBalance.chain,
          balance: {
            tokenId: testData.mockColdBalance.tokenId,
            amount: Number(testData.mockColdBalance.balance),
            name: 'name',
            decimals: 8,
            isNativeToken: true,
          },
        },
      ]);
    });

    /**
     * @target getAddressAssets should successfully read balance records of lock addresses from database
     * @scenario
     * - stub ChainHandler getChainConfigs to return a mock chainConfig for supported chains
     * - insert 2 ChainAddressBalanceEntity objects into database for lock and cold addresses
     * - stub balanceEntityToAddressBalance to return a mock object
     * - call getAddressAssets
     * @expected
     * - getAddressAssets should have resolved to an array of one AddressBalance object corresponding to lockAddress
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
          false
        );
      }

      await DatabaseActionMock.insertChainAddressBalanceRecord(
        testData.mockLockBalance
      );
      await DatabaseActionMock.insertChainAddressBalanceRecord(
        testData.mockColdBalance
      );

      vi.spyOn(
        balanceHandler as any,
        'balanceEntityToAddressBalance'
      ).mockImplementation((balance: any) => {
        return {
          address: balance.address,
          chain: balance.chain,
          balance: {
            tokenId: balance.tokenId,
            amount: Number(balance.balance),
            name: 'name',
            decimals: 8,
            isNativeToken: true,
          },
        };
      });

      // act
      const result = await balanceHandler.getAddressAssets('lock');

      // assert
      expect(result).toEqual([
        {
          address: testData.mockLockBalance.address,
          chain: testData.mockLockBalance.chain,
          balance: {
            tokenId: testData.mockLockBalance.tokenId,
            amount: Number(testData.mockLockBalance.balance),
            name: 'name',
            decimals: 8,
            isNativeToken: true,
          },
        },
      ]);
    });
  });

  describe('updateChainBatchBalances', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
    });

    const chain = ETHEREUM_CHAIN;
    const address = '0x123';
    const tokensBatch = ['token1', 'token2'];

    /**
     * @target updateChainBatchBalances should update batch balances successfully
     * @scenario
     * - stub ChainHandler.getAddressAssets to resolve to a balance object with 2 non-native tokens
     * - call updateChainBatchBalances
     * @expected
     * - database should have contained 3 ChainAddressBalanceEntity objects
     */
    it('should update batch balances successfully', async () => {
      // arrange
      const balance: AssetBalance = {
        nativeToken: 123n,
        tokens: [
          { id: 'token1', value: 100n },
          { id: 'token2', value: 200n },
        ],
      };

      ChainHandlerMock.mockChainName(chain);
      ChainHandlerMock.mockChainFunction(
        chain,
        'getAddressAssets',
        balance,
        true
      );

      // act
      await balanceHandler.updateChainBatchBalances(
        chain,
        address,
        tokensBatch
      );

      // assert
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'getAddressAssets')
      ).toHaveBeenCalledOnce();
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'getAddressAssets')
      ).toHaveBeenCalledWith(address, tokensBatch);

      const balances = await DatabaseActionMock.allChainAddressBalanceRecords();

      expect(balances).toHaveLength(3);
      expect(balances[0]).toEqual({
        chain,
        address,
        tokenId: ETH,
        lastUpdate: expect.any(Number),
        balance: 123n,
      });
      expect(balances[1]).toEqual({
        chain,
        address,
        tokenId: 'token1',
        lastUpdate: expect.any(Number),
        balance: 100n,
      });
      expect(balances[2]).toEqual({
        chain,
        address,
        tokenId: 'token2',
        lastUpdate: expect.any(Number),
        balance: 200n,
      });
    });
  });

  describe('updateChainBalances', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();
    });

    /**
     * @target updateChainBalances should successfully update all balances of a chain
     * @scenario
     * - stub ChainHandler getChainConfigs to return a mock chainConfig
     * - stub getChainTokenIds to return a mock array
     * - stub updateChainBatchBalances to resolve
     * - call updateChainBalances
     * @expected
     * - updateChainBatchBalances should have been called 4 times in this order
     *  - lockAddress x [token1]
     *  - lockAddress x [token2]
     *  - coldAddress x [token1]
     *  - coldAddress x [token2]
     */
    it('should successfully update all balances of a chain', async () => {
      // arrange
      const chain = ETHEREUM_CHAIN;
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
        false
      );

      vi.spyOn(balanceHandler as any, 'getChainTokenIds').mockReturnValue([
        'token1',
        'token2',
      ]);

      const updateChainBatchBalancesSpy = vi
        .spyOn(balanceHandler as any, 'updateChainBatchBalances')
        .mockResolvedValue(null);

      balanceHandler['chainsTokensPerIteration'][chain] = 1;
      Configs.balanceHandler[chain].updateBatchInterval = 0;

      // act
      await balanceHandler.updateChainBalances(chain);

      // assert
      expect(updateChainBatchBalancesSpy).toHaveBeenCalledTimes(4);
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        1,
        chain,
        lockAddress,
        ['token1']
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        2,
        chain,
        lockAddress,
        ['token2']
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        3,
        chain,
        coldAddress,
        ['token1']
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        4,
        chain,
        coldAddress,
        ['token2']
      );
    });
  });
});
