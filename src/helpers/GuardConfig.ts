import ExplorerApi from "../chains/ergo/network/ExplorerApi";
import { rosenConfig } from "./RosenConfig";
import ErgoUtils from "../chains/ergo/helpers/ErgoUtils";
import { Buffer } from "buffer";

class GuardConfig {
    publicKeys: Array<string>
    requiredSign: number
    guardsLen: number

    /**
     * Sets the guard public keys and required sign config
     */
    setConfig = async() => {
        const guardBox = (await ExplorerApi.getBoxesByTokenId(rosenConfig.guardNFT)).items[0]
        if(guardBox) {
            try {
                const r4 = ErgoUtils.decodeCollColl(guardBox.additionalRegisters['R4'].serializedValue)
                const r5 = ErgoUtils.decodeCollInt(guardBox.additionalRegisters['R5'].serializedValue)
                this.publicKeys = r4.map(pk => Buffer.from(pk).toString('hex'))
                this.guardsLen = r4.length
                this.requiredSign = r5[0]
                return
            } catch {
                console.log("Guard box format is incorrect, check the guard NFT to be correct")
                throw new Error("Guard box format is incorrect")
            }
        }
        console.log("Guard Sign box is not available, check the guard NFT to be correct")
        throw new Error("Guard Sign box is not available")
    }
}

const guardConfig = new GuardConfig()
export { guardConfig }
