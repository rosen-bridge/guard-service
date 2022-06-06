import { spy, when } from "ts-mockito";
import KoiosApi from "../../../../src/chains/cardano/network/KoiosApi";
import { Utxo } from "../../../../src/chains/cardano/models/Interfaces";


const mockedKoios = spy(KoiosApi)

/**
 * mocks KoiosApi getAddressBoxes method to return returnBoxes when called for address
 * @param address
 * @param returnBoxes
 */
const mockGetAddressBoxes = (address: string, returnBoxes: Utxo[]): void => {
    when(mockedKoios.getAddressBoxes(address)).thenResolve(returnBoxes)
}
export default mockGetAddressBoxes
