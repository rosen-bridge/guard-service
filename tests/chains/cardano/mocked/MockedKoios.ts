import { anything, deepEqual, resetCalls, spy, verify, when } from 'ts-mockito';
import KoiosApi from '../../../../src/chains/cardano/network/KoiosApi';
import {
  AddressInfo,
  AddressAssets,
  KoiosTransaction,
  Utxo,
} from '../../../../src/chains/cardano/models/Interfaces';

const mockedKoios = spy(KoiosApi);

/**
 * mocks KoiosApi getAddressBoxes method to return returnBoxes when called for address
 * @param address
 * @param returnBoxes
 */
const mockGetAddressBoxes = (address: string, returnBoxes: Utxo[]): void => {
  when(mockedKoios.getAddressBoxes(address)).thenResolve(returnBoxes);
};

/**
 * mocks KoiosApi getTxConfirmation method to return confirmation when called for txId
 * @param txId
 * @param confirmation
 */
const mockKoiosGetTxConfirmation = (
  txId: string,
  confirmation: number | null
): void => {
  when(mockedKoios.getTxConfirmation(txId)).thenResolve(confirmation);
};

/**
 * mocks KoiosApi getTxInformation method to return transactionInfo when called for txId
 * @param txId
 * @param tx
 */
const mockKoiosGetTxInfo = (txId: string, tx: KoiosTransaction) => {
  when(mockedKoios.getTxInformation(deepEqual([txId]))).thenResolve([tx]);
};

/**
 * mocks KoiosApi getAddressInfo method to return result when called for address
 * @param address
 * @param result
 */
const mockKoiosGetAddressInfo = (
  address: string,
  result: AddressInfo
): void => {
  when(mockedKoios.getAddressInfo(address)).thenResolve(result);
};

/**
 * verifies KoiosApi getAddressInfo method didn't get called
 */
const verifyKoiosGetAddressInfoDidntGetCalled = (): void => {
  verify(mockedKoios.getAddressInfo(anything())).never();
};

/**
 * mocks KoiosApi getAddressAssets method to return result when called for address
 * @param address
 * @param result
 */
const mockKoiosGetAddressAssets = (
  address: string,
  result: AddressAssets
): void => {
  when(mockedKoios.getAddressAssets(address)).thenResolve(result);
};

/**
 * reset call counts for mockedKoios
 */
const resetKoiosApiCalls = (): void => {
  resetCalls(mockedKoios);
};

export {
  mockGetAddressBoxes,
  mockKoiosGetTxInfo,
  mockKoiosGetTxConfirmation,
  mockKoiosGetAddressInfo,
  mockKoiosGetAddressAssets,
  resetKoiosApiCalls,
  verifyKoiosGetAddressInfoDidntGetCalled,
};
