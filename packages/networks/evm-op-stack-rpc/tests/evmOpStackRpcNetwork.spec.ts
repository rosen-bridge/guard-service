import { EvmTxStatus } from '@rosen-chains/evm';

import { mockDataSource } from './mocked/dataSource.mock';
import * as ethersMock from './mocked/ethers.mock';
import * as testData from './testData';
import { TestEvmOpStackRpcNetwork } from './testEvmOpStackRpcNetwork';

describe('EvmOpStackRpcNetwork', () => {
  let network: TestEvmOpStackRpcNetwork;

  beforeEach(async () => {
    const dataSource = await mockDataSource();
    network = new TestEvmOpStackRpcNetwork(
      'test',
      'custom-url',
      dataSource,
      testData.lockAddress,
    );
  });

  describe('getTxConfirmation', () => {
    /**
     * @target `EvmOpStackRpcNetwork.getTxConfirmation` should fetch tx confirmation count successfully
     * @dependencies
     * @scenario
     * - stub dbAction.getTxByUnsignedHash to resolve to null
     * - stub provider.getTransaction to resolve to a mock tx object
     * - stub getStatus to resolve to EvmTxStatus.succeed
     * - stub getBlock to resolve to a mock block object
     * - run test
     * - check returned value
     * @expected
     * - it should be the mock block height - tx block number
     */
    it('should fetch tx confirmation count successfully', async () => {
      // arrange
      vi.spyOn(network.getDbAction(), 'getTxByUnsignedHash').mockResolvedValue(
        null,
      );
      vi.spyOn(network.getProvider(), 'getTransaction').mockResolvedValue(
        testData.tx0Response,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(network as any, 'getStatus').mockResolvedValue(
        EvmTxStatus.succeed,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(network as any, 'getBlock').mockResolvedValue(
        testData.getBlockResponse,
      );

      // act
      const result = await network.getTxConfirmation(testData.tx0.hash!);

      // assert
      expect(result).toEqual(
        testData.getBlockResponse.number - testData.tx0Response.blockNumber!,
      );
    });
  });

  describe('estimateL1Gas', () => {
    /**
     * @target `EvmOpStackRpcNetwork.estimateL1Gas` should fetch estimated l1 gas successfully
     * @dependencies
     * @scenario
     * - stub Contract.getL1GasUsed to resolve to a mock value
     * - run test
     * - check returned value
     * @expected
     * - it should match the mock value
     */
    it('should fetch estimated l1 gas successfully', async () => {
      // arrange
      vi.spyOn(ethersMock.ContractInstance, 'getL1GasUsed').mockResolvedValue(
        testData.l1GasUsed,
      );

      // act
      const result = await network.callEstimateL1Gas(testData.tx0);

      // assert
      expect(result).toEqual(testData.l1GasUsed);
    });
  });

  describe('estimateL2Gas', () => {
    /**
     * @target `EvmOpStackRpcNetwork.estimateL2Gas` should fetch estimated l2 gas successfully
     * @dependencies
     * @scenario
     * - stub provider.estimateGas to resolve to a mock value
     * - run test
     * - check returned value
     * @expected
     * - it should match the mock value
     */
    it('should fetch estimated l2 gas successfully', async () => {
      // arrange
      vi.spyOn(network.getProvider(), 'estimateGas').mockResolvedValue(
        testData.estimatedGas,
      );

      // act
      const result = await network.callEstimateL2Gas(testData.tx0);

      // assert
      expect(result).toEqual(testData.estimatedGas);
    });
  });

  describe('getGasRequired', () => {
    /**
     * @target `EvmOpStackRpcNetwork.getGasRequired` should return gas estimation successfully
     * @dependencies
     * @scenario
     * - stub provider.estimateGas to resolve to a mock value
     * - stub contract.getL1GasUsed to resolve to a mock value
     * - run test
     * - check returned value
     * @expected
     * - it should return the correct required gas value
     */
    it('should return gas estimation successfully', async () => {
      // arrange
      vi.spyOn(network.getProvider(), 'estimateGas').mockResolvedValue(
        testData.estimatedGas,
      );
      vi.spyOn(ethersMock.ContractInstance, 'getL1GasUsed').mockResolvedValue(
        testData.l1GasUsed,
      );

      // act
      const result = await network.getGasRequired(testData.tx0);

      // assert
      expect(result).toEqual(testData.estimatedGas + testData.l1GasUsed);
    });
  });

  describe('getBlock', () => {
    /**
     * @target `EvmOpStackRpcNetwork.getBlock` should return the block object successfully
     * @dependencies
     * @scenario
     * - stub provider.getBlock to resolve to a mock block object
     * - run test
     * - check getBlock spy
     * - check returned value
     * @expected
     * - getBlock should be called once with 'finalized' block tag
     * - it should match the mock block object
     */
    it('should return the block object successfully', async () => {
      // arrange
      const getBlockSpy = vi
        .spyOn(network.getProvider(), 'getBlock')
        .mockResolvedValue(testData.getBlockResponse);

      // act
      const result = await network.callGetBlock('finalized');

      // assert
      expect(getBlockSpy).toHaveBeenCalledExactlyOnceWith('finalized');
      expect(result).toEqual(testData.getBlockResponse);
    });
  });
});
