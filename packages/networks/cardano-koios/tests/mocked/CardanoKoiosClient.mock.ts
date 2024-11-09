import cardanoKoiosClientFactory from '@rosen-clients/cardano-koios';
import * as testData from '../testData';
import {
  AddressInfoItemUtxoSetItem,
  CredentialUtxosBody,
  TxInfoItem,
  TxUtxos,
} from '@rosen-clients/cardano-koios';

/**
 * mock `getTip` of cardano koios client
 */
export const mockGetTip = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    getTip: async () => [
      {
        block_no: testData.blockHeight,
        abs_slot: testData.absoluteSlot,
      },
    ],
  } as any);
};

/**
 * mock `postTxStatus` of cardano koios client
 */
export const mockPostTxStatus = (txId: string, confirmation: bigint | null) => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postTxStatus: async () => [
      {
        tx_has: txId,
        num_confirmations: confirmation,
      },
    ],
  } as any);
};

/**
 * mock `postAddressInfo` and `postAddressAssets` of cardano koios client
 */
export const mockAddressAssets = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postAddressInfo: async () => [
      {
        balance: testData.addressBalance,
      },
    ],
    postAddressAssets: async () => testData.addressAssets,
  } as any);
};

/**
 * mock `postAddressInfo` and `postAddressAssets` of cardano koios client
 * so that address balance is 0 and contains no assets
 */
export const mockEmptyAddressAssets = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postAddressInfo: async () => [
      {
        balance: '0',
      },
    ],
    postAddressAssets: async () => [],
  } as any);
};

/**
 * mock `postAddressInfo` and `postAddressAssets` of cardano koios client
 * so that address has no info and contains no assets
 */
export const mockNoHistoryAddressAssets = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postAddressInfo: async () => [],
    postAddressAssets: async () => [],
  } as any);
};

/**
 * mock `postBlockTxs` of cardano koios client
 */
export const mockPostBlockTxs = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postBlockTxs: async () => testData.txHashes,
  } as any);
};

/**
 * mock `postBlockInfo` of cardano koios client
 */
export const mockPostBlockInfo = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postBlockInfo: async () => [
      {
        hash: testData.blockId,
        block_height: testData.oldBlockheight,
        parent_hash: testData.parentBlockId,
      },
    ],
  } as any);
};

/**
 * mock `postTxInfo` of cardano koios client
 */
export const mockPostTxInfo = (response: TxInfoItem) => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postTxInfo: async () => [response],
  } as any);
};

/**
 * mock `postSubmittx` of cardano koios client
 */
export const mockPostSubmittx = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postSubmittx: async () => testData.txId,
  } as any);
};

/**
 * mock `postAddressInfo` of cardano koios client
 */
export const mockPostAddressInfo = (utxoSet: AddressInfoItemUtxoSetItem[]) => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postAddressInfo: async () => [
      {
        utxo_set: utxoSet,
      },
    ],
  } as any);
};

/**
 * mock only inputs and outputs of `postTxInfo` api and `postCredentialUtxos` of cardano koios client
 */
export const mockUtxoValidation = (
  txUtxos: TxUtxos | undefined,
  credentialUtxos: CredentialUtxosBody
) => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postTxInfo: async () => (txUtxos ? [txUtxos] : []),
    postCredentialUtxos: async () => credentialUtxos,
  } as any);
};

/**
 * mock `postAddressInfo` of cardano koios client
 * so that address has no utxo
 */
export const mockPostAddressInfoNoHistory = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postAddressInfo: async () => [],
  } as any);
};

/**
 * mock only inputs and outputs of cardano koios client `postTxInfo` api
 */
export const mockPostTxUtxos = (utxos: TxUtxos) => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postTxInfo: async () => [utxos],
  } as any);
};

/**
 * mock `getEpochParams` of cardano koios client
 */
export const mockGetEpochParams = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    getEpochParams: async () => [testData.epochParams],
  } as any);
};

/**
 * mock `postAssetInfo` of cardano koios client
 */
export const mockPostAssetInfo = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    postAssetInfo: async () => [testData.assetInfo],
  } as any);
};
