import { randomBytes } from 'crypto';
import { vi } from 'vitest';

import { FailedError } from '@rosen-chains/abstract-chain';
import { EvmTxStatus } from '@rosen-chains/evm';

import './mocked/ethers.mock';
import { ContractInstance } from './mocked/ethers.mock';
import * as testData from './testData';
import { TestEvmRpcNetwork } from './testEvmRpcNetwork';

describe('EvmRpcNetwork', () => {
  let network: TestEvmRpcNetwork;
  const generateRandomId = (): string => randomBytes(32).toString('hex');

  beforeEach(async () => {
    network = new TestEvmRpcNetwork('test', 'custom-url', testData.lockAddress);
  });

  describe('getHeight', () => {
    /**
     * @target `EvmRpcNetwork.getHeight` should return block height successfully
     * @dependencies
     * @scenario
     * - mock provider.`getBlockNumber` to return height
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked block height
     */
    it('should return block height successfully', async () => {
      vi.spyOn(network.getProvider(), 'getBlockNumber').mockResolvedValue(
        testData.blockHeight,
      );

      const result = await network.getHeight();

      expect(result).toEqual(testData.blockHeight);
    });
  });

  describe('getTxConfirmation', () => {
    /**
     * @target `EvmRpcNetwork.getTxConfirmation` should fetch confirmation using txId successfully
     * @dependencies
     * @scenario
     * - mock provider.`getTransaction`
     *   - `wait` to return the transaction
     *   - `confirmations` to return confirmation
     * - run test
     * - check returned value
     * - check function is called
     * @expected
     * - it should be mocked confirmation
     * - provider.`getTransaction` should have been called with txId
     */
    it('should fetch confirmation using txId successfully', async () => {
      const txId = generateRandomId();

      const mockedConfirmation = 60;
      const transactionInstance = {
        wait: vi.fn(),
        confirmations: vi.fn(),
      };
      transactionInstance.wait.mockResolvedValue(testData.transaction0);
      transactionInstance.confirmations.mockResolvedValue(mockedConfirmation);
      const getTransactionSpy = vi.spyOn(
        network.getProvider(),
        'getTransaction',
      );
      getTransactionSpy.mockResolvedValue(transactionInstance as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await network.getTxConfirmation(txId);
      expect(result).toEqual(mockedConfirmation);
      expect(getTransactionSpy).toHaveBeenCalledExactlyOnceWith(txId);
    });

    /**
     * @target `EvmRpcNetwork.getTxConfirmation` should return -1 when transaction is not found
     * @dependencies
     * @scenario
     * - mock provider.`getTransaction`
     *   - `confirmations` to return null
     * - run test
     * - check returned value
     * - check function is called
     * @expected
     * - it should be -1
     * - provider.`getTransaction` should have been called with txId
     */
    it('should return -1 when transaction is not found', async () => {
      const txId = generateRandomId();

      const getTransactionSpy = vi.spyOn(
        network.getProvider(),
        'getTransaction',
      );
      getTransactionSpy.mockResolvedValue(null);

      const result = await network.getTxConfirmation(txId);
      expect(result).toEqual(-1);
      expect(getTransactionSpy).toHaveBeenCalledExactlyOnceWith(txId);
    });

    /**
     * @target `EvmRpcNetwork.getTxConfirmation` should return -1 for failed tx using signed hash
     * @dependencies
     * @scenario
     * - mock provider.`getTransaction`
     *   - `wait` to return null
     *   - `confirmations` to return confirmation
     * - run test
     * - check returned value
     * - check function is called
     * @expected
     * - it should be mocked confirmation
     * - provider.`getTransaction` should have been called with txId
     */
    it('should return -1 for failed tx using signed hash', async () => {
      const txId = generateRandomId();

      const mockedConfirmation = 60;
      const transactionInstance = {
        wait: vi.fn(),
        confirmations: vi.fn(),
      };
      transactionInstance.wait.mockResolvedValue(null);
      transactionInstance.confirmations.mockResolvedValue(mockedConfirmation);
      const getTransactionSpy = vi.spyOn(
        network.getProvider(),
        'getTransaction',
      );
      getTransactionSpy.mockResolvedValue(transactionInstance as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await network.getTxConfirmation(txId);
      expect(result).toEqual(-1);
      expect(getTransactionSpy).toHaveBeenCalledExactlyOnceWith(txId);
    });
  });

  describe('getBlockTransactionIds', () => {
    /**
     * @target `EvmRpcNetwork.getBlockTransactionIds` should return block txIds successfully
     * @dependencies
     * @scenario
     * - mock provider.`getBlock` to return txIds
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked block txIds
     */
    it('should return block txIds successfully', async () => {
      vi.spyOn(network.getProvider(), 'getBlock').mockResolvedValue(
        testData.getBlockResponse,
      );

      const result = await network.getBlockTransactionIds(testData.blockHash);

      expect(result).toEqual(testData.blockTxIds);
    });
  });

  describe('getBlockInfo', () => {
    /**
     * @target `EvmRpcNetwork.getBlockInfo` should return block info successfully
     * @dependencies
     * @scenario
     * - mock provider.`getBlock` to return info
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked block info
     */
    it('should return block info successfully', async () => {
      vi.spyOn(network.getProvider(), 'getBlock').mockResolvedValue(
        testData.getBlockResponse,
      );

      const result = await network.getBlockInfo(testData.blockHash);

      expect(result).toEqual(testData.blockInfo);
    });
  });

  describe('getTransaction', () => {
    /**
     * @target `EvmRpcNetwork.getTransaction` should throw error when tx is not found
     * @dependencies
     * @scenario
     * - mock provider.`getTransaction` to return null
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked the transaction
     */
    it('should throw error when tx is not found', async () => {
      vi.spyOn(network.getProvider(), 'getTransaction').mockResolvedValue(null);

      await expect(async () => {
        await network.getTransaction(
          testData.transaction0Id,
          testData.transaction0BlockId,
        );
      }).rejects.toThrow(FailedError);
    });

    /**
     * @target `EvmRpcNetwork.getTransaction` should throw error when tx block does not
     * match with given block id
     * @dependencies
     * @scenario
     * - mock provider.`getTransaction` to return mocked tx
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked the transaction
     */
    it('should throw error when tx block does not match with given block id', async () => {
      vi.spyOn(network.getProvider(), 'getTransaction').mockResolvedValue(
        testData.transaction0Response,
      );

      await expect(async () => {
        await network.getTransaction(
          testData.transaction0Id,
          testData.blockHash,
        );
      }).rejects.toThrow(FailedError);
    });
  });

  describe('getTokenDetail', () => {
    /**
     * @target `EvmRpcNetwork.getTokenDetail` should fetch token info successfully
     * @dependencies
     * @scenario
     * - mock Contract `name` and `decimals` functions
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked confirmation
     */
    it('should fetch token info successfully', async () => {
      vi.spyOn(ContractInstance, 'name').mockResolvedValue(testData.tokenName);
      vi.spyOn(ContractInstance, 'decimals').mockResolvedValue(
        testData.tokenDecimals,
      );
      const result = await network.getTokenDetail(testData.tokenId);
      expect(result).toEqual({
        tokenId: testData.tokenId,
        name: testData.tokenName,
        decimals: testData.tokenDecimals,
      });
    });
  });

  describe('getAddressBalanceForERC20Asset', () => {
    /**
     * @target `EvmRpcNetwork.getAddressBalanceForERC20Asset` should fetch token balance successfully
     * @dependencies
     * @scenario
     * - mock Contract `balanceOf` function
     * - run test
     * - check returned value
     * - check function is called
     * @expected
     * - it should be mocked confirmation
     * - Contract `balanceOf` function should have been called with given address
     */
    it('should fetch token balance successfully', async () => {
      const address = testData.lockAddress;
      vi.spyOn(ContractInstance, 'balanceOf').mockResolvedValue(
        testData.balance,
      );

      const result = await network.getAddressBalanceForERC20Asset(
        address,
        testData.tokenId,
      );
      expect(result).toEqual(testData.balance);
      expect(ContractInstance.balanceOf).toHaveBeenCalledExactlyOnceWith(
        address,
      );
    });
  });

  describe('getAddressBalanceForNativeToken', () => {
    /**
     * @target `EvmRpcNetwork.getAddressBalanceForNativeToken` should return address balance successfully
     * @dependencies
     * @scenario
     * - mock provider.`getBalance` to return balance
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked balance
     */
    it('should return address balance successfully', async () => {
      vi.spyOn(network.getProvider(), 'getBalance').mockResolvedValue(
        testData.balance,
      );

      const result = await network.getAddressBalanceForNativeToken(
        testData.lockAddress,
      );

      expect(result).toEqual(testData.balance);
    });
  });

  describe('getAddressNextAvailableNonce', () => {
    /**
     * @target `EvmRpcNetwork.getAddressNextAvailableNonce` should return address nonce successfully
     * @dependencies
     * @scenario
     * - mock provider.`getTransactionCount` to return address tx count
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked nonce
     */
    it('should return address nonce successfully', async () => {
      vi.spyOn(network.getProvider(), 'getTransactionCount').mockResolvedValue(
        testData.addressTxCount,
      );

      const result = await network.getAddressNextAvailableNonce(
        testData.lockAddress,
      );

      expect(result).toEqual(testData.addressTxCount);
    });
  });

  describe('getGasRequired', () => {
    /**
     * @target `EvmRpcNetwork.getGasRequired` should return gas estimation successfully
     * @dependencies
     * @scenario
     * - mock provider.`estimateGas` to return address tx count
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked nonce
     */
    it('should return gas estimation successfully', async () => {
      vi.spyOn(network.getProvider(), 'estimateGas').mockResolvedValue(
        testData.gasLimit,
      );

      const result = await network.getGasRequired(testData.transaction0);

      expect(result).toEqual(testData.gasLimit);
    });
  });

  describe('getFeeData', () => {
    /**
     * @target `EvmRpcNetwork.getFeeData` should return fee data successfully
     * @dependencies
     * @scenario
     * - mock provider.`getFeeData` to return address tx count
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked nonce
     */
    it('should return fee data successfully', async () => {
      vi.spyOn(network.getProvider(), 'getFeeData').mockResolvedValue(
        testData.feeDataResponse,
      );

      const result = await network.getFeeData();

      expect(result).toEqual(testData.feeDataResponse);
    });
  });

  describe('getTransactionStatus', () => {
    /**
     * @target `EvmRpcNetwork.getTransactionStatus` should return not found successfully
     * @dependencies
     * @scenario
     * - mock provider.`getTransaction` to return null
     * - run test
     * - check returned value
     * - check function is called
     * @expected
     * - it should be mocked confirmation
     * - provider.`getTransaction` should have been called with signedHash
     */
    it('should return not found successfully', async () => {
      const hash = generateRandomId();

      const getTransactionSpy = vi.spyOn(
        network.getProvider(),
        'getTransaction',
      );
      getTransactionSpy.mockResolvedValue(null);

      const result = await network.getTransactionStatus(hash);
      expect(result).toEqual(EvmTxStatus.notFound);
    });

    /**
     * @target `EvmRpcNetwork.getTransactionStatus` should return succeed successfully
     * @dependencies
     * @scenario
     * - mock provider.`getTransaction`.`wait` to return the transaction
     * - run test
     * - check returned value
     * - check function is called
     * @expected
     * - it should be mocked confirmation
     * - provider.`getTransaction` should have been called with signedHash
     */
    it('should return succeed successfully', async () => {
      const hash = generateRandomId();

      const transactionInstance = {
        wait: vi.fn(),
        confirmations: vi.fn(),
      };
      transactionInstance.wait.mockResolvedValue(testData.transaction0);
      const getTransactionSpy = vi.spyOn(
        network.getProvider(),
        'getTransaction',
      );
      getTransactionSpy.mockResolvedValue(transactionInstance as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await network.getTransactionStatus(hash);
      expect(result).toEqual(EvmTxStatus.succeed);
    });

    /**
     * @target `EvmRpcNetwork.getTransactionStatus` should return mempool successfully
     * @dependencies
     * @scenario
     * - mock provider.`getTransaction`.`wait` to return null
     * - run test
     * - check returned value
     * - check function is called
     * @expected
     * - it should be mocked confirmation
     * - provider.`getTransaction` should have been called with signedHash
     */
    it('should return mempool successfully', async () => {
      const hash = generateRandomId();

      const transactionInstance = {
        wait: vi.fn(),
        confirmations: vi.fn(),
      };
      transactionInstance.wait.mockResolvedValue(null);
      const getTransactionSpy = vi.spyOn(
        network.getProvider(),
        'getTransaction',
      );
      getTransactionSpy.mockResolvedValue(transactionInstance as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await network.getTransactionStatus(hash);
      expect(result).toEqual(EvmTxStatus.mempool);
    });

    /**
     * @target `EvmRpcNetwork.getTransactionStatus` should return failed when it throws CallbackException
     * @dependencies
     * @scenario
     * - mock provider.`getTransaction`.`wait` to return null
     * - run test
     * - check returned value
     * - check function is called
     * @expected
     * - it should be mocked confirmation
     * - provider.`getTransaction` should have been called with signedHash
     */
    it('should return failed when it throws CallbackException', async () => {
      const hash = generateRandomId();

      const transactionInstance = {
        wait: vi.fn(),
        confirmations: vi.fn(),
      };
      transactionInstance.wait.mockRejectedValue({
        code: 'CALL_EXCEPTION',
      });
      const getTransactionSpy = vi.spyOn(
        network.getProvider(),
        'getTransaction',
      );
      getTransactionSpy.mockResolvedValue(transactionInstance as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await network.getTransactionStatus(hash);
      expect(result).toEqual(EvmTxStatus.failed);
    });
  });
});
