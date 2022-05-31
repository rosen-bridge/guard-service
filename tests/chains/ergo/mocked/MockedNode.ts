import { spy, when } from "ts-mockito";
import NodeApi from "../../../../src/chains/ergo/network/NodeApi";
import { ErgoStateContext } from "ergo-lib-wasm-nodejs";
import TestData from "../testUtils/TestData";

// test configs
const testBlockchainHeight = 100000
const testErgoStateContext: ErgoStateContext = TestData.mockedErgoStateContext

const mockedNode = spy(NodeApi)
when(mockedNode.getHeight()).thenResolve(testBlockchainHeight)
when(mockedNode.getErgoStateContext()).thenResolve(testErgoStateContext)
