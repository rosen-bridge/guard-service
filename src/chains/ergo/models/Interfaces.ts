import { Constant, ErgoBox, ErgoBoxes } from "ergo-lib-wasm-nodejs";

interface Asset {
    tokenId: string,
    amount: bigint
}

interface Register {
    registerId: number,
    value: Constant
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

interface ErgoTransactionJsonModel {
    network: string
    txId: string
    eventId: string
    txBytes: string
    inputBoxes: string[]
}

interface ExplorerRegister {
    serializedValue: string,
    sigmaType: string,
    renderedValue: string
}

interface ExplorerToken {
    tokenId: string;
    index: number;
    amount: number;
    name: string;
    decimals: number;
    type: string;
}

interface ExplorerInputBox {
    boxId: string;
    value: number;
    outputTransactionId: string;
    outputBlockId: string,
    outputIndex: number;
    creationHeight: number;
    ergoTree: string;
    address: string;
    assets: ExplorerToken[];
    additionalRegisters: {[key: string]: ExplorerRegister};
    spentTransactionId: string;
}

interface ExplorerOutputBox {
    boxId: string;
    transactionId: string;
    blockId: string,
    value: number;
    index: number;
    creationHeight: number;
    ergoTree: string;
    address: string;
    assets: ExplorerToken[];
    additionalRegisters: {[key: string]: ExplorerRegister};
    spentTransactionId: string;
}

interface ExplorerTransaction {
    id: string,
    creationTimestamp: number,
    numConfirmations: number,
    inputs: ExplorerInputBox[],
    outputs: ExplorerOutputBox[],
}

export {
    Asset,
    Register,
    Box,
    Boxes,
    CoveringErgoBoxes,
    InBoxesInfo,
    AssetMap,
    ErgoBlockHeader,
    ErgoTransactionJsonModel,
    ExplorerOutputBox,
    ExplorerTransaction
}
