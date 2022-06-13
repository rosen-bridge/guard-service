import { spy, when } from "ts-mockito";
import TssSigner from "../../src/guard/TssSigner";

const mockedTss = spy(TssSigner)

/**
 * mocks TssSigner mockSignTxHash method to return signedHash when called for txHash
 * @param txHash
 * @param signedHash
 */
const mockSignTxHash = (txHash: Uint8Array, signedHash: Uint8Array): void => {
    when(mockedTss.signTxHash(txHash)).thenResolve(signedHash)
}

export default mockSignTxHash
