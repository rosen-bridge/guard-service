import axios from "axios";
import { ErgoBox } from "ergo-lib-wasm-nodejs";
import { Asset, AssetMap, Box, Boxes, CoveringErgoBoxes } from "../models/Interfaces";
import { JsonBI } from "../../../network/NetworkModels";
import ErgoConfigs from "../helpers/ErgoConfigs";


class ExplorerApi {

    static explorerApi = axios.create({
        baseURL: ErgoConfigs.explorer.url,
        timeout: ErgoConfigs.explorer.timeout
    })

    /**
     * gets boxes of an ergoTree
     * @param ergoTree the address ergoTree
     * @param offset
     * @param limit
     */
    static getBoxesForErgoTree = async (ergoTree: string, offset = 0, limit = 100): Promise<Boxes> => {
        return this.explorerApi.get(`/v1/boxes/unspent/byErgoTree/${ergoTree}?offset=${offset}&limit=${limit}`).then(res => res.data);
    }

    /**
     * gets enough boxes of an ergoTree to satisfy needed amount of erg and tokens
     * @param tree the address ergoTree
     * @param ergAmount needed amount of erg
     * @param tokens needed tokens
     * @param filter condition to filter boxes
     */
    static getCoveringErgAndTokenForErgoTree = async (
        tree: string,
        ergAmount: bigint,
        tokens: AssetMap = {},
        filter: (box: Box) => boolean = () => true
    ): Promise<CoveringErgoBoxes> => {

        const remaining = () => {
            const isAnyTokenRemain = Object.entries(tokens).map(([, amount]) => amount > 0).reduce((a, b) => a || b, false)
            return isAnyTokenRemain || ergAmount > 0;
        }

        const res: Box[] = []
        const boxesItems = await this.getBoxesForErgoTree(tree, 0, 1)
        const total = boxesItems.total
        let offset = 0

        while (offset < total && remaining()) {
            const boxes = await this.getBoxesForErgoTree(tree, offset, 10)
            for (const box of boxes.items) {
                if (filter(box)) {
                    res.push(box)
                    ergAmount -= box.value;
                    box.assets.map((asset: Asset) => {
                        if (Object.prototype.hasOwnProperty.call(tokens, asset.tokenId)) {
                            tokens[asset.tokenId] -= asset.amount
                        }
                    })
                    if (!remaining()) break
                }
            }
            offset += 10
        }

        return {
            boxes: res.map(box => ErgoBox.from_json(JsonBI.stringify(box))),
            covered: !remaining()
        }
    }

}

export default ExplorerApi
