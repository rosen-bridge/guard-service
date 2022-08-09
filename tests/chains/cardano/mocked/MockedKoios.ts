import { deepEqual, spy, when } from "ts-mockito";
import KoiosApi from "../../../../src/chains/cardano/network/KoiosApi";
import { KoiosTransaction, Utxo } from "../../../../src/chains/cardano/models/Interfaces";


const mockedKoios = spy(KoiosApi)

/**
 * mocks KoiosApi getAddressBoxes method to return returnBoxes when called for address
 * @param address
 * @param returnBoxes
 */
const mockGetAddressBoxes = (address: string, returnBoxes: Utxo[]): void => {
    when(mockedKoios.getAddressBoxes(address)).thenResolve(returnBoxes)
}

/**
 * mocks KoiosApi getTxConfirmation method to return confirmation when called for txId
 * @param txId
 * @param confirmation
 */
const mockKoiosGetTxConfirmation = (txId: string, confirmation: number | null): void => {
    when(mockedKoios.getTxConfirmation(txId)).thenResolve(confirmation)
}

const mockKoiosGetTxInfo = (txId: string, tx: KoiosTransaction) => {
    when(mockedKoios.getTxInformation(deepEqual([txId]))).thenResolve([tx])
}

export {
    mockGetAddressBoxes,
    mockKoiosGetTxInfo,
    mockKoiosGetTxConfirmation
}
