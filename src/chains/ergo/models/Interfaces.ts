import { ErgoBox, ErgoBoxes } from "ergo-lib-wasm-nodejs";

interface Asset {
    tokenId: string,
    amount: bigint
}

interface Box {
    boxId: string,
    ergoTree: string,
    address: string,
    value: bigint
    assets: Asset[]
}

interface Boxes {
    items: Box[],
    total: number
}

interface CoveringErgoBoxes {
    covered: boolean,
    boxes: ErgoBox[]
}

interface InBoxesInfo {
    inBoxes: ErgoBoxes,
    ergs: bigint,
    tokens: AssetMap
}

interface AssetMap {
    [id: string]: bigint
}

export {
    Asset,
    Box,
    Boxes,
    CoveringErgoBoxes,
    InBoxesInfo,
    AssetMap
}
