import { describe, it, expect, vi } from 'vitest';
import { In } from 'typeorm';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { ETH, ETHEREUM_CHAIN } from '@rosen-chains/ethereum';
import { BINANCE_CHAIN } from '@rosen-chains/binance';
import { BITCOIN_CHAIN } from '@rosen-chains/bitcoin';

import { ChainAddressTokenBalanceEntity } from '../../src/db/entities/ChainAddressTokenBalanceEntity';
import { ChainNativeToken, SUPPORTED_CHAINS } from '../../src/utils/constants';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import { TokenData } from '../../src/types/api';
import TestBalanceHandler from './TestBalanceHandler';
import ChainHandlerMock from './ChainHandler.mock';
import * as testData from './testData';

describe('BalanceHandler', () => {
  const mockRepository = {
    findBy: vi.fn(),
    upsert: vi.fn(),
  };
  const mockDataSource: DataSource = {
    getRepository: vi.fn(() => mockRepository),
  } as any;

  let balanceHandler: TestBalanceHandler;

  beforeEach(() => {
    ChainHandlerMock.resetMock();
    mockRepository.findBy.mockClear();
    mockRepository.upsert.mockClear();
    balanceHandler = new TestBalanceHandler(mockDataSource);
  });

  describe('getNativeTokenBalances', () => {
    const allNativeTokenIds: Set<string> = new Set();
    beforeAll(() => {
      for (const chain of SUPPORTED_CHAINS) {
        allNativeTokenIds.add(ChainNativeToken[chain]);
      }
    });

    /**
     * @target getNativeTokenBalances should return an empty array when repository returns no balances
     * @scenario
     * - stub chainAddressTokenBalanceRepository.findBy to resolve to an empty array
     * - call getNativeTokenBalances
     * @expected
     * - chainAddressTokenBalanceRepository.findBy should have been called once with object containing native token ids of all supported chains
     * - getNativeTokenBalances should have resolved to an empty array
     */
    it('should return an empty array when repository returns no balances', async () => {
      // arrange
      mockRepository.findBy.mockResolvedValue([]);

      // act
      const result = await balanceHandler.getNativeTokenBalances();

      // assert
      expect(mockRepository.findBy).toHaveBeenCalledOnce();
      expect(mockRepository.findBy).toHaveBeenCalledWith({
        tokenId: In([...allNativeTokenIds]),
      });
      expect(result).toEqual([]);
    });

    /**
     * @target getNativeTokenBalances should return balances when repository returns a non empty array
     * @scenario
     * - stub getTokenData to return a mock TokenData
     * - stub TokenMap.getConfig to return 2 token objects
     * - define a mock array with two balance objects
     * - stub chainAddressTokenBalanceRepository.findBy to resolve to the mock balance array
     * - call getNativeTokenBalances
     * @expected
     * - chainAddressTokenBalanceRepository.findBy should have been called once with object containing native token ids of all supported chains
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

      const mockBalances: ChainAddressTokenBalanceEntity[] = [
        testData.mockBalances.eth,
        testData.mockBalances.bnb,
      ];
      mockRepository.findBy.mockResolvedValue(mockBalances);

      // act
      const result = await balanceHandler.getNativeTokenBalances();

      // assert
      expect(mockRepository.findBy).toHaveBeenCalledOnce();
      expect(mockRepository.findBy).toHaveBeenCalledWith({
        tokenId: In([...allNativeTokenIds]),
      });
      expect(result).toEqual([
        {
          address: mockBalances[0].address,
          chain: mockBalances[0].chain,
          balance: {
            tokenId: mockBalances[0].tokenId,
            amount: Number(mockBalances[0].balance),
            name: mockBalances[0].tokenId.toUpperCase(),
            decimals: 8,
            isNativeToken: true,
          },
        },
        {
          address: mockBalances[1].address,
          chain: mockBalances[1].chain,
          balance: {
            tokenId: mockBalances[1].tokenId,
            amount: Number(mockBalances[1].balance),
            name: mockBalances[1].tokenId.toUpperCase(),
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
     * - result should have been equal to empty array
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
     * - result should have been equal to []
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
      expect(result).toHaveLength(1);
      expect(result).toContain('id1');
      expect(result).not.toContain('id2');
    });
  });

  describe('updateChainBatchBalances', () => {
    const chain = ETHEREUM_CHAIN;
    const address = '0x123';
    const tokensBatch = ['token1', 'token2'];

    /**
     * @target updateChainBatchBalances should update batch balances successfully
     * @scenario
     * - stub ChainHandler.getAddressAssets to resolve to a balance object with 2 tokens
     * - stub chainAddressTokenBalanceRepository.upsert to resolve
     * - call updateChainBatchBalances
     * @expected
     * - ChainHandler.getAddressAssets should have been called once with address and tokensBatch
     * - chainAddressTokenBalanceRepository.upsert should have been called once
     */
    it('should update batch balances successfully', async () => {
      // arrange
      const balance = {
        tokens: [
          { id: 'token1', value: 100 },
          { id: 'token2', value: 200 },
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

      expect(
        balanceHandler.chainAddressTokenBalanceRepository.upsert
      ).toHaveBeenCalledOnce();
      const upsertArgs = (
        balanceHandler.chainAddressTokenBalanceRepository.upsert as any
      ).mock.calls[0];
      expect(upsertArgs[0]).toHaveLength(2);
      expect(upsertArgs[0][0]).toMatchObject({
        chain,
        address,
        tokenId: 'token1',
        balance: 100,
      });
      expect(upsertArgs[0][1]).toMatchObject({
        chain,
        address,
        tokenId: 'token2',
        balance: 200,
      });
      expect(upsertArgs[1]).toEqual(['chain', 'address', 'tokenId']);
    });
  });
});
