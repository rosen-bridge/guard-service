import { Psbt } from 'bitcoinjs-lib';
import { expect, describe, it, vi } from 'vitest';

import JsonBigInt from '@rosen-bridge/json-bigint';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  TransactionType,
  NotEnoughAssetsError,
  NotEnoughValidBoxesError,
} from '@rosen-chains/abstract-chain';

import { FIRO_NETWORK, FiroTransaction, FiroUtxo } from '../lib';
import * as testData from './chainTestData';
import * as testUtils from './firoTestUtils';
import TestFiroNetwork from './network/testFiroNetwork';
import { TestFiroChain } from './testFiroChain';

describe('FiroChain', () => {
  describe('generateMultipleTransactions', () => {
    const network = new TestFiroNetwork();

    beforeEach(() => {
      vi.spyOn(network, 'getHeight').mockResolvedValue(123);
      vi.spyOn(network, 'getAddressAssets').mockResolvedValue({
        nativeToken: 100000000n,
        tokens: [],
      });
    });

    /**
     * @target FiroChain.generateMultipleTransactions should generate payment
     * transaction successfully
     * @dependencies
     * @scenario
     * - mock transaction order, getFeeRatio
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - run test
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId and inputUtxos should be as expected
     * - extracted order of generated transaction should be the same as input order
     * - getCoveringBoxes should have been called with correct arguments
     */
    it('should generate payment transaction successfully', async () => {
      // mock transaction order
      const order = testData.transaction2Order;
      const eventId = 'test-event-1';
      const txType = TransactionType.payment;

      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getTransactionHex for each UTXO
      const getTransactionHexSpy = vi.spyOn(network, 'getTransactionHex');
      testData.largeTestUtxos.forEach((utxo) => {
        getTransactionHexSpy.mockResolvedValueOnce(utxo.txHex);
      });

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const firoChain = await testUtils.generateChainObject(network);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const boxSelection = (firoChain as any).boxSelection;

      const getCovBoxesSpy = vi.spyOn(boxSelection, 'getCoveringBoxes');
      getCovBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: testData.largeTestUtxos,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        firoChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const result = await firoChain.generateMultipleTransactions(
        eventId,
        txType,
        order,
        [],
        [],
      );

      // check returned value
      expect(result.length).toBe(1);
      const firoTx = result[0] as FiroTransaction;
      expect(firoTx.txType).toEqual(txType);
      expect(firoTx.eventId).toEqual(eventId);
      expect(firoTx.inputUtxos).toEqual(
        testData.largeTestUtxos.map((utxo) => JsonBigInt.stringify(utxo)),
      );

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = firoChain.extractTransactionOrder(firoTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called with correct arguments
      const expectedRequiredAssets = structuredClone(
        testData.transaction2Order[0].assets,
      );
      expectedRequiredAssets.nativeToken += firoChain.getMinimumNativeToken();
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
     * @target FiroChain.generateMultipleTransactions should throw error
     * when lock address does not have enough assets
     * @dependencies
     * @scenario
     * - mock hasLockAddressEnoughAssets to return false
     * - mock getFeeRatio
     * - run test and expect error
     * @expected
     * - generateMultipleTransactions should throw NotEnoughAssetsError
     */
    it('should throw error when lock address does not have enough assets', async () => {
      // mock hasLockAddressEnoughAssets to return false
      const firoChain = await testUtils.generateChainObject(network);
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        firoChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(false);
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // run test and expect error
      await expect(async () => {
        await firoChain.generateMultipleTransactions(
          'event1',
          TransactionType.payment,
          testData.transaction2Order,
          [],
          [],
        );
      }).rejects.toThrow(NotEnoughAssetsError);
    });

    /**
     * @target FiroChain.generateMultipleTransactions should throw error
     * when bank boxes cannot cover order assets
     * @dependencies
     * @scenario
     * - mock getCoveringBoxes to return covered: false
     * - mock hasLockAddressEnoughAssets
     * - mock getFeeRatio
     * - run test and expect error
     * @expected
     * - generateMultipleTransactions should throw NotEnoughValidBoxesError
     */
    it('should throw error when bank boxes cannot cover order assets', async () => {
      // mock getCoveringBoxes to return covered: false
      const firoChain = await testUtils.generateChainObject(network);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const boxSelection = (firoChain as any).boxSelection;
      const getCovBoxesSpy = vi.spyOn(boxSelection, 'getCoveringBoxes');
      getCovBoxesSpy.mockResolvedValue({
        covered: false,
        boxes: [],
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        firoChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // run test and expect error
      await expect(async () => {
        await firoChain.generateMultipleTransactions(
          'event1',
          TransactionType.payment,
          testData.transaction2Order,
          [],
          [],
        );
      }).rejects.toThrow(NotEnoughValidBoxesError);
    });

    /**
     * @target FiroChain.generateMultipleTransactions should generate payment
     * while considering forbidden boxes caused by a serialized unsigned transaction
     * @dependencies
     * @scenario
     * - mock transaction order, getFeeRatio
     * - mock getCoveringBoxes to check forbidden boxes
     * - mock hasLockAddressEnoughAssets
     * - serialize an unsigned transaction and pass it in serializedSignedTransactions array
     * - run test and check that forbidden boxes are extracted from the serialized tx
     * - check returned value
     * @expected
     * - PaymentTransaction should be generated successfully
     * - forbidden boxes from serialized unsigned tx should be passed to getCoveringBoxes
     */
    it('should handle forbidden boxes from serialized unsigned transaction', async () => {
      // mock transaction order
      const order = testData.transaction2Order;
      const eventId = 'test-event-2';
      const txType = TransactionType.payment;

      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getTransactionHex for each UTXO
      const getTransactionHexSpy = vi.spyOn(network, 'getTransactionHex');
      testData.largeTestUtxos.forEach((utxo) => {
        getTransactionHexSpy.mockResolvedValueOnce(utxo.txHex);
      });

      // mock getCoveringBoxes
      const firoChain = await testUtils.generateChainObject(network);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const boxSelection = (firoChain as any).boxSelection;
      const getCovBoxesSpy = vi.spyOn(boxSelection, 'getCoveringBoxes');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getCovBoxesSpy.mockImplementation(async (...args: any[]) => {
        const forbiddenBoxIds = args[1] as Array<string>;
        // Check that forbidden box IDs are passed
        if (forbiddenBoxIds.length > 0) {
          return {
            covered: true,
            boxes: [testData.largeTestUtxos[0]], // Use first UTXO (4B satoshis, enough to cover order)
          };
        }
        return {
          covered: true,
          boxes: testData.largeTestUtxos,
        };
      });

      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        firoChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // Create unsigned transaction and serialize it as hex
      const unsignedTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      const serializedUnsignedTx = Buffer.from(unsignedTx.txBytes).toString(
        'hex',
      );

      // run test - passing serialized unsigned tx in serializedSignedTransactions array
      const result = await firoChain.generateMultipleTransactions(
        eventId,
        txType,
        order,
        [],
        [serializedUnsignedTx],
      );

      // check returned value
      expect(result.length).toBe(1);
      const firoTx = result[0] as FiroTransaction;
      expect(firoTx.txType).toEqual(txType);
      expect(firoTx.eventId).toEqual(eventId);

      // Verify getCoveringBoxes was called with forbidden boxes
      expect(getCovBoxesSpy).toHaveBeenCalled();
      const callArgs = getCovBoxesSpy.mock.calls[0];
      const forbiddenBoxIds = callArgs[1] as Array<string>;
      expect(forbiddenBoxIds.length).toBeGreaterThan(0);
    });
  });

  describe('verifyPaymentTransaction', () => {
    const network = new TestFiroNetwork();

    /**
     * @target FiroChain.verifyPaymentTransaction should return true
     * when data is consistent
     * @dependencies
     * @scenario
     * - mock a FiroTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when data is consistent', async () => {
      // mock a FiroTransaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = await firoChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target FiroChain.verifyPaymentTransaction should return false
     * when transaction id is wrong
     * @dependencies
     * @scenario
     * - mock a FiroTransaction with changed txId
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when transaction id is wrong', async () => {
      // mock a FiroTransaction with changed txId
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.txId = testUtils.generateRandomId();

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = await firoChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target FiroChain.verifyPaymentTransaction should return false
     * when number of utxos is wrong
     * @dependencies
     * @scenario
     * - mock a FiroTransaction with less utxos
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when number of utxos is wrong', async () => {
      // mock a FiroTransaction with less utxos
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.inputUtxos.pop();

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = await firoChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target FiroChain.verifyPaymentTransaction should return false
     * when at least one of the utxos is wrong
     * @dependencies
     * @scenario
     * - mock a FiroTransaction with changed utxo
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when at least one of the utxos is wrong', async () => {
      // mock a FiroTransaction with changed utxo
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.inputUtxos[0] = JsonBigInt.stringify({
        txId: testUtils.generateRandomId(),
        index: 0,
        value: 10000000,
      });

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = await firoChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('getTransactionAssets', () => {
    const network = new TestFiroNetwork();

    /**
     * @target FiroChain.getTransactionAssets should get transaction assets
     * successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should extract the transaction assets correctly
     */
    it('should get transaction assets successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = await firoChain.getTransactionAssets(paymentTx);

      // check returned value
      expect(result).toEqual(testData.transaction2Assets);
    });

    /**
     * @target FiroChain.getTransactionAssets should wrap transaction assets
     * successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test with multi-decimal token map
     * - check returned value
     * @expected
     * - it should wrap transaction assets from 8 decimals to 3 decimals
     */
    it('should wrap transaction assets successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const firoChain =
        await testUtils.generateChainObjectWithMultiDecimalTokenMap(network);
      const result = await firoChain.getTransactionAssets(paymentTx);

      // check returned value
      expect(result).toEqual(testData.transaction2WrappedAssets);
    });
  });

  describe('extractTransactionOrder', () => {
    const network = new TestFiroNetwork();

    /**
     * @target FiroChain.extractTransactionOrder should extract transaction
     * order successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return transaction order
     */
    it('should extract transaction order successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = firoChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(testData.transaction2Order);
    });

    /**
     * @target FiroChain.extractTransactionOrder should wrap transaction order
     * successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test with multi-decimal token map
     * - check returned value
     * @expected
     * - it should wrap transaction order from 8 decimals to 3 decimals
     */
    it('should wrap transaction order successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const firoChain =
        await testUtils.generateChainObjectWithMultiDecimalTokenMap(network);
      const result = firoChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(testData.transaction2WrappedExtractionOrder);
    });
  });

  describe('verifyTransactionFee', () => {
    const network = new TestFiroNetwork();

    /**
     * @target FiroChain.verifyTransactionFee should return true when fee
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
      // mock PaymentTransaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // Fee: 40000000 satoshis, tx size: 374 bytes (2 inputs, 2 outputs)
      // Fee ratio = 40000000 / 374 ≈ 106952
      const feeRatio = 106952;
      // mock getFeeRatio
      vi.spyOn(network, 'getFeeRatio').mockResolvedValue(feeRatio);

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = await firoChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toBe(true);
    });

    /**
     * @target FiroChain.verifyTransactionFee should return false when fee
     * difference is more than allowed slippage
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock getFeeRatio with very low value
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when fee difference is more than allowed slippage', async () => {
      // mock PaymentTransaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // mock getFeeRatio with very low value to trigger high slippage
      vi.spyOn(network, 'getFeeRatio').mockResolvedValue(1);

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = await firoChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyTransactionExtraConditions', () => {
    const network = new TestFiroNetwork();

    /**
     * @target FiroChain.verifyTransactionExtraConditions should return true when
     * change box script matches lock script
     * @dependencies
     * @scenario
     * - mock a payment transaction with valid change box
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when change box script is valid', async () => {
      // mock a payment transaction with valid change box
      const paymentTx = FiroTransaction.fromJson(
        testData.validChangeBoxPaymentTransaction,
      );

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = firoChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toBe(true);
    });

    /**
     * @target FiroChain.verifyTransactionExtraConditions should return false when
     * change box script does not match lock script
     * @dependencies
     * @scenario
     * - mock a payment transaction with wrong change box address
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when change box script is invalid', async () => {
      // mock a payment transaction with wrong change box (aJnZc2GfHvwgNUC481EF18fkfcE9vP1EuS instead of lock address)
      const paymentTx = FiroTransaction.fromJson(
        testData.invalidChangeBoxPaymentTransaction,
      );

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = firoChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toBe(false);
    });
  });

  describe('isTxValid', () => {
    const network = new TestFiroNetwork();

    /**
     * @target FiroChain.isTxValid should return valid status when all inputs are unspent
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock network unspent box validation
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return valid status when all inputs are unspent', async () => {
      // mock PaymentTransaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // mock network validation
      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy.mockResolvedValue(true);

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = await firoChain.isTxValid(paymentTx);

      // check returned value
      expect(result).toEqual({
        isValid: true,
        details: undefined,
      });
      // Should be called twice - once for each input
      expect(isBoxUnspentAndValidSpy).toHaveBeenCalledTimes(2);
      expect(isBoxUnspentAndValidSpy).toHaveBeenNthCalledWith(
        1,
        testData.transaction2Input0BoxId,
      );
      expect(isBoxUnspentAndValidSpy).toHaveBeenNthCalledWith(
        2,
        testData.transaction2Input1BoxId,
      );
    });

    /**
     * @target FiroChain.isTxValid should return false when at least one input
     * is invalid
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock a network object to return as invalid for the first input
     * - run test
     * - check returned value
     * - check if function got called
     * @expected
     * - it should return false and as expected invalidation
     */
    it('should return false when at least one input is invalid', async () => {
      // mock PaymentTransaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // mock network validation - return false for spent input
      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy.mockResolvedValue(false);

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = await firoChain.isTxValid(paymentTx);

      // check returned value
      expect(result).toEqual({
        isValid: false,
        details: {
          reason: expect.any(String),
          unexpected: false,
        },
      });
      expect(isBoxUnspentAndValidSpy).toHaveBeenCalledExactlyOnceWith(
        testData.transaction2Input0BoxId,
      );
    });
  });

  describe('getTransactionsBoxMapping', async () => {
    const network = new TestFiroNetwork();
    const tokenMap = new TokenMap();
    await tokenMap.updateConfigByJson(testData.testTokenMapRosen);
    const testInstance = new TestFiroChain(
      network,
      testData.testFiroConfigs,
      tokenMap,
      null as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    /**
     * @target FiroChain.getTransactionsBoxMapping should construct mapping
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
        Psbt.fromHex(testData.transaction2SignedTxBytesHex, {
          network: FIRO_NETWORK,
        }),
      ];

      // run test
      const result = testInstance.callGetTransactionsBoxMapping(
        transactions,
        testData.testFiroConfigs.addresses.lock,
      );

      // check returned value
      const trackMap = new Map<string, FiroUtxo | undefined>();
      const boxMapping = testData.transaction2BoxMapping;
      boxMapping.forEach((mapping) => {
        const candidate = JsonBigInt.parse(
          mapping.serializedOutput,
        ) as FiroUtxo;
        trackMap.set(mapping.inputId, {
          txId: candidate.txId,
          index: Number(candidate.index),
          value: candidate.value,
        });
      });
      expect(result).toEqual(trackMap);
    });

    /**
     * @target FiroChain.getTransactionsBoxMapping should map inputs to
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
        Psbt.fromHex(testData.transaction2SignedTxBytesHex, {
          network: FIRO_NETWORK,
        }),
      ];

      // run test
      const result = testInstance.callGetTransactionsBoxMapping(
        transactions,
        'another address',
      );

      // check returned value
      const trackMap = new Map<string, FiroUtxo | undefined>();
      const boxMapping = testData.transaction2BoxMapping;
      boxMapping.forEach((mapping) => {
        trackMap.set(mapping.inputId, undefined);
      });
      expect(result).toEqual(trackMap);
    });
  });

  describe('signTransaction', () => {
    const network = new TestFiroNetwork();

    /**
     * @target FiroChain.signTransaction should return PaymentTransaction of the
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
      const signFunction = async (hash: Uint8Array) => {
        const hashHex = Buffer.from(hash).toString('hex');
        if (hashHex === testData.transaction2HashMessage0)
          return {
            signature: testData.transaction2Signature0,
            signatureRecovery: '',
          };
        else if (hashHex === testData.transaction2HashMessage1)
          return {
            signature: testData.transaction2Signature1,
            signatureRecovery: '',
          };
        else
          throw Error(
            `TestError: sign function is called with wrong message [${hashHex}]`,
          );
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const firoChain = await testUtils.generateChainObject(network, {
        sign: signFunction,
        isInSign: vi.fn(),
      });
      const result = await firoChain.signTransaction(paymentTx);

      // check returned value
      expect(result.txId).toEqual(paymentTx.txId);
      expect(result.eventId).toEqual(paymentTx.eventId);
      expect(Buffer.from(result.txBytes).toString('hex')).toEqual(
        testData.transaction2SignedTxBytesHex,
      );
      expect(result.txType).toEqual(paymentTx.txType);
      expect(result.network).toEqual(paymentTx.network);
    });

    /**
     * @target FiroChain.signTransaction should throw error when at least signing of one message is failed
     * @dependencies
     * @scenario
     * - mock a sign function to throw error
     * - mock PaymentTransaction of unsigned transaction
     * - run test & check thrown exception
     * @expected
     * - it should throw the exact error thrown by sign function
     */
    it('should throw error when at least signing of one message is failed', async () => {
      // mock a sign function to throw error
      const signFunction = async () => {
        throw Error(`TestError: sign failed`);
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const firoChain = await testUtils.generateChainObject(network, {
        sign: signFunction,
        isInSign: vi.fn(),
      });

      await expect(async () => {
        await firoChain.signTransaction(paymentTx);
      }).rejects.toThrow('TestError: sign failed');
    });
  });

  describe('rawTxToPaymentTransaction', () => {
    const network = new TestFiroNetwork();

    /**
     * @target FiroChain.rawTxToPaymentTransaction should construct transaction successfully
     * @dependencies
     * @scenario
     * - mock PSBT hex string
     * - mock network getUtxo calls
     * - run test
     * - check returned value
     * @expected
     * - it should return constructed PaymentTransaction with manual type
     */
    it('should construct transaction successfully', async () => {
      // mock PaymentTransaction
      const expectedTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      expectedTx.eventId = '';
      expectedTx.txType = TransactionType.manual;

      // mock getUtxo
      const getUtxoSpy = vi.spyOn(network, 'getUtxo');
      expectedTx.inputUtxos.forEach((utxo) =>
        getUtxoSpy.mockResolvedValueOnce(JsonBigInt.parse(utxo)),
      );

      // run test
      const firoChain = await testUtils.generateChainObject(network);
      const result = await firoChain.rawTxToPaymentTransaction(
        Buffer.from(expectedTx.txBytes).toString('hex'),
      );

      // check returned value
      expect(result.toJson()).toEqual(expectedTx.toJson());
    });
  });

  describe('isTransactionInSign', () => {
    const network = new TestFiroNetwork();

    /**
     * @target FiroChain.isTransactionInSign should return true when at least one input is in sign
     * @dependencies
     * @scenario
     * - mock an isInSign function to return true only for one input
     * - mock PaymentTransaction of unsigned transaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when at least one input is in sign', async () => {
      // mock an isInSign function to return true only for one input
      const isInSignFunction = async (hash: Uint8Array) => {
        const hashHex = Buffer.from(hash).toString('hex');
        if (hashHex === testData.transaction2HashMessage0) return false;
        else if (hashHex === testData.transaction2HashMessage1) return true;
        else
          throw Error(
            `TestError: isInSign function is called with wrong message [${hashHex}]`,
          );
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const firoChain = await testUtils.generateChainObject(network, {
        sign: vi.fn(),
        isInSign: isInSignFunction,
      });
      const result = await firoChain.isTransactionInSign(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target FiroChain.isTransactionInSign should return false when no input is in sign
     * @dependencies
     * @scenario
     * - mock an isInSign function to return false only for one input
     * - mock PaymentTransaction of unsigned transaction
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when no input is in sign', async () => {
      // mock an isInSign function to return false only for one input
      const isInSignFunction = async (hash: Uint8Array) => {
        const hashHex = Buffer.from(hash).toString('hex');
        if (hashHex === testData.transaction2HashMessage0) return false;
        else if (hashHex === testData.transaction2HashMessage1) return false;
        else
          throw Error(
            `TestError: isInSign function is called with wrong message [${hashHex}]`,
          );
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = FiroTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const firoChain = await testUtils.generateChainObject(network, {
        sign: vi.fn(),
        isInSign: isInSignFunction,
      });
      const result = await firoChain.isTransactionInSign(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });
});
