import { spy, when } from "ts-mockito";
import KoiosApi from "../../../../src/chains/cardano/network/KoiosApi";
import { Utxo } from "../../../../src/chains/cardano/models/Models";

// test configs
const testBankAddress: string = "addr_test1qrm4haxxgl55kqzhpp3sda8h979gxd4cast340v0eh0p4qzp3vkcrhjqavv9uzsvq86mglwnwe8xp87q3rv8ve54kasqlf7xgl"

const mockedKoios = spy(KoiosApi)

/**
 * mocks KoiosApi getAddressBoxes method to return returnBoxes when called for address
 * @param address
 * @param returnBoxes
 */
const mockGetAddressBoxes = (address: string, returnBoxes: Promise<Utxo[]>): void => {
    when(mockedKoios.getAddressBoxes(address)).thenReturn(returnBoxes)
}
export default mockGetAddressBoxes
