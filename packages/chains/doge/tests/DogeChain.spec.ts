import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import {
  ChainUtils,
  NotEnoughAssetsError,
  NotEnoughValidBoxesError,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { Psbt } from 'bitcoinjs-lib';
import { DogeChain, DogeTransaction, DogeUtxo, TssSignFunction } from '../lib';
import TestDogeNetwork from './network/TestDogeNetwork';
import { TestDogeChain } from './TestDogeChain';
import * as testData from './testData';
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
        testData.transaction2PaymentTransaction
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const dogeChain = testUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(dogeChain as any, 'getCoveringBoxes');
      getCovBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: testData.lockAddressUtxos,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        dogeChain,
        'hasLockAddressEnoughAssets'
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const result = await dogeChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [DogeTransaction.fromJson(testData.transaction1PaymentTransaction)],
        // [],
        []
      );
      const dogeTx = result as DogeTransaction;

      // check returned value
      expect(dogeTx.txType).toEqual(payment1.txType);
      expect(dogeTx.eventId).toEqual(payment1.eventId);
      expect(dogeTx.network).toEqual(payment1.network);
      expect(dogeTx.inputUtxos).toEqual(
        testData.lockAddressUtxos.map((utxo) => JsonBigInt.stringify(utxo))
      );

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = dogeChain.extractTransactionOrder(dogeTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called with correct arguments
      const expectedRequiredAssets = structuredClone(
        testData.transaction2Order[0].assets
      );
      expectedRequiredAssets.nativeToken += dogeChain.getMinimumNativeToken();
      expect(getCovBoxesSpy).toHaveBeenCalledWith(
        testUtils.configs.addresses.lock,
        expectedRequiredAssets,
        testData.transaction1InputIds,
        new Map()
      );
    });

    /**
     * @target DogeChain.generateTransaction should throw error
     * when lock address does not have enough assets
     * @dependencies
     * @scenario
     * - mock hasLockAddressEnoughAssets
     * - run test and expect error
     * @expected
     * - generateTransaction should throw NotEnoughAssetsError
     */
    it('should throw error when lock address does not have enough assets', async () => {
      // mock hasLockAddressEnoughAssets
      const dogeChain = testUtils.generateChainObject(network);
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        dogeChain,
        'hasLockAddressEnoughAssets'
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(false);

      // run test and expect error
      await expect(async () => {
        await dogeChain.generateTransaction(
          'event1',
          TransactionType.payment,
          testData.transaction2Order,
          [],
          []
        );
      }).rejects.toThrow(NotEnoughAssetsError);
    });

    /**
     * @target DogeChain.generateTransaction should throw error
     * when bank boxes can not cover order assets
     * @dependencies
     * @scenario
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - run test and expect error
     * @expected
     * - generateTransaction should throw NotEnoughValidBoxesError
     */
    it('should throw error when bank boxes can not cover order assets', async () => {
      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const dogeChain = testUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(dogeChain as any, 'getCoveringBoxes');
      getCovBoxesSpy.mockResolvedValue({
        covered: false,
        boxes: testData.lockAddressUtxos,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        dogeChain,
        'hasLockAddressEnoughAssets'
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test and expect error
      await expect(async () => {
        await dogeChain.generateTransaction(
          'event1',
          TransactionType.payment,
          testData.transaction2Order,
          [],
          []
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
        testData.transaction2PaymentTransaction
      );

      // run test
      const dogeChain = testUtils.generateChainObject(network);

      // check returned value
      const result = await dogeChain.getTransactionAssets(paymentTx);
      expect(result).toEqual(testData.transaction2Assets);
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
        testData.transaction2PaymentTransaction
      );

      // run test
      const dogeChain =
        testUtils.generateChainObjectWithMultiDecimalTokenMap(network);

      // check returned value
      const result = await dogeChain.getTransactionAssets(paymentTx);
      expect(result).toEqual(testData.transaction2WrappedAssets);
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
    it('should extract transaction order successfully', () => {
      // mock PaymentTransaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );
      const expectedOrder = testData.transaction2Order;

      // run test
      const dogeChain = testUtils.generateChainObject(network);
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
    it('should throw error when tx has OP_RETURN utxo', () => {
      // mock PaymentTransaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction1PaymentTransaction
      );

      // run test & check thrown exception
      const dogeChain = testUtils.generateChainObject(network);
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
    it('should wrap transaction order successfully', () => {
      // mock PaymentTransaction
      const paymentTx = DogeTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );
      const expectedOrder = testData.transaction2WrappedOrder;

      // run test
      const dogeChain =
        testUtils.generateChainObjectWithMultiDecimalTokenMap(network);
      const result = dogeChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });
  });
});
