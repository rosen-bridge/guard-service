import { RosenChainToken } from '@rosen-bridge/tokens';

import { balanceRoutes } from '../../src/api/balance';
import { FastifySeverInstance } from '../../src/api/schemas';
import { ChainAddressTokenBalanceEntity } from '../../src/db/entities/ChainAddressTokenBalanceEntity';
import ChainHandlerMock from '../handlers/ChainHandler.mock';
import BalanceHandlerMock from '../handlers/mocked/BalanceHandler.mock';
import MockFastifyServer from '../utils/fastify.mock';

vi.mock('../../src/utils/constants', async () => {
  const originalModule = await vi.importActual('../../src/utils/constants');

  return {
    ...originalModule,
    SUPPORTED_CHAINS: ['chain1', 'chain2'],
    ChainNativeToken: { chain1: 't1', chain2: 't2' },
  };
});

vi.mock('../../src/handlers/tokenHandler', async () => {
  return {
    TokenHandler: {
      getInstance: vi.fn().mockReturnValue({
        getTokenMap: vi.fn().mockReturnValue({
          search: vi
            .fn()
            .mockImplementation(
              (chain: string, condition: Partial<RosenChainToken>) => {
                if (chain === 'chain1' && condition.tokenId === 't1')
                  return [
                    {
                      chain1: {
                        tokenId: 't1',
                        name: 't1',
                        decimals: 2,
                        type: 't1',
                        residency: 'chain1',
                        extra: {
                          someKey: 'someValue',
                        },
                      },
                    },
                  ];
                else if (chain === 'chain2' && condition.tokenId === 't2')
                  return [
                    {
                      chain2: {
                        tokenId: 't2',
                        name: 't2',
                        decimals: 3,
                        type: 't2',
                        residency: 'chain2',
                        extra: {},
                      },
                    },
                  ];

                return [];
              }
            ),
          getSignificantDecimals: vi
            .fn()
            .mockImplementation((tokenId: string) => {
              switch (tokenId) {
                case 't1':
                  return 2;

                case 't2':
                  return 3;

                default:
                  return undefined;
              }
            }),
        }),
      }),
    },
  };
});

describe('balanceRoutes', () => {
  describe('getBalanceRoute', () => {
    beforeEach(() => {
      ChainHandlerMock.resetMock();
      BalanceHandlerMock.resetMock();
      MockFastifyServer.resetMock();

      ChainHandlerMock.mockChainName('chain1');
      ChainHandlerMock.mockChainFunction(
        'chain1',
        'getChainConfigs',
        { addresses: { lock: `lock-address1` } },
        false
      );

      ChainHandlerMock.mockChainName('chain2');
      ChainHandlerMock.mockChainFunction(
        'chain2',
        'getChainConfigs',
        { addresses: { lock: `lock-address2`, cold: `cold-address2` } },
        false
      );
    });

    /**
     * @target fastifyServer[GET /balance] should return lock balance with hot and cold arrays populated
     * @scenario
     * - stub BalanceHandler.getBalances to return mock balances
     * - call handler with mock request/reply
     * @expected
     * - response status should have been 200
     * - response should have matched hot and cold balances from mockBalances
     */
    it('should return lock balance with hot and cold arrays populated', async () => {
      // arrange
      const mockBalances: ChainAddressTokenBalanceEntity[] = [
        {
          chain: 'chain1',
          tokenId: 't1',
          address: 'lock-address1',
          lastUpdate: 0,
          balance: 1000n,
        },
        {
          chain: 'chain2',
          tokenId: 't2',
          address: 'lock-address2',
          lastUpdate: 10,
          balance: 1200n,
        },
        {
          chain: 'chain2',
          tokenId: 't2',
          address: 'cold-address2',
          lastUpdate: 13,
          balance: 21000n,
        },
      ];

      BalanceHandlerMock.mock();
      BalanceHandlerMock.mockGetBalances().mockResolvedValue(mockBalances);

      const mockReply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      // act
      balanceRoutes(MockFastifyServer as any as FastifySeverInstance);
      await MockFastifyServer.simulateRequest('/balance', {}, mockReply);

      // assert
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        hot: [
          {
            address: 'lock-address1',
            chain: 'chain1',
            balance: {
              tokenId: 't1',
              name: 'T1',
              decimals: 2,
              isNativeToken: true,
              amount: 1000,
            },
          },
          {
            address: 'lock-address2',
            chain: 'chain2',
            balance: {
              tokenId: 't2',
              name: 'T2',
              decimals: 3,
              isNativeToken: true,
              amount: 1200,
            },
          },
        ],
        cold: [
          {
            address: 'cold-address2',
            chain: 'chain2',
            balance: {
              tokenId: 't2',
              name: 'T2',
              decimals: 3,
              isNativeToken: true,
              amount: 21000,
            },
          },
        ],
      });
    });

    /**
     * @target fastifyServer[GET /balance] should return empty lock balance when no balances are returned
     * @scenario
     * - stub BalanceHandler.getBalances to return empty array
     * - call handler
     * @expected
     * - response status should have been 200
     * - response balance arrays should have been an empty
     */
    it('should return empty lock balance when no balances are returned', async () => {
      // arrange
      BalanceHandlerMock.mock();
      BalanceHandlerMock.mockGetBalances().mockResolvedValue([]);

      const mockReply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      // act
      balanceRoutes(MockFastifyServer as any as FastifySeverInstance);
      await MockFastifyServer.simulateRequest('/balance', {}, mockReply);

      // assert
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ hot: [], cold: [] });
    });

    /**
     * @target fastifyServer[GET /balance] should return error response when an exception is thrown during balance retrieval
     * @scenario
     * - stub BalanceHandler.getBalances to reject
     * - call handler
     * @expected
     * - response status should have been 500
     * - response should have matched the correct error message
     */
    it('should return error response when an exception is thrown during balance retrieval', async () => {
      // arrange
      BalanceHandlerMock.mock();
      BalanceHandlerMock.mockGetBalances().mockImplementation(() => {
        throw new Error('error');
      });

      const mockReply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      // act
      balanceRoutes(MockFastifyServer as any as FastifySeverInstance);
      await MockFastifyServer.simulateRequest('/balance', {}, mockReply);

      // assert
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'error',
      });
    });
  });
});
