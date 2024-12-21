import { vi } from 'vitest';
import {
  ChainUtils,
  NotEnoughAssetsError,
  NotEnoughValidBoxesError,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { Psbt } from 'bitcoinjs-lib';
import {
  BitcoinChain,
  BitcoinTransaction,
  BitcoinUtxo,
  SEGWIT_INPUT_WEIGHT_UNIT,
  TssSignFunction,
} from '../lib';
import TestBitcoinNetwork from './network/TestBitcoinNetwork';
import { TestBitcoinChain } from './TestBitcoinChain';
import * as testData from './testData';
import * as testUtils from './testUtils';
import { TokenMap } from '@rosen-bridge/tokens';

describe('BitcoinChain', () => {
  describe('generateTransaction', () => {
    const network = new TestBitcoinNetwork();

    /**
     * @target BitcoinChain.generateTransaction should generate payment
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
      const payment1 = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const bitcoinChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(bitcoinChain as any, 'getCoveringBoxes');
      getCovBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: testData.lockAddressUtxos,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        bitcoinChain,
        'hasLockAddressEnoughAssets'
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const result = await bitcoinChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [BitcoinTransaction.fromJson(testData.transaction1PaymentTransaction)],
        []
      );
      const bitcoinTx = result as BitcoinTransaction;

      // check returned value
      expect(bitcoinTx.txType).toEqual(payment1.txType);
      expect(bitcoinTx.eventId).toEqual(payment1.eventId);
      expect(bitcoinTx.network).toEqual(payment1.network);
      expect(bitcoinTx.inputUtxos).toEqual(
        testData.lockAddressUtxos.map((utxo) => JsonBigInt.stringify(utxo))
      );

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = bitcoinChain.extractTransactionOrder(bitcoinTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called with correct arguments
      const expectedRequiredAssets = structuredClone(
        testData.transaction2Order[0].assets
      );
      expectedRequiredAssets.nativeToken +=
        bitcoinChain.getMinimumNativeToken();
      expect(getCovBoxesSpy).toHaveBeenCalledWith(
        testUtils.configs.addresses.lock,
        expectedRequiredAssets,
        testData.transaction1InputIds,
        new Map()
      );
    });

    /**
     * @target BitcoinChain.generateTransaction should throw error
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
      const bitcoinChain = await testUtils.generateChainObject(network);
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        bitcoinChain,
        'hasLockAddressEnoughAssets'
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(false);

      // run test and expect error
      await expect(async () => {
        await bitcoinChain.generateTransaction(
          'event1',
          TransactionType.payment,
          testData.transaction2Order,
          [],
          []
        );
      }).rejects.toThrow(NotEnoughAssetsError);
    });

    /**
     * @target BitcoinChain.generateTransaction should throw error
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
      const bitcoinChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(bitcoinChain as any, 'getCoveringBoxes');
      getCovBoxesSpy.mockResolvedValue({
        covered: false,
        boxes: testData.lockAddressUtxos,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        bitcoinChain,
        'hasLockAddressEnoughAssets'
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test and expect error
      await expect(async () => {
        await bitcoinChain.generateTransaction(
          'event1',
          TransactionType.payment,
          testData.transaction2Order,
          [],
          []
        );
      }).rejects.toThrow(NotEnoughValidBoxesError);
    });

    /**
     * @target BitcoinChain.generateTransaction should generate payment
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
      const payment1 = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const bitcoinChain =
        await testUtils.generateChainObjectWithMultiDecimalTokenMap(network);
      const getCovBoxesSpy = vi.spyOn(bitcoinChain as any, 'getCoveringBoxes');
      getCovBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: testData.lockAddressUtxos,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        bitcoinChain,
        'hasLockAddressEnoughAssets'
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const result = await bitcoinChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [BitcoinTransaction.fromJson(testData.transaction1PaymentTransaction)],
        []
      );
      const bitcoinTx = result as BitcoinTransaction;

      // check returned value
      expect(bitcoinTx.txType).toEqual(payment1.txType);
      expect(bitcoinTx.eventId).toEqual(payment1.eventId);
      expect(bitcoinTx.network).toEqual(payment1.network);
      expect(bitcoinTx.inputUtxos).toEqual(
        testData.lockAddressUtxos.map((utxo) => JsonBigInt.stringify(utxo))
      );

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = bitcoinChain.extractTransactionOrder(bitcoinTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called with correct arguments
      const tokenMap = bitcoinChain['tokenMap'];
      const expectedRequiredAssets = ChainUtils.wrapAssetBalance(
        testData.transaction2Order[0].assets,
        tokenMap,
        bitcoinChain.NATIVE_TOKEN_ID,
        bitcoinChain.CHAIN
      );
      expectedRequiredAssets.nativeToken += tokenMap.wrapAmount(
        bitcoinChain.NATIVE_TOKEN_ID,
        BigInt(Math.ceil(SEGWIT_INPUT_WEIGHT_UNIT / 4)),
        bitcoinChain.CHAIN
      ).amount;
      expect(getCovBoxesSpy).toHaveBeenCalledWith(
        testUtils.configs.addresses.lock,
        ChainUtils.unwrapAssetBalance(
          expectedRequiredAssets,
          tokenMap,
          bitcoinChain.NATIVE_TOKEN_ID,
          bitcoinChain.CHAIN
        ),
        testData.transaction1InputIds,
        new Map()
      );
    });
  });

  describe('getTransactionAssets', () => {
    const network = new TestBitcoinNetwork();

    /**
     * @target BitcoinChain.getTransactionAssets should get transaction assets
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
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );

      // run test
      const bitcoinChain = await testUtils.generateChainObject(network);

      // check returned value
      const result = await bitcoinChain.getTransactionAssets(paymentTx);
      expect(result).toEqual(testData.transaction2Assets);
    });

    /**
     * @target BitcoinChain.getTransactionAssets should wrap transaction assets
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
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );

      // run test
      const bitcoinChain =
        await testUtils.generateChainObjectWithMultiDecimalTokenMap(network);

      // check returned value
      const result = await bitcoinChain.getTransactionAssets(paymentTx);
      expect(result).toEqual(testData.transaction2WrappedAssets);
    });
  });

  describe('extractTransactionOrder', () => {
    const network = new TestBitcoinNetwork();

    /**
     * @target BitcoinChain.extractTransactionOrder should extract transaction
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
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );
      const expectedOrder = testData.transaction2Order;

      // run test
      const bitcoinChain = await testUtils.generateChainObject(network);
      const result = bitcoinChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target BitcoinChain.extractTransactionOrder should throw error
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
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction1PaymentTransaction
      );

      // run test & check thrown exception
      const bitcoinChain = await testUtils.generateChainObject(network);
      expect(() => {
        bitcoinChain.extractTransactionOrder(paymentTx);
      }).toThrow(Error);
    });

    /**
     * @target BitcoinChain.extractTransactionOrder should wrap transaction
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
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );
      const expectedOrder = testData.transaction2WrappedOrder;

      // run test
      const bitcoinChain =
        await testUtils.generateChainObjectWithMultiDecimalTokenMap(network);
      const result = bitcoinChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });
  });

  describe('verifyTransactionFee', () => {
    const network = new TestBitcoinNetwork();

    /**
     * @target BitcoinChain.verifyTransactionFee should return true when fee
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
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      const bitcoinChain = await testUtils.generateChainObject(network);
      const result = await bitcoinChain.verifyTransactionFee(paymentTx);

      expect(result).toEqual(true);
    });

    /**
     * @target BitcoinChain.verifyTransactionFee should return false when fee
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
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1.2);

      const bitcoinChain = await testUtils.generateChainObject(network);
      const result = await bitcoinChain.verifyTransactionFee(paymentTx);

      expect(result).toEqual(false);
    });
  });

  describe('verifyExtraCondition', () => {
    const network = new TestBitcoinNetwork();

    /**
     * @target: BitcoinChain.verifyTransactionExtraConditions should return true when all
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
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );

      // run test
      const bitcoinChain = await testUtils.generateChainObject(network);
      const result = bitcoinChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target: BitcoinChain.verifyTransactionExtraConditions should return false
     * when change box address is wrong
     * @dependencies
     * @scenario
     * - mock a payment transaction
     * - create a new BitcoinChain object with custom lock address
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when change box address is wrong', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction0PaymentTransaction
      );

      // create a new BitcoinChain object with custom lock address
      const newConfigs = structuredClone(testUtils.configs);
      newConfigs.addresses.lock = 'bc1qs2qr0j7ta5pvdkv53egm38zymgarhq0ugr7x8j';
      const tokenMap = new TokenMap();
      await tokenMap.updateConfigByJson(testData.testTokenMap);
      const bitcoinChain = new BitcoinChain(
        network,
        newConfigs,
        tokenMap,
        testUtils.mockedSignFn
      );

      // run test
      const result = bitcoinChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('isTxValid', () => {
    const network = new TestBitcoinNetwork();

    /**
     * @target BitcoinChain.isTxValid should return true when
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
      const payment1 = BitcoinTransaction.fromJson(
        testData.transaction0PaymentTransaction
      );

      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy.mockResolvedValue(true);

      const bitcoinChain = await testUtils.generateChainObject(network);
      const result = await bitcoinChain.isTxValid(payment1);

      expect(result).toEqual({
        isValid: true,
        details: undefined,
      });
      expect(isBoxUnspentAndValidSpy).toHaveBeenCalledWith(
        testData.transaction0Input0BoxId
      );
    });

    /**
     * @target BitcoinChain.isTxValid should return false when at least one input
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
      const payment1 = BitcoinTransaction.fromJson(
        testData.transaction0PaymentTransaction
      );

      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy
        .mockResolvedValue(true)
        .mockResolvedValueOnce(false);

      const bitcoinChain = await testUtils.generateChainObject(network);
      const result = await bitcoinChain.isTxValid(payment1);

      expect(result).toEqual({
        isValid: false,
        details: {
          reason: expect.any(String),
          unexpected: false,
        },
      });
      expect(isBoxUnspentAndValidSpy).toHaveBeenCalledWith(
        testData.transaction0Input0BoxId
      );
    });
  });

  describe('signTransaction', () => {
    const network = new TestBitcoinNetwork();

    /**
     * @target BitcoinChain.signTransaction should return PaymentTransaction of the
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
            `TestError: sign function is called with wrong message [${hashHex}]`
          );
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );

      // run test
      const bitcoinChain = await testUtils.generateChainObject(
        network,
        signFunction
      );
      const result = await bitcoinChain.signTransaction(paymentTx, 0);

      // check returned value
      expect(result.txId).toEqual(paymentTx.txId);
      expect(result.eventId).toEqual(paymentTx.eventId);
      expect(Buffer.from(result.txBytes).toString('hex')).toEqual(
        testData.transaction2SignedTxBytesHex
      );
      expect(result.txType).toEqual(paymentTx.txType);
      expect(result.network).toEqual(paymentTx.network);
    });

    /**
     * @target BitcoinChain.signTransaction should throw error when at least signing of one message is failed
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
          testData.transaction2HashMessage0
        )
          return {
            signature: testData.transaction2Signature0,
            signatureRecovery: '',
          };
        else throw Error(`TestError: sign failed`);
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );

      // run test
      const bitcoinChain = await testUtils.generateChainObject(
        network,
        signFunction
      );

      await expect(async () => {
        await bitcoinChain.signTransaction(paymentTx, 0);
      }).rejects.toThrow('TestError: sign failed');
    });
  });

  describe('rawTxToPaymentTransaction', () => {
    const network = new TestBitcoinNetwork();

    /**
     * @target BitcoinChain.rawTxToPaymentTransaction should construct transaction successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock getUtxo
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should construct transaction successfully', async () => {
      // mock PaymentTransaction
      const expectedTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );
      expectedTx.eventId = '';
      expectedTx.txType = TransactionType.manual;

      // mock getUtxo
      const getUtxoSpy = vi.spyOn(network, 'getUtxo');
      expectedTx.inputUtxos.forEach((utxo) =>
        getUtxoSpy.mockResolvedValueOnce(JsonBigInt.parse(utxo))
      );

      // run test
      const bitcoinChain = await testUtils.generateChainObject(network);
      const result = await bitcoinChain.rawTxToPaymentTransaction(
        Buffer.from(expectedTx.txBytes).toString('hex')
      );

      // check returned value
      expect(result.toJson()).toEqual(expectedTx.toJson());
    });
  });

  describe('getBoxInfo', () => {
    const network = new TestBitcoinNetwork();

    /**
     * @target BitcoinChain.getBoxInfo should get box info successfully
     * @dependencies
     * @scenario
     * - mock a BitcoinUtxo with assets
     * - run test
     * - check returned value
     * @expected
     * - it should return constructed BoxInfo
     */
    it('should get box info successfully', async () => {
      // mock a BitcoinUtxo with assets
      const rawBox = testData.lockUtxo;

      // run test
      const bitcoinChain = await testUtils.generateChainObject(network);

      // check returned value
      const result = (bitcoinChain as any).getBoxInfo(rawBox);
      expect(result.id).toEqual(rawBox.txId + '.' + rawBox.index);
      expect(result.assets.nativeToken.toString()).toEqual(
        rawBox.value.toString()
      );
    });
  });

  describe('getTransactionsBoxMapping', async () => {
    const network = new TestBitcoinNetwork();
    const tokenMap = new TokenMap();
    await tokenMap.updateConfigByJson(testData.testTokenMap);
    const testInstance = new TestBitcoinChain(
      network,
      testUtils.configs,
      tokenMap,
      null as any
    );

    /**
     * @target BitcoinChain.getTransactionsBoxMapping should construct mapping
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
          Psbt.fromBuffer(
            Buffer.from(BitcoinTransaction.fromJson(txJson).txBytes)
          )
      );

      // run test
      const result = testInstance.callGetTransactionsBoxMapping(
        transactions,
        testUtils.configs.addresses.lock
      );

      // check returned value
      const trackMap = new Map<string, BitcoinUtxo | undefined>();
      const boxMapping = testData.transaction2BoxMapping;
      boxMapping.forEach((mapping) => {
        const candidate = JsonBigInt.parse(
          mapping.serializedOutput
        ) as BitcoinUtxo;
        trackMap.set(mapping.inputId, {
          txId: candidate.txId,
          index: Number(candidate.index),
          value: candidate.value,
        });
      });
      expect(result).toEqual(trackMap);
    });

    /**
     * @target BitcoinChain.getTransactionsBoxMapping should map inputs to
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
          Psbt.fromBuffer(
            Buffer.from(BitcoinTransaction.fromJson(txJson).txBytes)
          )
      );

      // run test
      const result = testInstance.callGetTransactionsBoxMapping(
        transactions,
        'another address'
      );

      // check returned value
      const trackMap = new Map<string, BitcoinUtxo | undefined>();
      const boxMapping = testData.transaction2BoxMapping;
      boxMapping.forEach((mapping) => {
        trackMap.set(mapping.inputId, undefined);
      });
      expect(result).toEqual(trackMap);
    });
  });

  describe('verifyPaymentTransaction', () => {
    const network = new TestBitcoinNetwork();

    /**
     * @target BitcoinChain.verifyPaymentTransaction should return true
     * when data is consistent
     * @dependencies
     * @scenario
     * - mock a BitcoinTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when data is consistent', async () => {
      // mock a BitcoinTransaction
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );

      // run test
      const bitcoinChain = await testUtils.generateChainObject(network);
      const result = await bitcoinChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target BitcoinChain.verifyPaymentTransaction should return false
     * when transaction id is wrong
     * @dependencies
     * @scenario
     * - mock a BitcoinTransaction with changed txId
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when transaction id is wrong', async () => {
      // mock a BitcoinTransaction with changed txId
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );
      paymentTx.txId = testUtils.generateRandomId();

      // run test
      const bitcoinChain = await testUtils.generateChainObject(network);
      const result = await bitcoinChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target BitcoinChain.verifyPaymentTransaction should return false
     * when number of utxos is wrong
     * @dependencies
     * @scenario
     * - mock a BitcoinTransaction with less utxos
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when number of utxos is wrong', async () => {
      // mock a BitcoinTransaction with less utxos
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );
      paymentTx.inputUtxos.pop();

      // run test
      const bitcoinChain = await testUtils.generateChainObject(network);
      const result = await bitcoinChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target BitcoinChain.verifyPaymentTransaction should return false
     * when at least one of the utxos is wrong
     * @dependencies
     * @scenario
     * - mock a BitcoinTransaction with changed utxo
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when at least one of the utxos is wrong', async () => {
      // mock a BitcoinTransaction with changed utxo
      const paymentTx = BitcoinTransaction.fromJson(
        testData.transaction2PaymentTransaction
      );
      paymentTx.inputUtxos[1] = JsonBigInt.stringify({
        txId: testUtils.generateRandomId(),
        index: 1,
      });

      // run test
      const bitcoinChain = await testUtils.generateChainObject(network);
      const result = await bitcoinChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });
});
