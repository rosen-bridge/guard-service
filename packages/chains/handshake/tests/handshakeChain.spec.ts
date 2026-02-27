import JsonBigInt from '@rosen-bridge/json-bigint';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  ChainUtils,
  EcdsaSignMediator,
  NotEnoughAssetsError,
  NotEnoughValidBoxesError,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import {
  HandshakeChain,
  HandshakeTransaction,
  HandshakeUtxo,
  Serializer,
} from '../lib';
import TestHandshakeNetwork from './network/testHandshakeNetwork';
import * as testData from './testData';
import { TestHandshakeChain } from './testHandshakeChain';
import * as testUtils from './testUtils';

describe('HandshakeChain', () => {
  describe('generateTransaction', () => {
    const network = new TestHandshakeNetwork();

    /**
     * @target HandshakeChain.generateTransaction should generate payment
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
      const payment1 = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const handshakeChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(
        (handshakeChain as any).boxSelection, // eslint-disable-line @typescript-eslint/no-explicit-any
        'getCoveringBoxes',
      );
      getCovBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: testData.lockAddressUtxos,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        handshakeChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const result = await handshakeChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [
          HandshakeTransaction.fromJson(
            testData.transaction1PaymentTransaction,
          ),
        ],
        [],
      );
      const handshakeTx = result as HandshakeTransaction;

      // check returned value
      expect(handshakeTx.txType).toEqual(payment1.txType);
      expect(handshakeTx.eventId).toEqual(payment1.eventId);
      expect(handshakeTx.network).toEqual(payment1.network);
      expect(handshakeTx.inputUtxos).toHaveLength(2);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder =
        handshakeChain.extractTransactionOrder(handshakeTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called with correct arguments
      const expectedRequiredAssets = structuredClone(
        testData.transaction2Order[0].assets,
      );
      expectedRequiredAssets.nativeToken +=
        handshakeChain.getMinimumNativeToken();
      expect(getCovBoxesSpy).toHaveBeenCalledExactlyOnceWith(
        expectedRequiredAssets,
        testData.transaction1InputIds,
        new Map(),
        expect.any(Object),
        expect.any(BigInt),
        undefined,
        expect.any(Function),
      );
    });

    /**
     * @target HandshakeChain.generateTransaction should throw error
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
      const handshakeChain = await testUtils.generateChainObject(network);
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        handshakeChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(false);

      // run test and expect error
      await expect(async () => {
        await handshakeChain.generateTransaction(
          'event1',
          TransactionType.payment,
          testData.transaction2Order,
          [],
          [],
        );
      }).rejects.toThrow(NotEnoughAssetsError);
    });

    /**
     * @target HandshakeChain.generateTransaction should throw error
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
      const handshakeChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(
        (handshakeChain as any).boxSelection, // eslint-disable-line @typescript-eslint/no-explicit-any
        'getCoveringBoxes',
      );
      getCovBoxesSpy.mockResolvedValue({
        covered: false,
        boxes: testData.lockAddressUtxos,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        handshakeChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test and expect error
      await expect(async () => {
        await handshakeChain.generateTransaction(
          'event1',
          TransactionType.payment,
          testData.transaction2Order,
          [],
          [],
        );
      }).rejects.toThrow(NotEnoughValidBoxesError);
    });

    /**
     * @target HandshakeChain.generateTransaction should generate payment
     * transaction with wrapped order successfully
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
    it('should generate payment transaction with wrapped order successfully', async () => {
      // mock transaction order
      const order = testData.transaction2WrappedOrder;
      const payment1 = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const handshakeChain =
        await testUtils.generateChainObjectWithMultiDecimalTokenMap(network);
      const getCovBoxesSpy = vi.spyOn(
        (handshakeChain as any).boxSelection, // eslint-disable-line @typescript-eslint/no-explicit-any
        'getCoveringBoxes',
      );
      getCovBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: testData.lockAddressUtxos,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        handshakeChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const result = await handshakeChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [
          HandshakeTransaction.fromJson(
            testData.transaction1PaymentTransaction,
          ),
        ],
        [],
      );
      const handshakeTx = result as HandshakeTransaction;

      // check returned value
      expect(handshakeTx.txType).toEqual(payment1.txType);
      expect(handshakeTx.eventId).toEqual(payment1.eventId);
      expect(handshakeTx.network).toEqual(payment1.network);
      expect(handshakeTx.inputUtxos).toHaveLength(2);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder =
        handshakeChain.extractTransactionOrder(handshakeTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called with correct arguments
      const tokenMap = handshakeChain['tokenMap'];
      const expectedRequiredAssets = structuredClone(
        testData.transaction2WrappedOrder[0].assets,
      );
      expectedRequiredAssets.nativeToken +=
        handshakeChain.getMinimumNativeToken();
      expect(getCovBoxesSpy).toHaveBeenCalledExactlyOnceWith(
        ChainUtils.unwrapAssetBalance(
          expectedRequiredAssets,
          tokenMap,
          handshakeChain.NATIVE_TOKEN_ID,
          handshakeChain.CHAIN,
        ),
        testData.transaction1InputIds,
        new Map(),
        expect.any(Object),
        expect.any(BigInt),
        undefined,
        expect.any(Function),
      );
    });
  });

  describe('getTransactionAssets', () => {
    const network = new TestHandshakeNetwork();

    /**
     * @target HandshakeChain.getTransactionAssets should get transaction assets
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
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const handshakeChain = await testUtils.generateChainObject(network);

      // check returned value
      const result = await handshakeChain.getTransactionAssets(paymentTx);
      expect(result).toEqual(testData.transaction2Assets);
    });

    /**
     * @target HandshakeChain.getTransactionAssets should wrap transaction assets
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
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const handshakeChain =
        await testUtils.generateChainObjectWithMultiDecimalTokenMap(network);

      // check returned value
      const result = await handshakeChain.getTransactionAssets(paymentTx);
      expect(result).toEqual(testData.transaction2WrappedAssets);
    });
  });

  describe('extractTransactionOrder', () => {
    const network = new TestHandshakeNetwork();

    /**
     * @target HandshakeChain.extractTransactionOrder should extract transaction
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
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      const expectedOrder = testData.transaction2Order;

      // run test
      const handshakeChain = await testUtils.generateChainObject(network);
      const result = handshakeChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target HandshakeChain.extractTransactionOrder should wrap transaction
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
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      const expectedOrder = testData.transaction2WrappedOrder;

      // run test
      const handshakeChain =
        await testUtils.generateChainObjectWithMultiDecimalTokenMap(network);
      const result = handshakeChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target HandshakeChain.extractTransactionOrder should throw error
     * when an output has no address
     * @dependencies
     * @scenario
     * - mock Serializer.deserialize to return an output with missing address
     * - run test & check thrown exception
     * @expected
     * - it should throw Error
     */
    it('should throw error when an output has no address', async () => {
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      const deserializeSpy = vi
        .spyOn(Serializer, 'deserialize')
        .mockReturnValue(
          {
            outputs: [
              {
                getAddress: () => undefined,
                value: 1,
              },
            ],
          } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        );

      try {
        const handshakeChain = await testUtils.generateChainObject(network);
        expect(() => {
          handshakeChain.extractTransactionOrder(paymentTx);
        }).toThrow(Error);
      } finally {
        deserializeSpy.mockRestore();
      }
    });
  });

  describe('verifyTransactionFee', () => {
    const network = new TestHandshakeNetwork();

    /**
     * @target HandshakeChain.verifyTransactionFee should return true when fee
     * difference is less than allowed slippage
     * @dependencies
     * @scenario
     * - mock PaymentTransaction (tx2: 220 dollarydoo fee, ~208 vsize after witness)
     * - mock getFeeRatio to produce estimated fee close to actual fee
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when fee difference is less than allowed slippage', async () => {
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      // Actual fee: 220 dollarydoos, signed-vsize estimate: ~208
      // feeRatio = 220/208 ~= 1.06 produces estimated fee close to actual
      getFeeRatioSpy.mockResolvedValue(1.06);

      const handshakeChain = await testUtils.generateChainObject(network);
      const result = await handshakeChain.verifyTransactionFee(paymentTx);

      expect(result).toEqual(true);
    });

    /**
     * @target HandshakeChain.verifyTransactionFee should return false when fee
     * difference is more than allowed slippage
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock getFeeRatio with high value to trigger fee difference beyond slippage tolerance
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when fee difference is more than allowed slippage', async () => {
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(10); // High fee to trigger failure beyond slippage

      const handshakeChain = await testUtils.generateChainObject(network);
      const result = await handshakeChain.verifyTransactionFee(paymentTx);

      expect(result).toEqual(false);
    });
  });

  describe('verifyExtraCondition', () => {
    const network = new TestHandshakeNetwork();

    /**
     * @target: HandshakeChain.verifyTransactionExtraConditions should return true when all
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
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const handshakeChain = await testUtils.generateChainObject(network);
      const result = handshakeChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target: HandshakeChain.verifyTransactionExtraConditions should return false
     * when change box address is wrong
     * @dependencies
     * @scenario
     * - mock a payment transaction
     * - create a new HandshakeChain object with custom lock address
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when change box address is wrong', async () => {
      // mock a payment transaction
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );

      // create a new HandshakeChain object with custom lock address
      const newConfigs = structuredClone(testUtils.configs);
      newConfigs.addresses.lock = 'hs1qjcm86gyr7md4xuk0w7guwya3nqhd69nxurtlsj'; // Different address
      const tokenMap = new TokenMap();
      await tokenMap.updateConfigByJson(testData.testTokenMap);
      const handshakeChain = new HandshakeChain(
        network,
        newConfigs,
        tokenMap,
        testUtils.mockedSignMediator,
      );

      // run test
      const result = handshakeChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('isTxValid', () => {
    const network = new TestHandshakeNetwork();

    /**
     * @target HandshakeChain.isTxValid should return true when
     * all tx inputs are valid
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
    it('should return true when all tx inputs are valid', async () => {
      const payment1 = HandshakeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );

      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy.mockResolvedValue(true);

      const handshakeChain = await testUtils.generateChainObject(network);
      const result = await handshakeChain.isTxValid(payment1);

      expect(result).toEqual({
        isValid: true,
        details: undefined,
      });
      expect(isBoxUnspentAndValidSpy).toHaveBeenCalledExactlyOnceWith(
        testData.transaction0Input0BoxId,
      );
    });

    /**
     * @target HandshakeChain.isTxValid should return false when at least one input
     * is invalid
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock a network object to return as invalid for first input
     * - run test
     * - check returned value
     * @expected
     * - it should return false and as expected invalidation
     */
    it('should return false when at least one input is invalid', async () => {
      const payment1 = HandshakeTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );

      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy.mockResolvedValue(false);

      const handshakeChain = await testUtils.generateChainObject(network);
      const result = await handshakeChain.isTxValid(payment1);

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
    const network = new TestHandshakeNetwork();

    /**
     * @target HandshakeChain.signTransaction should return PaymentTransaction of the
     * signed transaction
     * @dependencies
     * @scenario
     * - mock a sign function to return signature for expected messages
     * - mock PaymentTransaction of unsigned transaction
     * - run test
     * - check returned value
     * @expected
     * - it should return PaymentTransaction of signed transaction (all fields
     *   are same as input object, and txBytes should be equal to expected signed
     *   transaction data)
     */
    it('should return PaymentTransaction of the signed transaction', async () => {
      // mock a sign function to return signature
      const signMediator: EcdsaSignMediator = {
        sign: async (hash: Uint8Array) => {
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
        },
        isInSign: vi.fn(),
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const handshakeChain = await testUtils.generateChainObject(
        network,
        signMediator,
      );
      const result = await handshakeChain.signTransaction(paymentTx, 0);

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
     * @target HandshakeChain.signTransaction should throw error when at least signing of one message is failed
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
      const signMediator: EcdsaSignMediator = {
        sign: async (hash: Uint8Array) => {
          if (
            Buffer.from(hash).toString('hex') ===
            testData.transaction2HashMessage0
          )
            return {
              signature: testData.transaction2Signature0,
              signatureRecovery: '',
            };
          else throw Error(`TestError: sign failed`);
        },
        isInSign: vi.fn(),
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const handshakeChain = await testUtils.generateChainObject(
        network,
        signMediator,
      );

      await expect(async () => {
        await handshakeChain.signTransaction(paymentTx, 0);
      }).rejects.toThrow('TestError: sign failed');
    });
  });

  describe('isTransactionInSign', () => {
    const network = new TestHandshakeNetwork();

    /**
     * @target HandshakeChain.isTransactionInSign should return true if transaction is in sign
     * @dependencies
     * @scenario
     * - mock isInSign to return true
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true if transaction is in sign', async () => {
      // mock isInSign to return true
      const signMediator: EcdsaSignMediator = {
        sign: vi.fn(),
        isInSign: vi.fn().mockResolvedValue(true),
      };

      // mock PaymentTransaction
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const handshakeChain = await testUtils.generateChainObject(
        network,
        signMediator,
      );
      const result = await handshakeChain.isTransactionInSign(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target HandshakeChain.isTransactionInSign should return false if transaction is not in sign
     * @dependencies
     * @scenario
     * - mock isInSign to return false
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false if transaction is not in sign', async () => {
      // mock isInSign to return false
      const signMediator: EcdsaSignMediator = {
        sign: vi.fn(),
        isInSign: vi.fn().mockResolvedValue(false),
      };

      // mock PaymentTransaction
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const handshakeChain = await testUtils.generateChainObject(
        network,
        signMediator,
      );
      const result = await handshakeChain.isTransactionInSign(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyPaymentTransaction', () => {
    const network = new TestHandshakeNetwork();

    /**
     * @target HandshakeChain.verifyPaymentTransaction should return true
     * when data is consistent
     * @dependencies
     * @scenario
     * - mock a HandshakeTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when data is consistent', async () => {
      // mock a HandshakeTransaction
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const handshakeChain = await testUtils.generateChainObject(network);
      const result = await handshakeChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target HandshakeChain.verifyPaymentTransaction should return false
     * when transaction id is wrong
     * @dependencies
     * @scenario
     * - mock a HandshakeTransaction with changed txId
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when transaction id is wrong', async () => {
      // mock a HandshakeTransaction with changed txId
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.txId = testUtils.generateRandomId();

      // run test
      const handshakeChain = await testUtils.generateChainObject(network);
      const result = await handshakeChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target HandshakeChain.verifyPaymentTransaction should return false
     * when number of utxos is wrong
     * @dependencies
     * @scenario
     * - mock a HandshakeTransaction with less utxos
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when number of utxos is wrong', async () => {
      // mock a HandshakeTransaction with less utxos
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.inputUtxos.pop();

      // run test
      const handshakeChain = await testUtils.generateChainObject(network);
      const result = await handshakeChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target HandshakeChain.verifyPaymentTransaction should return false
     * when at least one of the utxos is wrong
     * @dependencies
     * @scenario
     * - mock a HandshakeTransaction with changed utxo
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when at least one of the utxos is wrong', async () => {
      // mock a HandshakeTransaction with changed utxo
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.inputUtxos[1] = JsonBigInt.stringify({
        txId: testUtils.generateRandomId(),
        index: 1,
        value: '5000000',
      });

      // run test
      const handshakeChain = await testUtils.generateChainObject(network);
      const result = await handshakeChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('getTransactionsBoxMapping', async () => {
    const network = new TestHandshakeNetwork();
    const tokenMap = new TokenMap();
    await tokenMap.updateConfigByJson(testData.testTokenMap);
    const testInstance = new TestHandshakeChain(
      network,
      testUtils.configs,
      tokenMap,
      null as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    /**
     * @target HandshakeChain.getTransactionsBoxMapping should construct mapping
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
      const transactions = [testData.transaction2PaymentTransaction].map(
        (txJson) =>
          Serializer.deserialize(HandshakeTransaction.fromJson(txJson).txBytes),
      );

      // run test
      const result = testInstance.callGetTransactionsBoxMapping(
        transactions,
        testUtils.configs.addresses.lock,
      );

      // check returned value
      const trackMap = new Map<string, HandshakeUtxo | undefined>();
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      const tx = Serializer.deserialize(paymentTx.txBytes);
      const trackedOutput = tx.outputs[1];
      paymentTx.inputUtxos.forEach((utxo) => {
        const candidate = JsonBigInt.parse(utxo) as HandshakeUtxo;
        trackMap.set(`${candidate.txId}.${candidate.index}`, {
          txId: paymentTx.txId,
          index: 1,
          value: BigInt(trackedOutput.value),
        });
      });
      expect(result).toEqual(trackMap);
    });

    /**
     * @target HandshakeChain.getTransactionsBoxMapping should map inputs to
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
      const transactions = [testData.transaction2PaymentTransaction].map(
        (txJson) =>
          Serializer.deserialize(HandshakeTransaction.fromJson(txJson).txBytes),
      );

      // run test
      const result = testInstance.callGetTransactionsBoxMapping(
        transactions,
        'another address',
      );

      // check returned value
      const trackMap = new Map<string, HandshakeUtxo | undefined>();
      const paymentTx = HandshakeTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.inputUtxos.forEach((utxo) => {
        const candidate = JsonBigInt.parse(utxo) as HandshakeUtxo;
        trackMap.set(`${candidate.txId}.${candidate.index}`, undefined);
      });
      expect(result).toEqual(trackMap);
    });
  });

  describe('rawTxToPaymentTransaction', () => {
    const network = new TestHandshakeNetwork();

    /**
     * @target HandshakeChain.rawTxToPaymentTransaction should construct transaction successfully
     * @dependencies
     * @scenario
     * - mock getUtxo for inputs
     * - run test
     * - check returned value
     * @expected
     * - it should return construction of PaymentTransaction correctly
     *   (txId, eventId, txType and inputUtxos should be as expected)
     */
    it('should construct transaction successfully', async () => {
      // mock getUtxo for inputs
      const getUtxoSpy = vi.spyOn(network, 'getUtxo');
      getUtxoSpy.mockResolvedValueOnce(testData.lockAddressUtxos[0]);

      // run test
      const handshakeChain = await testUtils.generateChainObject(network);
      const transaction1 = JSON.parse(testData.transaction1PaymentTransaction);
      const result = await handshakeChain.rawTxToPaymentTransaction(
        transaction1.txBytes,
      );

      // check returned value
      expect(result.txId).toEqual(transaction1.txId);
      expect(result.eventId).toEqual('');
      expect(result.txType).toEqual(TransactionType.manual);
      expect(Buffer.from(result.txBytes).toString('hex')).toEqual(
        transaction1.txBytes,
      );
    });
  });
});
