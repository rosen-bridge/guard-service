import { mockDataSource } from './mocked/dataSource.mock';
import * as ethersMock from './mocked/ethers.mock';
import * as testData from './testData';
import { TestEvmL2RpcNetwork } from './testEvmL2RpcNetwork';

describe('EvmL2RpcNetwork', () => {
  let network: TestEvmL2RpcNetwork;

  beforeEach(async () => {
    const dataSource = await mockDataSource();
    network = new TestEvmL2RpcNetwork(
      'test',
      'custom-url',
      dataSource,
      testData.lockAddress,
    );
  });

  describe('estimateL1Gas', () => {
    /**
     * @target `EvmL2RpcNetwork.estimateL1Gas` should fetch estimated l1 gas successfully
     * @dependencies
     * @scenario
     * - mock Contract `getL1GasUsed` function
     * - run test
     * - check returned value
     * @expected
     * - it should be the mocked value
     */
    it('should fetch estimated l1 gas successfully', async () => {
      // arrange
      vi.spyOn(ethersMock.ContractInstance, 'getL1GasUsed').mockResolvedValue(
        testData.l1GasUsed,
      );

      // act
      const result = await network.estimateL1Gas(testData.transaction0);

      // assert
      expect(result).toEqual(testData.l1GasUsed);
    });
  });

  describe('estimateL2Gas', () => {
    /**
     * @target `EvmL2RpcNetwork.estimateL2Gas` should fetch estimated l2 gas successfully
     * @dependencies
     * @scenario
     * - mock rpc method `estimateGas`
     * - run test
     * - check returned value
     * @expected
     * - it should be the mocked value
     */
    it('should fetch estimated l2 gas successfully', async () => {
      // arrange
      vi.spyOn(network.getProvider(), 'estimateGas').mockResolvedValue(
        testData.estimatedGas,
      );

      // act
      const result = await network.estimateL2Gas(testData.transaction0);

      // assert
      expect(result).toEqual(testData.estimatedGas);
    });
  });

  describe('getGasRequired', () => {
    /**
     * @target `EvmL2RpcNetwork.getGasRequired` should return gas estimation successfully
     * @dependencies
     * @scenario
     * - stub provider.`estimateGas` to return a mock value
     * - stub contract.`getL1GasUsed` to return a mock value
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
      const result = await network.getGasRequired(testData.transaction0);

      // assert
      expect(result).toEqual(testData.estimatedGas + testData.l1GasUsed);
    });
  });

  describe('getBlock', () => {
    /**
     * @target `EvmL2RpcNetwork.getBlock` should return the block object successfully
     * @dependencies
     * @scenario
     * - mock provider.`getBlock` to return info
     * - run test
     * - check getBlock spy
     * - check returned value
     * @expected
     * - getBlock should be called once with 'finalized' block tag
     * - it should be the mocked block object
     */
    it('should return the block object successfully', async () => {
      // arrange
      const getBlockSpy = vi
        .spyOn(network.getProvider(), 'getBlock')
        .mockResolvedValue(testData.getBlockResponse);

      // act
      const result = await network.getBlock('finalized');

      // assert
      expect(getBlockSpy).toHaveBeenCalledExactlyOnceWith('finalized');
      expect(result).toEqual(testData.getBlockResponse);
    });
  });

  describe('getFeeData', () => {
    /**
     * @target `EvmL2RpcNetwork.getFeeData` should return fee data successfully
     * @dependencies
     * @scenario
     * - stub provider.`getFeeData` to a mock fee data
     * - stub provider.`getBlock` to a mock block
     * - run test
     * - check getBlock spy
     * - check returned value
     * @expected
     * - getBlock should be called once with 'latest' block tag
     * - it should be the correct fee data values
     */
    it('should return fee data successfully', async () => {
      // arrange
      vi.spyOn(network.getProvider(), 'getFeeData').mockResolvedValue(
        testData.feeDataResponse,
      );
      const getBlockSpy = vi
        .spyOn(network.getProvider(), 'getBlock')
        .mockResolvedValue(testData.getBlockResponse);

      // act
      const result = await network.getFeeData();

      // assert
      expect(getBlockSpy).toHaveBeenCalledExactlyOnceWith('latest');
      expect(result).toEqual(testData.feeDataResponse);
    });
  });

  describe('getFinalizedBlockHeight', () => {
    /**
     * @target `EvmL2RpcNetwork.getFinalizedBlockHeight` should return the finalized block height successfully
     * @dependencies
     * @scenario
     * - mock provider.`getBlock` to return info
     * - run test
     * - check getBlock spy
     * - check returned value
     * @expected
     * - getBlock should be called once with 'finalized' block tag
     * - it should be the mocked finalized block height
     */
    it('should return the finalized block height successfully', async () => {
      // arrange
      const getBlockSpy = vi
        .spyOn(network.getProvider(), 'getBlock')
        .mockResolvedValue(testData.getBlockResponse);

      // act
      const result = await network.getFinalizedBlockHeight();

      // assert
      expect(getBlockSpy).toHaveBeenCalledExactlyOnceWith('finalized');
      expect(result).toEqual(testData.getBlockResponse.number);
    });
  });
});
