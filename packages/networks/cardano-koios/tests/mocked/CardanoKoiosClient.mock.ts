import cardanoKoiosClientFactory, {
  TxCborItem,
  UtxoInfos,
} from '@rosen-clients/cardano-koios';
import * as testData from '../testData';
import { AddressInfoItemUtxoSetItem } from '@rosen-clients/cardano-koios';

/**
 * mock `tip` of cardano koios client
 */
export const mockTip = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    tip: async () => [
      {
        block_no: testData.blockHeight,
        abs_slot: testData.absoluteSlot,
      },
    ],
  } as any);
};

/**
 * mock `txStatus` of cardano koios client
 */
export const mockTxStatus = (txId: string, confirmation: bigint | null) => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    txStatus: async () => [
      {
        tx_has: txId,
        num_confirmations: confirmation,
      },
    ],
  } as any);
};

/**
 * mock `addressInfo` and `addressAssets` of cardano koios client
 */
export const mockAddressAssets = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    addressInfo: async () => [
      {
        balance: testData.addressBalance,
      },
    ],
    addressAssets: async () => testData.addressAssets,
  } as any);
};

/**
 * mock `addressInfo` and `addressAssets` of cardano koios client
 * so that address balance is 0 and contains no assets
 */
export const mockEmptyAddressAssets = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    addressInfo: async () => [
      {
        balance: '0',
      },
    ],
    addressAssets: async () => [],
  } as any);
};

/**
 * mock `addressInfo` and `addressAssets` of cardano koios client
 * so that address has no info and contains no assets
 */
export const mockNoHistoryAddressAssets = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    addressInfo: async () => [],
    addressAssets: async () => [],
  } as any);
};

/**
 * mock `blockTxs` of cardano koios client
 */
export const mockBlockTxs = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    blockTxs: async () => testData.txHashes,
  } as any);
};

/**
 * mock `blockInfo` of cardano koios client
 */
export const mockBlockInfo = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    blockInfo: async () => [
      {
        hash: testData.blockId,
        block_height: testData.oldBlockheight,
        parent_hash: testData.parentBlockId,
      },
    ],
  } as any);
};

/**
 * mock `txCbor` of cardano koios client
 */
export const mockTxCbor = (response: TxCborItem) => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    txCbor: async () => [response],
  } as any);
};

/**
 * mock `submittx` of cardano koios client
 */
export const mockSubmittx = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    submittx: async () => testData.txId,
  } as any);
};

/**
 * mock `addressInfo` of cardano koios client
 */
export const mockAddressInfo = (utxoSet: AddressInfoItemUtxoSetItem[]) => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    addressInfo: async () => [
      {
        utxo_set: utxoSet,
      },
    ],
  } as any);
};

/**
 * mock `txCbor` and `credentialUtxos` of cardano koios client
 */
export const mockUtxoValidation = (
  txCbor: TxCborItem | undefined,
  credentialUtxos: UtxoInfos
) => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    txCbor: async () => (txCbor ? [txCbor] : []),
    credentialUtxos: async () => credentialUtxos,
  } as any);
};

/**
 * mock `addressInfo` of cardano koios client
 * so that address has no utxo
 */
export const mockAddressInfoNoHistory = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    addressInfo: async () => [],
  } as any);
};

/**
 * mock `epochParams` of cardano koios client
 */
export const mockEpochParams = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    epochParams: async () => [testData.epochParams],
  } as any);
};

/**
 * mock `assetInfo` of cardano koios client
 */
export const mockAssetInfo = () => {
  vi.mocked(cardanoKoiosClientFactory).mockReturnValueOnce({
    assetInfo: async () => [testData.assetInfo],
  } as any);
};
