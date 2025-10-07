import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';

import JsonBI from '@rosen-bridge/json-bigint';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  NotEnoughAssetsError,
  NotEnoughValidBoxesError,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import { CardanoBoxCandidate, CardanoUtxo } from '../lib';
import CardanoChain from '../lib/cardanoChain';
import CardanoTransaction from '../lib/cardanoTransaction';
import CardanoUtils from '../lib/cardanoUtils';
import TestCardanoNetwork from './network/testCardanoNetwork';
import * as TestData from './testData';
import * as TestUtils from './testUtils';

describe('CardanoChain', () => {
  const bankBoxes = TestUtils.mockBankBoxes();

  describe('generateTransaction', () => {
    const network = new TestCardanoNetwork();

    /**
     * @target CardanoChain.generateTransaction should generate payment
     * transaction successfully
     * @dependencies
     * @scenario
     * - mock transaction order, currentSlot
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - call the function
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId, network should be as expected
     * - PaymentTransaction inputUtxos should be the sorted version of the bankBoxes
     * - extracted order of generated transaction should be the same as input
     *   order
     * - transaction fee and ttl should be the same as config fee
     * - getCoveringBoxes should have been called with correct arguments
     */
    it('should generate payment transaction successfully', async () => {
      // mock transaction order, currentSlot
      const order = TestData.transaction1Order;
      const payment1 = CardanoTransaction.fromJson(
        TestData.transaction1PaymentTransaction,
      );
      const getSlotSpy = vi.spyOn(network, 'currentSlot');
      getSlotSpy.mockResolvedValue(100);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const cardanoChain = await TestUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(
        (cardanoChain as any).boxSelection,
        'getCoveringBoxes',
      );
      getCovBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: bankBoxes,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        cardanoChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // call the function
      const result = await cardanoChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [CardanoTransaction.fromJson(TestData.transaction1PaymentTransaction)],
        [],
      );
      const cardanoTx = result as CardanoTransaction;

      // check returned value
      expect(cardanoTx.txType).toEqual(payment1.txType);
      expect(cardanoTx.eventId).toEqual(payment1.eventId);
      expect(cardanoTx.network).toEqual(payment1.network);

      // check inputUtxos
      expect(cardanoTx.inputUtxos.length).toEqual(bankBoxes.length);
      bankBoxes.forEach((utxo) => {
        expect(cardanoTx.inputUtxos).toContain(JsonBI.stringify(utxo));
      });
      for (let i = 1; i < cardanoTx.inputUtxos.length; i++) {
        const previousUtxo = JsonBigInt.parse(cardanoTx.inputUtxos[i - 1]);
        const utxo = JsonBigInt.parse(cardanoTx.inputUtxos[i]);
        if (utxo.txId === previousUtxo.txId)
          expect(utxo.index).toBeGreaterThan(previousUtxo.index);
        else
          expect(BigInt(`0x${utxo.txId}`)).toBeGreaterThan(
            BigInt(`0x${previousUtxo.txId}`),
          );
      }

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = cardanoChain.extractTransactionOrder(cardanoTx);
      expect(extractedOrder).toEqual(order);

      // transaction fee and ttl should be the same as input configs
      const tx = Transaction.from_bytes(cardanoTx.txBytes);
      expect(tx.body().fee().to_str()).toEqual(
        TestUtils.configs.fee.toString(),
      );
      expect(tx.body().ttl()).toEqual(164);

      // getCoveringBoxes should have been called with correct arguments
      const expectedRequiredAssets = structuredClone(
        TestData.transaction1Order[0].assets,
      );
      expectedRequiredAssets.nativeToken +=
        TestUtils.minBoxValue + TestUtils.configs.fee;
      expect(getCovBoxesSpy).toHaveBeenCalledExactlyOnceWith(
        expectedRequiredAssets,
        TestData.transaction1InputIds,
        new Map(),
        expect.any(Object),
        expect.any(BigInt),
      );
    });

    /**
     * @target CardanoChain.generateTransaction should generate payment
     * transaction successfully with special tokens
     * @dependencies
     * @scenario
     * - mock transaction order, currentSlot
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - call the function
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId, network should be as expected
     * - PaymentTransaction inputUtxos should be the sorted version of the bankBoxes
     * - extracted order of generated transaction should be the same as input
     *   order
     * - transaction fee and ttl should be the same as config fee
     * - tokens with same policyId and should put correctly
     */
    it('should generate payment transaction successfully with special tokens', async () => {
      // mock transaction order, currentSlot
      const order = TestData.transaction4Order;
      const payment = CardanoTransaction.fromJson(
        TestData.transaction4PaymentTransaction,
      );
      const getSlotSpy = vi.spyOn(network, 'currentSlot');
      getSlotSpy.mockResolvedValue(200);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const cardanoChain = await TestUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(
        (cardanoChain as any).boxSelection,
        'getCoveringBoxes',
      );
      const mockedBoxes = bankBoxes.slice(2);
      getCovBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: mockedBoxes,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        cardanoChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // call the function
      const result = await cardanoChain.generateTransaction(
        '2bedc6e54ede7748e5efc7df689a0a89b281ac1d92d09054650d5f27a25d5b85',
        TransactionType.payment,
        order,
        [],
        [],
      );
      const cardanoTx = result as CardanoTransaction;

      // check returned value
      expect(cardanoTx.txType).toEqual(payment.txType);
      expect(cardanoTx.eventId).toEqual(payment.eventId);
      expect(cardanoTx.network).toEqual(payment.network);

      // check inputUtxos
      expect(cardanoTx.inputUtxos.length).toEqual(mockedBoxes.length);
      mockedBoxes.forEach((utxo) => {
        expect(cardanoTx.inputUtxos).toContain(JsonBI.stringify(utxo));
      });
      for (let i = 1; i < cardanoTx.inputUtxos.length; i++) {
        const previousUtxo = JsonBigInt.parse(cardanoTx.inputUtxos[i - 1]);
        const utxo = JsonBigInt.parse(cardanoTx.inputUtxos[i]);
        if (utxo.txId === previousUtxo.txId)
          expect(utxo.index).toBeGreaterThan(previousUtxo.index);
        else
          expect(BigInt(`0x${utxo.txId}`)).toBeGreaterThan(
            BigInt(`0x${previousUtxo.txId}`),
          );
      }

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = cardanoChain.extractTransactionOrder(cardanoTx);
      expect(extractedOrder).toEqual(order);

      // transaction fee and ttl should be the same as input configs
      const tx = Transaction.from_bytes(cardanoTx.txBytes);
      expect(tx.body().fee().to_str()).toEqual(
        TestUtils.configs.fee.toString(),
      );
      expect(tx.body().ttl()).toEqual(264);

      // tokens with same policyId and should put correctly
      expect(
        tx.body().outputs().get(1).amount().multiasset()!.to_json(),
      ).toEqual(TestData.transaction4ChangeBoxMultiAssets.trim());
    });

    /**
     * @target CardanoChain.generateTransaction should throw error
     * when lock address does not have enough assets
     * @dependencies
     * @scenario
     * - mock hasLockAddressEnoughAssets
     * - call the function and expect error
     * @expected
     * - generateTransaction should throw NotEnoughAssetsError
     */
    it('should throw error when lock address does not have enough assets', async () => {
      // mock hasLockAddressEnoughAssets
      const cardanoChain = await TestUtils.generateChainObject(network);
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        cardanoChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(false);

      // call the function and expect error
      await expect(async () => {
        await cardanoChain.generateTransaction(
          'event1',
          TransactionType.payment,
          TestData.transaction1Order,
          [],
          [],
        );
      }).rejects.toThrow(NotEnoughAssetsError);
    });

    /**
     * @target CardanoChain.generateTransaction should throw error
     * when bank boxes can not cover order assets
     * @dependencies
     * @scenario
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - call the function and expect error
     * @expected
     * - generateTransaction should throw NotEnoughValidBoxesError
     */
    it('should throw error when bank boxes can not cover order assets', async () => {
      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const cardanoChain = await TestUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(
        (cardanoChain as any).boxSelection,
        'getCoveringBoxes',
      );
      getCovBoxesSpy.mockResolvedValue({
        covered: false,
        boxes: bankBoxes,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        cardanoChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // call the function and expect error
      await expect(async () => {
        await cardanoChain.generateTransaction(
          'event1',
          TransactionType.payment,
          TestData.transaction1Order,
          [],
          [],
        );
      }).rejects.toThrow(NotEnoughValidBoxesError);
    });

    /**
     * @target CardanoChain.generateTransaction should generate payment
     * transaction with wrapped order successfully
     * @dependencies
     * @scenario
     * - mock transaction order, currentSlot
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - call the function
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId, network should be as expected
     * - PaymentTransaction inputUtxos should be the sorted version of the bankBoxes
     * - extracted order of generated transaction should be the same as input
     *   order
     * - transaction fee and ttl should be the same as config fee
     * - tokens with same policyId and should put correctly
     */
    it('should generate payment transaction with wrapped order successfully', async () => {
      // mock transaction order, currentSlot
      const order = TestData.transaction4WrappedOrder;
      const payment = CardanoTransaction.fromJson(
        TestData.transaction4PaymentTransaction,
      );
      const getSlotSpy = vi.spyOn(network, 'currentSlot');
      getSlotSpy.mockResolvedValue(200);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const cardanoChain =
        await TestUtils.generateChainObjectWithMultiDecimalTokenMap(network);
      const getCovBoxesSpy = vi.spyOn(
        (cardanoChain as any).boxSelection,
        'getCoveringBoxes',
      );
      const mockedBoxes = bankBoxes.slice(2);
      getCovBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: mockedBoxes,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        cardanoChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // call the function
      const result = await cardanoChain.generateTransaction(
        '2bedc6e54ede7748e5efc7df689a0a89b281ac1d92d09054650d5f27a25d5b85',
        TransactionType.payment,
        order,
        [],
        [],
      );
      const cardanoTx = result as CardanoTransaction;

      // check returned value
      expect(cardanoTx.txType).toEqual(payment.txType);
      expect(cardanoTx.eventId).toEqual(payment.eventId);
      expect(cardanoTx.network).toEqual(payment.network);

      // check inputUtxos
      expect(cardanoTx.inputUtxos.length).toEqual(mockedBoxes.length);
      mockedBoxes.forEach((utxo) => {
        expect(cardanoTx.inputUtxos).toContain(JsonBI.stringify(utxo));
      });
      for (let i = 1; i < cardanoTx.inputUtxos.length; i++) {
        const previousUtxo = JsonBigInt.parse(cardanoTx.inputUtxos[i - 1]);
        const utxo = JsonBigInt.parse(cardanoTx.inputUtxos[i]);
        if (utxo.txId === previousUtxo.txId)
          expect(utxo.index).toBeGreaterThan(previousUtxo.index);
        else
          expect(BigInt(`0x${utxo.txId}`)).toBeGreaterThan(
            BigInt(`0x${previousUtxo.txId}`),
          );
      }

      // extracted order of generated transaction should be the same as input order
      const extractedOrder = cardanoChain.extractTransactionOrder(cardanoTx);
      expect(extractedOrder).toEqual(order);

      // transaction fee and ttl should be the same as input configs
      const tx = Transaction.from_bytes(cardanoTx.txBytes);
      expect(tx.body().fee().to_str()).toEqual(
        TestUtils.configs.fee.toString(),
      );
      expect(tx.body().ttl()).toEqual(264);

      // tokens with same policyId and should put correctly
      expect(
        tx.body().outputs().get(1).amount().multiasset()!.to_json(),
      ).toEqual(TestData.transaction4ChangeBoxMultiAssets.trim());
    });
  });

  describe('extractTransactionOrder', () => {
    const network = new TestCardanoNetwork();

    /**
     * @target CardanoChain.extractTransactionOrder should extract transaction
     * order successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - call the function
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should extract transaction order successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction1PaymentTransaction,
      );
      const expectedOrder = TestData.transaction1Order;

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = cardanoChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target CardanoChain.extractTransactionOrder should wrap transaction
     * order successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - call the function
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should wrap transaction order successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction1PaymentTransaction,
      );
      const expectedOrder = TestData.transaction1WrappedOrder;

      // call the function
      const cardanoChain =
        await TestUtils.generateChainObjectWithMultiDecimalTokenMap(network);
      const result = cardanoChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });
  });

  describe('getBoxInfo', () => {
    const network = new TestCardanoNetwork();

    /**
     * @target CardanoChain.getBoxInfo should get box id and assets correctly
     * @dependencies
     * @scenario
     * - mock a CardanoBox with assets
     * - call the function
     * - check returned value
     * @expected
     * - it should return constructed BoxInfo
     */
    it('should get box info successfully', async () => {
      // mock a CardanoBox with assets
      const rawBox = bankBoxes[0];

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);

      // check returned value
      const result = (cardanoChain as any).getBoxInfo(rawBox);
      expect(result.id).toEqual(rawBox.txId + '.' + rawBox.index);
      expect(result.assets.nativeToken.toString()).toEqual(
        rawBox.value.toString(),
      );
    });
  });

  describe('signTransaction', () => {
    const network = new TestCardanoNetwork();

    /**
     * @target CardanoChain.signTransaction should return PaymentTransaction of the
     * signed transaction
     * @dependencies
     * @scenario
     * - mock a sign function to return signature
     * - mock PaymentTransaction of unsigned transaction
     * - call the function
     * - check returned value
     * @expected
     * - it should return PaymentTransaction of signed transaction (all fields
     *   are same as input object, except txBytes which is signed transaction)
     */
    it('should return PaymentTransaction of the signed transaction', async () => {
      // mock a sign function to return signature
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const signFunction = async (txHash: Uint8Array): Promise<string> => {
        return '4d9794972a26d36ebc35c819ef3c8eea80bd451e497ac89a7303dd3025714cb235fcad6621778fdbd99b56753e6493ea646ac7ade8f30fed7dca7138c741fe02';
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction1PaymentTransaction,
      );

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(
        network,
        signFunction,
      );
      const result = await cardanoChain.signTransaction(paymentTx, 0);

      // check returned value
      expect(result.txId).toEqual(paymentTx.txId);
      expect(result.txType).toEqual(paymentTx.txType);
      expect(result.eventId).toEqual(paymentTx.eventId);
      expect(result.network).toEqual(paymentTx.network);
    });

    /**
     * @target CardanoChain.signTransaction should throw error when signing failed
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const signFunction = async (txHash: Uint8Array): Promise<string> => {
        throw Error(`TestError: sign failed`);
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction1PaymentTransaction,
      );

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(
        network,
        signFunction,
      );

      await expect(async () => {
        await cardanoChain.signTransaction(paymentTx, 0);
      }).rejects.toThrow('TestError: sign failed');
    });
  });

  describe('getTransactionAssets', () => {
    const network = new TestCardanoNetwork();

    /**
     * @target CardanoChain.getTransactionAssets should get transaction assets
     * successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - call the function
     * - check returned value
     * @expected
     * - it should return mocked transaction assets (both input and output assets)
     */
    it('should get transaction assets successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction1PaymentTransaction,
      );

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);

      // check returned value
      const result = await cardanoChain.getTransactionAssets(paymentTx);
      expect(result.inputAssets).toEqual(TestData.transaction1InputAssets);
      expect(result.outputAssets).toEqual(TestData.transaction1Assets);
    });

    /**
     * @target CardanoChain.getTransactionAssets should skip duplicate inputs
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - call the function
     * - check returned value
     * @expected
     * - it should return mocked transaction assets (both input and output assets)
     */
    it('should skip duplicate inputs', async () => {
      // mock PaymentTransaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction6PaymentTransaction,
      );

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);

      // check returned value
      const result = await cardanoChain.getTransactionAssets(paymentTx);
      expect(result.inputAssets).toEqual(TestData.transaction6InputAssets);
    });

    /**
     * @target CardanoChain.getTransactionAssets should wrap transaction assets
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
      // mock PaymentTransaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction1PaymentTransaction,
      );

      // call the function
      const cardanoChain =
        await TestUtils.generateChainObjectWithMultiDecimalTokenMap(network);

      // check returned value
      const result = await cardanoChain.getTransactionAssets(paymentTx);
      expect(result.inputAssets).toEqual(
        TestData.transaction1WrappedInputAssets,
      );
      expect(result.outputAssets).toEqual(TestData.transaction1WrappedAssets);
    });
  });

  describe('getMempoolBoxMapping', () => {
    const network = new TestCardanoNetwork();
    const trackingAddress =
      'addr1qxwxpafgqasnddk8et6en0vn74awg4j0n2nfek6e62aywvgcwedk5s2s92dx7msutk33zsl92uh8uhahh305nz7pekjsz5l37w';

    /**
     * @target CardanoChain.getMempoolBoxMapping should construct mapping
     * successfully when no token provided
     * @dependencies
     * @scenario
     * - mock getMempoolTransactions
     * - call the function
     * - check returned value
     * @expected
     * - it should return a map equal to constructed map
     */
    it('should construct mapping successfully when no token provided', async () => {
      // mock getMempoolTransactions
      const transactions = [TestData.cardanoTx1];
      vi.spyOn(network, 'getMempoolTransactions').mockResolvedValueOnce(
        transactions,
      );

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.getMempoolBoxMapping(trackingAddress);

      // check returned value
      const trackMap = new Map<string, CardanoUtxo | undefined>();
      trackMap.set(CardanoUtils.getBoxId(TestData.cardanoTx1.inputs[0]), {
        txId: TestData.cardanoTx1.id,
        index: 0,
        value: TestData.cardanoTx1.outputs[0].value,
        assets: TestData.cardanoTx1.outputs[0].assets,
      });
      expect(result).toEqual(trackMap);
    });

    /**
     * @target CardanoChain.getMempoolBoxMapping should construct mapping
     * successfully when token provided
     * @dependencies
     * @scenario
     * - mock getMempoolTransactions
     * - call the function
     * - check returned value
     * @expected
     * - it should return a map equal to constructed map
     */
    it('should construct mapping successfully when token provided', async () => {
      // mock getMempoolTransactions
      const transactions = [TestData.cardanoTx1];
      vi.spyOn(network, 'getMempoolTransactions').mockResolvedValueOnce(
        transactions,
      );

      // call the function
      const trackingTokenId =
        'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59';
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.getMempoolBoxMapping(
        trackingAddress,
        trackingTokenId,
      );

      // check returned value
      const trackMap = new Map<string, CardanoUtxo | undefined>();
      trackMap.set(CardanoUtils.getBoxId(TestData.cardanoTx1.inputs[0]), {
        txId: TestData.cardanoTx1.id,
        index: 0,
        value: TestData.cardanoTx1.outputs[0].value,
        assets: TestData.cardanoTx1.outputs[0].assets,
      });
      expect(result).toEqual(trackMap);
    });

    /**
     * @target CardanoChain.getMempoolBoxMapping should map inputs to
     * undefined when no valid output box found
     * @dependencies
     * @scenario
     * - mock getMempoolTransactions
     * - call the function
     * - check returned value
     * @expected
     * - it should return a map of each box to undefined
     */
    it('should map inputs to undefined when no valid output box found', async () => {
      // mock getMempoolTransactions
      const transactions = [TestData.cardanoTx1];
      vi.spyOn(network, 'getMempoolTransactions').mockResolvedValueOnce(
        transactions,
      );

      // call the function
      const trackingTokenId =
        '48d4a14b8407af8407702df3afda4cc8a945ce55235e9808c62c5f9b.5273744572676f546f6b656e7654657374';
      vi.spyOn(network, 'getMempoolTransactions').mockResolvedValueOnce(
        transactions,
      );
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.getMempoolBoxMapping(
        trackingAddress,
        trackingTokenId,
      );

      // check returned value
      const trackMap = new Map<string, CardanoUtxo | undefined>();
      trackMap.set(
        CardanoUtils.getBoxId(TestData.cardanoTx1.inputs[0]),
        undefined,
      );
      expect(result).toEqual(trackMap);
    });
  });

  describe('getTransactionsBoxMapping', async () => {
    const network = new TestCardanoNetwork();
    class TestCardanoChain extends CardanoChain {
      callGetTransactionsBoxMapping = (
        serializedTransactions: Transaction[],
        address: string,
        tokenId?: string,
      ) => {
        return this.getTransactionsBoxMapping(
          serializedTransactions,
          address,
          tokenId,
        );
      };
    }
    const tokenMap = new TokenMap();
    await tokenMap.updateConfigByJson(TestData.testTokenMap);
    const testInstance = new TestCardanoChain(
      network,
      TestUtils.configs,
      tokenMap,
      null as any,
    );

    /**
     * @target CardanoChain.getTransactionsBoxMapping should construct mapping
     * successfully when no token provided
     * @dependencies
     * @scenario
     * - mock serialized transactions
     * - call the function
     * - check returned value
     * @expected
     * - it should return a map equal to constructed map
     */
    it('should construct mapping successfully when no token provided', () => {
      // mock serialized transactions
      const transactions = [TestData.transaction1].map((txJson) =>
        Transaction.from_json(txJson),
      );

      // call the function
      const result = testInstance.callGetTransactionsBoxMapping(
        transactions,
        TestUtils.configs.addresses.lock,
      );

      // check returned value
      const trackMap = new Map<string, CardanoUtxo | undefined>();
      const boxMapping = TestData.transaction1BoxMapping;
      boxMapping.forEach((mapping) => {
        const candidate = JsonBI.parse(
          mapping.serializedOutput,
        ) as CardanoBoxCandidate;
        trackMap.set(mapping.inputId, {
          txId: TestData.transaction1Id,
          index: 1,
          value: candidate.value,
          assets: candidate.assets,
        });
      });
      expect(result).toEqual(trackMap);
    });

    /**
     * @target CardanoChain.getTransactionsBoxMapping should construct mapping
     * successfully when token provided
     * @dependencies
     * @scenario
     * - mock serialized transactions
     * - call the function
     * - check returned value
     * @expected
     * - it should return a map equal to constructed map
     */
    it('should construct mapping successfully when token provided', () => {
      // mock serialized transactions
      const transactions = [TestData.transaction1].map((txJson) =>
        Transaction.from_json(txJson),
      );

      // call the function
      const trackingTokenId =
        'ef6aa6200e21634e58ce6796b4b61d1d7d059d2ebe93c2996eeaf286.5273744552477654657374';
      const result = testInstance.callGetTransactionsBoxMapping(
        transactions,
        TestUtils.configs.addresses.lock,
        trackingTokenId,
      );

      // check returned value
      const trackMap = new Map<string, CardanoUtxo | undefined>();
      const boxMapping = TestData.transaction1BoxMapping;
      boxMapping.forEach((mapping) => {
        const candidate = JsonBI.parse(
          mapping.serializedOutput,
        ) as CardanoBoxCandidate;
        trackMap.set(mapping.inputId, {
          txId: TestData.transaction1Id,
          index: 1,
          value: candidate.value,
          assets: candidate.assets,
        });
      });
      expect(result).toEqual(trackMap);
    });

    /**
     * @target CardanoChain.getTransactionsBoxMapping should map inputs to
     * undefined when no valid output box found
     * @dependencies
     * @scenario
     * - mock serialized transactions
     * - call the function
     * - check returned value
     * @expected
     * - it should return a map of each box to undefined
     */
    it('should map inputs to undefined when no valid output box found', () => {
      // mock serialized transactions
      const transactions = [TestData.transaction1].map((txJson) =>
        Transaction.from_json(txJson),
      );

      // call the function
      const trackingTokenId = 'asset1v25eyenfzrv6me9hw4vczfprdctzy5ed3x99p0';
      const result = testInstance.callGetTransactionsBoxMapping(
        transactions,
        TestUtils.configs.addresses.lock,
        trackingTokenId,
      );

      // check returned value
      const trackMap = new Map<string, CardanoUtxo | undefined>();
      const boxMapping = TestData.transaction1BoxMapping;
      boxMapping.forEach((mapping) => {
        trackMap.set(mapping.inputId, undefined);
      });
      expect(result).toEqual(trackMap);
    });
  });

  describe('isTxInMempool', () => {
    const network = new TestCardanoNetwork();

    /**
     * @target CardanoChain.isTxInMempool should true when tx is in mempool
     * @dependencies
     * @scenario
     * - mock getMempoolTransactions
     * - call the function
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should true when tx is in mempool', async () => {
      // mock getMempoolTransactions
      const transactions = [TestData.cardanoTx1];
      vi.spyOn(network, 'getMempoolTransactions').mockResolvedValueOnce(
        transactions,
      );

      // call the function
      const txId = transactions[0].id;
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.isTxInMempool(txId);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target CardanoChain.isTxInMempool should false when tx is NOT in mempool
     * @dependencies
     * @scenario
     * - mock getMempoolTransactions
     * - call the function
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should false when tx is NOT in mempool', async () => {
      //  mock getMempoolTransactions
      const transactions = [TestData.cardanoTx1];
      vi.spyOn(network, 'getMempoolTransactions').mockResolvedValueOnce(
        transactions,
      );

      // call the function
      const txId = TestUtils.generateRandomId();
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.isTxInMempool(txId);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('isTxValid', () => {
    const network = new TestCardanoNetwork();

    /**
     * @target CardanoChain.isTxValid should return true when
     * all tx inputs are valid and ttl is less than current slot
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock a network object to return as valid for all inputs of a mocked
     *   transaction
     * - mock currentSlot of cardano network
     * - call the function
     * - check returned value
     * @expected
     * - it should return true with no details
     */
    it('should return true when all tx inputs are valid and ttl is less than current slot', async () => {
      // mock PaymentTransaction
      const payment1 = CardanoTransaction.fromJson(
        TestData.transaction5PaymentTransaction,
      );

      // mock a network object to return as valid for all inputs of a mocked transaction
      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy.mockResolvedValue(true);

      // mock get current slot of cardano network
      const currentSlotSpy = vi.spyOn(network, 'currentSlot');
      currentSlotSpy.mockResolvedValue(100);

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.isTxValid(payment1);

      // check returned value
      expect(result).toEqual({
        isValid: true,
        details: undefined,
      });
    });

    /**
     * @target CardanoChain.isTxValid should return false when ttl is expired
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock currentSlot of cardano network
     * - call the function
     * - check returned value
     * @expected
     * - it should return false and as expected invalidation
     */
    it('should return false when ttl is expired', async () => {
      // mock PaymentTransaction
      const payment1 = CardanoTransaction.fromJson(
        TestData.transaction1PaymentTransaction,
      );

      // mock get current slot of cardano network
      const currentSlotSpy = vi.spyOn(network, 'currentSlot');
      currentSlotSpy.mockResolvedValue(1000);

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.isTxValid(payment1);

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
     * @target CardanoChain.isTxValid should return false when at least one input
     * is invalid
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock a network object to return as valid for all inputs of a mocked
     *   transaction except for the first one
     * - mock currentSlot of cardano network
     * - call the function
     * - check returned value
     * @expected
     * - it should return false and as expected invalidation
     */
    it('should return false when at least one input is invalid', async () => {
      // mock PaymentTransaction
      const payment1 = CardanoTransaction.fromJson(
        TestData.transaction1PaymentTransaction,
      );

      // mock a network object to return as valid for all inputs of a mocked
      //   transaction except for the first one
      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy
        .mockResolvedValueOnce(false)
        .mockResolvedValue(true);

      // mock get current slot of cardano network
      const currentSlotSpy = vi.spyOn(network, 'currentSlot');
      currentSlotSpy.mockResolvedValue(100);

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.isTxValid(payment1);

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
     * @target CardanoChain.isTxValid should return false when
     * input and output assets do not match
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock a network object to return as valid for all inputs of a mocked
     *   transaction
     * - mock currentSlot of cardano network
     * - call the function
     * - check returned value
     * @expected
     * - it should return false and as expected invalidation
     */
    it('should return false when input and output assets do not match', async () => {
      // mock PaymentTransaction
      const payment1 = CardanoTransaction.fromJson(
        TestData.transaction6PaymentTransaction,
      );

      // mock a network object to return as valid for all inputs of a mocked transaction
      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy.mockResolvedValue(true);

      // mock get current slot of cardano network
      const currentSlotSpy = vi.spyOn(network, 'currentSlot');
      currentSlotSpy.mockResolvedValue(100);

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.isTxValid(payment1);

      // check returned value
      expect(result).toEqual({
        isValid: false,
        details: {
          reason: expect.any(String),
          unexpected: false,
        },
      });
    });
  });

  describe('verifyTransactionFee', () => {
    const network = new TestCardanoNetwork();

    /**
     * @target CardanoChain.verifyTransactionFee should return true when fee is
     * less than config fee
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - call the function
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when fee is less than config fee', async () => {
      // mock PaymentTransaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction1PaymentTransaction,
      );

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target CardanoChain.verifyTransactionFee should return false when fee is
     * more than config fee
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - call the function
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when fee is more than config fee', async () => {
      // mock PaymentTransaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction2PaymentTransaction,
      );

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyTransactionExtraConditions', () => {
    const network = new TestCardanoNetwork();

    /**
     * @target: CardanoChain.verifyTransactionExtraConditions should return true when all
     * extra conditions are met
     * @dependencies
     * @scenario
     * - mock a payment transaction
     * - call the function
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when all extra conditions are met', async () => {
      // mock a payment transaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction1PaymentTransaction,
      );

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result =
        await cardanoChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target: CardanoChain.verifyTransactionExtraConditions should return false
     * when transaction has metadata
     * @dependencies
     * @scenario
     * - mock a payment transaction
     * - call the function
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when transaction has metadata', async () => {
      // mock a payment transaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction3PaymentTransaction,
      );

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = cardanoChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: CardanoChain.verifyTransactionExtraConditions should return false
     * when change box address is wrong
     * @dependencies
     * @scenario
     * - mock a payment transaction
     * - create a new CardanoChain object with custom lock address
     * - call the function
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when change box address is wrong', async () => {
      // mock a payment transaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction1PaymentTransaction,
      );

      // create a new CardanoChain object with custom lock address
      const newConfigs = structuredClone(TestUtils.configs);
      newConfigs.addresses.lock = 'TEST';
      const tokenMap = new TokenMap();
      await tokenMap.updateConfigByJson(TestData.testTokenMap);
      const cardanoChain = new CardanoChain(
        network,
        newConfigs,
        tokenMap,
        TestUtils.mockedSignFn,
      );

      // call the function
      const result = cardanoChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('rawTxToPaymentTransaction', () => {
    const network = new TestCardanoNetwork();

    /**
     * @target CardanoChain.rawTxToPaymentTransaction should construct transaction successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock getUtxo
     * - call the function
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should construct transaction successfully', async () => {
      // mock PaymentTransaction
      const expectedTx = CardanoTransaction.fromJson(
        TestData.transaction5PaymentTransaction,
      );
      const rawTxJsonString = Transaction.from_bytes(
        expectedTx.txBytes,
      ).to_json();
      expectedTx.eventId = '';
      expectedTx.txType = TransactionType.manual;

      // mock getUtxo
      const getUtxoSpy = vi.spyOn(network, 'getUtxo');
      expectedTx.inputUtxos.forEach((utxo) =>
        getUtxoSpy.mockResolvedValueOnce(JsonBigInt.parse(utxo) as CardanoUtxo),
      );

      // call the function
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result =
        await cardanoChain.rawTxToPaymentTransaction(rawTxJsonString);

      // check returned value
      expect(result.toJson()).toEqual(expectedTx.toJson());
    });
  });

  describe('verifyPaymentTransaction', () => {
    const network = new TestCardanoNetwork();

    /**
     * @target CardanoChain.verifyPaymentTransaction should return true
     * when data is consistent
     * @dependencies
     * @scenario
     * - mock a CardanoTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when data is consistent', async () => {
      // mock a CardanoTransaction
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction5PaymentTransaction,
      );

      // run test
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target CardanoChain.verifyPaymentTransaction should return false
     * when transaction id is wrong
     * @dependencies
     * @scenario
     * - mock a CardanoTransaction with changed txId
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when transaction id is wrong', async () => {
      // mock a CardanoTransaction with changed txId
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction5PaymentTransaction,
      );
      paymentTx.txId = TestUtils.generateRandomId();

      // run test
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target CardanoChain.verifyPaymentTransaction should return false
     * when number of boxes is wrong
     * @dependencies
     * @scenario
     * - mock a CardanoTransaction with less boxes
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when number of boxes is wrong', async () => {
      // mock a CardanoTransaction with less boxes
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction5PaymentTransaction,
      );
      paymentTx.inputUtxos.pop();

      // run test
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target CardanoChain.verifyPaymentTransaction should return false
     * when at least one of the boxes is wrong
     * @dependencies
     * @scenario
     * - mock a CardanoTransaction with changed box
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when at least one of the boxes is wrong', async () => {
      // mock a CardanoTransaction with changed box
      const paymentTx = CardanoTransaction.fromJson(
        TestData.transaction5PaymentTransaction,
      );
      paymentTx.inputUtxos[1] = JsonBigInt.stringify({
        txId: TestUtils.generateRandomId(),
        index: 1,
      });

      // run test
      const cardanoChain = await TestUtils.generateChainObject(network);
      const result = await cardanoChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });
});
