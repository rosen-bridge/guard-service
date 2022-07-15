import {randomBytes} from "crypto";
import Codecs from "../../src/helpers/Codecs";
import Configs from "../../src/helpers/Configs";
import TestConfigs from "./TestConfigs";

class TestUtils {

    /**
     * generates 32 bytes random data used for the identifiers such as txId
     */
    static generateRandomId = (): string => randomBytes(32).toString('hex')

    /**
     * signs payment transaction metadata with arbitrary guard
     */
    static signTxMetaData = (txBytes: Uint8Array, guardId: number): string => {
        const idBuffer = Codecs.numberToByte(guardId)
        const data = Buffer.concat([txBytes, idBuffer]).toString("hex")
        const secretKey = TestConfigs.guardsSecret.find(guard => guard.guardId == guardId)?.secretKey
        if (secretKey === undefined) throw Error(`no secret found for guardId: ${guardId}`)

        const signature  = Codecs.sign(data, Buffer.from(secretKey!, "hex"))
        return Buffer.from(signature).toString("hex")
    }

}

export default TestUtils
