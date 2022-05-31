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

interface ErgoBlockHeader {
    extensionId: string,
    difficulty: string,
    votes: string,
    timestamp: number,
    size: number,
    stateRoot: string,
    height: number,
    nBits: number,
    version: number,
    id: string,
    adProofsRoot: string,
    transactionsRoot: string,
    extensionHash: string,
    powSolutions: {
        pk: string,
        w: string,
        n: string,
        d: number
    },
    adProofsId: string,
    transactionsId: string,
    parentId: string
}

export {
    Asset,
    Box,
    Boxes,
    CoveringErgoBoxes,
    InBoxesInfo,
    AssetMap,
    ErgoBlockHeader
}
