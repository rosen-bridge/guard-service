import { reset, spy, when } from 'ts-mockito';
import NodeApi from '../../../../src/chains/ergo/network/NodeApi';
import { ErgoStateContext } from 'ergo-lib-wasm-nodejs';
import TestData from '../testUtils/TestData';
import TestConfigs from '../../../testUtils/TestConfigs';

// test configs
const testBlockchainHeight = TestConfigs.ergo.blockchainHeight;
const testErgoStateContext: ErgoStateContext = TestData.mockedErgoStateContext;

let mockedNode = spy(NodeApi);
when(mockedNode.getHeight()).thenResolve(testBlockchainHeight);
when(mockedNode.getErgoStateContext()).thenResolve(testErgoStateContext);

/**
 * mocks NodeApi mockGetHeight method to return height when called
 * @param height
 */
const mockGetHeight = (height: number): void => {
  when(mockedNode.getHeight()).thenResolve(height);
};

/**
 * resets mocked methods of NodeApi
 */
const resetMockedNodeApi = (): void => {
  reset(mockedNode);
  mockedNode = spy(NodeApi);
  when(mockedNode.getHeight()).thenResolve(testBlockchainHeight);
  when(mockedNode.getErgoStateContext()).thenResolve(testErgoStateContext);
};

export { mockGetHeight, resetMockedNodeApi };
