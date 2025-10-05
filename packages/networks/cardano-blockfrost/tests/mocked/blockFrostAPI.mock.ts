import { vi } from 'vitest';
import {
  BlockFrostAPI,
  BlockfrostServerError,
} from '@blockfrost/blockfrost-js';
import * as testData from '../testData';
import { components } from '@blockfrost/openapi';
import { PAGE_ITEM_COUNT } from '../../lib';

const serverNotFoundError = new BlockfrostServerError({
  status_code: 404,
  message: 'The requested component has not been found.',
  error: 'Not Found',
  url: 'requested_url',
});

/**
 * mocks `blocksLatest` function of the client to return value
 * @param client
 */
export const mockBlockLatest = (client: BlockFrostAPI) => {
  vi.spyOn(client, 'blocksLatest').mockResolvedValue(testData.blockInfo);
};

/**
 * mocks `txs` function of the client to return value
 * @param client
 */
export const mockTxs = (
  client: BlockFrostAPI,
  txInfo: components['schemas']['tx_content']
) => {
  vi.spyOn(client, 'txs').mockResolvedValue(txInfo);
};

/**
 * mocks `txs` function of the client to throw error
 * @param client
 */
export const mockTxsNotFound = (client: BlockFrostAPI) => {
  vi.spyOn(client, 'txs').mockRejectedValue(serverNotFoundError);
};

/**
 * mocks `addresses` function of the client to return value
 * @param client
 */
export const mockAddresses = (
  client: BlockFrostAPI,
  result: components['schemas']['address_content']
) => {
  vi.spyOn(client, 'addresses').mockResolvedValue(result);
};

/**
 * mocks `addresses` function of the client to throw error
 * @param client
 */
export const mockAddressesNotFound = (client: BlockFrostAPI) => {
  vi.spyOn(client, 'addresses').mockRejectedValue(serverNotFoundError);
};

/**
 * mocks `blocksTxsAll` function of the client to return value
 * @param client
 */
export const mockBlocksTxsAll = (client: BlockFrostAPI) => {
  vi.spyOn(client, 'blocksTxsAll').mockResolvedValue(testData.txHashes);
};

/**
 * mocks `blocks` function of the client to return value
 * @param client
 */
export const mockBlocks = (client: BlockFrostAPI) => {
  vi.spyOn(client, 'blocks').mockResolvedValue(testData.blockInfo);
};

/**
 * mocks `txsUtxos` function of the client to return value
 * @param client
 */
export const mockTxsUtxos = (
  client: BlockFrostAPI,
  txUtxos: components['schemas']['tx_content_utxo']
) => {
  vi.spyOn(client, 'txsUtxos').mockResolvedValue(txUtxos);
};

/**
 * mocks `txsUtxos` function of the client to throw error
 * @param client
 */
export const mockTxsUtxosNotFound = (client: BlockFrostAPI) => {
  vi.spyOn(client, 'txsUtxos').mockRejectedValue(serverNotFoundError);
};

/**
 * mocks `txsMetadata` function of the client to return value
 * @param client
 */
export const mockTxsMetadata = (
  client: BlockFrostAPI,
  txMetadata: components['schemas']['tx_content_metadata']
) => {
  vi.spyOn(client, 'txsMetadata').mockResolvedValue(txMetadata);
};

/**
 * mocks `addressesUtxos` function of the client to return value
 * @param client
 */
export const mockAddressesUtxos = (
  client: BlockFrostAPI,
  result: components['schemas']['address_utxo_content']
) => {
  const addressUtxoSpy = vi.spyOn(client, 'addressesUtxos');
  for (let i = 0; i < result.length; i += PAGE_ITEM_COUNT)
    addressUtxoSpy.mockResolvedValueOnce(result.slice(i, i + PAGE_ITEM_COUNT));
  addressUtxoSpy.mockResolvedValue([]);
};

/**
 * mocks `addressesUtxos` function of the client to throw error
 * @param client
 */
export const mockAddressesUtxosNotFound = (client: BlockFrostAPI) => {
  vi.spyOn(client, 'addressesUtxos').mockRejectedValue(serverNotFoundError);
};

/**
 * mocks `addressesUtxosAll` function of the client to return value
 * @param client
 */
export const mockAddressesUtxosAll = (
  client: BlockFrostAPI,
  result: components['schemas']['address_utxo_content']
) => {
  vi.spyOn(client, 'addressesUtxosAll').mockResolvedValue(result);
};

/**
 * mocks `epochsLatestParameters` function of the client to return value
 * @param client
 */
export const mockEpochsLatestParameters = (client: BlockFrostAPI) => {
  vi.spyOn(client, 'epochsLatestParameters').mockResolvedValue(
    testData.epochParams
  );
};

/**
 * mocks `epochsLatestParameters` function of the client to return value
 * @param client
 */
export const mockAssetsById = (client: BlockFrostAPI) => {
  vi.spyOn(client, 'assetsById').mockResolvedValue(testData.assetByIdResult);
};
