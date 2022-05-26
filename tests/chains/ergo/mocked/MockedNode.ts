import { mock, spy, when } from "ts-mockito";
import NodeApi from "../../../../src/chains/ergo/network/NodeApi";
import { BlockHeader, BlockHeaders, ErgoStateContext, PreHeader } from "ergo-lib-wasm-nodejs";
import TestData from "../../cardano/testUtils/TestData";

// test configs
const testBlockchainHeight: number = 100000
const testBlockHeaders = BlockHeaders.from_json(TestData.mockedBlockHeaderJson)
const testErgoStateContext: ErgoStateContext = new ErgoStateContext(PreHeader.from_block_header(testBlockHeaders.get(0)), testBlockHeaders)

const mockedNode = spy(NodeApi)
when(mockedNode.getHeight()).thenReturn(new Promise<number>((resolve, reject) => {
    resolve(testBlockchainHeight)
}))
when(mockedNode.getErgoStateContext()).thenReturn(new Promise<ErgoStateContext>((resolve, reject) => {
    resolve(testErgoStateContext)
}))
