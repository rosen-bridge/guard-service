import * as boxTestData from './boxTestData';
import * as transactionTestData from './transactionTestData';
import * as ergoTestUtils from './ergoTestUtils';
import { ErgoChain } from '../lib';
import {
  AssetBalance,
  BlockInfo,
  BoxInfo,
  CoveringBoxes,
  NotEnoughAssetsError,
  NotEnoughValidBoxesError,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import TestErgoNetwork from './network/TestErgoNetwork';
import { ErgoConfigs } from '../lib';
import { when } from 'jest-when';
import * as wasm from 'ergo-lib-wasm-nodejs';
import ErgoTransaction from '../lib/ErgoTransaction';

const spyOn = jest.spyOn;

describe('ErgoChain', () => {
  describe('generateTransaction', () => {
    /**
     * @target ErgoChain.generateTransaction should throw error when
     * last item on order is to lock address
     * @dependencies
     * @scenario
     * - run test and expect exception thrown
     * @expected
     * - it should throw Error
     */
    it('should throw error when last item on order is to lock address', async () => {
      const ergoChain = ergoTestUtils.generateChainObject(
        new TestErgoNetwork()
      );
      await expect(async () => {
        await ergoChain.generateTransaction(
          '',
          TransactionType.manual,
          transactionTestData.invalidOrder,
          [],
          [],
          [],
          []
        );
      }).rejects.toThrow(Error);
    });

    /**
     * @target ErgoChain.generateTransaction should generate payment
     * transaction successfully
     * @dependencies
     * @scenario
     * - mock transaction order, input and data input boxes
     * - mock an AssetBalance as lock address assets with enough assets
     * - mock a network object
     *   - mock 'getHeight'
     *   - mock 'getStateContext'
     *   - mock 'getAddressAssets' to return mocked assets
     *   - mock 'getMempoolTransactions' to return empty list
     * - mock chain config
     * - mock getCoveringBoxes
     * - mock getMempoolBoxMapping
     * - run test
     * - check attributes of returned value
     * @expected
     * - PaymentTransaction inputs, dataInputs, eventId and txType should be as
     *   expected
     * - extracted order of generated transaction should be the same as input
     *   order
     * - transaction fee should be the same as config fee
     * - two change boxes should be as expected
     */
    it('should generate payment transaction successfully', async () => {
      // mock transaction order, input and data input boxes
      const paymentTx = ErgoTransaction.fromJson(
        transactionTestData.transaction3PaymentTransaction
      );
      const order = transactionTestData.transaction3Order;
      const inputs = [Buffer.from(paymentTx.inputBoxes[0]).toString('hex')];
      const dataInputs = paymentTx.dataInputs.map((serializedBox) =>
        Buffer.from(serializedBox).toString('hex')
      );

      // mock an AssetBalance as lock address assets with enough assets
      const mockedLockAssets = {
        nativeToken: 50000000n,
        tokens: [
          {
            id: '10278c102bf890fdab8ef5111e94053c90b3541bc25b0de2ee8aa6305ccec3de',
            value: 5000n,
          },
          {
            id: ergoTestUtils.generateRandomId(),
            value: 100000n,
          },
        ],
      };

      // mock a network object
      const network = new TestErgoNetwork();
      // mock 'getHeight'
      const getHeightSpy = spyOn(network, 'getHeight');
      getHeightSpy.mockResolvedValue(966000);
      // mock 'getStateContext'
      const getStateContextSpy = spyOn(network, 'getStateContext');
      getStateContextSpy.mockResolvedValue(
        transactionTestData.mockedStateContext
      );
      // mock 'getAddressAssets' to return mocked assets
      const getAddressAssetsSpy = spyOn(network, 'getAddressAssets');
      getAddressAssetsSpy.mockResolvedValue(mockedLockAssets);
      // mock 'getMempoolTransactions'
      const getMempoolTransactionsSpy = spyOn(
        network,
        'getMempoolTransactions'
      );
      getMempoolTransactionsSpy.mockResolvedValue([]);

      // mock chain config
      const config: ErgoConfigs = {
        fee: 1100000n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: 'nB3L2PD3LG4ydEj62n9aymRyPCEbkBdzaubgvCWDH2oxHxFBfAUy9GhWDvteDbbUh5qhXxnW8R46qmEiZfkej8gt4kZYvbeobZJADMrWXwFJTsZ17euEcoAp3KDk31Q26okFpgK9SKdi4',
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud_addr',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 300000n,
        eventTxConfirmation: 18,
      };

      // mock getCoveringBoxes
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.testTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      const getCoveringBoxesSpy = spyOn(ergoChain as any, 'getCoveringBoxes');
      getCoveringBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: paymentTx.inputBoxes
          .slice(1)
          .map((serializedBox) =>
            wasm.ErgoBox.sigma_parse_bytes(serializedBox)
          ),
      });

      // mock getMempoolBoxMapping (the box itself doesn't matter)
      const mempoolTrackMap = new Map<string, wasm.ErgoBox | undefined>();
      mempoolTrackMap.set(
        'boxId',
        ergoTestUtils.toErgoBox(boxTestData.ergoBox2)
      );
      const getMempoolBoxMappingSpy = spyOn(ergoChain, 'getMempoolBoxMapping');
      getMempoolBoxMappingSpy.mockResolvedValue(mempoolTrackMap);

      // run test
      const result = await ergoChain.generateTransaction(
        paymentTx.eventId,
        paymentTx.txType,
        order,
        [],
        [],
        inputs,
        dataInputs
      );

      // check returned value
      //  PaymentTransaction inputs, dataInputs, eventId and txType should be as expected
      const ergoTx = result as ErgoTransaction;
      expect(ergoTx.inputBoxes).toEqual(paymentTx.inputBoxes);
      expect(ergoTx.dataInputs).toEqual(paymentTx.dataInputs);
      expect(ergoTx.eventId).toEqual(paymentTx.eventId);
      expect(ergoTx.txType).toEqual(paymentTx.txType);
      //  extracted order of generated transaction should be the same as input order
      const extractedOrder = ergoChain.extractTransactionOrder(result);
      expect(extractedOrder).toEqual(order);
      //  transaction fee should be the same as config fee
      const tx = wasm.ReducedTransaction.sigma_parse_bytes(
        result.txBytes
      ).unsigned_tx();
      let boxChecked = false;
      for (let i = 0; i < tx.output_candidates().len(); i++) {
        if (
          tx.output_candidates().get(i).ergo_tree().to_base16_bytes() ===
          ErgoChain.feeBoxErgoTree
        ) {
          expect(
            BigInt(tx.output_candidates().get(i).value().as_i64().to_str())
          ).toEqual(config.fee);
          boxChecked = true;
        }
      }
      expect(boxChecked).toEqual(true);
      // two change boxes should be as expected
      const outputsLength = tx.output_candidates().len();
      const changeBox1 = tx.output_candidates().get(outputsLength - 3);
      expect(changeBox1.value().as_i64().to_str()).toEqual(
        transactionTestData.transaction3ChangeBox1Assets.nativeToken.toString()
      );
      const changeBox1Tokens = changeBox1.tokens();
      expect(changeBox1Tokens.len()).toEqual(
        transactionTestData.transaction3ChangeBox1Assets.tokens.length
      );
      for (let i = 0; i < changeBox1Tokens.len(); i++) {
        const token = changeBox1Tokens.get(i);
        expect(token.id().to_str()).toEqual(
          transactionTestData.transaction3ChangeBox1Assets.tokens[i].id
        );
        expect(token.amount().as_i64().to_str()).toEqual(
          transactionTestData.transaction3ChangeBox1Assets.tokens[
            i
          ].value.toString()
        );
      }
      const changeBox2 = tx.output_candidates().get(outputsLength - 2);
      expect(changeBox2.value().as_i64().to_str()).toEqual(
        transactionTestData.transaction3ChangeBox2Assets.nativeToken.toString()
      );
      const changeBox2Tokens = changeBox2.tokens();
      expect(changeBox2Tokens.len()).toEqual(
        transactionTestData.transaction3ChangeBox2Assets.tokens.length
      );
      for (let i = 0; i < changeBox2Tokens.len(); i++) {
        const token = changeBox2Tokens.get(i);
        expect(token.id().to_str()).toEqual(
          transactionTestData.transaction3ChangeBox2Assets.tokens[i].id
        );
        expect(token.amount().as_i64().to_str()).toEqual(
          transactionTestData.transaction3ChangeBox2Assets.tokens[
            i
          ].value.toString()
        );
      }
    });

    /**
     * @target ErgoChain.generateTransaction should throw appropriate
     * error when locked assets are not enough to generate transaction
     * @dependencies
     * @scenario
     * - mock transaction order, input and data input boxes
     * - mock an AssetBalance as lock address assets lacking enough assets
     * - mock a network object
     *   - mock 'getHeight'
     *   - mock 'getStateContext'
     *   - mock 'getAddressAssets' to return mocked assets
     * - mock chain config
     * - run test and expect exception thrown
     * @expected
     * - it should thrown NotEnoughAssetsError
     */
    it('should throw appropriate error when locked assets are not enough to generate transaction', async () => {
      // mock transaction order, input and data input boxes
      const paymentTx = ErgoTransaction.fromJson(
        transactionTestData.transaction3PaymentTransaction
      );
      const order = transactionTestData.transaction3Order;
      const inputs = [Buffer.from(paymentTx.inputBoxes[0]).toString('hex')];
      const dataInputs = paymentTx.dataInputs.map((serializedBox) =>
        Buffer.from(serializedBox).toString('hex')
      );

      // mock an AssetBalance as lock address assets lacking enough assets
      const mockedLockAssets = {
        nativeToken: 1000000n,
        tokens: [],
      };

      // mock a network object
      const network = new TestErgoNetwork();
      // mock 'getHeight'
      const getHeightSpy = spyOn(network, 'getHeight');
      getHeightSpy.mockResolvedValue(966000);
      // mock 'getStateContext'
      const getStateContextSpy = spyOn(network, 'getStateContext');
      getStateContextSpy.mockResolvedValue(
        transactionTestData.mockedStateContext
      );
      // mock 'getAddressAssets' to return mocked assets
      const getAddressAssetsSpy = spyOn(network, 'getAddressAssets');
      getAddressAssetsSpy.mockResolvedValue(mockedLockAssets);

      // mock chain config
      const config: ErgoConfigs = {
        fee: 1100000n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: 'nB3L2PD3LG4ydEj62n9aymRyPCEbkBdzaubgvCWDH2oxHxFBfAUy9GhWDvteDbbUh5qhXxnW8R46qmEiZfkej8gt4kZYvbeobZJADMrWXwFJTsZ17euEcoAp3KDk31Q26okFpgK9SKdi4',
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud_addr',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 300000n,
        eventTxConfirmation: 18,
      };

      // run test and expect exception thrown
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.testTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      await expect(async () => {
        await ergoChain.generateTransaction(
          paymentTx.eventId,
          paymentTx.txType,
          order,
          [],
          [],
          inputs,
          dataInputs
        );
      }).rejects.toThrow(NotEnoughAssetsError);
    });

    /**
     * @target ErgoChain.generateTransaction should throw appropriate
     * error when available boxes cannot cover required assets to generate
     * transaction
     * @dependencies
     * @scenario
     * - mock transaction order, input and data input boxes
     * - mock an AssetBalance as lock address assets with enough assets
     * - mock a network object
     *   - mock 'getHeight'
     *   - mock 'getStateContext'
     *   - mock 'getAddressAssets' to return mocked assets
     *   - mock 'getMempoolTransactions' to return empty list
     * - mock chain config
     * - mock getCoveringBoxes to return NOT covered
     * - run test and expect exception thrown
     * @expected
     * - it should thrown NotEnoughValidBoxesError
     */
    it('should throw appropriate error when available boxes cannot cover required assets to generate transaction', async () => {
      // mock transaction order, input and data input boxes
      const paymentTx = ErgoTransaction.fromJson(
        transactionTestData.transaction3PaymentTransaction
      );
      const order = transactionTestData.transaction3Order;
      const inputs = [Buffer.from(paymentTx.inputBoxes[0]).toString('hex')];
      const dataInputs = paymentTx.dataInputs.map((serializedBox) =>
        Buffer.from(serializedBox).toString('hex')
      );

      // mock an AssetBalance as lock address assets with enough assets
      const mockedLockAssets = {
        nativeToken: 50000000n,
        tokens: [
          {
            id: '10278c102bf890fdab8ef5111e94053c90b3541bc25b0de2ee8aa6305ccec3de',
            value: 5000n,
          },
          {
            id: ergoTestUtils.generateRandomId(),
            value: 100000n,
          },
        ],
      };

      // mock a network object
      const network = new TestErgoNetwork();
      // mock 'getHeight'
      const getHeightSpy = spyOn(network, 'getHeight');
      getHeightSpy.mockResolvedValue(966000);
      // mock 'getStateContext'
      const getStateContextSpy = spyOn(network, 'getStateContext');
      getStateContextSpy.mockResolvedValue(
        transactionTestData.mockedStateContext
      );
      // mock 'getAddressAssets' to return mocked assets
      const getAddressAssetsSpy = spyOn(network, 'getAddressAssets');
      getAddressAssetsSpy.mockResolvedValue(mockedLockAssets);
      // mock 'getMempoolTransactions'
      const getMempoolTransactionsSpy = spyOn(
        network,
        'getMempoolTransactions'
      );
      getMempoolTransactionsSpy.mockResolvedValue([]);

      // mock chain config
      const config: ErgoConfigs = {
        fee: 1100000n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: 'nB3L2PD3LG4ydEj62n9aymRyPCEbkBdzaubgvCWDH2oxHxFBfAUy9GhWDvteDbbUh5qhXxnW8R46qmEiZfkej8gt4kZYvbeobZJADMrWXwFJTsZ17euEcoAp3KDk31Q26okFpgK9SKdi4',
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud_addr',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 300000n,
        eventTxConfirmation: 18,
      };

      // mock getCoveringBoxes
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.testTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      const getCoveringBoxesSpy = spyOn(ergoChain as any, 'getCoveringBoxes');
      getCoveringBoxesSpy.mockResolvedValue({
        covered: false,
        boxes: paymentTx.inputBoxes
          .slice(1, 2)
          .map((serializedBox) =>
            wasm.ErgoBox.sigma_parse_bytes(serializedBox)
          ),
      });

      // run test and expect exception thrown
      await expect(async () => {
        await ergoChain.generateTransaction(
          paymentTx.eventId,
          paymentTx.txType,
          order,
          [],
          [],
          inputs,
          dataInputs
        );
      }).rejects.toThrow(NotEnoughValidBoxesError);
    });

    /**
     * @target ErgoChain.generateTransaction should filter boxes that
     * are used in unsigned transactions successfully
     * @dependencies
     * @scenario
     * - mock transaction order, input and data input boxes
     * - mock an unsigned transaction with it's input boxes
     * - mock an AssetBalance as lock address assets with enough assets
     * - mock a network object
     *   - mock 'getHeight'
     *   - mock 'getStateContext'
     *   - mock 'getAddressAssets' to return mocked assets
     *   - mock 'getMempoolTransactions' to return empty list
     * - mock chain config
     * - mock getCoveringBoxes
     *   - returns NOT covered when forbiddenBoxIds argument contains
     *     right ids
     *   - otherwise returns covered
     * - run test and expect exception thrown
     * @expected
     * - it should thrown NotEnoughValidBoxesError
     */
    it('should throw appropriate error when available boxes cannot cover required assets to generate transaction', async () => {
      // mock transaction order, input and data input boxes
      const paymentTx = ErgoTransaction.fromJson(
        transactionTestData.transaction3PaymentTransaction
      );
      const order = transactionTestData.transaction3Order;
      const inputs = [Buffer.from(paymentTx.inputBoxes[0]).toString('hex')];
      const dataInputs = paymentTx.dataInputs.map((serializedBox) =>
        Buffer.from(serializedBox).toString('hex')
      );

      // mock an unsigned transaction with it's input boxess
      const unsignedTransaction = ErgoTransaction.fromJson(
        transactionTestData.transaction2PartialUnsignedPaymentTransaction
      );
      const unsignedTxInputBoxIds = transactionTestData.transaction2InputBoxIds;

      // mock an AssetBalance as lock address assets with enough assets
      const mockedLockAssets = {
        nativeToken: 50000000n,
        tokens: [
          {
            id: '10278c102bf890fdab8ef5111e94053c90b3541bc25b0de2ee8aa6305ccec3de',
            value: 5000n,
          },
          {
            id: ergoTestUtils.generateRandomId(),
            value: 100000n,
          },
        ],
      };

      // mock a network object
      const network = new TestErgoNetwork();
      // mock 'getHeight'
      const getHeightSpy = spyOn(network, 'getHeight');
      getHeightSpy.mockResolvedValue(966000);
      // mock 'getStateContext'
      const getStateContextSpy = spyOn(network, 'getStateContext');
      getStateContextSpy.mockResolvedValue(
        transactionTestData.mockedStateContext
      );
      // mock 'getAddressAssets' to return mocked assets
      const getAddressAssetsSpy = spyOn(network, 'getAddressAssets');
      getAddressAssetsSpy.mockResolvedValue(mockedLockAssets);
      // mock 'getMempoolTransactions'
      const getMempoolTransactionsSpy = spyOn(
        network,
        'getMempoolTransactions'
      );
      getMempoolTransactionsSpy.mockResolvedValue([]);

      // mock chain config
      const config: ErgoConfigs = {
        fee: 1100000n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: 'nB3L2PD3LG4ydEj62n9aymRyPCEbkBdzaubgvCWDH2oxHxFBfAUy9GhWDvteDbbUh5qhXxnW8R46qmEiZfkej8gt4kZYvbeobZJADMrWXwFJTsZ17euEcoAp3KDk31Q26okFpgK9SKdi4',
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud_addr',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 300000n,
        eventTxConfirmation: 18,
      };

      // mock getCoveringBoxes
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.testTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      const getCoveringBoxesSpy = spyOn(
        ergoChain as any,
        'getCoveringBoxes'
      ) as jest.SpyInstance<
        Promise<CoveringBoxes<wasm.ErgoBox>>,
        [
          address: string,
          requiredAssets: AssetBalance,
          forbiddenBoxIds: string[],
          trackMap: Map<string, wasm.ErgoBox | undefined>
        ],
        any
      >;
      getCoveringBoxesSpy.mockImplementation(
        async (
          address: string,
          requiredAssets: AssetBalance,
          forbiddenBoxIds: Array<string>,
          trackMap: Map<string, wasm.ErgoBox | undefined>
        ) => {
          // returns NOT covered when forbiddenBoxIds argument equals to expected value
          if (
            forbiddenBoxIds.length === 1 &&
            forbiddenBoxIds[0] === unsignedTxInputBoxIds[0]
          )
            return {
              covered: false,
              boxes: [],
            };
          // otherwise returns covered
          else
            return {
              covered: true,
              boxes: paymentTx.inputBoxes
                .slice(1)
                .map((serializedBox) =>
                  wasm.ErgoBox.sigma_parse_bytes(serializedBox)
                ),
            };
        }
      );

      // run test and expect exception thrown
      await expect(async () => {
        await ergoChain.generateTransaction(
          paymentTx.eventId,
          paymentTx.txType,
          order,
          [unsignedTransaction],
          [],
          inputs,
          dataInputs
        );
      }).rejects.toThrow(NotEnoughValidBoxesError);
    });

    /**
     * @target ErgoChain.generateTransaction should generate payment
     * transaction with wrapped order successfully
     * @dependencies
     * @scenario
     * - mock transaction order, input and data input boxes
     * - mock an AssetBalance as lock address assets with enough assets
     * - mock a network object
     *   - mock 'getHeight'
     *   - mock 'getStateContext'
     *   - mock 'getAddressAssets' to return mocked assets
     *   - mock 'getMempoolTransactions' to return empty list
     * - mock chain config
     * - mock getCoveringBoxes
     * - mock getMempoolBoxMapping
     * - run test
     * - check attributes of returned value
     * @expected
     * - PaymentTransaction inputs, dataInputs, eventId and txType should be as
     *   expected
     * - extracted order of generated transaction should be the same as input
     *   order
     * - transaction fee should be the same as config fee
     * - two change boxes should be as expected
     */
    it('should generate payment transaction with wrapped order successfully', async () => {
      // mock transaction order, input and data input boxes
      const paymentTx = ErgoTransaction.fromJson(
        transactionTestData.transaction3PaymentTransaction
      );
      const order = transactionTestData.transaction3WrappedOrder;
      const inputs = [Buffer.from(paymentTx.inputBoxes[0]).toString('hex')];
      const dataInputs = paymentTx.dataInputs.map((serializedBox) =>
        Buffer.from(serializedBox).toString('hex')
      );

      // mock an AssetBalance as lock address assets with enough assets
      const mockedLockAssets = {
        nativeToken: 50000000n,
        tokens: [
          {
            id: '10278c102bf890fdab8ef5111e94053c90b3541bc25b0de2ee8aa6305ccec3de',
            value: 5000n,
          },
          {
            id: ergoTestUtils.generateRandomId(),
            value: 100000n,
          },
        ],
      };

      // mock a network object
      const network = new TestErgoNetwork();
      // mock 'getHeight'
      const getHeightSpy = spyOn(network, 'getHeight');
      getHeightSpy.mockResolvedValue(966000);
      // mock 'getStateContext'
      const getStateContextSpy = spyOn(network, 'getStateContext');
      getStateContextSpy.mockResolvedValue(
        transactionTestData.mockedStateContext
      );
      // mock 'getAddressAssets' to return mocked assets
      const getAddressAssetsSpy = spyOn(network, 'getAddressAssets');
      getAddressAssetsSpy.mockResolvedValue(mockedLockAssets);
      // mock 'getMempoolTransactions'
      const getMempoolTransactionsSpy = spyOn(
        network,
        'getMempoolTransactions'
      );
      getMempoolTransactionsSpy.mockResolvedValue([]);

      // mock chain config
      const config: ErgoConfigs = {
        fee: 1100000n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: 'nB3L2PD3LG4ydEj62n9aymRyPCEbkBdzaubgvCWDH2oxHxFBfAUy9GhWDvteDbbUh5qhXxnW8R46qmEiZfkej8gt4kZYvbeobZJADMrWXwFJTsZ17euEcoAp3KDk31Q26okFpgK9SKdi4',
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud_addr',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 300000n,
        eventTxConfirmation: 18,
      };

      // mock getCoveringBoxes
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.multiDecimalTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      const getCoveringBoxesSpy = spyOn(ergoChain as any, 'getCoveringBoxes');
      getCoveringBoxesSpy.mockResolvedValue({
        covered: true,
        boxes: paymentTx.inputBoxes
          .slice(1)
          .map((serializedBox) =>
            wasm.ErgoBox.sigma_parse_bytes(serializedBox)
          ),
      });

      // mock getMempoolBoxMapping (the box itself doesn't matter)
      const mempoolTrackMap = new Map<string, wasm.ErgoBox | undefined>();
      mempoolTrackMap.set(
        'boxId',
        ergoTestUtils.toErgoBox(boxTestData.ergoBox2)
      );
      const getMempoolBoxMappingSpy = spyOn(ergoChain, 'getMempoolBoxMapping');
      getMempoolBoxMappingSpy.mockResolvedValue(mempoolTrackMap);

      // run test
      const result = await ergoChain.generateTransaction(
        paymentTx.eventId,
        paymentTx.txType,
        order,
        [],
        [],
        inputs,
        dataInputs
      );

      // check returned value
      //  PaymentTransaction inputs, dataInputs, eventId and txType should be as expected
      const ergoTx = result as ErgoTransaction;
      expect(ergoTx.inputBoxes).toEqual(paymentTx.inputBoxes);
      expect(ergoTx.dataInputs).toEqual(paymentTx.dataInputs);
      expect(ergoTx.eventId).toEqual(paymentTx.eventId);
      expect(ergoTx.txType).toEqual(paymentTx.txType);
      //  extracted order of generated transaction should be the same as input order
      const extractedOrder = ergoChain.extractTransactionOrder(result);
      expect(extractedOrder).toEqual(order);
      //  transaction fee should be the same as config fee
      const tx = wasm.ReducedTransaction.sigma_parse_bytes(
        result.txBytes
      ).unsigned_tx();
      let boxChecked = false;
      for (let i = 0; i < tx.output_candidates().len(); i++) {
        if (
          tx.output_candidates().get(i).ergo_tree().to_base16_bytes() ===
          ErgoChain.feeBoxErgoTree
        ) {
          expect(
            BigInt(tx.output_candidates().get(i).value().as_i64().to_str())
          ).toEqual(config.fee);
          boxChecked = true;
        }
      }
      expect(boxChecked).toEqual(true);
      // two change boxes should be as expected
      const outputsLength = tx.output_candidates().len();
      const changeBox1 = tx.output_candidates().get(outputsLength - 3);
      expect(changeBox1.value().as_i64().to_str()).toEqual(
        transactionTestData.transaction3ChangeBox1Assets.nativeToken.toString()
      );
      const changeBox1Tokens = changeBox1.tokens();
      expect(changeBox1Tokens.len()).toEqual(
        transactionTestData.transaction3ChangeBox1Assets.tokens.length
      );
      for (let i = 0; i < changeBox1Tokens.len(); i++) {
        const token = changeBox1Tokens.get(i);
        expect(token.id().to_str()).toEqual(
          transactionTestData.transaction3ChangeBox1Assets.tokens[i].id
        );
        expect(token.amount().as_i64().to_str()).toEqual(
          transactionTestData.transaction3ChangeBox1Assets.tokens[
            i
          ].value.toString()
        );
      }
      const changeBox2 = tx.output_candidates().get(outputsLength - 2);
      expect(changeBox2.value().as_i64().to_str()).toEqual(
        transactionTestData.transaction3ChangeBox2Assets.nativeToken.toString()
      );
      const changeBox2Tokens = changeBox2.tokens();
      expect(changeBox2Tokens.len()).toEqual(
        transactionTestData.transaction3ChangeBox2Assets.tokens.length
      );
      for (let i = 0; i < changeBox2Tokens.len(); i++) {
        const token = changeBox2Tokens.get(i);
        expect(token.id().to_str()).toEqual(
          transactionTestData.transaction3ChangeBox2Assets.tokens[i].id
        );
        expect(token.amount().as_i64().to_str()).toEqual(
          transactionTestData.transaction3ChangeBox2Assets.tokens[
            i
          ].value.toString()
        );
      }
    });
  });

  describe('getTransactionAssets', () => {
    const network = new TestErgoNetwork();

    /**
     * @target ErgoChain.getTransactionAssets should get transaction assets
     * successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction assets
     */
    it('should get transaction assets successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = ErgoTransaction.fromJson(
        transactionTestData.transaction3PaymentTransaction
      );
      const expectedAssets = transactionTestData.transaction3Assets;

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.getTransactionAssets(paymentTx);

      // check returned value
      expect(result).toEqual(expectedAssets);
    });

    /**
     * @target ErgoChain.getTransactionAssets should wrap transaction assets
     * successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction assets
     */
    it('should wrap transaction assets successfully', async () => {
      // mock PaymentTransaction
      const paymentTx = ErgoTransaction.fromJson(
        transactionTestData.transaction3PaymentTransaction
      );
      const expectedAssets = transactionTestData.transaction3WrappedAssets;

      // run test
      const ergoChain = ergoTestUtils.generateDefaultChainObjectWithTokenMap(
        network,
        ergoTestUtils.multiDecimalTokenMap
      );
      const result = await ergoChain.getTransactionAssets(paymentTx);

      // check returned value
      expect(result).toEqual(expectedAssets);
    });
  });

  describe('extractTransactionOrder', () => {
    const network = new TestErgoNetwork();

    /**
     * @target ErgoChain.extractTransactionOrder should extract transaction
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
      const paymentTx = ErgoTransaction.fromJson(
        transactionTestData.transaction6PaymentTransaction
      );
      const expectedOrder = transactionTestData.transaction6Order;
      const config: ErgoConfigs = {
        fee: 1100000n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: transactionTestData.transaction6InAddress,
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 1000000n,
        eventTxConfirmation: 18,
      };

      // run test
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.testTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      const result = ergoChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target ErgoChain.extractTransactionOrder should wrap transaction
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
      const paymentTx = ErgoTransaction.fromJson(
        transactionTestData.transaction6PaymentTransaction
      );
      const expectedOrder = transactionTestData.transaction6WrappedOrder;
      const config: ErgoConfigs = {
        fee: 1100000n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: transactionTestData.transaction6InAddress,
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 1000000n,
        eventTxConfirmation: 18,
      };

      // run test
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.multiDecimalTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      const result = ergoChain.extractTransactionOrder(paymentTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });
  });

  describe('verifyTransactionFee', () => {
    const network = new TestErgoNetwork();

    /**
     * @target ErgoChain.verifyTransactionFee should return true when fee is
     * less than config fee
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock a config that has more fee comparing to mocked transaction fee
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when fee is less than config fee', async () => {
      // mock PaymentTransaction
      const paymentTx = new ErgoTransaction(
        'txId',
        'eventId',
        wasm.ReducedTransaction.sigma_parse_bytes(
          Buffer.from(transactionTestData.transaction2UnsignedSerialized, 'hex')
        ).sigma_serialize_bytes(),
        TransactionType.payment,
        [],
        []
      );

      // mock a config that has more fee comparing to mocked transaction fee
      const config: ErgoConfigs = {
        fee: 1200000n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: ergoTestUtils.testLockAddress,
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud_addr',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 1000000n,
        eventTxConfirmation: 18,
      };

      // run test
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.testTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      const result = await ergoChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target ErgoChain.verifyTransactionFee should return false when fee is
     * more than config fee
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock a config that has less fee comparing to mocked transaction fee
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when fee is more than config fee', async () => {
      // mock PaymentTransaction
      const paymentTx = new ErgoTransaction(
        'txId',
        'eventId',
        wasm.ReducedTransaction.sigma_parse_bytes(
          Buffer.from(transactionTestData.transaction2UnsignedSerialized, 'hex')
        ).sigma_serialize_bytes(),
        TransactionType.payment,
        [],
        []
      );

      // mock a config that has less fee comparing to mocked transaction fee
      const config: ErgoConfigs = {
        fee: 100n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: ergoTestUtils.testLockAddress,
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud_addr',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 1000000n,
        eventTxConfirmation: 18,
      };

      // run test
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.testTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      const result = await ergoChain.verifyTransactionFee(paymentTx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyLockTransactionExtraConditions', () => {
    const network = new TestErgoNetwork();

    /**
     * @target ErgoChain.verifyLockTransactionExtraConditions should return false when
     * output box creation height is more than a year ago
     * @dependencies
     * @scenario
     * - mock a tx with block info
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when output box creation height is more than a year ago', async () => {
      const blockInfo: BlockInfo = {
        hash: ergoTestUtils.generateRandomId(),
        parentHash: ergoTestUtils.generateRandomId(),
        height: 2000000,
      };
      const mockedTx = ergoTestUtils.deserializeTransaction(
        transactionTestData.transaction2SignedSerialized
      );

      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.verifyLockTransactionExtraConditions(
        mockedTx,
        blockInfo
      );

      expect(result).toEqual(false);
    });

    /**
     * @target ErgoChain.verifyLockTransactionExtraConditions should return true when
     * all output boxes creation heights are fresh
     * @dependencies
     * @scenario
     * - mock a tx with block info
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when all output boxes creation heights are fresh', async () => {
      const blockInfo: BlockInfo = {
        hash: ergoTestUtils.generateRandomId(),
        parentHash: ergoTestUtils.generateRandomId(),
        height: 100000,
      };
      const mockedTx = ergoTestUtils.deserializeTransaction(
        transactionTestData.transaction2SignedSerialized
      );

      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.verifyLockTransactionExtraConditions(
        mockedTx,
        blockInfo
      );

      expect(result).toEqual(true);
    });
  });

  describe('verifyTransactionExtraConditions', () => {
    const network = new TestErgoNetwork();

    /**
     * @target ErgoChain.verifyTransactionExtraConditions should return true
     * when change box conditions are met
     * @dependencies
     * @scenario
     * - mock valid PaymentTransaction
     * - mock a config with valid lockAddress
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when change box conditions are met', async () => {
      // mock PaymentTransaction
      const paymentTx = ErgoTransaction.fromJson(
        transactionTestData.transaction3PaymentTransaction
      );

      // mock a config with valid lockAddress
      const config: ErgoConfigs = {
        fee: 1200000n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: 'nB3L2PD3LG4ydEj62n9aymRyPCEbkBdzaubgvCWDH2oxHxFBfAUy9GhWDvteDbbUh5qhXxnW8R46qmEiZfkej8gt4kZYvbeobZJADMrWXwFJTsZ17euEcoAp3KDk31Q26okFpgK9SKdi4',
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud_addr',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 1000000n,
        eventTxConfirmation: 18,
      };

      // run test
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.testTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      const result = await ergoChain.verifyTransactionExtraConditions(
        paymentTx
      );

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target ErgoChain.verifyTransactionExtraConditions should return false
     * when change box has value in R4
     * @dependencies
     * @scenario
     * - mock PaymentTransaction with value in change box R4
     * - mock a config with valid lockAddress
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when change box has value in R4', async () => {
      // mock PaymentTransaction
      const paymentTx = ErgoTransaction.fromJson(
        transactionTestData.transaction4PaymentTransaction
      );

      // mock a config with valid lockAddress
      const config: ErgoConfigs = {
        fee: 1200000n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: 'nB3L2PD3LG4ydEj62n9aymRyPCEbkBdzaubgvCWDH2oxHxFBfAUy9GhWDvteDbbUh5qhXxnW8R46qmEiZfkej8gt4kZYvbeobZJADMrWXwFJTsZ17euEcoAp3KDk31Q26okFpgK9SKdi4',
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud_addr',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 1000000n,
        eventTxConfirmation: 18,
      };

      // run test
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.testTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      const result = await ergoChain.verifyTransactionExtraConditions(
        paymentTx
      );

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('isTxValid', () => {
    /**
     * @target ErgoChain.isTxValid should return true when all inputs are valid
     * @dependencies
     * @scenario
     * - mock a network object to return as valid for all inputs of a mocked
     *   transaction
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return true with no details
     */
    it('should return true when all inputs are valid', async () => {
      // mock a network object to return as valid for all inputs of a mocked transaction
      const network = new TestErgoNetwork();
      const isBoxUnspentAndValidSpy = spyOn(network, 'isBoxUnspentAndValid');
      transactionTestData.transaction0InputIds.forEach((inputId) =>
        when(isBoxUnspentAndValidSpy)
          .calledWith(inputId)
          .mockResolvedValueOnce(true)
      );

      // mock PaymentTransaction
      const paymentTx = new ErgoTransaction(
        'txId',
        'eventId',
        ergoTestUtils
          .toTransaction(transactionTestData.transaction0)
          .sigma_serialize_bytes(),
        TransactionType.payment,
        [],
        []
      );

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.isTxValid(paymentTx);

      // check returned value
      expect(result).toEqual({
        isValid: true,
        details: undefined,
      });
    });

    /**
     * @target ErgoChain.isTxValid should return false when at least one input
     * is invalid
     * @dependencies
     * @scenario
     * - mock a network object to return as valid for all inputs of a mocked
     *   transaction except for the first one
     * - mock PaymentTransaction
     * - run test
     * - check returned value
     * @expected
     * - it should return false and as expected invalidation
     */
    it('should return false when at least one input is invalid', async () => {
      // mock a network object to return as valid for all inputs of a mocked transaction except for the first one
      const network = new TestErgoNetwork();
      const isBoxUnspentAndValidSpy = spyOn(network, 'isBoxUnspentAndValid');
      let isFirstBox = true;
      transactionTestData.transaction0InputIds.forEach((inputId) => {
        when(isBoxUnspentAndValidSpy)
          .calledWith(inputId)
          .mockResolvedValueOnce(!isFirstBox);
        isFirstBox = false;
      });

      // mock PaymentTransaction
      const paymentTx = new ErgoTransaction(
        'txId',
        'eventId',
        ergoTestUtils
          .toTransaction(transactionTestData.transaction0)
          .sigma_serialize_bytes(),
        TransactionType.payment,
        [],
        []
      );

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.isTxValid(paymentTx);

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

  describe('signTransaction', () => {
    const ergoChain = ergoTestUtils.generateChainObject(new TestErgoNetwork());

    /**
     * @target ErgoChain.signTransaction should return PaymentTransaction of the
     * signed transaction
     * @dependencies
     * @scenario
     * - mock a sign function to return signed transaction
     * - mock PaymentTransaction of unsigned transaction
     * - run test
     * - check returned value
     * @expected
     * - it should return PaymentTransaction of signed transaction (all fields
     *   are same as input object, except txBytes which is signed transaction)
     */
    it('should return PaymentTransaction of the signed transaction', async () => {
      // mock PaymentTransaction of unsigned transaction
      const paymentTx = new ErgoTransaction(
        'txId',
        'eventId',
        wasm.ReducedTransaction.sigma_parse_bytes(
          Buffer.from(transactionTestData.transaction2UnsignedSerialized, 'hex')
        ).sigma_serialize_bytes(),
        TransactionType.payment,
        [],
        []
      );

      // run test
      const result = (await ergoChain.signTransaction(
        paymentTx,
        0
      )) as ErgoTransaction;

      // check returned value
      expect(result.txId).toEqual(paymentTx.txId);
      expect(result.eventId).toEqual(paymentTx.eventId);
      expect(result.txBytes).toEqual(
        ergoTestUtils
          .deserializeTransaction(
            transactionTestData.transaction2SignedSerialized
          )
          .sigma_serialize_bytes()
      );
      expect(result.inputBoxes).toEqual(paymentTx.inputBoxes);
      expect(result.dataInputs).toEqual(paymentTx.dataInputs);
      expect(result.txType).toEqual(paymentTx.txType);
    });

    /**
     * @target ErgoChain.signTransaction should throw error when signing failed
     * @dependencies
     * @scenario
     * - mock a sign function to throw error
     * - mock PaymentTransaction of unsigned transaction
     * - run test & check thrown exception
     * @expected
     * - it should throw the exact error thrown by sign function
     */
    it('should throw error when signing failed', async () => {
      // mock a sign function to throw error
      const signFunction = async (
        tx: wasm.ReducedTransaction,
        requiredSign: number,
        boxes: Array<wasm.ErgoBox>,
        dataBoxes?: Array<wasm.ErgoBox>
      ): Promise<wasm.Transaction> => {
        throw Error(`TestError: sign failed`);
      };
      const ergoChain = ergoTestUtils.generateChainObject(
        new TestErgoNetwork(),
        ergoTestUtils.rwtId,
        signFunction
      );
      // mock PaymentTransaction of unsigned transaction
      const paymentTx = new ErgoTransaction(
        'txId',
        'eventId',
        wasm.ReducedTransaction.sigma_parse_bytes(
          Buffer.from(transactionTestData.transaction2UnsignedSerialized, 'hex')
        ).sigma_serialize_bytes(),
        TransactionType.payment,
        [],
        []
      );

      // run test & check thrown exception
      await expect(async () => {
        await ergoChain.signTransaction(paymentTx, 0);
      }).rejects.toThrow(`TestError: sign failed`);
    });
  });

  describe('isTxInMempool', () => {
    /**
     * @target ErgoChain.isTxInMempool should true when tx is in mempool
     * @dependencies
     * @scenario
     * - mock list of transactions
     * - mock a network object to return mocked transactions for mempool
     * - get txId of one of the transactions
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should true when tx is in mempool', async () => {
      // mock list of transactions
      const transactions = [
        transactionTestData.transaction0,
        transactionTestData.transaction1,
      ].map(ergoTestUtils.toTransaction);

      // mock a network object to return mocked transactions for mempool
      const network = new TestErgoNetwork();
      spyOn(network, 'getMempoolTransactions').mockResolvedValueOnce(
        transactions
      );

      // get txId of one of the transactions
      const txId = transactions[0].id().to_str();

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.isTxInMempool(txId);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target ErgoChain.isTxInMempool should false when tx is NOT in mempool
     * @dependencies
     * @scenario
     * - mock list of transactions
     * - mock a network object to return mocked transactions for mempool
     * - generate a random txId
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should false when tx is NOT in mempool', async () => {
      // mock list of transactions
      const transactions = [
        transactionTestData.transaction0,
        transactionTestData.transaction1,
      ].map(ergoTestUtils.toTransaction);

      // mock a network object to return mocked transactions for mempool
      const network = new TestErgoNetwork();
      spyOn(network, 'getMempoolTransactions').mockResolvedValueOnce(
        transactions
      );

      // generate a random txId
      const txId = ergoTestUtils.generateRandomId();

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.isTxInMempool(txId);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('getMempoolBoxMapping', () => {
    const trackingAddress =
      'nB3L2PD3LBtiNhDYK7XhZ8nVt6uekBXN7RcPUKgdKLXFcrJiSPxmQsUKuUkTRQ1hbvDrxEQAKYurGFbaGD1RPxU7XqQimD78j23HHMQKL1boUGsnNhCxaVNAYMcFbQNo355Af8cWkhAN6';

    /**
     * @target ErgoChain.getMempoolBoxMapping should construct mapping
     * successfully when no token provided
     * @dependencies
     * @scenario
     * - mock list of transactions with their box mapping
     * - mock a network object to return mocked transactions for mempool
     * - construct trackMap using transaction box mappings
     * - run test
     * - check returned value
     * @expected
     * - it should return constructed trackMap
     */
    it('should construct mapping successfully when no token provided', async () => {
      // mock list of transactions with their box mapping
      const transactions = [transactionTestData.transaction0].map(
        ergoTestUtils.toTransaction
      );
      const boxMapping = transactionTestData.transaction0BoxMapping;

      // mock a network object to return mocked transactions for mempool
      const network = new TestErgoNetwork();
      spyOn(network, 'getMempoolTransactions').mockResolvedValueOnce(
        transactions
      );

      // construct trackMap using transaction box mappings
      const trackMap = new Map<string, string | undefined>();
      boxMapping.forEach((mapping) =>
        trackMap.set(mapping.inputId, mapping.serializedOutput)
      );

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.getMempoolBoxMapping(trackingAddress);

      // check returned value
      const constructedMap = new Map<string, string | undefined>();
      result.forEach((value, key) =>
        constructedMap.set(
          key,
          value
            ? Buffer.from(value.sigma_serialize_bytes()).toString('hex')
            : undefined
        )
      );
      expect(constructedMap).toEqual(trackMap);
    });

    /**
     * @target ErgoChain.getMempoolBoxMapping should construct mapping
     * successfully when token provided
     * @dependencies
     * @scenario
     * - mock list of transactions with their box mapping
     * - mock a network object to return mocked transactions for mempool
     * - construct trackMap using transaction box mappings
     * - run test
     * - check returned value
     * @expected
     * - it should return constructed trackMap
     */
    it('should construct mapping successfully when token provided', async () => {
      // mock list of transactions with their box mapping
      const transactions = [transactionTestData.transaction0].map(
        ergoTestUtils.toTransaction
      );
      const boxMapping = transactionTestData.transaction0BoxMapping;
      const trackingTokenId =
        '03689941746717cddd05c52f454e34eb6e203a84f931fdc47c52f44589f83496';

      // mock a network object to return mocked transactions for mempool
      const network = new TestErgoNetwork();
      spyOn(network, 'getMempoolTransactions').mockResolvedValueOnce(
        transactions
      );

      // construct trackMap using transaction box mappings
      const trackMap = new Map<string, string | undefined>();
      boxMapping.forEach((mapping) =>
        trackMap.set(mapping.inputId, mapping.serializedOutput)
      );

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.getMempoolBoxMapping(
        trackingAddress,
        trackingTokenId
      );

      // check returned value
      const constructedMap = new Map<string, string | undefined>();
      result.forEach((value, key) =>
        constructedMap.set(
          key,
          value
            ? Buffer.from(value.sigma_serialize_bytes()).toString('hex')
            : undefined
        )
      );
      expect(constructedMap).toEqual(trackMap);
    });

    /**
     * @target ErgoChain.getMempoolBoxMapping should construct mapping
     * successfully when token provided
     * @dependencies
     * @scenario
     * - mock list of transactions with their box mapping
     * - mock a network object to return mocked transactions for mempool
     * - construct trackMap using transaction box mappings (set outputs as
     *   undefined)
     * - run test
     * - check returned value
     * @expected
     * - it should return constructed trackMap
     */
    it('should map inputs to undefined when no valid output box found', async () => {
      // mock list of transactions with their box mapping
      const transactions = [transactionTestData.transaction0].map(
        ergoTestUtils.toTransaction
      );
      const boxMapping = transactionTestData.transaction0BoxMapping;
      const trackingTokenId =
        '3f3add41746717cddd05c52f454e34eb98424408a931fdc47c52f44f0537f126';

      // mock a network object to return mocked transactions for mempool
      const network = new TestErgoNetwork();
      spyOn(network, 'getMempoolTransactions').mockResolvedValueOnce(
        transactions
      );

      // construct trackMap using transaction box mappings
      const trackMap = new Map<string, string | undefined>();
      boxMapping.forEach((mapping) => trackMap.set(mapping.inputId, undefined));

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.getMempoolBoxMapping(
        trackingAddress,
        trackingTokenId
      );

      // check returned value
      expect(result).toEqual(trackMap);
    });
  });

  describe('getBoxInfo', () => {
    const network = new TestErgoNetwork();

    /**
     * @target ErgoChain.getBoxInfo should get box id and assets successfully
     * @dependencies
     * @scenario
     * - mock an ErgoBox with assets
     * - construct serialized box and BoxInfo
     * - run test
     * - check returned value
     * @expected
     * - it should return constructed BoxInfo
     */
    it('should get box id and assets successfully', () => {
      // mock an ErgoBox with assets
      const box = ergoTestUtils.toErgoBox(boxTestData.ergoBox1);
      const boxInfo: BoxInfo = {
        id: box.box_id().to_str(),
        assets: boxTestData.box1Assets,
      };

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = (ergoChain as any).getBoxInfo(box);

      // check returned value
      expect(result).toEqual(boxInfo);
    });
  });

  describe('getBoxHeight', () => {
    const network = new TestErgoNetwork();

    /**
     * @target ErgoChain.getBoxHeight should get box height successfully
     * @dependencies
     * @scenario
     * - mock an ErgoBox and construct serialized box
     * - run test
     * - check returned value
     * @expected
     * - it should return constructed BoxInfo
     */
    it('should get box height successfully', () => {
      // mock an ErgoBox and construct serialized box
      const box = ergoTestUtils.toErgoBox(boxTestData.ergoBox1);
      const serializedBox = Buffer.from(box.sigma_serialize_bytes()).toString(
        'hex'
      );

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = ergoChain.getBoxHeight(serializedBox);

      // check returned value
      expect(result).toEqual(box.creation_height());
    });
  });

  describe('getBoxWID', () => {
    const network = new TestErgoNetwork();

    /**
     * @target ErgoChain.getBoxWID should get box WID successfully
     * @dependencies
     * @scenario
     * - mock an ErgoBox with WID and construct serialized box
     * - run test
     * - check returned value
     * @expected
     * - it should return constructed BoxInfo
     */
    it('should get box WID successfully', () => {
      // mock an ErgoBox with WID and construct serialized box
      const box = ergoTestUtils.toErgoBox(boxTestData.ergoBox2);
      const serializedBox = Buffer.from(box.sigma_serialize_bytes()).toString(
        'hex'
      );
      const wid =
        '97a2dabcd974d69a07c3a03e20d05a36d13b986ffca5670302997484dd87e247';

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = ergoChain.getBoxWID(serializedBox);

      // check returned value
      expect(result).toEqual(wid);
    });

    /**
     * @target ErgoChain.getBoxWID should throw Error when box has no WID
     * @dependencies
     * @scenario
     * - mock an ErgoBox without WID and construct serialized box
     * - run test and expect exception thrown
     * @expected
     * - it should throw Error
     */
    it('should throw Error when box has no WID', () => {
      // mock an ErgoBox without WID and construct serialized box
      const box = ergoTestUtils.toErgoBox(boxTestData.ergoBox1);
      const serializedBox = Buffer.from(box.sigma_serialize_bytes()).toString(
        'hex'
      );

      // run test and expect exception thrown
      const ergoChain = ergoTestUtils.generateChainObject(network);
      expect(() => {
        ergoChain.getBoxWID(serializedBox);
      }).toThrow(Error);
    });
  });

  describe('getBoxRWT', () => {
    const network = new TestErgoNetwork();

    /**
     * @target ErgoChain.getBoxRWT should get box RWT successfully
     * @dependencies
     * @scenario
     * - mock an ErgoBox with RWT and construct serialized box
     * - run test
     * - check returned value
     * @expected
     * - it should return RWT amount
     */
    it('should get box RWT successfully', () => {
      // mock an ErgoBox with RWT and construct serialized box
      const serializedBox = Buffer.from(
        ergoTestUtils.toErgoBox(boxTestData.eventBox1).sigma_serialize_bytes()
      ).toString('hex');

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = ergoChain.getBoxRWT(serializedBox);

      // check returned value
      expect(result).toEqual(10n);
    });

    /**
     * @target ErgoChain.getBoxRWT should wrap RWT amount successfully
     * @dependencies
     * @scenario
     * - mock an ErgoBox with RWT and construct serialized box
     * - run test
     * - check returned value
     * @expected
     * - it should return RWT amount
     */
    it('should wrap RWT amount successfully', () => {
      // mock an ErgoBox with RWT and construct serialized box
      const serializedBox = Buffer.from(
        ergoTestUtils.toErgoBox(boxTestData.eventBox1).sigma_serialize_bytes()
      ).toString('hex');

      // run test
      const ergoChain = ergoTestUtils.generateDefaultChainObjectWithTokenMap(
        network,
        ergoTestUtils.wrappedRwtTokenMap
      );
      const result = ergoChain.getBoxRWT(serializedBox);

      // check returned value
      expect(result).toEqual(1n);
    });

    /**
     * @target ErgoChain.getBoxRWT should throw Error when box has no token
     * @dependencies
     * @scenario
     * - mock an ErgoBox without token and construct serialized box
     * - run test and expect exception thrown
     * @expected
     * - it should throw Error
     */
    it('should throw Error when box has no token', () => {
      // mock an ErgoBox without token and construct serialized box
      const serializedBox = Buffer.from(
        ergoTestUtils.toErgoBox(boxTestData.ergoBox3).sigma_serialize_bytes()
      ).toString('hex');

      // run test and expect exception thrown
      const ergoChain = ergoTestUtils.generateChainObject(network);
      expect(() => {
        ergoChain.getBoxRWT(serializedBox);
      }).toThrow(Error);
    });
  });

  describe('getSerializedBoxInfo', () => {
    const network = new TestErgoNetwork();

    /**
     * @target ErgoChain.getSerializedBoxInfo should get box id and assets successfully
     * @dependencies
     * @scenario
     * - mock an ErgoBox with assets
     * - construct serialized box and BoxInfo
     * - run test
     * - check returned value
     * @expected
     * - it should return constructed BoxInfo
     */
    it('should get box id and assets successfully', () => {
      // mock an ErgoBox with assets
      const box = ergoTestUtils.toErgoBox(boxTestData.ergoBox1);
      const serializedBox = Buffer.from(box.sigma_serialize_bytes()).toString(
        'hex'
      );
      const boxInfo: BoxInfo = {
        id: box.box_id().to_str(),
        assets: boxTestData.box1Assets,
      };

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = ergoChain.getSerializedBoxInfo(serializedBox);

      // check returned value
      expect(result).toEqual(boxInfo);
    });

    /**
     * @target ErgoChain.getSerializedBoxInfo should wrap assets successfully
     * @dependencies
     * @scenario
     * - mock an ErgoBox with assets
     * - construct serialized box and BoxInfo
     * - run test
     * - check returned value
     * @expected
     * - it should return constructed BoxInfo
     */
    it('should wrap assets successfully', () => {
      // mock an ErgoBox with assets
      const box = ergoTestUtils.toErgoBox(boxTestData.ergoBox1);
      const serializedBox = Buffer.from(box.sigma_serialize_bytes()).toString(
        'hex'
      );
      const boxInfo: BoxInfo = {
        id: box.box_id().to_str(),
        assets: boxTestData.box1WrappedAssets,
      };

      // run test
      const ergoChain = ergoTestUtils.generateDefaultChainObjectWithTokenMap(
        network,
        ergoTestUtils.multiDecimalTokenMap
      );
      const result = ergoChain.getSerializedBoxInfo(serializedBox);

      // check returned value
      expect(result).toEqual(boxInfo);
    });
  });

  describe('getGuardsConfigBox', () => {
    /**
     * @target ErgoChain.getGuardsConfigBox should get guard box successfully
     * @dependencies
     * @scenario
     * - mock serialized box and guardNFT
     * - mock a network object with mocked 'getBoxesByTokenId'
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked serializedBox
     */
    it('should get guard box successfully', async () => {
      // mock serialized box and guardNFT (the box itself doesn't matter)
      const box = ergoTestUtils.toErgoBox(boxTestData.ergoBox2);
      const serializedBox = Buffer.from(box.sigma_serialize_bytes()).toString(
        'hex'
      );
      const guardNFT = ergoTestUtils.generateRandomId();

      // mock a network object
      const network = new TestErgoNetwork();
      // mock 'getBoxesByTokenId'
      const getBoxesByTokenIdSpy = spyOn(network, 'getBoxesByTokenId');
      when(getBoxesByTokenIdSpy)
        .calledWith(guardNFT, ergoTestUtils.testLockAddress)
        .mockResolvedValue([box]);

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.getGuardsConfigBox(
        guardNFT,
        ergoTestUtils.testLockAddress
      );

      // check returned value
      expect(result).toEqual(serializedBox);
    });

    /**
     * @target ErgoChain.getGuardsConfigBox should throw error when
     * no guard box found
     * @dependencies
     * @scenario
     * - mock guardNFT
     * - mock a network object with mocked 'getBoxesByTokenId'
     * - run test and expect exception thrown
     * @expected
     * - it should return Error
     */
    it('should throw error when no guard box found', async () => {
      // mock guardNFT
      const guardNFT = ergoTestUtils.generateRandomId();

      // mock a network object
      const network = new TestErgoNetwork();
      // mock 'getBoxesByTokenId'
      const getBoxesByTokenIdSpy = spyOn(network, 'getBoxesByTokenId');
      when(getBoxesByTokenIdSpy)
        .calledWith(guardNFT, ergoTestUtils.testLockAddress)
        .mockResolvedValue([]);

      // run test and expect exception thrown
      const ergoChain = ergoTestUtils.generateChainObject(network);
      await expect(async () => {
        await ergoChain.getGuardsConfigBox(
          guardNFT,
          ergoTestUtils.testLockAddress
        );
      }).rejects.toThrow(Error);
    });

    /**
     * @target ErgoChain.getGuardsConfigBox should throw error when
     * multiple guard box found
     * @dependencies
     * @scenario
     * - mock guardNFT and multiple serializedBoxes
     * - mock a network object with mocked 'getBoxesByTokenId'
     * - run test and expect exception thrown
     * @expected
     * - it should return Error
     */
    it('should throw error when multiple guard box found', async () => {
      // mock guardNFT and multiple serializedBoxes (the boxes themselves don't matter)
      const guardNFT = ergoTestUtils.generateRandomId();
      const serializedBoxes = [
        ergoTestUtils.toErgoBox(boxTestData.ergoBox1),
        ergoTestUtils.toErgoBox(boxTestData.ergoBox2),
        ergoTestUtils.toErgoBox(boxTestData.ergoBox3),
      ];

      // mock a network object
      const network = new TestErgoNetwork();
      // mock 'getBoxesByTokenId'
      const getBoxesByTokenIdSpy = spyOn(network, 'getBoxesByTokenId');
      when(getBoxesByTokenIdSpy)
        .calledWith(guardNFT, ergoTestUtils.testLockAddress)
        .mockResolvedValue(serializedBoxes);

      // run test and expect exception thrown
      const ergoChain = ergoTestUtils.generateChainObject(network);
      await expect(async () => {
        await ergoChain.getGuardsConfigBox(
          guardNFT,
          ergoTestUtils.testLockAddress
        );
      }).rejects.toThrow(Error);
    });
  });

  describe('verifyEventRWT', () => {
    const network = new TestErgoNetwork();
    const serializedEventBox = Buffer.from(
      ergoTestUtils.toErgoBox(boxTestData.eventBox1).sigma_serialize_bytes()
    ).toString('hex');
    const eventRwtId =
      '9410db5b39388c6b515160e7248346d7ec63d5457292326da12a26cc02efb526';

    /**
     * @target ErgoChain.verifyEventRWT should return true
     * when RWT token is correct
     * @dependencies
     * @scenario
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when RWT token is correct', async () => {
      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = ergoChain.verifyEventRWT(serializedEventBox, eventRwtId);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target ErgoChain.verifyEventRWT should return false
     * when box has no token
     * @dependencies
     * @scenario
     * - mock an ergo box with no token
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when box has no token', async () => {
      // mock an ergo box with no token
      const serializedBox = Buffer.from(
        ergoTestUtils.toErgoBox(boxTestData.ergoBox3).sigma_serialize_bytes()
      ).toString('hex');

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = ergoChain.verifyEventRWT(serializedBox, eventRwtId);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target ErgoChain.verifyEventRWT should return false
     * when rwt token id is wrong
     * @dependencies
     * @scenario
     * - run test with wrong rwt token id
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when rwt token id is wrong', async () => {
      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = ergoChain.verifyEventRWT(
        serializedEventBox,
        'fake_rwt_id'
      );

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('getGuardsPkConfig', () => {
    /**
     * @target ErgoChain.getGuardsPkConfig should get guards public key config successfully
     * @dependencies
     * @scenario
     * - mock guard config box and guardNFT
     * - mock a network object with mocked 'getBoxesByTokenId'
     * - run test
     * - check returned value
     * @expected
     * - it should return expected public keys and requiredSigns
     */
    it('should get guards public key config successfully', async () => {
      // mock guard config box and guardNFT
      const box = ergoTestUtils.toErgoBox(boxTestData.guardConfigBox);
      const guardNFT = boxTestData.guardNFT;

      // mock a network object
      const network = new TestErgoNetwork();
      // mock 'getBoxesByTokenId'
      const getBoxesByTokenIdSpy = spyOn(network, 'getBoxesByTokenId');
      when(getBoxesByTokenIdSpy)
        .calledWith(guardNFT, ergoTestUtils.testLockAddress)
        .mockResolvedValue([box]);

      // run test
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.getGuardsPkConfig(
        guardNFT,
        ergoTestUtils.testLockAddress
      );

      // check returned value
      expect(result).toEqual(boxTestData.guardPks);
    });

    /**
     * @target ErgoChain.getGuardsPkConfig should throw error when
     * register values are invalid
     * @dependencies
     * @scenario
     * - mock an invalid box and guardNFT
     * - mock a network object with mocked 'getBoxesByTokenId'
     * - run test and expect exception thrown
     * @expected
     * - it should throw Error
     */
    it('should throw error when register values are invalid', async () => {
      // mock an invalid box and guardNFT
      const box = ergoTestUtils.toErgoBox(boxTestData.eventBox1);
      const guardNFT = boxTestData.guardNFT;

      // mock a network object
      const network = new TestErgoNetwork();
      // mock 'getBoxesByTokenId'
      const getBoxesByTokenIdSpy = spyOn(network, 'getBoxesByTokenId');
      when(getBoxesByTokenIdSpy)
        .calledWith(guardNFT, ergoTestUtils.testLockAddress)
        .mockResolvedValue([box]);

      // run test and expect exception thrown
      const ergoChain = ergoTestUtils.generateChainObject(network);
      await expect(async () => {
        await ergoChain.getGuardsPkConfig(
          guardNFT,
          ergoTestUtils.testLockAddress
        );
      }).rejects.toThrow(Error);
    });
  });

  describe('extractSignedTransactionOrder', () => {
    const network = new TestErgoNetwork();

    /**
     * @target ErgoChain.extractSignedTransactionOrder should extract transaction
     * order successfully
     * @dependencies
     * @scenario
     * - mock serialized transaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should extract transaction order successfully', () => {
      // mock serialized transaction
      const serializedTx = Buffer.from(
        ergoTestUtils
          .toTransaction(transactionTestData.transaction6)
          .sigma_serialize_bytes()
      ).toString('hex');

      const expectedOrder = transactionTestData.transaction6Order;
      const config: ErgoConfigs = {
        fee: 1100000n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: transactionTestData.transaction6InAddress,
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 1000000n,
        eventTxConfirmation: 18,
      };

      // run test
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.testTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      const result = ergoChain.extractSignedTransactionOrder(serializedTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });

    /**
     * @target ErgoChain.extractSignedTransactionOrder should wrap transaction
     * order successfully
     * @dependencies
     * @scenario
     * - mock serialized transaction
     * - run test
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should wrap transaction order successfully', () => {
      // mock serialized transaction
      const serializedTx = Buffer.from(
        ergoTestUtils
          .toTransaction(transactionTestData.transaction6)
          .sigma_serialize_bytes()
      ).toString('hex');

      const expectedOrder = transactionTestData.transaction6WrappedOrder;
      const config: ErgoConfigs = {
        fee: 1100000n,
        confirmations: ergoTestUtils.defaultConfirmations,
        addresses: {
          lock: transactionTestData.transaction6InAddress,
          cold: 'cold_addr',
          permit: 'permit_addr',
          fraud: 'fraud',
        },
        rwtId: ergoTestUtils.rwtId,
        minBoxValue: 1000000n,
        eventTxConfirmation: 18,
      };

      // run test
      const ergoChain = new ErgoChain(
        network,
        config,
        ergoTestUtils.multiDecimalTokenMap,
        ergoTestUtils.defaultSignFunction
      );
      const result = ergoChain.extractSignedTransactionOrder(serializedTx);

      // check returned value
      expect(result).toEqual(expectedOrder);
    });
  });

  describe('rawTxToPaymentTransaction', () => {
    /**
     * @target ErgoChain.rawTxToPaymentTransaction should construct transaction successfully
     * @dependencies
     * @scenario
     * - mock PaymentTransaction
     * - mock a network object
     *   - mock 'getHeight'
     *   - mock 'getStateContext'
     * - call the function
     * - check returned value
     * @expected
     * - it should return mocked transaction order
     */
    it('should construct transaction successfully', async () => {
      // mock PaymentTransaction
      const expectedTx = ErgoTransaction.fromJson(
        transactionTestData.transaction5PaymentTransaction
      );
      const rawTxJsonString = transactionTestData.transaction5UnsignedJson;
      expectedTx.eventId = '';
      expectedTx.txType = TransactionType.manual;

      // mock a network object
      const network = new TestErgoNetwork();
      // mock 'getStateContext'
      const getStateContextSpy = spyOn(network, 'getStateContext');
      getStateContextSpy.mockResolvedValue(
        transactionTestData.mockedStateContext
      );
      // mock getBox
      const getBoxSpy = spyOn(network, 'getBox');
      [...expectedTx.inputBoxes, ...expectedTx.dataInputs].forEach((box) =>
        getBoxSpy.mockResolvedValueOnce(wasm.ErgoBox.sigma_parse_bytes(box))
      );

      // call the function
      const ergoChain = ergoTestUtils.generateChainObject(network);
      const result = await ergoChain.rawTxToPaymentTransaction(rawTxJsonString);

      // check returned value
      expect(result.toJson()).toEqual(expectedTx.toJson());
    });
  });
});
