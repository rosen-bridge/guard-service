import JsonBigInt from '@rosen-bridge/json-bigint';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  NotEnoughAssetsError,
  NotEnoughValidBoxesError,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { Psbt } from 'bitcoinjs-lib';

import {
  DOGE_NETWORK,
  DogeChain,
  DogeTransaction,
  DogeUtxo,
  TssSignFunction,
} from '../lib';
import TestDogeNetwork from './network/testDogeNetwork';
import * as testData from './testData';
import { TestDogeChain } from './testDogeChain';
import * as testUtils from './testUtils';

describe('DogeChain', () => {
  describe('generateTransaction', () => {
    const network = new TestDogeNetwork();

    /**
     * @target DogeChain.generateTransaction should generate payment
     * transaction successfully
     * @dependencies
     * @scenario
     * - mock transaction order, getFeeRatio
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - run test
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId, network and inputUtxos should be as
     *   expected
     * - extracted order of generated transaction should be the same as input
     *   order
     * - getCoveringBoxes should have been called with correct arguments
     */
    it('should generate payment transaction successfully', async () => {
      // mock transaction order
      const order = testData.transaction2Order;
      const payment1 = DogeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const dogeChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(
        (dogeChain as any).boxSelection,
        'getCoveringBoxes',
      );
      getCovBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: testData.lockAddressUtxos,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        dogeChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // mock getTransactionHex for each UTXO
      const getUtxoSpy = vi.spyOn(network, 'getTransactionHex');
      testData.lockAddressUtxos.forEach((utxo) => {
        getUtxoSpy.mockResolvedValueOnce(utxo.txHex);
      });

      // run test
      const result = await dogeChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [],
        [],
      );
      const dogeTx = result as DogeTransaction;

      // check returned value
      expect(dogeTx.txType).toEqual(payment1.txType);
      expect(dogeTx.eventId).toEqual(payment1.eventId);
      expect(dogeTx.network).toEqual(payment1.network);
      expect(dogeTx.inputUtxos).toEqual(
        testData.lockAddressUtxos.map((utxo) => JsonBigInt.stringify(utxo)),
      );

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = dogeChain.extractTransactionOrder(dogeTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called with correct arguments
      const expectedRequiredAssets = structuredClone(
        testData.transaction2Order[0].assets,
      );
      expectedRequiredAssets.nativeToken += dogeChain.getMinimumNativeToken();
      expect(getCovBoxesSpy).toHaveBeenCalledExactlyOnceWith(
        expectedRequiredAssets,
        [],
        new Map(),
        expect.any(Object),
        expect.any(BigInt),
        undefined,
        expect.any(Function),
      );
    });

    /**
     * @target DogeChain.generateTransaction should generate payment with signed transaction outputs
     * @dependencies
     * @scenario
     * - mock transaction order, getFeeRatio
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - run test
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId, network and inputUtxos should be as expected
     */
    it('should generate payment transaction successfully with signed transaction outputs', async () => {
      // mock transaction order
      const order = testData.transaction2Order;
      const payment1 = DogeTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const dogeChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(
        (dogeChain as any).boxSelection,
        'getCoveringBoxes',
      );
      getCovBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: testData.coveredBoxes,
      });

      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        dogeChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // mock getTransactionHex for each UTXO
      const getUtxoSpy = vi.spyOn(network, 'getTransactionHex');
      testData.lockAddressUtxos.forEach((utxo) => {
        getUtxoSpy.mockResolvedValueOnce(utxo.txHex);
      });

      // run test
      const result = await dogeChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [],
        [testData.transaction0SignedTxBytesHex],
      );
      const dogeTx = result as DogeTransaction;

      // check returned value
      expect(dogeTx.txType).toEqual(payment1.txType);
      expect(dogeTx.eventId).toEqual(payment1.eventId);
      expect(dogeTx.network).toEqual(payment1.network);
      expect(dogeTx.inputUtxos.length).toEqual(1);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = dogeChain.extractTransactionOrder(dogeTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called with correct arguments
      const expectedRequiredAssets = structuredClone(
        testData.transaction2Order[0].assets,
      );
      expectedRequiredAssets.nativeToken += dogeChain.getMinimumNativeToken();
    });

    /**
     * @target DogeChain.generateTransaction should successfully generate payment transaction while considering forbidden boxes caused by a signed transaction without signature
     * @dependencies
     * @scenario
     * - mock transaction order, getFeeRatio
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     *
     * - run test
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId, network and inputUtxos should be as expected
     */
    it('should successfully generate payment transaction while considering forbidden boxes caused by a signed transaction without signature', async () => {
      // mock transaction order
      const order = testData.transaction2Order;
      const payment1 = DogeTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const dogeChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(
        (dogeChain as any).boxSelection,
        'getCoveringBoxes',
      );
      getCovBoxesSpy.mockImplementation(async (...args: any[]) => {
        const forbiddenBoxIds = args[1] as Array<string>;
        // Only return covered boxes if forbidden box IDs match expected values
        if (
          forbiddenBoxIds.length === 2 &&
          forbiddenBoxIds.includes(
            'a2623a8e6358b44df7c672cee5a6ff1df2b45721b2f506d22ef59a0634f7641d.0',
          ) &&
          forbiddenBoxIds.includes(
            'f7fdbfcb582dd9e34997df257bfff291c1ea98a5622ba18400794f3337113b0e.2',
          )
        ) {
          return {
            covered: true,
            boxes: testData.coveredBoxes,
          };
        }
        return {
          covered: false,
          boxes: [],
        };
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        dogeChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const faultyTx = Buffer.from(
        DogeTransaction.fromJson(testData.transaction0PaymentTransaction)
          .txBytes,
      ).toString('hex');
      const result = await dogeChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [],
        [testData.transaction0SignedTxBytesHex, faultyTx],
      );
      const dogeTx = result as DogeTransaction;

      // check returned value
      expect(dogeTx.txType).toEqual(payment1.txType);
      expect(dogeTx.eventId).toEqual(payment1.eventId);
      expect(dogeTx.network).toEqual(payment1.network);
      expect(dogeTx.inputUtxos.length).toEqual(1);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = dogeChain.extractTransactionOrder(dogeTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called with correct arguments
      const expectedRequiredAssets = structuredClone(
        testData.transaction2Order[0].assets,
      );
      expectedRequiredAssets.nativeToken += dogeChain.getMinimumNativeToken();
    });

    /**
     * @target DogeChain.generateTransaction should fail to generate payment with forbidden boxes
     * @dependencies
     * @scenario
     * - mock transaction order, getFeeRatio
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - run test
     * - check returned value
     * @expected
     * - generateTransaction should throw NotEnoughValidBoxesError
     */
    it('should fail to generate payment transaction with forbidden boxes', async () => {
      // mock transaction order
      const order = testData.transaction2Order;
      const payment1 = DogeTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const dogeChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(
        (dogeChain as any).boxSelection,
        'getCoveringBoxes',
      );
      getCovBoxesSpy.mockResolvedValue({
        covered: false,
        boxes: [],
      });
      getCovBoxesSpy.mockImplementation(async (...args: any[]) => {
        const forbiddenBoxIds = args[1] as Array<string>;
        // Only return empty boxes if forbidden box IDs match expected values
        if (
          forbiddenBoxIds.length === 2 &&
          forbiddenBoxIds.includes(
            'a2623a8e6358b44df7c672cee5a6ff1df2b45721b2f506d22ef59a0634f7641d.0',
          ) &&
          forbiddenBoxIds.includes(
            'f7fdbfcb582dd9e34997df257bfff291c1ea98a5622ba18400794f3337113b0e.2',
          )
        ) {
          return {
            covered: false,
            boxes: [],
          };
        }
        return {
          covered: true,
          boxes: testData.coveredBoxes,
        };
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        dogeChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      await expect(async () => {
        await dogeChain.generateTransaction(
          payment1.eventId,
          payment1.txType,
          order,
          [DogeTransaction.fromJson(testData.transaction0PaymentTransaction)],
          [],
        );
      }).rejects.toThrow(NotEnoughValidBoxesError);
    });

    /**
     * @target DogeChain.generateTransaction should throw error
     * when lock address does not have enough assets
     * @dependencies
     * @scenario
     * - mock hasLockAddressEnoughAssets
     * - mock getFeeRatio
     * - run test and expect error
     * @expected
     * - generateTransaction should throw NotEnoughAssetsError
     */
    it('should throw error when lock address does not have enough assets', async () => {
      // mock hasLockAddressEnoughAssets
      const dogeChain = await testUtils.generateChainObject(network);
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        dogeChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(false);
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // run test and expect error
      await expect(async () => {
        await dogeChain.generateTransaction(
          'event1',
          TransactionType.payment,
          testData.transaction2Order,
          [],
          [],
        );
      }).rejects.toThrow(NotEnoughAssetsError);
    });

    /**
     * @target DogeChain.generateTransaction should throw error
     * when bank boxes can not cover order assets
     * @dependencies
     * @scenario
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - mock getFeeRatio
     * - run test and expect error
     * @expected
     * - generateTransaction should throw NotEnoughValidBoxesError
     *
     */
    it('should throw error when bank boxes can not cover order assets', async () => {
      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const dogeChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(
        (dogeChain as any).boxSelection,
        'getCoveringBoxes',
      );
      getCovBoxesSpy.mockResolvedValue({
        covered: false,
        boxes: [],
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        dogeChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // run test and expect error
      await expect(async () => {
        await dogeChain.generateTransaction(
          'event1',
          TransactionType.payment,
          testData.transaction2Order,
          [],
          [],
        );
      }).rejects.toThrow(NotEnoughValidBoxesError);
    });
  });

  describe('getTransactionAssets', () => {
    const network = new TestDogeNetwork();

    /**
     * @target DogeChain.getTransactionAssets should get transaction assets
     * successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction assets (both input and output assets)
     */
    it('should get transaction assets successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );

      // run test
      const dogeChain = await testUtils.generateChainObject(network);

      // check returned value
      const result = await dogeChain.getTransactionAssets(paymentTx);
      expect(result).toEqual(testData.transaction0Assets);
    });

    /**
     * @target DogeChain.getTransactionAssets should wrap transaction assets
     * successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction assets (both input and output assets)
     */
    it('should wrap transaction assets successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );

      // run test
      const dogeChain =
        await testUtils.generateChainObjectWithMultiDecimalTokenMap(network);

      // check returned value
      const result = await dogeChain.getTransactionAssets(paymentTx);
      expect(result).toEqual(testData.transaction0WrappedAssets);
    });
  });

  describe('extractTransactionOrder', () => {
    const network = new TestDogeNetwork();

    /**
     * @target DogeChain.extractTransactionOrder should extract transaction
     * order successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should extract transaction order successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );
      const expectedOrder = testData.transaction2Order;

      // run test
      const dogeChain = await testUtils.generateChainObject(network);
      const result = dogeChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target DogeChain.extractTransactionOrder should throw error
     * when tx has OP_RETURN utxo
     * @dependencies
     * @scenario
     * - mock PaymentTransaction with OP_RETURN output
     * - run test & check thrown exception
     * @expected
     * - it should throw Error
     */
    it('should throw error when tx has OP_RETURN utxo', async () => {
      // mock PaymentTransaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transactionOpReturnPaymentTransaction,
      );

      // run test & check thrown exception
      const dogeChain = await testUtils.generateChainObject(network);
      expect(() => {
        dogeChain.extractTransactionOrder(paymentTx);
      }).toThrow(Error);
    });

    /**
     * @target DogeChain.extractTransactionOrder should wrap transaction
     * order successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should wrap transaction order successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );
      const expectedOrder = testData.transaction2WrappedOrder;

      // run test
      const dogeChain =
        await testUtils.generateChainObjectWithMultiDecimalTokenMap(network);
      const result = dogeChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });
  });

  describe('verifyTransactionFee', () => {
    const network = new TestDogeNetwork();

    /**
     * @target DogeChain.verifyTransactionFee should return true when fee
     * difference is less than allowed slippage
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock getFeeRatio
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when fee difference is less than allowed slippage', async () => {
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(176991);

      const dogeChain = await testUtils.generateChainObject(network);
      const result = await dogeChain.verifyTransactionFee(paymentTx);

      expect(result).toEqual(true);
    });

    /**
     * @target DogeChain.verifyTransactionFee should return false when fee
     * difference is more than allowed slippage
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock getFeeRatio
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when fee difference is more than allowed slippage', async () => {
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(100);

      const dogeChain = await testUtils.generateChainObject(network);
      const result = await dogeChain.verifyTransactionFee(paymentTx);

      expect(result).toEqual(false);
    });
  });

  describe('verifyExtraCondition', () => {
    const network = new TestDogeNetwork();

    /**
     * @target: DogeChain.verifyTransactionExtraConditions should return true when all
     * extra conditions are met
     * @dependencies
     * @scenario
     * - mock a payment transaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when all extra conditions are met', async () => {
      // mock a payment transaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );

      // run test
      const dogeChain = await testUtils.generateChainObject(network);
      const result = dogeChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target: DogeChain.verifyTransactionExtraConditions should return false
     * when change box address is wrong
     * @dependencies
     * @scenario
     * - mock a payment transaction
     * - create a new DogeChain object with custom lock address
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when change box address is wrong', async () => {
      // mock a payment transaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );

      const tokenMap = new TokenMap();
      await tokenMap.updateConfigByJson(testData.testTokenMap);

      // create a new DogeChain object with custom lock address
      const newConfigs = structuredClone(testUtils.configs);
      newConfigs.addresses.lock = 'DDd8APtwJLJZJxwmoh3YmP5oeBe9tcdUp4';
      const dogeChain = new DogeChain(
        network,
        newConfigs,
        tokenMap,
        testUtils.mockedSignFn,
      );

      // run test
      const result = dogeChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('isTxValid', () => {
    const network = new TestDogeNetwork();

    /**
     * @target DogeChain.isTxValid should return true when
     * all tx inputs are valid and ttl is less than current slot
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock a network object to return as valid for all inputs of a mocked
     *   transaction
     * - run test
     * - check returned value
     * - check if function got called
     * @expected
     * - it should return true with no details
     * - `isBoxUnspentAndValidSpy` should have been called with tx input ids
     */
    it('should return true when all tx inputs are valid and ttl is less than current slot', async () => {
      const payment1 = DogeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );

      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy.mockResolvedValue(true);

      const dogeChain = await testUtils.generateChainObject(network);
      const result = await dogeChain.isTxValid(payment1);

      expect(result).toEqual({
        isValid: true,
        details: undefined,
      });
      expect(isBoxUnspentAndValidSpy).toHaveBeenCalledTimes(2);
      expect(isBoxUnspentAndValidSpy).toHaveBeenNthCalledWith(
        1,
        testData.transaction0Input0BoxId,
      );
      expect(isBoxUnspentAndValidSpy).toHaveBeenNthCalledWith(
        2,
        testData.transaction0Input1BoxId,
      );
    });

    /**
     * @target DogeChain.isTxValid should return false when at least one input
     * is invalid
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock a network object to return as valid for all inputs of a mocked
     *   transaction except for the first one
     * - run test
     * - check returned value
     * - check if function got called
     * @expected
     * - it should return false and as expected invalidation
     */
    it('should return false when at least one input is invalid', async () => {
      const payment1 = DogeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );

      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy
        .mockResolvedValue(true)
        .mockResolvedValueOnce(false);

      const dogeChain = await testUtils.generateChainObject(network);
      const result = await dogeChain.isTxValid(payment1);

      expect(result).toEqual({
        isValid: false,
        details: {
          reason: expect.any(String),
          unexpected: false,
        },
      });
      expect(isBoxUnspentAndValidSpy).toHaveBeenCalledExactlyOnceWith(
        testData.transaction0Input0BoxId,
      );
    });
  });

  describe('signTransaction', () => {
    const network = new TestDogeNetwork();

    /**
     * @target DogeChain.signTransaction should return PaymentTransaction of the
     * signed transaction
     * @dependencies
     * @scenario
     * - mock a sign function to return signature for expected messages
     * - mock PaymentTransaction of unsigned transaction
     * - run test
     * - check returned value
     * @expected
     * - it should return PaymentTransaction of signed transaction (all fields
     *   are same as input object, except txBytes which is signed transaction)
     */
    it('should return PaymentTransaction of the signed transaction', async () => {
      // mock a sign function to return signature
      const signFunction: TssSignFunction = async (hash: Uint8Array) => {
        const hashHex = Buffer.from(hash).toString('hex');
        if (hashHex === testData.transaction0HashMessage0)
          return {
            signature: testData.transaction0Signature0,
            signatureRecovery: '',
          };
        else if (hashHex === testData.transaction0HashMessage1)
          return {
            signature: testData.transaction0Signature1,
            signatureRecovery: '',
          };
        else
          throw Error(
            `TestError: sign function is called with wrong message [${hashHex}]`,
          );
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );

      // run test
      const dogeChain = await testUtils.generateChainObject(
        network,
        signFunction,
      );
      const result = await dogeChain.signTransaction(paymentTx);

      // check returned value
      expect(result.txId).toEqual(paymentTx.txId);
      expect(result.eventId).toEqual(paymentTx.eventId);
      expect(Buffer.from(result.txBytes).toString('hex')).toEqual(
        testData.transaction0SignedTxBytesHex,
      );
      expect(result.txType).toEqual(paymentTx.txType);
      expect(result.network).toEqual(paymentTx.network);
    });

    /**
     * @target DogeChain.signTransaction should throw error when at least signing of one message is failed
     * @dependencies
     * @scenario
     * - mock a sign function to throw error for 2nd message
     * - mock PaymentTransaction of unsigned transaction
     * - run test & check thrown exception
     * @expected
     * - it should throw the exact error thrown by sign function
     */
    it('should throw error when at least signing of one message is failed', async () => {
      // mock a sign function to throw error
      const signFunction: TssSignFunction = async (hash: Uint8Array) => {
        if (
          Buffer.from(hash).toString('hex') ===
          testData.transaction0HashMessage0
        )
          return {
            signature: testData.transaction0Signature0,
            signatureRecovery: '',
          };
        else throw Error(`TestError: sign failed`);
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );

      // run test
      const dogeChain = await testUtils.generateChainObject(
        network,
        signFunction,
      );

      await expect(async () => {
        await dogeChain.signTransaction(paymentTx);
      }).rejects.toThrow('TestError: sign failed');
    });
  });

  describe('rawTxToPaymentTransaction', () => {
    const network = new TestDogeNetwork();

    /**
     * @target DogeChain.rawTxToPaymentTransaction should construct transaction successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should construct transaction successfully', async () => {
      // mock PaymentTransaction
      const expectedTx = DogeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );
      expectedTx.eventId = '';
      expectedTx.txType = TransactionType.manual;

      // mock getUtxo
      const getUtxoSpy = vi.spyOn(network, 'getUtxo');
      expectedTx.inputUtxos.forEach((utxo) =>
        getUtxoSpy.mockResolvedValueOnce(JsonBigInt.parse(utxo)),
      );

      // run test
      const dogeChain = await testUtils.generateChainObject(network);
      const result = await dogeChain.rawTxToPaymentTransaction(
        Buffer.from(expectedTx.txBytes).toString('hex'),
      );

      // check returned value
      expect(result.toJson()).toEqual(expectedTx.toJson());
    });
  });

  describe('getTransactionsBoxMapping', async () => {
    const network = new TestDogeNetwork();
    const tokenMap = new TokenMap();
    await tokenMap.updateConfigByJson(testData.testTokenMap);
    const testInstance = new TestDogeChain(
      network,
      testUtils.configs,
      tokenMap,
      null as any,
    );

    /**
     * @target DogeChain.getTransactionsBoxMapping should construct mapping
     * successfully
     * @dependencies
     * @scenario
     * - mock serialized transactions
     * - run test
     * - check returned value
     * @expected
     * - it should return a map equal to constructed map
     */
    it('should construct mapping successfully', () => {
      // mock serialized transactions
      const transactions = [
        Psbt.fromHex(testData.transaction0SignedTxBytesHex, {
          network: DOGE_NETWORK,
        }),
      ];

      // run test
      const result = testInstance.callGetTransactionsBoxMapping(
        transactions,
        testUtils.configs.addresses.lock,
      );

      // check returned value
      const trackMap = new Map<string, DogeUtxo | undefined>();
      const boxMapping = testData.transaction2BoxMapping;
      boxMapping.forEach((mapping) => {
        const candidate = JsonBigInt.parse(
          mapping.serializedOutput,
        ) as DogeUtxo;
        trackMap.set(mapping.inputId, {
          txId: candidate.txId,
          index: Number(candidate.index),
          value: candidate.value,
        });
      });
      expect(result).toEqual(trackMap);
    });

    /**
     * @target DogeChain.getTransactionsBoxMapping should map inputs to
     * undefined when no valid output box found
     * @dependencies
     * @scenario
     * - mock serialized transactions
     * - run test
     * - check returned value
     * @expected
     * - it should return a map of each box to undefined
     */
    it('should map inputs to undefined when no valid output box found', () => {
      // mock serialized transactions
      const transactions = [
        Psbt.fromHex(testData.transaction0SignedTxBytesHex, {
          network: DOGE_NETWORK,
        }),
      ];

      // run test
      const result = testInstance.callGetTransactionsBoxMapping(
        transactions,
        'another address',
      );

      // check returned value
      const trackMap = new Map<string, DogeUtxo | undefined>();
      const boxMapping = testData.transaction2BoxMapping;
      boxMapping.forEach((mapping) => {
        trackMap.set(mapping.inputId, undefined);
      });
      expect(result).toEqual(trackMap);
    });
  });

  describe('verifyPaymentTransaction', () => {
    const network = new TestDogeNetwork();

    /**
     * @target DogeChain.verifyPaymentTransaction should return true
     * when data is consistent
     * @dependencies
     * @scenario
     * - mock a DogeTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when data is consistent', async () => {
      // mock a DogeTransaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const dogeChain = await testUtils.generateChainObject(network);
      const result = await dogeChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target DogeChain.verifyPaymentTransaction should return false
     * when transaction id is wrong
     * @dependencies
     * @scenario
     * - mock a DogeTransaction with changed txId
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when transaction id is wrong', async () => {
      // mock a DogeTransaction with changed txId
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.txId = testUtils.generateRandomId();

      // run test
      const dogeChain = await testUtils.generateChainObject(network);
      const result = await dogeChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target DogeChain.verifyPaymentTransaction should return false
     * when number of utxos is wrong
     * @dependencies
     * @scenario
     * - mock a DogeTransaction with less utxos
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when number of utxos is wrong', async () => {
      // mock a DogeTransaction with less utxos
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.inputUtxos.pop();

      // run test
      const dogeChain = await testUtils.generateChainObject(network);
      const result = await dogeChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target DogeChain.verifyPaymentTransaction should return false
     * when at least one of the utxos is wrong
     * @dependencies
     * @scenario
     * - mock a DogeTransaction with changed utxo
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when at least one of the utxos is wrong', async () => {
      // mock a DogeTransaction with changed utxo
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.inputUtxos[1] = JsonBigInt.stringify({
        txId: testUtils.generateRandomId(),
        index: 1,
      });

      // run test
      const dogeChain = await testUtils.generateChainObject(network);
      const result = await dogeChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });
});
