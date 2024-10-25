import { expect, vi } from 'vitest';
import {
  AssetNotSupportedError,
  MaxParallelTxError,
  NotEnoughAssetsError,
  PaymentTransaction,
  SigningStatus,
  TransactionFormatError,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import TestEvmNetwork from './network/TestEvmNetwork';
import * as TestData from './testData';
import * as testUtils from './TestUtils';
import Serializer from '../lib/Serializer';
import { Transaction, TransactionLike } from 'ethers';
import { mockGetAddressBalanceForNativeToken } from './TestUtils';
import { EvmTxStatus } from '../lib';
import TestChain from './TestChain';

describe('EvmChain', () => {
  const network = new TestEvmNetwork();

  const evmChain = testUtils.generateChainObject(network);

  describe(`constructor`, () => {
    /**
     * @target EvmChain.constructor should initialize rosen-extractor successfully
     * @dependencies
     * @scenario
     * - initialize EvmChain
     * - check CHAIN variable in rosen-extractor
     * @expected
     * - CHAIN variable should be the same as the one defined EvmChain
     */
    it('should initialize rosen-extractor successfully', async () => {
      const chain = new TestChain(
        network,
        testUtils.configs,
        TestData.testTokenMap,
        TestData.supportedTokens,
        testUtils.mockedSignFn
      );
      expect(chain.extractor?.chain).toEqual(chain.CHAIN);
    });
  });

  describe('generateMultipleTransactions', () => {
    /**
     * @target EvmChain.generateMultipleTransactions should generate payment transactions
     * successfully for multiple orders
     * @dependencies
     * @scenario
     * - mock hasLockAddressEnoughAssets, getMaxFeePerGas
     * - mock getGasRequired, getAddressNextNonce
     * - mock getMaxPriorityFeePerGas
     * - call the function
     * - check returned value
     * @expected
     * - PaymentTransactions txType, eventId and network should be as
     *   expected
     * - extracted order of generated transactions should be the same as input
     *   orders
     * - eventId should be properly encoded at the end of the transactions' data
     * - no extra data should be found in the transactions' data
     * - transactions must be of type 2 and has no blobs
     * - nonces must be in sequential order starting from next available nonce
     * - gas limit should be as expected
     */
    it('should generate payment transactions successfully for multiple orders', async () => {
      const orders = TestData.multipleOrders;
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const nonce = 54;
      const unsigned = TestData.paralelTransactions.map((elem: Transaction) => {
        elem = elem.clone();
        elem.signature = null;
        return new PaymentTransaction(
          'test',
          elem.unsignedHash,
          eventId,
          Serializer.serialize(elem),
          txType
        );
      });
      const signed = TestData.paralelTransactions.map((elem) =>
        Buffer.from(Serializer.signedSerialize(elem)).toString('hex')
      );

      // mock hasLockAddressEnoughAssets, getMaxFeePerGas,
      // getGasRequired, getAddressNextNonce, getMaxPriorityFeePerGas
      const requiredGas = 100000n;
      testUtils.mockHasLockAddressEnoughAssets(evmChain, true);
      testUtils.mockGetMaxFeePerGas(network, 10n);
      testUtils.mockGetGasRequired(network, requiredGas);
      testUtils.mockGetAddressNextAvailableNonce(network, nonce);
      testUtils.mockGetMaxPriorityFeePerGas(network, 10n);

      // run test
      const evmTxs = await evmChain.generateMultipleTransactions(
        eventId,
        txType,
        orders,
        unsigned,
        signed
      );

      // check returned value
      const splittedOrders = TestData.splittedOrders;
      for (let index = 0; index < evmTxs.length; index++) {
        const evmTx = evmTxs[index];
        const order = splittedOrders[index];

        expect(evmTx.txType).toEqual(txType);
        expect(evmTx.eventId).toEqual(eventId);
        expect(evmTx.network).toEqual(evmChain.CHAIN);

        // extracted order of generated transaction should be the same as input order
        const extractedOrder = evmChain.extractTransactionOrder(evmTx);
        expect(extractedOrder).toEqual(order);

        // check eventId encoded at the end of the data
        const tx = Serializer.deserialize(evmTx.txBytes);
        expect(tx.data.substring(tx.data.length - 32)).toEqual(eventId);

        // check there is no more data
        if (order[0].assets.nativeToken != 0n)
          expect(tx.data.length).toEqual(34);
        else expect(tx.data.length).toEqual(170);

        // check transaction type
        expect(tx.type).toEqual(2);

        // check blobs zero
        expect(tx.maxFeePerBlobGas).toEqual(null);

        // check nonce
        expect(tx.nonce).toEqual(nonce + index);

        // check gas limit
        expect(tx.gasLimit).toEqual(requiredGas * 3n); // requiredGas * gasLimitMultiplier
      }
    });

    /**
     * @target EvmChain.generateMultipleTransactions should generate payment
     * transaction successfully for single order
     * @dependencies
     * @scenario
     * - mock hasLockAddressEnoughAssets, getMaxFeePerGas
     * - mock getGasRequired, getAddressNextNonce
     * - mock getMaxPriorityFeePerGas
     * - call the function
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId and network should be as
     *   expected
     * - extracted order of generated transaction should be the same as input
     *   order
     * - eventId should be properly in the transaction data
     * - no extra data should be found in the transaction data
     * - transaction must be of type 2 and has no blobs
     * - nonce must be the same as the next available nonce
     * - gas limit should be as expected
     */
    it('should generate payment transaction successfully for single order', async () => {
      const order = TestData.nativePaymentOrder;
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const nonce = 54;

      // mock hasLockAddressEnoughAssets, getMaxFeePerGas,
      // getGasRequired, getAddressNextNonce, getMaxPriorityFeePerGas
      const requiredGas = 21000n;
      testUtils.mockHasLockAddressEnoughAssets(evmChain, true);
      testUtils.mockGetMaxFeePerGas(network, 10n);
      testUtils.mockGetGasRequired(network, requiredGas);
      testUtils.mockGetAddressNextAvailableNonce(network, nonce);
      testUtils.mockGetMaxPriorityFeePerGas(network, 10n);

      // run test
      const evmTx = await evmChain.generateMultipleTransactions(
        eventId,
        txType,
        order,
        [],
        []
      );

      // check returned value
      expect(evmTx[0].txType).toEqual(txType);
      expect(evmTx[0].eventId).toEqual(eventId);
      expect(evmTx[0].network).toEqual(evmChain.CHAIN);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = evmChain.extractTransactionOrder(evmTx[0]);
      expect(extractedOrder).toEqual(order);

      const tx = Serializer.deserialize(evmTx[0].txBytes);

      // check eventId encoded at the end of the data
      expect(tx.data.substring(2, 34)).toEqual(eventId);

      // check there is no more data
      expect(tx.data.length).toEqual(34);

      // check transaction type
      expect(tx.type).toEqual(2);

      // check blobs zero
      expect(tx.maxFeePerBlobGas).toEqual(null);

      // check nonce
      expect(tx.nonce).toEqual(nonce);

      // check gas limit
      expect(tx.gasLimit).toEqual(requiredGas * 3n); // requiredGas * gasLimitMultiplier
    });

    /**
     * @target EvmChain.generateMultipleTransactions should generate payment
     * transaction with capped gas limit when required is too high
     * @dependencies
     * @scenario
     * - mock hasLockAddressEnoughAssets, getMaxFeePerGas
     * - mock getGasRequired, getAddressNextNonce
     * - mock getMaxPriorityFeePerGas
     * - call the function
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId and network should be as
     *   expected
     * - extracted order of generated transaction should be the same as input
     *   order
     * - eventId should be properly in the transaction data
     * - no extra data should be found in the transaction data
     * - transaction must be of type 2 and has no blobs
     * - nonce must be the same as the next available nonce
     * - gas limit should be the capped gas limit
     */
    it('should generate payment transaction with capped gas limit when required is too high', async () => {
      const order = TestData.nativePaymentOrder;
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const nonce = 54;

      // mock hasLockAddressEnoughAssets, getMaxFeePerGas,
      // getGasRequired, getAddressNextNonce, getMaxPriorityFeePerGas
      testUtils.mockHasLockAddressEnoughAssets(evmChain, true);
      testUtils.mockGetMaxFeePerGas(network, 10n);
      testUtils.mockGetGasRequired(network, 200000n);
      testUtils.mockGetAddressNextAvailableNonce(network, nonce);
      testUtils.mockGetMaxPriorityFeePerGas(network, 10n);

      // run test
      const evmTx = await evmChain.generateMultipleTransactions(
        eventId,
        txType,
        order,
        [],
        []
      );

      // check returned value
      expect(evmTx[0].txType).toEqual(txType);
      expect(evmTx[0].eventId).toEqual(eventId);
      expect(evmTx[0].network).toEqual(evmChain.CHAIN);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = evmChain.extractTransactionOrder(evmTx[0]);
      expect(extractedOrder).toEqual(order);

      const tx = Serializer.deserialize(evmTx[0].txBytes);

      // check eventId encoded at the end of the data
      expect(tx.data.substring(2, 34)).toEqual(eventId);

      // check there is no more data
      expect(tx.data.length).toEqual(34);

      // check transaction type
      expect(tx.type).toEqual(2);

      // check blobs zero
      expect(tx.maxFeePerBlobGas).toEqual(null);

      // check nonce
      expect(tx.nonce).toEqual(nonce);

      // check gas limit
      expect(tx.gasLimit).toEqual(100000n * 3n); // gasLimitCap * gasLimitMultiplier
    });

    /**
     * @target EvmChain.generateMultipleTransactions should throw error
     * when token id is not supported
     * @dependencies
     * @scenario
     * - mock PaymentOrder
     * - call the function
     * @expected
     * - throw AssetNotSupportedError
     */
    it('should throw error when when token id is not supported', async () => {
      const orders = structuredClone(TestData.multipleOrders);
      orders[0].assets.tokens[0].id =
        '0x12345672e5a2f595151c94762fb38e5730357785';
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      // run test and expect error
      await expect(async () => {
        await evmChain.generateMultipleTransactions(
          eventId,
          txType,
          orders,
          [],
          []
        );
      }).rejects.toThrow(AssetNotSupportedError);
    });

    /**
     * @target EvmChain.generateMultipleTransactions should throw error
     * when lock address does not have enough assets
     * @dependencies
     * @scenario
     * - mock hasLockAddressEnoughAssets
     * - call the function
     * @expected
     * - throw NotEnoughAssetsError
     */
    it('should throw error when lock address does not have enough assets', async () => {
      const order = TestData.multipleOrders;
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;

      // mock hasLockAddressEnoughAssets
      testUtils.mockHasLockAddressEnoughAssets(evmChain, false);

      // run test and expect error
      await expect(async () => {
        await evmChain.generateMultipleTransactions(
          eventId,
          txType,
          order,
          [],
          []
        );
      }).rejects.toThrow(NotEnoughAssetsError);
    });

    /**
     * @target EvmChain.generateMultipleTransactions should generate tx with next nonce
     * when next available nonce was already used for maximum allowed times
     * @dependencies
     * @scenario
     * - fill the unsigned and signed transactions lists with mock data
     * - mock hasLockAddressEnoughAssets and getAddressNextNonce
     * - call the function
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId and network should be as
     *   expected
     * - extracted order of generated transaction should be the same as input
     *   order
     * - eventId should be properly in the transaction data
     * - no extra data should be found in the transaction data
     * - transaction must be of type 2 and has no blobs
     * - nonce must be the increamented next available nonce
     * - gas limit should be as expected
     */
    it('should generate tx with next nonce when next available nonce was already used for maximum allowed times', async () => {
      const order = TestData.nativePaymentOrder;
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const unsigned = TestData.paralelTransactions.map((elem) => {
        elem = elem.clone();
        elem.signature = null;
        return new PaymentTransaction(
          'test',
          elem.unsignedHash,
          eventId,
          Serializer.serialize(elem),
          txType
        );
      });
      const signed = TestData.paralelTransactions.map((elem) =>
        Buffer.from(Serializer.signedSerialize(elem)).toString('hex')
      );
      const nonce = 53;

      // mock hasLockAddressEnoughAssets, getMaxFeePerGas,
      // getGasRequired, getAddressNextNonce, getMaxPriorityFeePerGas
      const requiredGas = 21000n;
      testUtils.mockHasLockAddressEnoughAssets(evmChain, true);
      testUtils.mockGetMaxFeePerGas(network, 10n);
      testUtils.mockGetGasRequired(network, requiredGas);
      testUtils.mockGetAddressNextAvailableNonce(network, nonce);
      testUtils.mockGetMaxPriorityFeePerGas(network, 10n);

      // run test
      const evmTx = await evmChain.generateMultipleTransactions(
        eventId,
        txType,
        order,
        unsigned,
        signed
      );

      // check returned value
      expect(evmTx[0].txType).toEqual(txType);
      expect(evmTx[0].eventId).toEqual(eventId);
      expect(evmTx[0].network).toEqual(evmChain.CHAIN);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = evmChain.extractTransactionOrder(evmTx[0]);
      expect(extractedOrder).toEqual(order);

      const tx = Serializer.deserialize(evmTx[0].txBytes);

      // check eventId encoded at the end of the data
      expect(tx.data.substring(2, 34)).toEqual(eventId);

      // check there is no more data
      expect(tx.data.length).toEqual(34);

      // check transaction type
      expect(tx.type).toEqual(2);

      // check blobs zero
      expect(tx.maxFeePerBlobGas).toEqual(null);

      // check nonce
      expect(tx.nonce).toEqual(nonce + 1);

      // check gas limit
      expect(tx.gasLimit).toEqual(requiredGas * 3n); // requiredGas * gasLimitMultiplier
    });

    /**
     * @target EvmChain.generateMultipleTransactions should not throw error
     * when next available nonce is not yet used for maximum allowed times
     * @dependencies
     * @scenario
     * - fill the unsigned and signed transactions lists with mock data
     * - mock hasLockAddressEnoughAssets and getAddressNextNonce
     * - call the function
     * @expected
     * - no error
     */
    it('should not throw error when next available nonce is not yet used for maximum allowed times', async () => {
      const order = TestData.multipleOrders;
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const unsigned = TestData.paralelTransactions.map((elem: Transaction) => {
        elem = elem.clone();
        elem.signature = null;
        return new PaymentTransaction(
          'test',
          elem.unsignedHash,
          eventId,
          Serializer.serialize(elem),
          txType
        );
      });
      const signed = TestData.paralelTransactions.map((elem) =>
        Buffer.from(Serializer.signedSerialize(elem)).toString('hex')
      );

      // mock hasLockAddressEnoughAssets, getAddressNextNonce,
      testUtils.mockHasLockAddressEnoughAssets(evmChain, true);
      testUtils.mockGetAddressNextAvailableNonce(network, 53);

      // run test and expect no error
      evmChain.configs.maxParallelTx = 12;
      expect(async () => {
        await evmChain.generateMultipleTransactions(
          eventId,
          txType,
          order,
          unsigned,
          signed
        );
      }).not.rejects;
    });

    /**
     * @target EvmChain.generateMultipleTransactions should generate payment
     * transaction successfully for wrapped order
     * @dependencies
     * @scenario
     * - mock hasLockAddressEnoughAssets, getMaxFeePerGas
     * - mock getGasRequired, getAddressNextNonce
     * - mock getMaxPriorityFeePerGas
     * - call the function
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId and network should be as
     *   expected
     * - extracted order of generated transaction should be the same as input
     *   order
     * - eventId should be properly in the transaction data
     * - no extra data should be found in the transaction data
     * - transaction must be of type 2 and has no blobs
     * - nonce must be the same as the next available nonce
     */
    it('should generate payment transaction successfully for wrapped order', async () => {
      const evmChain =
        testUtils.generateChainObjectWithMultiDecimalTokenMap(network);

      const order = TestData.nativePaymentWrappedOrder;
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const nonce = 54;

      // mock hasLockAddressEnoughAssets, getMaxFeePerGas,
      // getGasRequired, getAddressNextNonce, getMaxPriorityFeePerGas
      testUtils.mockHasLockAddressEnoughAssets(evmChain, true);
      testUtils.mockGetMaxFeePerGas(network, 10n);
      testUtils.mockGetGasRequired(network, 21000n);
      testUtils.mockGetAddressNextAvailableNonce(network, nonce);
      testUtils.mockGetMaxPriorityFeePerGas(network, 10n);

      // run test
      const evmTx = await evmChain.generateMultipleTransactions(
        eventId,
        txType,
        order,
        [],
        []
      );

      // check returned value
      expect(evmTx[0].txType).toEqual(txType);
      expect(evmTx[0].eventId).toEqual(eventId);
      expect(evmTx[0].network).toEqual(evmChain.CHAIN);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = evmChain.extractTransactionOrder(evmTx[0]);
      expect(extractedOrder).toEqual(order);

      const tx = Serializer.deserialize(evmTx[0].txBytes);

      // check eventId encoded at the end of the data
      expect(tx.data.substring(2, 34)).toEqual(eventId);

      // check there is no more data
      expect(tx.data.length).toEqual(34);

      // check transaction type
      expect(tx.type).toEqual(2);

      // check blobs zero
      expect(tx.maxFeePerBlobGas).toEqual(null);

      // check nonce
      expect(tx.nonce).toEqual(nonce);
    });
  });

  describe('rawTxToPaymentTransaction', () => {
    /**
     * @target EvmChain.rawTxToPaymentTransaction should construct transaction successfully
     * @dependencies
     * @scenario
     * - mock a network object
     *   - mock 'getHeight'
     *   - mock 'getStateContext'
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should construct transaction successfully', async () => {
      const result = await evmChain.rawTxToPaymentTransaction(
        TestData.transaction0JsonString
      );

      // run test
      expect(result.toJson()).toEqual(
        TestData.transaction0PaymentTransaction.toJson()
      );
    });

    /**
     * @target EvmChain.rawTxToPaymentTransaction should throw error when transaction
     * is not of type 2
     * @dependencies
     * @scenario
     * - mock invalid transaction
     * - run test
     * @expected
     * - throw TransactionFormatError
     */
    it('should throw error when transaction is not of type 2', async () => {
      expect(async () => {
        await evmChain.rawTxToPaymentTransaction(
          TestData.transaction1JsonString
        );
      }).rejects.toThrow(TransactionFormatError);
    });
  });

  describe('getTransactionAssets', () => {
    /**
     * @target EvmChain.getTransactionAssets should get transaction assets
     * successfully when there is ERC-20 token transfer.
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - call the function
     * - check returned value
     * @expected
     * - it should return mocked transaction assets (both input and output assets)
     */
    it('should get transaction assets successfully when there is ERC-20 token transfer.', async () => {
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      // mock PaymentTransaction
      const tx = Transaction.from(TestData.transaction1Json);
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = await evmChain.getTransactionAssets(paymentTx);

      // check returned value
      expect(result.inputAssets).toEqual(TestData.transaction1Assets);
      expect(result.outputAssets).toEqual(TestData.transaction1Assets);
    });

    /**
     * @target EvmChain.getTransactionAssets should get transaction assets
     * successfully when there is only native-token transfer.
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - call the function
     * - check returned value
     * @expected
     * - it should return mocked transaction assets (both input and output assets)
     */
    it('should get transaction assets successfully when there is only native-token transfer', async () => {
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      // mock PaymentTransaction
      const trx = { ...TestData.transaction1Json };
      trx.data = '0x';
      const tx = Transaction.from(trx);
      const assets = { ...TestData.transaction1Assets };
      assets.tokens = [];
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // check returned value
      const result = await evmChain.getTransactionAssets(paymentTx);

      // check returned value
      expect(result.inputAssets).toEqual(assets);
      expect(result.outputAssets).toEqual(assets);
    });

    /**
     * @target EvmChain.getTransactionAssets should throw error when `to` is null
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - call the function
     * @expected
     * - throw error
     */
    it('should throw error when `to` is null', async () => {
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      // mock PaymentTransaction
      const trx = { ...TestData.transaction1Json };
      trx.data = '0x';
      const tx = Transaction.from(trx);
      const assets = { ...TestData.transaction1Assets };
      assets.tokens = [];
      tx.to = null;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test function and expect error
      expect(async () => {
        await evmChain.getTransactionAssets(paymentTx);
      }).rejects.toThrowError(TransactionFormatError);
    });

    /**
     * @target EvmChain.getTransactionAssets should throw error when transaction is not of type 2
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - call the function
     * @expected
     * - throw error
     */
    it('should throw error when transaction is not of type 2', async () => {
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      // mock PaymentTransaction
      const trx = { ...TestData.transaction1Json };
      trx.data = '0x';
      const tx = Transaction.from(trx);
      const assets = { ...TestData.transaction1Assets };
      assets.tokens = [];
      tx.type = 3;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test function and expect error
      expect(async () => {
        await evmChain.getTransactionAssets(paymentTx);
      }).rejects.toThrowError(TransactionFormatError);
    });

    /**
     * @target EvmChain.getTransactionAssets should wrap transaction assets
     * successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - call the function
     * - check returned value
     * @expected
     * - it should return mocked transaction assets (both input and output assets)
     */
    it('should wrap transaction assets successfully', async () => {
      const evmChain =
        testUtils.generateChainObjectWithMultiDecimalTokenMap(network);

      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      // mock PaymentTransaction
      const trx = { ...TestData.transaction1Json };
      trx.data = '0x';
      const tx = Transaction.from(trx);
      const assets = { ...TestData.transaction1WrappedAssets };
      assets.tokens = [];
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // check returned value
      const result = await evmChain.getTransactionAssets(paymentTx);

      // check returned value
      expect(result.inputAssets).toEqual(assets);
      expect(result.outputAssets).toEqual(assets);
    });
  });

  describe('verifyTransactionFee', () => {
    /**
     * @target EvmChain.verifyTransactionFee should return true when
     * both fees and gasLimit are set properly
     * @dependencies
     * @scenario
     * - mock mockGetGasRequired
     * - mock mockGetMaxFeePerGas, mockGetMaxPriorityFeePerGas
     * - mock PaymentTransaction
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when both fees and gasLimit are set properly', async () => {
      // mock a config that has almost the same fee as the mocked transaction
      testUtils.mockGetGasRequired(network, 100000n);
      testUtils.mockGetMaxFeePerGas(network, 20n);
      testUtils.mockGetMaxPriorityFeePerGas(network, 7n);

      // mock PaymentTransaction
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 85000n * evmChain.configs.gasLimitMultiplier;
      tx.maxFeePerGas = 22n;
      tx.maxPriorityFeePerGas = 8n;
      tx.value = 2n;

      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = await evmChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target EvmChain.verifyTransactionFee should return false when `to` is null
     * @dependencies
     * @scenario
     * - mock mockGetGasRequired
     * - mock mockGetMaxFeePerGas, mockGetMaxPriorityFeePerGas
     * - mock PaymentTransaction
     * @expected
     * - return false
     */
    it('should return false when `to` is null', async () => {
      // mock a config that has almost the same fee as the transaction fee
      testUtils.mockGetGasRequired(network, 100000n);
      testUtils.mockGetMaxFeePerGas(network, 20n);
      testUtils.mockGetMaxPriorityFeePerGas(network, 7n);

      // mock PaymentTransaction
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 100000n * evmChain.configs.gasLimitMultiplier;
      tx.maxFeePerGas = 22n;
      tx.maxPriorityFeePerGas = 8n;
      tx.value = 2n;
      tx.to = null;

      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = await evmChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionFee should return false when transaction is not of type 2
     * @dependencies
     * @scenario
     * - mock mockGetGasRequired
     * - mock mockGetMaxFeePerGas, mockGetMaxPriorityFeePerGas
     * - mock PaymentTransaction
     * @expected
     * - return false
     */
    it('should return false when transaction is not of type 2', async () => {
      // mock a config that has almost the same fee as the transaction fee
      testUtils.mockGetGasRequired(network, 55000n);
      testUtils.mockGetMaxFeePerGas(network, 20n);
      testUtils.mockGetMaxPriorityFeePerGas(network, 7n);

      // mock PaymentTransaction
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 55000n * evmChain.configs.gasLimitMultiplier;
      tx.maxFeePerGas = 22n;
      tx.maxPriorityFeePerGas = 8n;
      tx.value = 2n;
      tx.type = 3;

      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = await evmChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionFee should return false when gasLimit is wrong
     * for erc-20 transfer
     * @dependencies
     * @scenario
     * - mock mockGetGasRequired
     * - mock mockGetMaxFeePerGas, mockGetMaxPriorityFeePerGas
     * - mock PaymentTransaction
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when gasLimit is wrong for erc-20 transfer', async () => {
      // mock a config that has more fee and wrong required gas
      // comparing to the mocked transaction
      testUtils.mockGetGasRequired(network, 90000n);
      testUtils.mockGetMaxFeePerGas(network, 20n);
      testUtils.mockGetMaxPriorityFeePerGas(network, 7n);

      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 60000n * evmChain.configs.gasLimitMultiplier;
      tx.maxFeePerGas = 22n;
      tx.maxPriorityFeePerGas = 8n;
      tx.value = 0n;

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = await evmChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionFee should return false when gasLimit is over
     * the cap for erc-20 transfer
     * @dependencies
     * @scenario
     * - mock mockGetGasRequired
     * - mock mockGetMaxFeePerGas, mockGetMaxPriorityFeePerGas
     * - mock PaymentTransaction
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when gasLimit is over the cap for erc-20 transfer', async () => {
      // mock a config that has more fee and wrong required gas
      // comparing to the mocked transaction
      testUtils.mockGetGasRequired(network, 90000n);
      testUtils.mockGetMaxFeePerGas(network, 20n);
      testUtils.mockGetMaxPriorityFeePerGas(network, 7n);

      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 120000n * evmChain.configs.gasLimitMultiplier;
      tx.maxFeePerGas = 22n;
      tx.maxPriorityFeePerGas = 8n;
      tx.value = 0n;

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = await evmChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionFee should return false when gasLimit is wrong
     * for native-token transfer
     * @dependencies
     * @scenario
     * - mock mockGetGasRequired
     * - mock mockGetMaxFeePerGas, mockGetMaxPriorityFeePerGas
     * - mock PaymentTransaction
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when gasLimit is wrong for native-token transfer', async () => {
      // mock a config that has more fee and wrong required gas
      // comparing to the mocked transaction
      testUtils.mockGetGasRequired(network, 20000n);
      testUtils.mockGetMaxFeePerGas(network, 20n);
      testUtils.mockGetMaxPriorityFeePerGas(network, 7n);

      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 30000n * evmChain.configs.gasLimitMultiplier;
      tx.maxFeePerGas = 22n;
      tx.maxPriorityFeePerGas = 8n;
      tx.value = 10n;
      tx.data = '0x';

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = await evmChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionFee should return false when maxFeePerGas
     * is too much bigger than expected
     * @dependencies
     * @scenario
     * - mock mockGetGasRequired
     * - mock mockGetMaxFeePerGas, mockGetMaxPriorityFeePerGas
     * - mock PaymentTransaction
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when maxFeePerGas is too much bigger than expected', async () => {
      // mock a config that has too much bigger max fee comparing to the mocked transaction
      testUtils.mockGetGasRequired(network, 76000n);
      testUtils.mockGetMaxFeePerGas(network, 20n);
      testUtils.mockGetMaxPriorityFeePerGas(network, 7n);

      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 76000n * evmChain.configs.gasLimitMultiplier;
      tx.maxFeePerGas = 25n;
      tx.maxPriorityFeePerGas = 7n;
      tx.value = 10n;

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = await evmChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionFee should return false when maxFeePerGas
     * is too much smaller than expected
     * @dependencies
     * @scenario
     * - mock mockGetGasRequired
     * - mock mockGetMaxFeePerGas, mockGetMaxPriorityFeePerGas
     * - mock PaymentTransaction
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when maxFeePerGas is too much smaller than exptected', async () => {
      // mock a config that has too much smaller max fee comparing to the mocked transaction
      testUtils.mockGetGasRequired(network, 76000n);
      testUtils.mockGetMaxFeePerGas(network, 20n);
      testUtils.mockGetMaxPriorityFeePerGas(network, 7n);

      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 76000n * evmChain.configs.gasLimitMultiplier;
      tx.maxFeePerGas = 16n;
      tx.maxPriorityFeePerGas = 8n;
      tx.value = 10n;

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = await evmChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionFee should return false when maxPriorityFeePerGas
     * is too much bigger than expected
     * @dependencies
     * @scenario
     * - mock mockGetGasRequired
     * - mock mockGetMaxFeePerGas, mockGetMaxPriorityFeePerGas
     * - mock PaymentTransaction
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when maxPriorityFeePerGas is too much bigger than expected', async () => {
      // mock a config that has too much bigger max fee comparing to the mocked transaction
      testUtils.mockGetGasRequired(network, 76000n);
      testUtils.mockGetMaxFeePerGas(network, 20n);
      testUtils.mockGetMaxPriorityFeePerGas(network, 7n);

      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 76000n * evmChain.configs.gasLimitMultiplier;
      tx.maxFeePerGas = 20n;
      tx.maxPriorityFeePerGas = 10n;
      tx.value = 10n;

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = await evmChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionFee should return false when maxPriorityFeePerGas
     * is too much smaller than expected
     * @dependencies
     * @scenario
     * - mock mockGetGasRequired
     * - mock mockGetMaxFeePerGas, mockGetMaxPriorityFeePerGas
     * - mock PaymentTransaction
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when maxPriorityFeePerGas is too much smaller than expected', async () => {
      // mock a config that has too much bigger max fee comparing to the mocked transaction
      testUtils.mockGetGasRequired(network, 76000n);
      testUtils.mockGetMaxFeePerGas(network, 20n);
      testUtils.mockGetMaxPriorityFeePerGas(network, 7n);

      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 76000n * evmChain.configs.gasLimitMultiplier;
      tx.maxFeePerGas = 20n;
      tx.maxPriorityFeePerGas = 5n;
      tx.value = 10n;

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = await evmChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('extractTransactionOrder', () => {
    /**
     * @target EvmChain.extractTransactionOrder should extract transaction
     * order successfully for ERC-20 token transfer only
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should extract transaction order successfully for ERC-20 token transfer only', () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(TestData.splittedOrders[1]);
    });

    /**
     * @target EvmChain.extractTransactionOrder should extract transaction
     * order successfully when there is native-token transfer only
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should extract transaction order successfully when there is native-token transfer only', () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from({
        ...(TestData.erc20transaction as TransactionLike),
      });
      tx.data = '0x';
      tx.value = 100n;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual([
        {
          address: '0xedee4752e5a2f595151c94762fb38e5730357785',
          assets: {
            nativeToken: 100n,
            tokens: [],
          },
        },
      ]);
    });

    /**
     * @target EvmChain.extractTransactionOrder should extract transaction
     * order successfully when there are native and ERC-20 token transfers to same address
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should extract transaction order successfully when there are native and ERC-20 token transfers to same address', () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from({
        ...(TestData.erc20transaction as TransactionLike),
      });
      tx.value = 100n;
      tx.to = '0xcfb01d43cb1299024171141d449bb9cd08f4c075';
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual([
        {
          address: '0xcfb01d43cb1299024171141d449bb9cd08f4c075',
          assets: {
            nativeToken: 100n,
            tokens: [
              {
                id: '0xcfb01d43cb1299024171141d449bb9cd08f4c075',
                value: 3305307248n,
              },
            ],
          },
        },
      ]);
    });

    /**
     * @target EvmChain.extractTransactionOrder should extract transaction
     * order successfully when there are native and ERC-20 token transfers to different addresses
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should extract transaction order successfully when there are native and ERC-20 token transfers to different addresses', () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from({
        ...(TestData.erc20transaction as TransactionLike),
      });
      tx.value = 100n;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual([
        {
          address: '0xedee4752e5a2f595151c94762fb38e5730357785',
          assets: {
            nativeToken: 100n,
            tokens: [],
          },
        },
        {
          address: '0xcfb01d43cb1299024171141d449bb9cd08f4c075',
          assets: {
            nativeToken: 0n,
            tokens: [
              {
                id: '0xedee4752e5a2f595151c94762fb38e5730357785',
                value: 3305307248n,
              },
            ],
          },
        },
      ]);
    });

    /**
     * @target EvmChain.extractTransactionOrder should throw error when `to` is null
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * @expected
     * - throw error
     */
    it('should throw error when `to` is null', () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const trx = { ...(TestData.erc20transaction as TransactionLike) };
      trx.to = null;
      const tx = Transaction.from(trx);
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      expect(async () =>
        evmChain.extractTransactionOrder(paymentTx)
      ).rejects.toThrowError(TransactionFormatError);
    });

    /**
     * @target EvmChain.extractTransactionOrder should wrap transaction
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
      const evmChain =
        testUtils.generateChainObjectWithMultiDecimalTokenMap(network);

      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from({
        ...(TestData.erc20transaction as TransactionLike),
      });
      tx.data = '0x';
      tx.value = 100n;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual([
        {
          address: '0xedee4752e5a2f595151c94762fb38e5730357785',
          assets: {
            nativeToken: 1n,
            tokens: [],
          },
        },
      ]);
    });
  });

  describe('submitTransaction', () => {
    /**
     * @target EvmChain.submitTransaction should submit the transaction
     * when transaction is of type 2, fees are set properly and lock address has enough assets
     * @dependencies
     * @scenario
     * - mock valid PaymentTransaction
     * - mock getMaxFeePerGas, getMaxPriorityFeePerGas
     * - mock hasLockAddressEnoughAssets
     * - run test
     * - check function is called
     * @expected
     * - it should call the function
     */
    it('should submit the transaction when transaction is of type 2, fees are set properly and lock address has enough assets', async () => {
      // mock getMaxFeePerGas, getMaxPriorityFeePerGas, and hasLockAddressEnoughAssets
      testUtils.mockGetMaxFeePerGas(network, 20n);
      testUtils.mockGetMaxPriorityFeePerGas(network, 7n);
      testUtils.mockHasLockAddressEnoughAssets(evmChain, true);

      // mock PaymentTransaction
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 55000n + 21000n;
      tx.maxFeePerGas = 20n;
      tx.maxPriorityFeePerGas = 7n;
      tx.value = 2n;

      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );
      const submitTransactionSpy = vi.spyOn(network, 'submitTransaction');
      submitTransactionSpy.mockImplementation(async () => undefined);
      await evmChain.submitTransaction(paymentTx);
      expect(submitTransactionSpy).toHaveBeenCalled();
    });

    /**
     * @target EvmChain.submitTransaction should not submit the transaction
     * when transaction is not of type 2
     * @dependencies
     * @scenario
     * - mock invalid PaymentTransaction
     * - run test
     * - check function is not called
     * @expected
     * - it should not call the function
     */
    it('should submit the transaction when transaction is not of type 2', async () => {
      // mock PaymentTransaction
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 55000n + 21000n;
      tx.type = 3;

      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );
      const submitTransactionSpy = vi.spyOn(network, 'submitTransaction');
      submitTransactionSpy.mockImplementation(async () => undefined);
      await evmChain.submitTransaction(paymentTx);
      expect(submitTransactionSpy).not.toHaveBeenCalled();
    });

    /**
     * @target EvmChain.submitTransaction should not submit the transaction
     * when gasLimit is wrong
     * @dependencies
     * @scenario
     * - mock invalid PaymentTransaction
     * - mock getGasRequired
     * - mock hasLockAddressEnoughAssets
     * - run test
     * - check function is not called
     * @expected
     * - it should not call the function
     */
    it('should not submit the transaction when gasLimit is wrong', async () => {
      // mock getGasRequired, and hasLockAddressEnoughAssets
      testUtils.mockGetGasRequired(network, 77000n);

      // mock PaymentTransaction
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 55000n + 21000n;
      tx.maxFeePerGas = 21n;
      tx.maxPriorityFeePerGas = 6n;
      tx.value = 2n;

      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );
      const submitTransactionSpy = vi.spyOn(network, 'submitTransaction');
      submitTransactionSpy.mockImplementation(async () => undefined);
      await evmChain.submitTransaction(paymentTx);
      expect(submitTransactionSpy).not.toHaveBeenCalled();
    });

    /**
     * @target EvmChain.submitTransaction should not submit the transaction
     * when lock address does not have enough asset
     * @dependencies
     * @scenario
     * - mock invalid PaymentTransaction
     * - mock getMaxFeePerGas, getMaxPriorityFeePerGas
     * - mock hasLockAddressEnoughAssets
     * - run test
     * - check the function is not called
     * @expected
     * - it should not call the function
     */
    it('should not submit the transaction when lock address does not have enough asset', async () => {
      // mock getMaxFeePerGas, getMaxPriorityFeePerGas, and hasLockAddressEnoughAssets
      testUtils.mockGetMaxFeePerGas(network, 20n);
      testUtils.mockGetMaxPriorityFeePerGas(network, 7n);
      testUtils.mockHasLockAddressEnoughAssets(evmChain, false);

      // mock PaymentTransaction
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 55000n + 21000n;
      tx.maxFeePerGas = 20n;
      tx.maxPriorityFeePerGas = 7n;
      tx.value = 2n;

      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );
      const submitTransactionSpy = vi.spyOn(network, 'submitTransaction');
      submitTransactionSpy.mockImplementation(async () => undefined);
      await evmChain.submitTransaction(paymentTx);
      expect(submitTransactionSpy).not.toHaveBeenCalled();
    });

    /**
     * @target EvmChain.submitTransaction should not submit the transaction
     * when checking failed due to error
     * @dependencies
     * @scenario
     * - mock invalid PaymentTransaction
     * - mock getGasRequired to throw error
     * - run test
     * - check function is not called
     * @expected
     * - it should not call the function
     */
    it('should not submit the transaction when checking failed due to error', async () => {
      // mock getGasRequired
      vi.spyOn(network, 'getGasRequired').mockImplementation(() => {
        throw Error(`test Error`);
      });

      // mock PaymentTransaction
      const tx = Transaction.from(TestData.transaction1Json);
      tx.gasLimit = 55000n;
      tx.maxFeePerGas = 21n;
      tx.maxPriorityFeePerGas = 6n;
      tx.value = 2n;

      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );
      const submitTransactionSpy = vi.spyOn(network, 'submitTransaction');
      submitTransactionSpy.mockImplementation(async () => undefined);
      await evmChain.submitTransaction(paymentTx);
      expect(submitTransactionSpy).not.toHaveBeenCalled();
    });
  });

  describe('verifyTransactionExtraConditions', () => {
    /**
     * @target EvmChain.verifyTransactionExtraConditions should return true
     * for erc-20 transfer when extra conditions are met and eventId is not empty
     * @dependencies
     * @scenario
     * - mock valid PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true for erc-20 transfer when extra conditions are met and eventId is not empty', async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target EvmChain.verifyTransactionExtraConditions should return false
     * when transaction is not of type 2
     * @dependencies
     * @scenario
     * - mock valid PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when transaction is not of type 2', async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);
      tx.type = 3;

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionExtraConditions should return true
     * for erc-20 transfer when extra conditions are met and eventId is empty
     * @dependencies
     * @scenario
     * - mock valid PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when extra conditions are met and eventId is empty', async () => {
      // mock PaymentTransaction
      const eventId = '';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);
      tx.data = tx.data.substring(0, tx.data.length - 32);
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target EvmChain.verifyTransactionExtraConditions should return true
     * for native-token transfer when extra conditions are met and eventId is not empty
     * @dependencies
     * @scenario
     * - mock valid PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true for native-token transfer when extra conditions are met and eventId is not empty', async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);
      tx.data = '0x' + eventId;
      tx.to = TestData.lockAddress;
      tx.value = 10n;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target EvmChain.verifyTransactionExtraConditions should return true
     * for native-token transfer when extra conditions are met and eventId is empty
     * @dependencies
     * @scenario
     * - mock valid PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when extra conditions are met and eventId is empty', async () => {
      // mock PaymentTransaction
      const eventId = '';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);
      tx.data = tx.data.substring(0, tx.data.length - 32);
      tx.data = '0x' + eventId;
      tx.to = TestData.lockAddress;
      tx.value = 10n;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target EvmChain.verifyTransactionExtraConditions should return false
     * when `to` is null
     * @dependencies
     * @scenario
     * - mock invalid PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when `to` is null', async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const trx = { ...(TestData.erc20transaction as TransactionLike) };
      trx.to = null;
      const tx = Transaction.from(trx);
      tx.maxFeePerBlobGas = 0;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionExtraConditions should return false
     * when `data` is null
     * @dependencies
     * @scenario
     * - mock invalid PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when `data` is null', async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const trx = { ...(TestData.erc20transaction as TransactionLike) };
      trx.data = null;
      const tx = Transaction.from(trx);
      tx.maxFeePerBlobGas = 0;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionExtraConditions should return false
     * when eventId is not at the end of `data`
     * @dependencies
     * @scenario
     * - mock invalid PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when eventId is not at the end of `data`', async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const trx = { ...(TestData.erc20transaction as TransactionLike) };
      trx.data =
        trx.data?.substring(0, trx.data.length - eventId.length) +
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbc';
      const tx = Transaction.from(trx);
      tx.maxFeePerBlobGas = 0;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionExtraConditions should return false
     * when both an erc-20 and the native-token are being transfered
     * @dependencies
     * @scenario
     * - mock valid PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when both an erc-20 and the native-token are being transfered', async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);
      tx.maxFeePerBlobGas = 0;
      tx.value = 10000n;
      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionExtraConditions should return false
     * when there are extra bytes in the data
     * @dependencies
     * @scenario
     * - mock valid PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when there are extra bytes in the data', async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);
      tx.maxFeePerBlobGas = 0;
      tx.data =
        tx.data.substring(0, 138) + 'eeeeeeeeee' + tx.data.substring(138);

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionExtraConditions should return false
     * when it's an erc-20 token transfer but `data` does not match with `transfer`
     * @dependencies
     * @scenario
     * - mock valid PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it("should return false when it's an erc-20 token transfer but `data` does not match with `transfer`", async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);
      tx.maxFeePerBlobGas = 0;
      tx.data = '0x343' + tx.data.substring(5);

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EvmChain.verifyTransactionExtraConditions should return false
     * when it's an erc-20 token transfer but `to` can not be parsed to an address
     * @dependencies
     * @scenario
     * - mock valid PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it("should return false when it's an erc-20 token transfer but `to` can not be parsed to an address", async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);
      tx.maxFeePerBlobGas = 0;
      tx.data = tx.data.substring(0, 30) + 'e43ba' + tx.data.substring(35);

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // run test
      const result = evmChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('isTxValid', () => {
    /**
     * @target EvmChain.isTxValid should return true when
     * tx is not found and nonce is not used
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock getAddressNextAvailableNonce
     * - call the function
     * - check returned value
     * @expected
     * - it should return true with no details
     */
    it('should return true when tx is not found and nonce is not used', async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // mock getTransactionStatus
      testUtils.mockGetTransactionStatus(network, EvmTxStatus.notFound);

      // mock getAddressNextAvailableNonce
      testUtils.mockGetAddressNextAvailableNonce(network, tx.nonce);

      // run test
      const result = await evmChain.isTxValid(paymentTx, SigningStatus.Signed);

      // check returned value
      expect(result).toEqual({
        isValid: true,
        details: undefined,
      });
    });

    /**
     * @target EvmChain.isTxValid should return false when nonce is
     * already used by another transaction
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock getTransactionStatus
     * - mock getAddressNextAvailableNonce
     * - mock getTransactionByNonce
     * - call the function
     * - check returned value
     * @expected
     * - it should return false and as expected invalidation
     */
    it('should return false when nonce is already used by another transaction', async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // mock getTransactionStatus
      testUtils.mockGetTransactionStatus(network, EvmTxStatus.succeed);

      // mock getAddressNextAvailableNonce
      testUtils.mockGetAddressNextAvailableNonce(network, tx.nonce + 1);

      // mock getTransactionByNonce
      testUtils.mockGetTransactionByNonce(network, {
        unsignedHash:
          'b129a7ff43fa447edcd87dc596cd8788742d9f395a84e4b5863e7e9d266acf9c',
        txId: '568722d20aabcc3102affe9bcd2637f3b8b46429b93154ec7f42649f9844b85e',
      });

      // run test
      const result = await evmChain.isTxValid(paymentTx, SigningStatus.Signed);

      // check returned value
      expect(result).toEqual({
        isValid: false,
        details: {
          reason: expect.any(String),
          unexpected: false,
        },
      });
    });

    /**
     * @target EvmChain.isTxValid should return true when nonce is
     * used by current transaction
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock getTransactionStatus
     * - mock getAddressNextAvailableNonce
     * - mock getTransactionByNonce
     * - call the function
     * - check returned value
     * @expected
     * - it should return true with no details
     */
    it('should return true when nonce is used by current transaction', async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // mock getTransactionStatus
      testUtils.mockGetTransactionStatus(network, EvmTxStatus.succeed);

      // mock getAddressNextAvailableNonce
      testUtils.mockGetAddressNextAvailableNonce(network, tx.nonce + 1);

      // mock getTransactionByNonce
      testUtils.mockGetTransactionByNonce(network, {
        unsignedHash: tx.unsignedHash,
        txId: tx.hash!,
      });

      // run test
      const result = await evmChain.isTxValid(paymentTx, SigningStatus.Signed);

      // check returned value
      expect(result).toEqual({
        isValid: true,
        details: undefined,
      });
    });

    /**
     * @target EvmChain.isTxValid should return false when
     * tx is failed
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock getTransactionStatus
     * - mock getAddressNextAvailableNonce
     * - call the function
     * - check returned value
     * @expected
     * - it should return false and as unexpected invalidation
     */
    it('should return false when tx is failed', async () => {
      // mock PaymentTransaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // mock getTransactionStatus
      testUtils.mockGetTransactionStatus(network, EvmTxStatus.failed);

      // mock getAddressNextAvailableNonce
      testUtils.mockGetAddressNextAvailableNonce(network, tx.nonce);

      // run test
      const result = await evmChain.isTxValid(paymentTx, SigningStatus.Signed);

      // check returned value
      expect(result).toEqual({
        isValid: false,
        details: {
          reason: expect.any(String),
          unexpected: true,
        },
      });
    });
  });

  describe('signTransaction', () => {
    /**
     * @target EvmChain.signTransaction should return PaymentTransaction of the
     * signed transaction
     * @dependencies
     * @scenario
     * - mock a sign function to return signature
     * - mock PaymentTransaction of unsigned transaction
     * - call the function
     * - check returned value
     * - check if function got called
     * @expected
     * - it should return PaymentTransaction of signed transaction (all fields
     *   are same as input object, except txBytes which is signed transaction)
     * - signed tx bytes and hash should be as expected
     * - `signFunction` should have been called with unsigned hash without '0x'
     */
    it('should return PaymentTransaction of the signed transaction', async () => {
      // mock a sign function to return signature
      const signFunction = vi.fn();
      signFunction.mockImplementation(async (txHash: Uint8Array) => {
        return {
          signature: TestData.transaction2Signature,
          signatureRecovery: TestData.transaction2SignatureRecovery,
        };
      });
      const evmChain = testUtils.generateChainObject(network, signFunction);

      // mock PaymentTransaction of unsigned transaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.transaction2UnsignedTx);

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // call the function
      const result = await evmChain.signTransaction(paymentTx, 0);

      // check returned value
      expect(result.txId).toEqual(paymentTx.txId);
      expect(result.txType).toEqual(paymentTx.txType);
      expect(result.eventId).toEqual(paymentTx.eventId);
      expect(result.network).toEqual(paymentTx.network);
      const signedTx = Serializer.deserialize(result.txBytes);
      expect(signedTx.serialized).toEqual(TestData.transaction2SignedTx);
      expect(signedTx.hash).toEqual(TestData.transaction2TxId);

      // `signFunction` should have been called with unsigned hash without '0x'
      expect(signFunction).toHaveBeenCalledOnce();
      const callArguments = signFunction.mock.lastCall as Uint8Array[];
      expect(Buffer.from(callArguments[0]).toString('hex')).toEqual(
        tx.unsignedHash.slice(2)
      );
    });

    /**
     * @target EvmChain.signTransaction should throw error when signing failed
     * @dependencies
     * @scenario
     * - mock a sign function to throw error
     * - mock PaymentTransaction of unsigned transaction
     * - call the function & check thrown exception
     * @expected
     * - it should throw the exact error thrown by sign function
     */
    it('should throw error when signing failed', async () => {
      // mock a sign function to throw error
      const signFunction = async (txHash: Uint8Array) => {
        throw Error(`TestError: sign failed`);
      };
      const evmChain = testUtils.generateChainObject(network, signFunction);

      // mock PaymentTransaction of unsigned transaction
      const eventId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const txType = TransactionType.payment;
      const tx = Transaction.from(TestData.transaction2UnsignedTx);

      const paymentTx = new PaymentTransaction(
        evmChain.CHAIN,
        tx.unsignedHash,
        eventId,
        Serializer.serialize(tx),
        txType
      );

      // call the function & check thrown exception
      await expect(async () => {
        await evmChain.signTransaction(paymentTx, 0);
      }).rejects.toThrow('TestError: sign failed');
    });
  });

  describe('getAddressAssets', () => {
    /**
     * @target EvmChain.getAddressAssets should get address assets successfully
     * @dependencies
     * @scenario
     * - mock getAddressBalanceForNativeToken
     * - mock getAddressBalanceForERC20Asset for each supported tokens
     * - call the function
     * - check returned value
     * @expected
     * - it should return mocked address assets (both input and output assets)
     */
    it('should get address assets successfully', async () => {
      mockGetAddressBalanceForNativeToken(evmChain.network, 1000n);
      vi.spyOn(network, 'getAddressBalanceForERC20Asset').mockImplementation(
        async (address, tokenId) => {
          if (tokenId === '0xedee4752e5a2f595151c94762fb38e5730357785')
            return 0n;
          else if (tokenId === '0x12345752e5a2f595151c94762fb38e5730357785')
            return 10n;
          else if (tokenId === '0xedee4752e5a2f595151c94762fb38e5730357786')
            return 30n;
          else if (tokenId === '0xedee4752e5a2f595151c94762fb38e5730357787')
            return 40n;
          else return 0n;
        }
      );

      // run test
      const result = await evmChain.getAddressAssets(TestData.lockAddress);

      // check returned value
      expect(result).toEqual({
        nativeToken: 1000n,
        tokens: [
          { id: '0xedee4752e5a2f595151c94762fb38e5730357785', value: 0n },
          { id: '0x12345752e5a2f595151c94762fb38e5730357785', value: 10n },
          { id: '0xedee4752e5a2f595151c94762fb38e5730357786', value: 30n },
          { id: '0xedee4752e5a2f595151c94762fb38e5730357787', value: 40n },
        ],
      });
    });

    /**
     * @target EvmChain.getAddressAssets should return 0 balance with no token if address is empty
     * @dependencies
     * @scenario
     * - call the function
     * - check returned value
     * @expected
     * - it should return mocked address assets (both input and output assets)
     */
    it('should return 0 balance with no token if address is empty', async () => {
      // run test
      const result = await evmChain.getAddressAssets('');

      // check returned value
      expect(result).toEqual({ nativeToken: 0n, tokens: [] });
    });

    /**
     * @target EvmChain.getAddressAssets should wrap address assets successfully
     * @dependencies
     * @scenario
     * - mock getAddressBalanceForNativeToken
     * - mock getAddressBalanceForERC20Asset for each supported tokens
     * - call the function
     * - check returned value
     * @expected
     * - it should return mocked address assets (both input and output assets)
     */
    it('should wrap address assets successfully', async () => {
      const evmChain =
        testUtils.generateChainObjectWithMultiDecimalTokenMap(network);

      mockGetAddressBalanceForNativeToken(evmChain.network, 1000n);
      vi.spyOn(network, 'getAddressBalanceForERC20Asset').mockImplementation(
        async (address, tokenId) => {
          if (tokenId === '0xedee4752e5a2f595151c94762fb38e5730357785')
            return 0n;
          else if (tokenId === '0x12345752e5a2f595151c94762fb38e5730357785')
            return 10n;
          else if (tokenId === '0xedee4752e5a2f595151c94762fb38e5730357786')
            return 30n;
          else if (tokenId === '0xedee4752e5a2f595151c94762fb38e5730357787')
            return 40n;
          else return 0n;
        }
      );

      // run test
      const result = await evmChain.getAddressAssets(TestData.lockAddress);

      // check returned value
      expect(result).toEqual({
        nativeToken: 10n,
        tokens: [
          { id: '0xedee4752e5a2f595151c94762fb38e5730357785', value: 0n },
          { id: '0x12345752e5a2f595151c94762fb38e5730357785', value: 10n },
          { id: '0xedee4752e5a2f595151c94762fb38e5730357786', value: 30n },
          { id: '0xedee4752e5a2f595151c94762fb38e5730357787', value: 40n },
        ],
      });
    });
  });

  describe('verifyLockTransactionExtraConditions', () => {
    /**
     * @target EvmChain.verifyLockTransactionExtraConditions should return true when
     * tx is succeed
     * @dependencies
     * @scenario
     * - mock transaction
     * - mock getTransactionStatus
     * - call the function
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when tx is succeed', async () => {
      // mock transaction
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);

      // mock getTransactionStatus
      testUtils.mockGetTransactionStatus(network, EvmTxStatus.succeed);

      // run test
      const result = await evmChain.verifyLockTransactionExtraConditions(
        tx,
        {} as any
      );

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target EvmChain.verifyLockTransactionExtraConditions should return false when
     * tx is failed
     * @dependencies
     * @scenario
     * - mock transaction
     * - mock getTransactionStatus
     * - call the function
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when tx is failed', async () => {
      // mock transaction
      const tx = Transaction.from(TestData.erc20transaction as TransactionLike);

      // mock getTransactionStatus
      testUtils.mockGetTransactionStatus(network, EvmTxStatus.failed);

      // run test
      const result = await evmChain.verifyLockTransactionExtraConditions(
        tx,
        {} as any
      );

      // check returned value
      expect(result).toEqual(false);
    });
  });
});
