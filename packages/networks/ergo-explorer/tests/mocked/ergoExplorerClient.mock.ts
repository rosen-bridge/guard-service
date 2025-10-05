import { vi } from 'vitest';

import ergoExplorerClientFactory from '@rosen-clients/ergo-explorer';

import {
  testAddressBalance,
  testAddressBoxes,
  testBlockHeader,
  testBlockHeaders,
  testBox,
  testHeight,
  testMempoolTransactions,
  testPartialTransactions,
  testTokenIdBoxes,
  testTransaction,
  tokenApiResponse,
} from '../testData';

/**
 * mock `getApiV1Networkstate` of ergo explorer client
 */
export const mockGetApiV1Networkstate = () =>
  vi.mocked(ergoExplorerClientFactory).mockReturnValueOnce({
    v1: {
      getApiV1Networkstate: async () => ({
        height: testHeight,
      }),
    },
  } as any);

/**
 * mock `getApiV1TransactionsP1` of ergo explorer client
 */
export const mockGetApiV1TransactionsP1 = (
  tx: typeof testTransaction = testTransaction
) =>
  vi.mocked(ergoExplorerClientFactory).mockReturnValueOnce({
    v1: {
      getApiV1TransactionsP1: async () => tx,
    },
  } as any);

/**
 * mock `getApiV1AddressesP1BalanceConfirmed` of ergo explorer client
 * @param balance
 */
export const mockGetApiV1AddressesP1BalanceConfirmed = (
  balance: Partial<typeof testAddressBalance> | null = testAddressBalance
) =>
  vi.mocked(ergoExplorerClientFactory).mockReturnValueOnce({
    v1: {
      getApiV1AddressesP1BalanceConfirmed: async () => balance,
    },
  } as any);

/**
 * mock `getApiV1BlocksP1` of ergo explorer client
 * @param txs
 */
export const mockGetApiV1BlocksP1 = (
  txs: typeof testPartialTransactions | null = testPartialTransactions
) =>
  vi.mocked(ergoExplorerClientFactory).mockReturnValueOnce({
    v1: {
      getApiV1BlocksP1: async () => ({
        block: {
          ...(txs && {
            blockTransactions: txs,
          }),
          header: testBlockHeader,
        },
      }),
    },
  } as any);

/**
 * mock `postApiV0TransactionsSend` of ergo explorer client
 */
export const mockPostApiV0TransactionsSend = () => {
  const postApiV0TransactionsSendSpy = vi.fn();
  vi.mocked(ergoExplorerClientFactory).mockReturnValueOnce({
    v0: {
      postApiV0TransactionsSend: postApiV0TransactionsSendSpy.mockResolvedValue(
        testTransaction.id
      ),
    },
  } as any);
  return postApiV0TransactionsSendSpy;
};

/**
 * mock `getApiV0TransactionsUnconfirmed` of ergo explorer client
 */
export const mockGetApiV0TransactionsUnconfirmed = () =>
  vi.mocked(ergoExplorerClientFactory).mockReturnValueOnce({
    v0: {
      getApiV0TransactionsUnconfirmed: async ({
        offset,
        limit,
      }: {
        offset: bigint;
        limit: bigint;
      }) => ({
        items: testMempoolTransactions.slice(
          Number(offset),
          Number(offset + limit)
        ),
        total: testMempoolTransactions.length,
      }),
    },
  } as any);

/**
 * mock `getApiV1BoxesUnspentByaddressP1` of ergo explorer client
 */
export const mockGetApiV1BoxesUnspentByaddressP1 = (
  shouldIncludeItemsField = true
) =>
  vi.mocked(ergoExplorerClientFactory).mockReturnValueOnce({
    v1: {
      getApiV1BoxesUnspentByaddressP1: async (
        address: string,
        {
          offset,
          limit,
        }: {
          offset: bigint;
          limit: bigint;
        }
      ) => ({
        ...(shouldIncludeItemsField && {
          items: testAddressBoxes.slice(Number(offset), Number(offset + limit)),
        }),
        total: testAddressBoxes.length,
      }),
    },
  } as any);

/**
 * mock `getApiV1BoxesUnspentBytokenidP1` of ergo explorer client
 */
export const mockGetApiV1BoxesUnspentBytokenidP1 = (
  shouldIncludeItemsField = true
) =>
  vi.mocked(ergoExplorerClientFactory).mockReturnValueOnce({
    v1: {
      getApiV1BoxesUnspentBytokenidP1: async (
        address: string,
        {
          offset,
          limit,
        }: {
          offset: bigint;
          limit: bigint;
        }
      ) => ({
        ...(shouldIncludeItemsField && {
          items: testTokenIdBoxes.slice(Number(offset), Number(offset + limit)),
        }),
        total: testTokenIdBoxes.length,
      }),
    },
  } as any);

/**
 * mock `getApiV1BlocksHeaders` of ergo explorer client
 */
export const mockGetApiV1BlocksHeaders = (shouldIncludeItemsField = true) =>
  vi.mocked(ergoExplorerClientFactory).mockReturnValueOnce({
    v1: {
      getApiV1BlocksHeaders: async ({
        offset,
        limit,
      }: {
        offset: bigint;
        limit: bigint;
      }) => ({
        ...(shouldIncludeItemsField && {
          items: testBlockHeaders.slice(Number(offset), Number(offset + limit)),
        }),
        total: testBlockHeaders.length,
      }),
    },
  } as any);

/**
 * mock `getApiV1BoxesP1` of ergo explorer client
 */
export const mockGetApiV1BoxesP1 = () =>
  vi.mocked(ergoExplorerClientFactory).mockReturnValueOnce({
    v1: {
      getApiV1BoxesP1: async () => testBox,
    },
  } as any);

/**
 * mock `getApiV1TokensP1` of ergo explorer client
 */
export const mockGetApiV1TokensP1 = () =>
  vi.mocked(ergoExplorerClientFactory).mockReturnValueOnce({
    v1: {
      getApiV1TokensP1: async () => tokenApiResponse,
    },
  } as any);

type ErgoExplorerClientSchema = ReturnType<typeof ergoExplorerClientFactory>;
/**
 * mock an api in a version to throw an error
 * @param version ergo explorer api version
 * @param apiName the name of the api in the version
 * @param objectToThrow
 */
export const mockApiToThrow = <Version extends keyof ErgoExplorerClientSchema>(
  version: Version,
  apiName: keyof ErgoExplorerClientSchema[Version],
  objectToThrow: {
    [key: string]: any;
  }
) =>
  vi.mocked(ergoExplorerClientFactory).mockReturnValueOnce({
    [version]: {
      [apiName]: vi.fn().mockRejectedValueOnce(objectToThrow),
    },
  } as any);
