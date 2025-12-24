import { isRunestone, tryDecodeRunestone } from '@magiceden-oss/runestone-lib';
import { address, Psbt, Transaction } from 'bitcoinjs-lib';

import JsonBigInt from '@rosen-bridge/json-bigint';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  ChainUtils,
  NotEnoughAssetsError,
  NotEnoughValidBoxesError,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import {
  BITCOIN_RUNES_CHAIN,
  BitcoinRunesChain,
  BitcoinRunesTransaction,
} from '../lib';
import { TestBitcoinRunesNetwork } from './network/testBitcoinRunesNetwork';
import * as testData from './testData';
import { generateChainObject, generateRandomId } from './testUtils';
import * as testUtils from './testUtils';

describe('BitcoinRunesChain', () => {
  describe('generateTransaction', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target BitcoinRunesChain.generateTransaction should generate payment
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
     * - transaction artifact should be a Runestone
     * - extracted order of generated transaction should be the same as input
     *   order
     * - getCoveringBoxes should have been called with correct arguments
     */
    it('should generate payment transaction successfully', async () => {
      // mock transaction order
      const order = testData.transaction1Order;
      const payment1 = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = {
        fn: vi.spyOn(
          (bitcoinRunesChain as any).boxSelection, // eslint-disable-line @typescript-eslint/no-explicit-any
          'getCoveringBoxes',
        ),
        callArgs: {
          forbiddenBoxIds: Array<string>(),
        },
      };
      const selectedBoxes = testData.lockAddressUtxos.slice(0, 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getCovBoxesSpy.fn.mockImplementation((...args: any[]) => {
        getCovBoxesSpy.callArgs.forbiddenBoxIds.push(structuredClone(args[1]));
        const fee = 215n;
        const remainingNativeToken =
          selectedBoxes
            .map((box) => box.value)
            .reduce((sum, value) => sum + value, 0n) -
          args[0].nativeToken -
          fee;
        return {
          covered: true,
          boxes: selectedBoxes,
          additionalAssets: {
            aggregated: {
              nativeToken: remainingNativeToken,
              tokens: [{ id: '880890:3052', value: 3500000n }],
            },
            list: [
              {
                nativeToken: remainingNativeToken,
                tokens: [{ id: '880890:3052', value: 3500000n }],
              },
            ],
            fee: fee,
          },
        };
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        bitcoinRunesChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const result = await bitcoinRunesChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [
          BitcoinRunesTransaction.fromJson(
            testData.transaction2PaymentTransaction,
          ),
        ],
        [],
      );
      const bitcoinTx = result as BitcoinRunesTransaction;

      // check returned value
      expect(bitcoinTx.txType).toEqual(payment1.txType);
      expect(bitcoinTx.eventId).toEqual(payment1.eventId);
      expect(bitcoinTx.network).toEqual(payment1.network);
      expect(bitcoinTx.inputUtxos).toEqual(
        selectedBoxes.map((utxo) => JsonBigInt.stringify(utxo)),
      );

      // transaction artifact should be a Runestone
      const psbt = Psbt.fromBuffer(Buffer.from(bitcoinTx.txBytes));
      const runestone = tryDecodeRunestone({
        vout: Transaction.fromBuffer(psbt.data.getTransaction()).outs.map(
          (out) => ({
            scriptPubKey: { hex: out.script.toString('hex') },
          }),
        ),
      });
      expect(runestone).toBeDefined();
      expect(isRunestone(runestone!)).toEqual(true);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder =
        bitcoinRunesChain.extractTransactionOrder(bitcoinTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called with correct arguments
      expect(getCovBoxesSpy.fn).toHaveBeenCalledExactlyOnceWith(
        {
          nativeToken: 0n,
          tokens: testData.transaction1Order[0].assets.tokens,
        },
        expect.any(Array), // Since the argument is mutated, it's not possible to check it here
        new Map(),
        expect.any(Object),
        expect.any(BigInt),
        undefined,
        expect.any(Function),
      );
      //-- check forbiddenBoxIds
      expect(getCovBoxesSpy.callArgs.forbiddenBoxIds.at(-1)).toEqual(
        testData.transaction2InputIds,
      );
    });

    /**
     * @target BitcoinRunesChain.generateTransaction should generate payment
     * transaction successfully even when no transferring rune remains
     * @dependencies
     * @scenario
     * - mock transaction order, getFeeRatio
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - run test
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId, network and inputUtxos should be as
     *   expected
     * - transaction artifact should be a Runestone
     * - extracted order of generated transaction should be the same as input
     *   order
     * - getCoveringBoxes should have been called with correct arguments
     */
    it('should generate payment transaction successfully even when no transferring rune remains', async () => {
      // mock transaction order
      const order = structuredClone(testData.transaction1Order);
      order[0].assets.tokens[0].value = 5500000n;
      const payment1 = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = {
        fn: vi.spyOn(
          (bitcoinRunesChain as any).boxSelection, // eslint-disable-line @typescript-eslint/no-explicit-any
          'getCoveringBoxes',
        ),
        callArgs: {
          forbiddenBoxIds: Array<string>(),
        },
      };
      const selectedBoxes = testData.lockAddressUtxos.slice(0, 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getCovBoxesSpy.fn.mockImplementation((...args: any[]) => {
        getCovBoxesSpy.callArgs.forbiddenBoxIds.push(structuredClone(args[1]));
        const fee = 215n;
        const remainingNativeToken =
          selectedBoxes
            .map((box) => box.value)
            .reduce((sum, value) => sum + value, 0n) -
          args[0].nativeToken -
          fee;
        return {
          covered: true,
          boxes: selectedBoxes,
          additionalAssets: {
            aggregated: {
              nativeToken: remainingNativeToken,
              tokens: [],
            },
            list: [
              {
                nativeToken: remainingNativeToken,
                tokens: [],
              },
            ],
            fee: fee,
          },
        };
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        bitcoinRunesChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const result = await bitcoinRunesChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [
          BitcoinRunesTransaction.fromJson(
            testData.transaction2PaymentTransaction,
          ),
        ],
        [],
      );
      const bitcoinTx = result as BitcoinRunesTransaction;

      // check returned value
      expect(bitcoinTx.txType).toEqual(payment1.txType);
      expect(bitcoinTx.eventId).toEqual(payment1.eventId);
      expect(bitcoinTx.network).toEqual(payment1.network);
      expect(bitcoinTx.inputUtxos).toEqual(
        selectedBoxes.map((utxo) => JsonBigInt.stringify(utxo)),
      );

      // transaction artifact should be a Runestone
      const psbt = Psbt.fromBuffer(Buffer.from(bitcoinTx.txBytes));
      const runestone = tryDecodeRunestone({
        vout: Transaction.fromBuffer(psbt.data.getTransaction()).outs.map(
          (out) => ({
            scriptPubKey: { hex: out.script.toString('hex') },
          }),
        ),
      });
      expect(runestone).toBeDefined();
      expect(isRunestone(runestone!)).toEqual(true);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder =
        bitcoinRunesChain.extractTransactionOrder(bitcoinTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called with correct arguments
      expect(getCovBoxesSpy.fn).toHaveBeenCalledExactlyOnceWith(
        { nativeToken: 0n, tokens: order[0].assets.tokens },
        expect.any(Array), // Since the argument is mutated, it's not possible to check it here
        new Map(),
        expect.any(Object),
        expect.any(BigInt),
        undefined,
        expect.any(Function),
      );
      //-- check forbiddenBoxIds
      expect(getCovBoxesSpy.callArgs.forbiddenBoxIds.at(-1)).toEqual(
        testData.transaction2InputIds,
      );
    });

    /**
     * @target BitcoinRunesChain.generateTransaction should generate payment
     * transaction with universal change box when inputs contain other runes
     * @dependencies
     * @scenario
     * - mock transaction order, getFeeRatio
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - run test
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId, network and inputUtxos should be as
     *   expected
     * - transaction artifact should be a Runestone
     * - extracted order of generated transaction should be the same as input
     *   order
     * - address/script of each utxo should be as expected
     *   - 1st: lock address (universal change)
     *   - 2nd: lock address (transferring rune change)
     *   - 3rd: OP_RETURN (Note: the value is not verified here)
     *   - 4th: target address
     *   - 5th: lock address (BTC change)
     * - getCoveringBoxes should have been called with correct arguments
     */
    it('should generate payment transaction with universal change box when inputs contain other runes', async () => {
      // mock transaction order
      const order = testData.transaction3Order;
      const payment1 = BitcoinRunesTransaction.fromJson(
        testData.transaction3PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = {
        fn: vi.spyOn(
          (bitcoinRunesChain as any).boxSelection, // eslint-disable-line @typescript-eslint/no-explicit-any
          'getCoveringBoxes',
        ),
        callArgs: {
          forbiddenBoxIds: Array<string>(),
        },
      };
      const selectedBoxes = testData.lockAddressUtxos;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getCovBoxesSpy.fn.mockImplementation((...args: any[]) => {
        getCovBoxesSpy.callArgs.forbiddenBoxIds.push(structuredClone(args[1]));
        const remainingAsset = ChainUtils.subtractAssetBalance(
          structuredClone(testData.lockBalance),
          args[0],
        );
        const fee = 381n;
        remainingAsset.nativeToken -= fee;
        return {
          covered: true,
          boxes: selectedBoxes,
          additionalAssets: {
            aggregated: remainingAsset,
            list: [remainingAsset],
            fee: fee,
          },
        };
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        bitcoinRunesChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const result = await bitcoinRunesChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [],
        [],
      );
      const bitcoinTx = result as BitcoinRunesTransaction;

      // check returned value
      expect(bitcoinTx.txType).toEqual(payment1.txType);
      expect(bitcoinTx.eventId).toEqual(payment1.eventId);
      expect(bitcoinTx.network).toEqual(payment1.network);
      expect(bitcoinTx.inputUtxos).toEqual(
        selectedBoxes.map((utxo) => JsonBigInt.stringify(utxo)),
      );

      // transaction artifact should be a Runestone
      const psbt = Psbt.fromBuffer(Buffer.from(bitcoinTx.txBytes));
      const runestone = tryDecodeRunestone({
        vout: Transaction.fromBuffer(psbt.data.getTransaction()).outs.map(
          (out) => ({
            scriptPubKey: { hex: out.script.toString('hex') },
          }),
        ),
      });
      expect(runestone).toBeDefined();
      expect(isRunestone(runestone!)).toEqual(true);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder =
        bitcoinRunesChain.extractTransactionOrder(bitcoinTx);
      expect(extractedOrder).toEqual(order);

      // address/script of each utxo should be as expected
      expect(psbt.txOutputs.length).toEqual(5);
      expect(address.fromOutputScript(psbt.txOutputs[0].script)).toEqual(
        testData.lockAddress,
      );
      expect(address.fromOutputScript(psbt.txOutputs[1].script)).toEqual(
        testData.lockAddress,
      );
      expect(psbt.txOutputs[2].script.toString('hex')).toMatch(/^6a/); // assert that script starts with OP_RETURN opcode (6a)
      expect(address.fromOutputScript(psbt.txOutputs[3].script)).toEqual(
        order[0].address,
      );
      expect(address.fromOutputScript(psbt.txOutputs[4].script)).toEqual(
        testData.lockAddress,
      );

      // getCoveringBoxes should have been called with correct arguments
      expect(getCovBoxesSpy.fn).toHaveBeenCalledExactlyOnceWith(
        {
          nativeToken: 0n,
          tokens: testData.transaction3Order[0].assets.tokens,
        },
        expect.any(Array), // Since the argument is mutated, it's not possible to check it here
        new Map(),
        expect.any(Object),
        expect.any(BigInt),
        undefined,
        expect.any(Function),
      );
      //-- check forbiddenBoxIds
      expect(getCovBoxesSpy.callArgs.forbiddenBoxIds.at(-1)).toEqual([]);
    });

    /**
     * @target BitcoinRunesChain.generateTransaction should generate payment
     * transaction while fetching BTC boxes from different API
     * @dependencies
     * @scenario
     * - mock transaction order, getFeeRatio
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - run test
     * - check returned value
     * @expected
     * - PaymentTransaction txType, eventId, network and inputUtxos should be as
     *   expected
     * - transaction artifact should be a Runestone
     * - extracted order of generated transaction should be the same as input
     *   order
     * - getCoveringBoxes should have been called twice with correct arguments
     */
    it('should generate payment transaction while fetching BTC boxes from different API', async () => {
      // mock transaction order
      const order = testData.transaction1Order;
      const payment1 = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = {
        fn: vi.spyOn(
          (bitcoinRunesChain as any).boxSelection, // eslint-disable-line @typescript-eslint/no-explicit-any
          'getCoveringBoxes',
        ),
        callArgs: {
          forbiddenBoxIds: Array<string>(),
        },
      };
      const selectedBoxesOfEachCall = [
        testData.realisticLockAddressUtxos.slice(0, 1),
        testData.realisticLockAddressUtxos.slice(2, 4),
      ];
      const totalSelectedBoxes = selectedBoxesOfEachCall.flat();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getCovBoxesSpy.fn.mockImplementation((...args: any[]) => {
        const selectedBoxes =
          selectedBoxesOfEachCall[
            getCovBoxesSpy.callArgs.forbiddenBoxIds.length
          ];
        getCovBoxesSpy.callArgs.forbiddenBoxIds.push(structuredClone(args[1]));
        const fee = 314n;
        const remainingNativeToken =
          selectedBoxes
            .map((box) => box.value)
            .reduce((sum, value) => sum + value, 0n) -
          args[0].nativeToken -
          fee;
        const remainingAssets = {
          nativeToken: remainingNativeToken,
          tokens: [
            {
              id: '880890:3052',
              value: 5500000n - (args[0].tokens.at(0)?.value ?? 0n),
            },
          ],
        };
        return {
          covered: true,
          boxes: selectedBoxes,
          additionalAssets: {
            aggregated: remainingAssets,
            list: [remainingAssets],
            fee: fee,
          },
        };
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        bitcoinRunesChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const result = await bitcoinRunesChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [
          BitcoinRunesTransaction.fromJson(
            testData.transaction2PaymentTransaction,
          ),
        ],
        [],
      );
      const bitcoinTx = result as BitcoinRunesTransaction;

      // check returned value
      expect(bitcoinTx.txType).toEqual(payment1.txType);
      expect(bitcoinTx.eventId).toEqual(payment1.eventId);
      expect(bitcoinTx.network).toEqual(payment1.network);
      expect(bitcoinTx.inputUtxos).toEqual(
        totalSelectedBoxes.map((utxo) => JsonBigInt.stringify(utxo)),
      );

      // transaction artifact should be a Runestone
      const psbt = Psbt.fromBuffer(Buffer.from(bitcoinTx.txBytes));
      const runestone = tryDecodeRunestone({
        vout: Transaction.fromBuffer(psbt.data.getTransaction()).outs.map(
          (out) => ({
            scriptPubKey: { hex: out.script.toString('hex') },
          }),
        ),
      });
      expect(runestone).toBeDefined();
      expect(isRunestone(runestone!)).toEqual(true);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder =
        bitcoinRunesChain.extractTransactionOrder(bitcoinTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called twice with correct arguments
      expect(getCovBoxesSpy.fn).toHaveBeenNthCalledWith(
        1,
        {
          nativeToken: 0n,
          tokens: testData.transaction1Order[0].assets.tokens,
        },
        expect.any(Array), // Since the argument is mutated, it's not possible to check it here
        new Map(),
        expect.any(Object),
        expect.any(BigInt),
        undefined,
        expect.any(Function),
      );
      expect(getCovBoxesSpy.fn).toHaveBeenNthCalledWith(
        2,
        { nativeToken: 330n + 294n, tokens: [] }, // Sum of MinUtxoValue of taproot and native-segwit
        expect.any(Array), // Since the argument is mutated, it's not possible to check it here
        new Map(),
        expect.any(Object),
        expect.any(BigInt),
        undefined,
        expect.any(Function),
      );
      //-- check forbiddenBoxIds
      expect(getCovBoxesSpy.callArgs.forbiddenBoxIds[0]).toEqual(
        testData.transaction2InputIds,
      );
      expect(getCovBoxesSpy.callArgs.forbiddenBoxIds[1]).toEqual([
        ...testData.transaction2InputIds,
        testData.realisticLockAddressBoxIds[0],
      ]);
    });

    /**
     * @target BitcoinRunesChain.generateTransaction should throw error
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
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        bitcoinRunesChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(false);

      // run test and expect error
      await expect(async () => {
        await bitcoinRunesChain.generateTransaction(
          'event1',
          TransactionType.payment,
          testData.transaction1Order,
          [],
          [],
        );
      }).rejects.toThrow(NotEnoughAssetsError);
    });

    /**
     * @target BitcoinRunesChain.generateTransaction should throw error
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
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = vi.spyOn(
        (bitcoinRunesChain as any).boxSelection, // eslint-disable-line @typescript-eslint/no-explicit-any
        'getCoveringBoxes',
      );
      getCovBoxesSpy.mockResolvedValue({
        covered: false,
        boxes: testData.lockAddressUtxos,
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        bitcoinRunesChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test and expect error
      await expect(async () => {
        await bitcoinRunesChain.generateTransaction(
          'event1',
          TransactionType.payment,
          testData.transaction1Order,
          [],
          [],
        );
      }).rejects.toThrow(NotEnoughValidBoxesError);
    });

    /**
     * @target BitcoinRunesChain.generateTransaction should generate payment
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
     * - transaction artifact should be a Runestone
     * - extracted order of generated transaction should be the same as input
     *   order
     * - getCoveringBoxes should have been called with correct arguments
     */
    it('should generate payment transaction with wrapped order successfully', async () => {
      // mock transaction order
      const order = testData.transaction1WrappedOrder;
      const payment1 = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const bitcoinRunesChain = await testUtils.generateChainObject(
        network,
        undefined,
        testData.multiDecimalTokenMap,
      );
      const getCovBoxesSpy = {
        fn: vi.spyOn(
          (bitcoinRunesChain as any).boxSelection, // eslint-disable-line @typescript-eslint/no-explicit-any
          'getCoveringBoxes',
        ),
        callArgs: {
          forbiddenBoxIds: Array<string>(),
        },
      };
      const selectedBoxes = testData.lockAddressUtxos.slice(0, 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getCovBoxesSpy.fn.mockImplementation(async (...args: any[]) => {
        getCovBoxesSpy.callArgs.forbiddenBoxIds.push(structuredClone(args[1]));
        const fee = 215n;
        const remainingNativeToken =
          selectedBoxes
            .map((box) => box.value)
            .reduce((sum, value) => sum + value, 0n) -
          args[0].nativeToken -
          fee;
        return {
          covered: true,
          boxes: selectedBoxes,
          additionalAssets: {
            aggregated: {
              nativeToken: remainingNativeToken,
              tokens: [{ id: '880890:3052', value: 3500000n }],
            },
            list: [
              {
                nativeToken: remainingNativeToken,
                tokens: [{ id: '880890:3052', value: 3500000n }],
              },
            ],
            fee: fee,
          },
        };
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        bitcoinRunesChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const result = await bitcoinRunesChain.generateTransaction(
        payment1.eventId,
        payment1.txType,
        order,
        [
          BitcoinRunesTransaction.fromJson(
            testData.transaction2PaymentTransaction,
          ),
        ],
        [],
      );
      const bitcoinTx = result as BitcoinRunesTransaction;

      // check returned value
      expect(bitcoinTx.txType).toEqual(payment1.txType);
      expect(bitcoinTx.eventId).toEqual(payment1.eventId);
      expect(bitcoinTx.network).toEqual(payment1.network);
      expect(bitcoinTx.inputUtxos).toEqual(
        selectedBoxes.map((utxo) => JsonBigInt.stringify(utxo)),
      );

      // transaction artifact should be a Runestone
      const psbt = Psbt.fromBuffer(Buffer.from(bitcoinTx.txBytes));
      const runestone = tryDecodeRunestone({
        vout: Transaction.fromBuffer(psbt.data.getTransaction()).outs.map(
          (out) => ({
            scriptPubKey: { hex: out.script.toString('hex') },
          }),
        ),
      });
      expect(runestone).toBeDefined();
      expect(isRunestone(runestone!)).toEqual(true);

      // extracted order of generated transaction should be the same as input order
      const extractedOrder =
        bitcoinRunesChain.extractTransactionOrder(bitcoinTx);
      expect(extractedOrder).toEqual(order);

      // getCoveringBoxes should have been called with correct arguments
      expect(getCovBoxesSpy.fn).toHaveBeenCalledExactlyOnceWith(
        {
          nativeToken: 0n,
          tokens: testData.transaction1Order[0].assets.tokens,
        },
        expect.any(Array), // Since the argument is mutated, it's not possible to check it here
        new Map(),
        expect.any(Object),
        expect.any(BigInt),
        undefined,
        expect.any(Function),
      );
      //-- check forbiddenBoxIds
      expect(getCovBoxesSpy.callArgs.forbiddenBoxIds.at(-1)).toEqual(
        testData.transaction2InputIds,
      );
    });
  });

  describe('generateMultipleTransactions', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target BitcoinRunesChain.generateMultipleTransactions should generate multiple
     * transactions when order demands transfer of multiple runes
     * @dependencies
     * @scenario
     * - mock transaction order, getFeeRatio
     * - mock getCoveringBoxes, hasLockAddressEnoughAssets
     * - run test
     * - check returned value
     * @expected
     * - it should return 2 transactions, for each one
     *   - PaymentTransaction txType, eventId, network and inputUtxos should be as
     *     expected
     *   - transaction artifact should be a Runestone
     *   - extracted order of it should only contain one rune and be as expected
     * - getCoveringBoxes should have been called twice with correct arguments
     */
    it('should generate multiple transactions when order demands transfer of multiple runes', async () => {
      // mock transaction order
      const order = testData.mockedColdOrder;
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1);

      // mock getCoveringBoxes, hasLockAddressEnoughAssets
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const getCovBoxesSpy = {
        fn: vi.spyOn(
          (bitcoinRunesChain as any).boxSelection, // eslint-disable-line @typescript-eslint/no-explicit-any
          'getCoveringBoxes',
        ),
        callArgs: {
          forbiddenBoxIds: Array<string>(),
        },
      };
      const selectedBoxesList = [
        testData.lockAddressUtxos.slice(0, 2),
        testData.lockAddressUtxos.slice(2, 3),
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getCovBoxesSpy.fn.mockImplementation((...args: any[]) => {
        const callCount = getCovBoxesSpy.callArgs.forbiddenBoxIds.length;
        const selectedBoxes = selectedBoxesList[callCount];
        const remainingAssets = testData.remainingAssetsAfterCold[callCount];
        getCovBoxesSpy.callArgs.forbiddenBoxIds.push(structuredClone(args[1]));
        const fee = 400n;
        return {
          covered: true,
          boxes: selectedBoxes,
          additionalAssets: {
            aggregated: remainingAssets,
            list: [remainingAssets],
            fee: fee,
          },
        };
      });
      const hasLockAddressEnoughAssetsSpy = vi.spyOn(
        bitcoinRunesChain,
        'hasLockAddressEnoughAssets',
      );
      hasLockAddressEnoughAssetsSpy.mockResolvedValue(true);

      // run test
      const result = await bitcoinRunesChain.generateMultipleTransactions(
        '',
        TransactionType.coldStorage,
        order,
        [],
        [],
      );

      // check returned value
      expect(result.length).toEqual(2);
      result.forEach((bitcoinTx) => {
        expect(bitcoinTx.txType).toEqual(TransactionType.coldStorage);
        expect(bitcoinTx.eventId).toEqual('');
        expect(bitcoinTx.network).toEqual(BITCOIN_RUNES_CHAIN);

        // transaction artifact should be a Runestone
        const psbt = Psbt.fromBuffer(Buffer.from(bitcoinTx.txBytes));
        const runestone = tryDecodeRunestone({
          vout: Transaction.fromBuffer(psbt.data.getTransaction()).outs.map(
            (out) => ({
              scriptPubKey: { hex: out.script.toString('hex') },
            }),
          ),
        });
        expect(runestone).toBeDefined();
        expect(isRunestone(runestone!)).toEqual(true);
      });
      expect(result[0].inputUtxos).toEqual(
        selectedBoxesList[0].map((utxo) => JsonBigInt.stringify(utxo)),
      );
      expect(result[1].inputUtxos).toEqual(
        selectedBoxesList[1].map((utxo) => JsonBigInt.stringify(utxo)),
      );

      // extracted order of each generated transaction should be as expected
      expect(bitcoinRunesChain.extractTransactionOrder(result[0])).toEqual([
        testData.splittedColdOrder[0],
      ]);
      expect(bitcoinRunesChain.extractTransactionOrder(result[1])).toEqual([
        testData.splittedColdOrder[1],
      ]);

      // getCoveringBoxes should have been called with correct arguments
      expect(getCovBoxesSpy.fn).toHaveBeenNthCalledWith(
        1,
        {
          nativeToken: 0n,
          tokens: testData.splittedColdOrder[0].assets.tokens,
        },
        expect.any(Array), // Since the argument is mutated, it's not possible to check it here
        new Map(),
        expect.any(Object),
        expect.any(BigInt),
        undefined,
        expect.any(Function),
      );
      expect(getCovBoxesSpy.fn).toHaveBeenNthCalledWith(
        2,
        {
          nativeToken: 0n,
          tokens: testData.splittedColdOrder[1].assets.tokens,
        },
        expect.any(Array), // Since the argument is mutated, it's not possible to check it here
        new Map(),
        expect.any(Object),
        expect.any(BigInt),
        undefined,
        expect.any(Function),
      );
      //-- check forbiddenBoxIds
      expect(getCovBoxesSpy.callArgs.forbiddenBoxIds[0]).toEqual([]); // no box is forbidden in 1st call
      expect(getCovBoxesSpy.callArgs.forbiddenBoxIds[1]).toEqual(
        testData.lockAddressBoxIds.slice(0, 2),
      ); // the boxes selected by first transaction is forbidden in 2nd call
    });
  });

  describe('extractTransactionOrder', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target BitcoinRunesChain.extractTransactionOrder should extract transaction
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
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );
      const expectedOrder = testData.transaction1Order;

      // run test
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const result = bitcoinRunesChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target BitcoinRunesChain.extractTransactionOrder should extract transaction
     * order successfully even when there are multiple change boxes
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should extract transaction order successfully even when there are multiple change boxes', async () => {
      // mock PaymentTransaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction3PaymentTransaction,
      );
      const expectedOrder = testData.transaction3Order;

      // run test
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const result = bitcoinRunesChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target BitcoinRunesChain.extractTransactionOrder should successfully skip rune transfer
     * when tx has no Runestone
     * @dependencies
     * @scenario
     * - mock PaymentTransaction with custom OP_RETURN output
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order without token
     */
    it('should successfully skip rune transfer when tx has no Runestone', async () => {
      // mock PaymentTransaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.nullRunestone,
        ),
      );
      const expectedOrder = [
        {
          ...testData.transaction1Order[0],
          assets: {
            ...testData.transaction1Order[0].assets,
            tokens: [],
          },
        },
      ];

      // run test
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const result = bitcoinRunesChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target BitcoinRunesChain.extractTransactionOrder should successfully skip rune transfer
     * when Runestone is a cenotaph
     * @dependencies
     * @scenario
     * - mock PaymentTransaction where Runestone is a cenotaph
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order without token
     */
    it('should successfully skip rune transfer when Runestone is a cenotaph', async () => {
      // mock PaymentTransaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.invalidPointer,
        ),
      );
      const expectedOrder = [
        {
          ...testData.transaction1Order[0],
          assets: {
            ...testData.transaction1Order[0].assets,
            tokens: [],
          },
        },
      ];

      // run test
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const result = bitcoinRunesChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target BitcoinRunesChain.extractTransactionOrder should successfully extract
     * transaction order even when some runes are burned
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should successfully extract transaction order even when some runes are burned', async () => {
      // mock PaymentTransaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.burningRunesByEdict,
        ),
      );
      const expectedOrder = [
        {
          ...testData.transaction1Order[0],
          assets: {
            ...testData.transaction1Order[0].assets,
            tokens: [
              {
                id: '880890:3052',
                value: 2000000n,
              },
            ],
          },
        },
      ];

      // run test
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const result = bitcoinRunesChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target BitcoinRunesChain.extractTransactionOrder should successfully extract
     * transaction order even when edicts exceed input assets
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should successfully extract transaction order even when edicts exceed input assets', async () => {
      // mock PaymentTransaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.overdrawnEdict,
        ),
      );
      const expectedOrder = [
        {
          ...testData.transaction1Order[0],
          assets: {
            ...testData.transaction1Order[0].assets,
            tokens: [
              {
                id: '880890:3052',
                value: 4000000n,
              },
            ],
          },
        },
      ];

      // run test
      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const result = bitcoinRunesChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target BitcoinRunesChain.extractTransactionOrder should wrap transaction
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
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );
      const expectedOrder = testData.transaction1WrappedOrder;

      // run test
      const bitcoinRunesChain = await testUtils.generateChainObject(
        network,
        undefined,
        testData.multiDecimalTokenMap,
      );
      const result = bitcoinRunesChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });
  });

  describe('verifyTransactionFee', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target BitcoinRunesChain.verifyTransactionFee should return true when fee
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
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(2);

      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const result = await bitcoinRunesChain.verifyTransactionFee(paymentTx);

      expect(result).toEqual(true);
    });

    /**
     * @target BitcoinRunesChain.verifyTransactionFee should return false when fee
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
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction0PaymentTransaction,
      );
      const getFeeRatioSpy = vi.spyOn(network, 'getFeeRatio');
      getFeeRatioSpy.mockResolvedValue(1.8);

      const bitcoinRunesChain = await testUtils.generateChainObject(network);
      const result = await bitcoinRunesChain.verifyTransactionFee(paymentTx);

      expect(result).toEqual(false);
    });
  });

  describe('verifyNoTokenBurned', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target: BitcoinRunesChain.verifyNoTokenBurned should return true
     * when no runes is burned
     * @dependencies
     * @scenario
     * - mock a payment transaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when no runes is burned', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result = await bitcoinRunesChain.verifyNoTokenBurned(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target: BitcoinRunesChain.verifyNoTokenBurned should return true
     * when Runestone is null
     * @dependencies
     * @scenario
     * - mock a payment transaction with no Runestone
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when Runestone is null', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.nullRunestone,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result = await bitcoinRunesChain.verifyNoTokenBurned(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target: BitcoinRunesChain.verifyNoTokenBurned should return false
     * when Runestone points to an OP_RETURN output
     * @dependencies
     * @scenario
     * - mock a payment transaction with Runestone pointing to an OP_RETURN output
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when Runestone points to an OP_RETURN output', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.burningRunesByPointer,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result = await bitcoinRunesChain.verifyNoTokenBurned(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyNoTokenBurned should return false
     * when Runestone pointer is out of bound
     * @dependencies
     * @scenario
     * - mock a payment transaction with invalid Runestone pointer
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when Runestone pointer is out of bound', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.invalidPointer,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result = await bitcoinRunesChain.verifyNoTokenBurned(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyNoTokenBurned should return true
     * when Runestone has no edict
     * @dependencies
     * @scenario
     * - mock a payment transaction with invalid Runestone pointer
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when Runestone has no edict', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.noEdict,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result = await bitcoinRunesChain.verifyNoTokenBurned(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target: BitcoinRunesChain.verifyNoTokenBurned should return false
     * when Runestone has invalid edict rune id
     * @dependencies
     * @scenario
     * - mock a payment transaction with invalid Runestone edict rune id
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when Runestone has invalid edict rune id', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.invalidEdictRuneId,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result = await bitcoinRunesChain.verifyNoTokenBurned(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyNoTokenBurned should return false
     * when tx is burning runes by sending them to OP_RETURN output
     * @dependencies
     * @scenario
     * - mock a payment transaction with an edict to OP_RETURN output
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when tx is burning runes by sending them to OP_RETURN output', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.burningRunesByEdict,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result = await bitcoinRunesChain.verifyNoTokenBurned(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyNoTokenBurned should return false
     * when Runestone has invalid edict output
     * @dependencies
     * @scenario
     * - mock a payment transaction with invalid Runestone edict output
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when Runestone has invalid edict output', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.invalidEdictOutput,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result = await bitcoinRunesChain.verifyNoTokenBurned(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyTransactionExtraConditions', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return true when all
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
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return true when all
     * extra conditions are met even with universal change box
     * @dependencies
     * @scenario
     * - mock a payment transaction with two runes in its inputs
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when all extra conditions are met even with universal change box', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2Forms.generatePaymentTxString(
          testData.transaction2Forms.txData.valid,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when change box address is wrong
     * @dependencies
     * @scenario
     * - mock a payment transaction
     * - create a new BitcoinRunesChain object with custom lock address
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when change box address is wrong', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );

      // create a new BitcoinRunesChain object with custom lock address
      const newConfigs = structuredClone(testUtils.configs);
      newConfigs.addresses.lock = 'bc1qs2qr0j7ta5pvdkv53egm38zymgarhq0ugr7x8j';
      const tokenMap = new TokenMap();
      await tokenMap.updateConfigByJson(testData.testTokenMap);
      const bitcoinRunesChain = new BitcoinRunesChain(
        network,
        newConfigs,
        tokenMap,
        testUtils.mockedSignMediator,
      );

      // run test
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when universal change box address is wrong
     * @dependencies
     * @scenario
     * - mock a payment transaction
     * - create a new BitcoinRunesChain object with custom lock address
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when universal change box address is wrong', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2Forms.generatePaymentTxString(
          testData.transaction2Forms.txData.valid,
        ),
      );

      // create a new BitcoinRunesChain object with custom lock address
      const newConfigs = structuredClone(testUtils.configs);
      newConfigs.addresses.lock = 'bc1qs2qr0j7ta5pvdkv53egm38zymgarhq0ugr7x8j';
      const tokenMap = new TokenMap();
      await tokenMap.updateConfigByJson(testData.testTokenMap);
      const bitcoinRunesChain = new BitcoinRunesChain(
        network,
        newConfigs,
        tokenMap,
        testUtils.mockedSignMediator,
      );

      // run test
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when Runestone is null
     * @dependencies
     * @scenario
     * - mock a payment transaction with no Runestone
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when Runestone is null', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.nullRunestone,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when Runestone is a cenotaph
     * @dependencies
     * @scenario
     * - mock a payment transaction where Runestone is a cenotaph
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when Runestone is a cenotaph', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.invalidPointer,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when Runestone pointer is null
     * @dependencies
     * @scenario
     * - mock a payment transaction with null Runestone pointer
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when Runestone pointer is null', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.nullPointer,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when Runestone is not pointing to the change box
     * @dependencies
     * @scenario
     * - mock a payment transaction with Runestone pointing to output of another address
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when Runestone is not pointing to the change box', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.destinationOutputPointer,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when Runestone has no edicts
     * @dependencies
     * @scenario
     * - mock a payment transaction with Runestone with empty edicts
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when Runestone has no edicts', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.noEdict,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when Runestone has redundant edicts
     * @dependencies
     * @scenario
     * - mock a payment transaction with Runestone that has two edicts with same Rune and output
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when Runestone has redundant edicts', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.redundantEdict,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when tx has universal change while it's not required
     * @dependencies
     * @scenario
     * - mock a payment transaction with universal change box (with 5 outputs) while there
     *   is only one rune in inputs
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it("should return false when tx has universal change while it's not required", async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.redundantUniversalChange,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when tx does not have universal change while it's required
     * @dependencies
     * @scenario
     * - mock a payment transaction without universal change box (with 4 outputs) while
     *   there are two runes in inputs
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it("should return false when tx does not have universal change while it's required", async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2Forms.generatePaymentTxString(
          testData.transaction2Forms.txData.withoutRequiredUniversalChange,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when the transferring rune change has wrong script
     * @dependencies
     * @scenario
     * - mock a payment transaction with invalid transferring rune change script
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when the transferring rune change has wrong script', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2Forms.generatePaymentTxString(
          testData.transaction2Forms.txData.wrongTransferringRuneChangeScript,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when OP_RETURN utxo is in wrong index
     * @dependencies
     * @scenario
     * - mock a payment transaction where the order and OP_RETURN outputs are miss positioned
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when OP_RETURN utxo is in wrong index', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2Forms.generatePaymentTxString(
          testData.transaction2Forms.txData.wrongOpReturnIndex,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when the BTC change has wrong script
     * @dependencies
     * @scenario
     * - mock a payment transaction with invalid BTC change script
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when the BTC change has wrong script', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2Forms.generatePaymentTxString(
          testData.transaction2Forms.txData.wrongBtcChangeScript,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target: BitcoinRunesChain.verifyTransactionExtraConditions should return false
     * when Runestone has edict to an unexpected output
     * @dependencies
     * @scenario
     * - mock a payment transaction with Runestone that has edicts to universal change box
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when Runestone has edict to an unexpected output', async () => {
      // mock a payment transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2Forms.generatePaymentTxString(
          testData.transaction2Forms.txData.hasUnexpectedEdict,
        ),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        bitcoinRunesChain.verifyTransactionExtraConditions(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('isTxValid', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target BitcoinRunesChain.isTxValid should return true when all tx inputs are valid
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
      const payment1 = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );

      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy.mockResolvedValue(true);

      const bitcoinRunesChain = await generateChainObject(network);
      const result = await bitcoinRunesChain.isTxValid(payment1);

      expect(result).toEqual({
        isValid: true,
        details: undefined,
      });
      expect(isBoxUnspentAndValidSpy).toHaveBeenCalledExactlyOnceWith(
        testData.transaction1Input0BoxId,
      );
    });

    /**
     * @target BitcoinRunesChain.isTxValid should return false
     * when at least one input id is invalid
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
     * - `isBoxUnspentAndValidSpy` should have been called with tx input ids
     */
    it('should return false when at least one input id is invalid', async () => {
      const payment1 = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );

      const isBoxUnspentAndValidSpy = vi.spyOn(network, 'isBoxUnspentAndValid');
      isBoxUnspentAndValidSpy
        .mockResolvedValue(true)
        .mockResolvedValueOnce(false);

      const bitcoinRunesChain = await generateChainObject(network);
      const result = await bitcoinRunesChain.isTxValid(payment1);

      expect(result).toEqual({
        isValid: false,
        details: {
          reason: expect.any(String),
          unexpected: false,
        },
      });
      expect(isBoxUnspentAndValidSpy).toHaveBeenCalledExactlyOnceWith(
        testData.transaction1Input0BoxId,
      );
    });
  });

  describe('signTransaction', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target BitcoinRunesChain.signTransaction should return PaymentTransaction of the
     * signed transaction
     * @dependencies
     * @scenario
     * - mock a sign function to return signature for expected message
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
        if (hashHex === testData.transaction1HashMessage0)
          return {
            signature: testData.transaction1Signature0,
            signatureRecovery: '',
          };
        else
          throw Error(
            `TestError: sign function is called with wrong message [${hashHex}]`,
          );
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network, {
        sign: signFunction,
        isInSign: vi.fn(),
      });
      const result = await bitcoinRunesChain.signTransaction(paymentTx, 0);

      // check returned value
      expect(result.txId).toEqual(paymentTx.txId);
      expect(result.eventId).toEqual(paymentTx.eventId);
      expect(Buffer.from(result.txBytes).toString('hex')).toEqual(
        testData.transaction1SignedTxBytesHex,
      );
      expect(result.txType).toEqual(paymentTx.txType);
      expect(result.network).toEqual(paymentTx.network);
    });

    /**
     * @target BitcoinRunesChain.signTransaction should throw error when at least signing of one message is failed
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const signFunction = async (hash: Uint8Array) => {
        throw Error(`TestError: sign failed`);
      };

      // mock PaymentTransaction of unsigned transaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network, {
        sign: signFunction,
        isInSign: vi.fn(),
      });

      await expect(async () => {
        await bitcoinRunesChain.signTransaction(paymentTx, 0);
      }).rejects.toThrow('TestError: sign failed');
    });
  });

  describe('isTransactionInSign', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target BitcoinRunesChain.isTransactionInSign should return true when at least one input is in sign
     * @dependencies
     * @scenario
     * - mock an isinSign function to return true only for one input
     * - mock PaymentTransaction of unsigned transaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when at least one input is in sign', async () => {
      // mock an isinSign function to return true only for one input
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
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const bitcoinChain = await testUtils.generateChainObject(network, {
        sign: vi.fn(),
        isInSign: isInSignFunction,
      });
      const result = await bitcoinChain.isTransactionInSign(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target BitcoinRunesChain.isTransactionInSign should return false when no input is in sign
     * @dependencies
     * @scenario
     * - mock an isinSign function to return false only for one input
     * - mock PaymentTransaction of unsigned transaction
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when no input is in sign', async () => {
      // mock an isinSign function to return false only for one input
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
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // run test
      const bitcoinChain = await testUtils.generateChainObject(network, {
        sign: vi.fn(),
        isInSign: isInSignFunction,
      });
      const result = await bitcoinChain.isTransactionInSign(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('getAddressAssets', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target AbstractChain.getAddressAssets should return wrapped values
     * @dependencies
     * @scenario
     * - mock a network object to return actual values for the assets
     * - run test
     * - check returned value
     * @expected
     * - it should return the wrapped values
     */
    it('should return wrapped values', async () => {
      // mock a network object to return actual values for the assets
      const getAddressAssetsSpy = vi.spyOn(network, 'getAddressAssets');
      getAddressAssetsSpy.mockResolvedValueOnce(testData.actualBalance);

      // run test
      const chain = await generateChainObject(
        network,
        undefined,
        testData.multiDecimalTokenMap,
      );
      const result = await chain.getAddressAssets('address');

      // check returned value
      expect(result).toEqual(testData.wrappedBalance);
    });

    /**
     * @target AbstractChain.getAddressAssets should wrap native token value with Bitcoin BTC
     * @dependencies
     * @scenario
     * - mock a network object to return actual values for the assets
     * - run test
     * - check returned value
     * @expected
     * - it should return the wrapped values
     */
    it('should wrap native token value with Bitcoin BTC', async () => {
      // mock a network object to return actual values for the assets
      const getAddressAssetsSpy = vi.spyOn(network, 'getAddressAssets');
      getAddressAssetsSpy.mockResolvedValueOnce(testData.actualBalance);

      // run test
      const chain = await generateChainObject(network, undefined, [
        ...testData.multiDecimalBtcTokenMap,
        ...testData.multiDecimalTokenMap,
      ]);
      const result = await chain.getAddressAssets('address');

      // check returned value
      expect(result).toEqual(testData.wrappedBtcBalance);
    });
  });

  describe('rawTxToPaymentTransaction', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target BitcoinRunesChain.rawTxToPaymentTransaction should construct transaction successfully
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
      const expectedTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1PaymentTransaction,
      );
      expectedTx.eventId = '';
      expectedTx.txType = TransactionType.manual;

      // mock getUtxo
      const getUtxoSpy = vi.spyOn(network, 'getUtxo');
      expectedTx.inputUtxos.forEach((utxo) =>
        getUtxoSpy.mockResolvedValueOnce(JsonBigInt.parse(utxo)),
      );

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result = await bitcoinRunesChain.rawTxToPaymentTransaction(
        Buffer.from(expectedTx.txBytes).toString('hex'),
      );

      // check returned value
      expect(result.toJson()).toEqual(expectedTx.toJson());
    });
  });

  describe('verifyPaymentTransaction', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target BitcoinRunesChain.verifyPaymentTransaction should return true
     * when data is consistent
     * @dependencies
     * @scenario
     * - mock a BitcoinRunesTransaction
     * - mock `getUtxo` to return mocked values
     * - run test
     * - check returned value
     * - check if function got called
     * @expected
     * - it should return true
     * - `getUtxo` should have been called for both inputs
     */
    it('should return true when data is consistent', async () => {
      // mock a BitcoinRunesTransaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // mock getUtxo to return mocked values
      const getUtxoSpy = vi.spyOn(network, 'getUtxo');
      getUtxoSpy.mockImplementation(async (boxId: string) => {
        if (boxId === testData.transaction2Input0BoxId)
          return testData.transaction2Input0Utxo;
        else if (boxId === testData.transaction2Input1BoxId)
          return testData.transaction2Input1Utxo;
        else
          throw Error(
            `TestError: getUtxo is called with wrong boxId [${boxId}]`,
          );
      });

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        await bitcoinRunesChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(true);

      // check if function got called
      expect(getUtxoSpy).toHaveBeenCalledTimes(2);
      expect(getUtxoSpy.mock.calls[0][0]).toEqual(
        testData.transaction2Input0BoxId,
      );
      expect(getUtxoSpy.mock.calls[1][0]).toEqual(
        testData.transaction2Input1BoxId,
      );
    });

    /**
     * @target BitcoinRunesChain.verifyPaymentTransaction should return false
     * when transaction id is wrong
     * @dependencies
     * @scenario
     * - mock a BitcoinRunesTransaction with changed txId
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when transaction id is wrong', async () => {
      // mock a BitcoinRunesTransaction with changed txId
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.txId = generateRandomId();

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        await bitcoinRunesChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target BitcoinRunesChain.verifyPaymentTransaction should return false
     * when number of utxos is wrong
     * @dependencies
     * @scenario
     * - mock a BitcoinRunesTransaction with less utxos
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when number of utxos is wrong', async () => {
      // mock a BitcoinRunesTransaction with less utxos
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.inputUtxos.pop();

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        await bitcoinRunesChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target BitcoinRunesChain.verifyPaymentTransaction should return false
     * when at least one input box id is wrong
     * @dependencies
     * @scenario
     * - mock a BitcoinRunesTransaction with changed input box id
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when at least one input box id is wrong', async () => {
      // mock a BitcoinRunesTransaction with changed utxo
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );
      paymentTx.inputUtxos[0] = JsonBigInt.stringify({
        txId: generateRandomId(),
        index: 1,
      });

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        await bitcoinRunesChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target BitcoinRunesChain.verifyPaymentTransaction should return false
     * when at least one input BTC is incorrect
     * @dependencies
     * @scenario
     * - mock a BitcoinRunesTransaction
     * - mock `getUtxo` to return mocked value with changed BTC of the 2nd input
     * - run test
     * - check returned value
     * - check if function got called
     * @expected
     * - it should return false
     * - `getUtxo` should have been called for both inputs
     */
    it('should return false when at least one input BTC is incorrect', async () => {
      // mock a BitcoinRunesTransaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // mock getUtxo to return mocked values with changed BTC of the 2nd input
      const getUtxoSpy = vi.spyOn(network, 'getUtxo');
      getUtxoSpy.mockImplementation(async (boxId: string) => {
        if (boxId === testData.transaction2Input0BoxId)
          return testData.transaction2Input0Utxo;
        else if (boxId === testData.transaction2Input1BoxId)
          return {
            ...testData.transaction2Input1Utxo,
            value: 10000n,
          };
        else
          throw Error(
            `TestError: getUtxo is called with wrong boxId [${boxId}]`,
          );
      });

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        await bitcoinRunesChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);

      // check if function got called
      expect(getUtxoSpy).toHaveBeenCalledTimes(2);
      expect(getUtxoSpy.mock.calls[0][0]).toEqual(
        testData.transaction2Input0BoxId,
      );
      expect(getUtxoSpy.mock.calls[1][0]).toEqual(
        testData.transaction2Input1BoxId,
      );
    });

    /**
     * @target BitcoinRunesChain.verifyPaymentTransaction should return false
     * when at least one input contains more runes
     * @dependencies
     * @scenario
     * - mock a BitcoinRunesTransaction
     * - mock `getUtxo` to return mocked values with additional runes for the 2nd input
     * - run test
     * - check returned value
     * - check if function got called
     * @expected
     * - it should return false
     * - `getUtxo` should have been called for both inputs
     */
    it('should return false when at least one input contains more runes', async () => {
      // mock a BitcoinRunesTransaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // mock getUtxo to return mocked values with additional runes for the 2nd input
      const getUtxoSpy = vi.spyOn(network, 'getUtxo');
      getUtxoSpy.mockImplementation(async (boxId: string) => {
        if (boxId === testData.transaction2Input0BoxId)
          return testData.transaction2Input0Utxo;
        else if (boxId === testData.transaction2Input1BoxId)
          return {
            ...testData.transaction2Input1Utxo,
            runes: [
              ...testData.transaction2Input1Utxo.runes,
              {
                runeId: '880890:3052',
                quantity: 1000n,
              },
            ],
          };
        else
          throw Error(
            `TestError: getUtxo is called with wrong boxId [${boxId}]`,
          );
      });

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        await bitcoinRunesChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);

      // check if function got called
      expect(getUtxoSpy).toHaveBeenCalledTimes(2);
      expect(getUtxoSpy.mock.calls[0][0]).toEqual(
        testData.transaction2Input0BoxId,
      );
      expect(getUtxoSpy.mock.calls[1][0]).toEqual(
        testData.transaction2Input1BoxId,
      );
    });

    /**
     * @target BitcoinRunesChain.verifyPaymentTransaction should return false
     * when at least one input runes is incorrect
     * @dependencies
     * @scenario
     * - mock a BitcoinRunesTransaction
     * - mock `getUtxo` to return mocked values with changed runes of the 2nd input
     * - run test
     * - check returned value
     * - check if function got called
     * @expected
     * - it should return false
     * - `getUtxo` should have been called for both inputs
     */
    it('should return false when at least one input runes is incorrect', async () => {
      // mock a BitcoinRunesTransaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction2PaymentTransaction,
      );

      // mock getUtxo to return mocked values with changed runes of the 2nd input
      const getUtxoSpy = vi.spyOn(network, 'getUtxo');
      getUtxoSpy.mockImplementation(async (boxId: string) => {
        if (boxId === testData.transaction2Input0BoxId)
          return testData.transaction2Input0Utxo;
        else if (boxId === testData.transaction2Input1BoxId)
          return {
            ...testData.transaction2Input1Utxo,
            runes: [
              {
                runeId: '880890:3052',
                quantity: 1000n,
              },
            ],
          };
        else
          throw Error(
            `TestError: getUtxo is called with wrong boxId [${boxId}]`,
          );
      });

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        await bitcoinRunesChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);

      // check if function got called
      expect(getUtxoSpy).toHaveBeenCalledTimes(2);
      expect(getUtxoSpy.mock.calls[0][0]).toEqual(
        testData.transaction2Input0BoxId,
      );
      expect(getUtxoSpy.mock.calls[1][0]).toEqual(
        testData.transaction2Input1BoxId,
      );
    });

    /**
     * @target BitcoinRunesChain.verifyPaymentTransaction should return true
     * and skip Runestone checks when it is null
     * @dependencies
     * @scenario
     * - mock a BitcoinRunesTransaction
     * - mock `getUtxo` to return mocked values
     * - run test
     * - check returned value
     * - check if function got called
     * @expected
     * - it should return true
     * - `getUtxo` should have been called for the only input
     */
    it('should return true and skip Runestone checks when it is null', async () => {
      // mock a BitcoinRunesTransaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.nullRunestone,
        ),
      );

      // mock getUtxo to return mocked values
      const getUtxoSpy = vi.spyOn(network, 'getUtxo');
      getUtxoSpy.mockImplementation(async (boxId: string) => {
        if (boxId === testData.transaction1Input0BoxId)
          return testData.transaction1Input0Utxo;
        else
          throw Error(
            `TestError: getUtxo is called with wrong boxId [${boxId}]`,
          );
      });

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        await bitcoinRunesChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(true);

      // check if function got called
      expect(getUtxoSpy).toHaveBeenCalledTimes(1);
      expect(getUtxoSpy.mock.calls[0][0]).toEqual(
        testData.transaction1Input0BoxId,
      );
    });

    /**
     * @target BitcoinRunesChain.verifyPaymentTransaction should return false
     * when Runestone is a cenotaph
     * @dependencies
     * @scenario
     * - mock a BitcoinRunesTransaction
     * - mock `getUtxo` to return mocked values
     * - run test
     * - check returned value
     * - check if function got called
     * @expected
     * - it should return false
     * - `getUtxo` should have been called for both inputs
     */
    it('should return false when Runestone is a cenotaph', async () => {
      // mock a BitcoinRunesTransaction
      const paymentTx = BitcoinRunesTransaction.fromJson(
        testData.transaction1InvalidForms.generatePaymentTxString(
          testData.transaction1InvalidForms.txData.invalidEdictOutput,
        ),
      );

      // mock getUtxo to return mocked values
      const getUtxoSpy = vi.spyOn(network, 'getUtxo');
      getUtxoSpy.mockImplementation(async (boxId: string) => {
        if (boxId === testData.transaction1Input0BoxId)
          return testData.transaction1Input0Utxo;
        else
          throw Error(
            `TestError: getUtxo is called with wrong boxId [${boxId}]`,
          );
      });

      // run test
      const bitcoinRunesChain = await generateChainObject(network);
      const result =
        await bitcoinRunesChain.verifyPaymentTransaction(paymentTx);

      // check returned value
      expect(result).toEqual(false);

      // check if function got called
      expect(getUtxoSpy).toHaveBeenCalledTimes(1);
      expect(getUtxoSpy.mock.calls[0][0]).toEqual(
        testData.transaction1Input0BoxId,
      );
    });
  });
});
