import { anything, spy, verify, when } from "ts-mockito";
import KoiosApi from "../../../../src/chains/cardano/network/KoiosApi";
import { MetaData, TxMetaData, Utxo } from "../../../../src/chains/cardano/models/Interfaces";


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
const mockKoiosGetTxConfirmationCalledOnce = (txId: string, confirmation: number): void => {
    when(mockedKoios.getTxConfirmation(txId)).thenResolve(confirmation)
}

/**
 * mocks KoiosApi getTxUtxos method to return the required tx information
 * @param txId
 * @param tx
 */
const mockKoiosGetTxUtxos = (txId: string, tx: { inputs: Array<Utxo>, outputs: Array<Utxo> }) => {
    when(mockedKoios.getTxUtxos(anything())).thenResolve([{
        utxosOutput: tx.outputs,
        utxosInput: tx.inputs,
    }])
}

const mockKoiosGetTxMetadata = (txId: string, txMetaData: TxMetaData) => {
    when(mockedKoios.getTxMetaData(anything())).thenResolve([txMetaData])
}

export {
    mockGetAddressBoxes,
    mockKoiosGetTxConfirmationCalledOnce,
    mockKoiosGetTxUtxos,
    mockKoiosGetTxMetadata
}
