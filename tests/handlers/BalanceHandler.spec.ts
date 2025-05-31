import { describe, it, expect, vi } from 'vitest';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { In } from 'typeorm';
import { ETH, ETHEREUM_CHAIN } from '@rosen-chains/ethereum';
import { BINANCE_CHAIN, BNB } from '@rosen-chains/binance';
import { ChainConfigs } from '@rosen-chains/abstract-chain';

import { ChainAddressTokenBalanceEntity } from '../../src/db/entities/ChainAddressTokenBalanceEntity';
import { ChainNativeToken, SUPPORTED_CHAINS } from '../../src/utils/constants';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import Utils from '../../src/utils/Utils';
import TestBalanceHandler from './TestBalanceHandler';
import ChainHandlerMock from './ChainHandler.mock';

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

  describe('getBalances', () => {
    const allNativeTokenIds: Set<string> = new Set();
    for (const chain of SUPPORTED_CHAINS) {
      allNativeTokenIds.add(ChainNativeToken[chain]);
    }

    /**
     * @target getBalances should return an empty array when repository returns no balances
     * @scenario
     * - stub chainAddressTokenBalanceRepository.findBy to resolve to an empty array
     * - call getBalances
     * @expected
     * - chainAddressTokenBalanceRepository.findBy should have been called once with object containing native token ids of all supported chains
     * - getBalances should have resolved to an empty array
     */
    it('should return an empty array when repository returns no balances', async () => {
      // arrange
      mockRepository.findBy.mockResolvedValue([]);

      // act
      const result = await balanceHandler.getBalances();

      // assert
      expect(mockRepository.findBy).toHaveBeenCalledOnce();
      expect(mockRepository.findBy).toHaveBeenCalledWith({
        tokenId: In([...allNativeTokenIds]),
      });
      expect(result).toEqual([]);
    });

    /**
     * @target getBalances should return balances when repository returns a non empty array
     * @scenario
     * - define a mock array with two balance objects
     * - stub chainAddressTokenBalanceRepository.findBy to resolve to the mock balance array
     * - call getBalances
     * @expected
     * - chainAddressTokenBalanceRepository.findBy should have been called once with object containing native token ids of all supported chains
     * - getBalances should have resolved to the mock balance array
     */
    it('should return balances when repository returns a non empty array', async () => {
      // arrange
      const mockBalances: ChainAddressTokenBalanceEntity[] = [
        {
          chain: ETHEREUM_CHAIN,
          address: '1',
          tokenId: ETH,
          lastUpdate: 1643723400,
          balance: 1000000000n,
        },
        {
          chain: BINANCE_CHAIN,
          address: '2',
          tokenId: BNB,
          lastUpdate: 1643723401,
          balance: 500000000n,
        },
      ];
      mockRepository.findBy.mockResolvedValue(mockBalances);

      // act
      const result = await balanceHandler.getBalances();

      // assert
      expect(mockRepository.findBy).toHaveBeenCalledOnce();
      expect(mockRepository.findBy).toHaveBeenCalledWith({
        tokenId: In([...allNativeTokenIds]),
      });
      expect(result).toEqual(mockBalances);
    });
  });

  describe('getChainAddresses', () => {
    /**
     * @target getChainAddresses should return an array with lock and cold addresses from chain configs
     * @scenario
     * - stub getChainConfigs to return a mock chain config with lock and cold addresses
     * - call getChainAddresses with 'chainA'
     * @expected
     * - getChainConfigs should have been called once
     * - getChainAddresses should have returned an array containing lock and cold addresses
     */
    it('should return an array with lock and cold addresses from chain configs', () => {
      // arrange
      const chain = 'chain1';
      const mockLockAddress = 'lock_address';
      const mockColdAddress = 'cold_address';
      const mockChainConfig: ChainConfigs = {
        fee: 100n,
        confirmations: {
          observation: 1,
          payment: 1,
          cold: 1,
          manual: 1,
          arbitrary: 1,
        },
        addresses: {
          lock: mockLockAddress,
          cold: mockColdAddress,
          permit: 'permit',
          fraud: 'fraud',
        },
        rwtId: 'rwt',
      };

      ChainHandlerMock.mockChainName(chain);
      ChainHandlerMock.mockChainFunction(
        chain,
        'getChainConfigs',
        mockChainConfig,
        false
      );

      // act
      const result = balanceHandler.callGetChainAddresses(chain);

      // assert
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'getChainConfigs')
      ).toHaveBeenCalledOnce();

      expect(result).toEqual([mockLockAddress, mockColdAddress]);
    });
  });

  describe('getChainTokens', () => {
    /**
     * @target getChainTokens should return empty array when token map is empty
     * @scenario
     * - stub TokenMap.getConfig to return empty array
     * - call getChainTokens with 'chainA'
     * @expected
     * - result should have been equal to empty array
     */
    it('should return empty array when token map is empty', () => {
      // arrange
      vi.spyOn(TokenHandler, 'getInstance').mockReturnValue({
        getTokenMap: () => {
          return {
            getConfig: () => [],
          };
        },
      } as any);

      // act
      const result = balanceHandler.callGetChainTokens('chainA');

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target getChainTokens should return empty array when no tokens exist for specified chain
     * @scenario
     * - stub TokenMap.getConfig to return a token for chainB
     * - call getChainTokens with 'chainA'
     * @expected
     * - result should have been equal to []
     */
    it('should return empty array when no tokens exist for specified chain', () => {
      // arrange
      vi.spyOn(TokenHandler, 'getInstance').mockReturnValue({
        getTokenMap: () => ({
          getConfig: () => [
            {
              chainB: {
                tokenId: 'id2',
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
      const result = balanceHandler.callGetChainTokens('chainA');

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target getChainTokens should return non-native token ids when chain has mixed native and non-native tokens
     * @scenario
     * - stub TokenMap.getConfig to return a native and 2 non-native tokens
     * - call getChainTokens with 'chainA'
     * @expected
     * - result length should have been equal to 2
     * - result should have contained 'id2'
     * - result should have contained 'id3'
     * - result should not have contained 'id1'
     */
    it('should return non-native token ids when chain has mixed native and non-native tokens', () => {
      // arrange
      vi.spyOn(TokenHandler, 'getInstance').mockReturnValue({
        getTokenMap: () => ({
          getConfig: () => [
            {
              chainA: {
                tokenId: 'id1',
                type: 'native',
                name: '',
                decimals: 0,
                residency: '',
                extra: {},
              },
            },
            {
              chainA: {
                tokenId: 'id2',
                type: 'ERC20',
                name: '',
                decimals: 0,
                residency: '',
                extra: {},
              },
            },
            {
              chainA: {
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
      const result = balanceHandler.callGetChainTokens('chainA');

      // assert
      expect(result).toHaveLength(2);
      expect(result).toContain('id2');
      expect(result).toContain('id3');
      expect(result).not.toContain('id1');
    });

    /**
     * @target getChainTokens should only return tokens for specified chain when multiple chains exist in token map
     * @scenario
     * - stub TokenMap.getConfig to return a non native token for 2 chains
     * - call getChainTokens with 'chainA'
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
              chainA: {
                tokenId: 'id1',
                type: 'ERC20',
                name: '',
                decimals: 0,
                residency: '',
                extra: {},
              },
            },
            {
              chainB: {
                tokenId: 'id2',
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
      const result = balanceHandler.callGetChainTokens('chainA');

      // assert
      expect(result).toHaveLength(1);
      expect(result).toContain('id1');
      expect(result).not.toContain('id2');
    });
  });

  describe('updateChainBatchBalances', () => {
    const chain = 'chain1';
    const address = '0x123';
    const tokensBatch = ['token1', 'token2'];
    const maxRetries = 3;

    const chainBalanceConfigsMock = {
      [chain]: { updateBatchMaxRetries: maxRetries },
    };

    const retryUntilSpy = vi
      .spyOn(Utils, 'retryUntil')
      .mockImplementation(
        async <T>(
          maxTries: number,
          action: () => Promise<T>,
          _retryTimeoutMs = 1,
          dropError = false
        ) => {
          const _maxTries = maxTries > 1 ? maxTries : 1;
          for (let i = 0; i < _maxTries; i += 1) {
            try {
              const result = await action();
              return result;
            } catch (error) {
              if (i < _maxTries - 1) {
                //
              } else {
                if (!dropError) throw new Error('max retry reached');
                return undefined;
              }
            }
          }
        }
      );

    beforeEach(() => {
      retryUntilSpy.mockClear();

      balanceHandler.chainConfigs = chainBalanceConfigsMock as any;
    });

    /**
     * @target updateChainBatchBalances should update batch balances successfully when no retry is necessary
     * @scenario
     * - stub Utils.retryUntil to invoke the callback immediately
     * - stub ChainHandler.getAddressAssets to resolve to a balance object with 2 tokens
     * - stub chainAddressTokenBalanceRepository.upsert to resolve
     * - call updateChainBatchBalances
     * @expected
     * - Utils.retryUntil should have been called once with max retry count from this.chainConfigs for the chain and a callback
     * - ChainHandler.getAddressAssets should have been called once with address and tokensBatch
     * - chainAddressTokenBalanceRepository.upsert should have been called once
     */
    it('should update batch balances successfully when no retry is necessary', async () => {
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
      expect(retryUntilSpy).toHaveBeenCalledOnce();
      expect(retryUntilSpy).toHaveBeenCalledWith(
        maxRetries,
        expect.any(Function)
      );

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

    /**
     * @target updateChainBatchBalances should update batch balances successfully after a retry when the first attempt fails
     * @scenario
     * - stub Utils.retryUntil to invoke the callback immediately
     * - stub ChainHandler.getAddressAssets to throw an error on the first call and resolve on the second call
     * - stub chainAddressTokenBalanceRepository.upsert to resolve
     * - call updateChainBatchBalances
     * @expected
     * - Utils.retryUntil should have been called once with max retry count from this.chainConfigs for the chain and a callback that was executed multiple times
     * - ChainHandler.getAddressAssets should have been called twice with address and tokensBatch
     * - chainAddressTokenBalanceRepository.upsert should have been called once
     */
    it('should update batch balances successfully after a retry when the first attempt fails', async () => {
      // arrange
      const balance = {
        tokens: [{ id: 'token1', value: 100 }],
      };

      ChainHandlerMock.mockChainName(chain);
      ChainHandlerMock.mockChainFunctionSequence(
        chain,
        'getAddressAssets',
        [new Error('error'), balance],
        true
      );

      // act
      await balanceHandler.updateChainBatchBalances(
        chain,
        address,
        tokensBatch
      );

      // assert
      expect(retryUntilSpy).toHaveBeenCalledOnce();

      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'getAddressAssets')
      ).toHaveBeenCalledTimes(2);
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'getAddressAssets')
      ).toHaveBeenNthCalledWith(1, address, tokensBatch);
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'getAddressAssets')
      ).toHaveBeenNthCalledWith(2, address, tokensBatch);

      expect(
        balanceHandler.chainAddressTokenBalanceRepository.upsert
      ).toHaveBeenCalledOnce();
      const upsertArgs = (
        balanceHandler.chainAddressTokenBalanceRepository.upsert as any
      ).mock.calls[0];
      expect(upsertArgs[0]).toHaveLength(1);
      expect(upsertArgs[0][0]).toMatchObject({
        chain,
        address,
        tokenId: 'token1',
        balance: 100,
      });
      expect(upsertArgs[1]).toEqual(['chain', 'address', 'tokenId']);
    });

    /**
     * @target updateChainBatchBalances should throw an error if retries exceed max retry count due to failures
     * @scenario
     * - stub Utils.retryUntil to invoke the callback immediately
     * - stub ChainHandler.getAddressAssets to reject
     * - call updateChainBatchBalances
     * @expected
     * - updateChainBatchBalances should have thrown an error after exceeding max retries
     * - Utils.retryUntil should have been called once
     * - ChainHandler.getAddressAssets should have been called `max retry count` times
     * - chainAddressTokenBalanceRepository.upsert should not have been called
     */
    it('should throw an error if retries exceed max retry count due to failures', async () => {
      // arrange
      ChainHandlerMock.mockChainName(chain);
      ChainHandlerMock.mockChainFunctionToThrow(
        chain,
        'getAddressAssets',
        new Error('error'),
        true
      );

      // act and assets
      await expect(async () => {
        await balanceHandler.updateChainBatchBalances(
          chain,
          address,
          tokensBatch
        );
      }).rejects.toThrow('max retry reached');

      expect(retryUntilSpy).toHaveBeenCalledOnce();
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'getAddressAssets')
      ).toHaveBeenCalledTimes(maxRetries);

      expect(
        balanceHandler.chainAddressTokenBalanceRepository.upsert
      ).not.toHaveBeenCalled();
    });
  });
});
