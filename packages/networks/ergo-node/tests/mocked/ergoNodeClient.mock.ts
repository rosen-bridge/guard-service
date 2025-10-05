import ergoNodeClientFactory from '@rosen-clients/ergo-node';
import { vi } from 'vitest';

import {
  testAddressBalance,
  testAddressBoxes,
  testBlockHeaders,
  testHeight,
  testLastBlockHeaders,
  testMempoolTransactions,
  testPartialTransactions,
  testTransaction,
  tokenApiResponse,
} from '../testData';

/**
 * mock `getNodeInfo` of ergo node client
 */
export const mockGetNodeInfo = () =>
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    getNodeInfo: async () => ({
      fullHeight: testHeight,
    }),
  } as any);

/**
 * mock `getTxById` of ergo node client
 */
export const mockGetTxById = () =>
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    getTxById: async () => testTransaction,
  } as any);

/**
 * mock `getAddressBalanceTotal` of ergo node client
 * @param balance
 */
export const mockGetAddressBalanceTotal = (
  balance: typeof testAddressBalance | null = testAddressBalance
) =>
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    getAddressBalanceTotal: async () => ({
      confirmed: balance,
    }),
  } as any);

/**
 * mock `getBlockTransactionsById` of ergo node client
 * @param txs
 */
export const mockGetBlockTransactionsById = (
  txs: typeof testPartialTransactions | null = testPartialTransactions
) =>
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    getBlockTransactionsById: async () => ({
      transactions: txs,
    }),
  } as any);

/**
 * mock `getBlockHeaderById` of ergo node client
 * @param txs
 */
export const mockGetBlockHeaderById = () =>
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    getBlockHeaderById: async () => testBlockHeaders,
  } as any);

/**
 * mock `getTxById` and `getBlockTransactionsById` of ergo node client together
 * @param txs
 */
export const mockGetTxByIdAndGetBlockTransactionsById = () =>
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    getTxById: async () => testTransaction,
    getBlockTransactionsById: async () => ({
      transactions: [testTransaction],
    }),
  } as any);

/**
 * mock `sendTransactionAsBytes` of ergo node client
 */
export const mockSendTransactionAsBytes = () => {
  const sendTransactionAsBytesSpy = vi.fn();
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    sendTransactionAsBytes: sendTransactionAsBytesSpy.mockResolvedValue(
      testTransaction.id
    ),
  } as any);
  return sendTransactionAsBytesSpy;
};

/**
 * mock `getUnconfirmedTransactions` of ergo node client
 */
export const mockGetUnconfirmedTransactions = () =>
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    getUnconfirmedTransactions: async ({
      offset,
      limit,
    }: {
      offset: number;
      limit: number;
    }) => testMempoolTransactions.slice(Number(offset), Number(offset + limit)),
  } as any);

/**
 * mock `getBoxesByAddressUnspent` of ergo node client
 */
export const mockGetBoxesByAddressUnspent = () =>
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    getBoxesByAddressUnspent: async (
      address: string,
      { offset, limit }: { offset: number; limit: number }
    ) => testAddressBoxes.slice(Number(offset), Number(offset + limit)),
  } as any);

/**
 * mock `getLastHeaders` of ergo node client
 */
export const mockGetLastHeaders = () =>
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    getLastHeaders: async () => testLastBlockHeaders,
  } as any);

/**
 * mock `getIndexedBoxById` of ergo node client
 */
export const mockIndexedBoxById = () =>
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    getIndexedBoxById: async () => testAddressBoxes[0],
  } as any);

/**
 * mock an api to throw an error
 * @param apiName the name of the api in the category
 * @param objectToThrow
 */
export const mockApiToThrow = (
  apiName: string,
  objectToThrow: { [p: string]: any }
) =>
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    [apiName]: vi.fn().mockRejectedValueOnce(objectToThrow),
  } as any);

/**
 * mock `getTokenById` of ergo node client
 */
export const mockGetTokenById = () =>
  vi.mocked(ergoNodeClientFactory).mockReturnValueOnce({
    getTokenById: async () => tokenApiResponse,
  } as any);
