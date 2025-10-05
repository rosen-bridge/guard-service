import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { RosenData } from '@rosen-bridge/rosen-extractor';
import TestChainNetwork from './network/testChainNetwork';
import * as testData from './testData';
import { generateChainObject, generateRandomId } from './testUtils';
import {
  AssetBalance,
  ConfirmationStatus,
  PaymentTransaction,
  TransactionType,
} from '../lib';
import { TokenMap } from '@rosen-bridge/tokens';

describe('AbstractChain', () => {
  describe('generateTransaction', () => {
    const network = new TestChainNetwork();

    /**
     * @target AbstractChain.generateTransaction should return generated txs
     * @dependencies
     * @scenario
     * - mock chain 'generateMultipleTransactions' function to return 1 tx
     * - run test
     * - check returned value
     * @expected
     * - it should return the only mocked tx
     */
    it('should return generated txs', async () => {
      const mockedTxs = [
        new PaymentTransaction(
          'test',
          'tx-id',
          'event-id',
          Buffer.from(''),
          TransactionType.manual
        ),
      ];

      const chain = generateChainObject(network);
      const getLockAddressAssetsSpy = vi.spyOn(
        chain,
        'generateMultipleTransactions'
      );
      getLockAddressAssetsSpy.mockResolvedValueOnce(mockedTxs);

      // run test
      const result = await chain.generateTransaction(
        'event-id',
        TransactionType.manual,
        [],
        [],
        []
      );

      // Check returned value
      expect(result).toEqual(mockedTxs[0]);
    });

    /**
     * @target AbstractChain.generateTransaction should throw error when
     * multiple txs are generated
     * @dependencies
     * @scenario
     * - mock chain 'generateMultipleTransactions' function to return 1 tx
     * - run test and expect exception thrown
     * @expected
     * - it should throw Error
     */
    it('should throw error when multiple txs are generated', async () => {
      const mockedTxs = [
        new PaymentTransaction(
          'test',
          'tx-id',
          'event-id',
          Buffer.from(''),
          TransactionType.manual
        ),
        new PaymentTransaction(
          'test',
          'tx-id',
          'event-id',
          Buffer.from(''),
          TransactionType.manual
        ),
      ];

      const chain = generateChainObject(network);
      const getLockAddressAssetsSpy = vi.spyOn(
        chain,
        'generateMultipleTransactions'
      );
      getLockAddressAssetsSpy.mockResolvedValueOnce(mockedTxs);

      // run test
      await expect(async () => {
        await chain.generateTransaction(
          'event-id',
          TransactionType.manual,
          [],
          [],
          []
        );
      }).rejects.toThrow(Error);
    });
  });

  describe('verifyNoTokenBurned', () => {
    const paymentTx: PaymentTransaction = {
      network: 'ergo',
      txId: 'mockedTxId',
      eventId: 'mockedNetworkId',
      txBytes: Buffer.from('mockedTxBytes'),
      txType: TransactionType.payment,
      toJson: () => '',
    };
    const network = new TestChainNetwork();

    /**
     * @target AbstractChain.verifyNoTokenBurned should return true when no
     * token burned
     * @dependencies
     * @scenario
     * - mock an AssetBalance
     * - mock chain 'getTransactionAssets' function to return mocked assets
     *   for input and output
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when no token burned', async () => {
      // mock an AssetBalance
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
        ],
      };

      // mock chain 'getTransactionAssets' function to return mocked assets
      const chain = generateChainObject(network);
      const getTransactionAssetsSpy = vi.spyOn(chain, 'getTransactionAssets');
      getTransactionAssetsSpy.mockResolvedValueOnce({
        inputAssets: a,
        outputAssets: a,
      });

      // run test
      const result = await chain.verifyNoTokenBurned(paymentTx);

      // Check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target AbstractChain.verifyNoTokenBurned should return false when some
     * amount of a token got burned
     * @dependencies
     * @scenario
     * - mock two AssetBalance (second object has less value for a token)
     * - mock chain 'getTransactionAssets' function to return mocked assets
     *   for input and output
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when some amount of a token got burned', async () => {
      // mock two AssetBalance (second object has less value for a token)
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
        ],
      };
      const b = structuredClone(a);
      b.tokens[0].value = 5n;

      // mock chain 'getTransactionAssets' function to return mocked assets
      const chain = generateChainObject(network);
      const getTransactionAssetsSpy = vi.spyOn(chain, 'getTransactionAssets');
      getTransactionAssetsSpy.mockResolvedValueOnce({
        inputAssets: a,
        outputAssets: b,
      });

      // run test
      const result = await chain.verifyNoTokenBurned(paymentTx);

      // Check returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyEvent', () => {
    const feeConfig = new ChainMinimumFee({
      bridgeFee: 0n,
      networkFee: 0n,
      feeRatio: 0n,
      rsnRatio: 0n,
      rsnRatioDivisor: 10000000000000000n,
    });

    /**
     * @target AbstractChain.verifyEvent should return true when event is valid
     * @dependencies
     * @scenario
     * - mock an event
     * - mock a network object functions
     *   - 'getBlockTransactionIds'
     *   - 'getTransaction'
     *   - 'getBlockInfo' to return event block height
     * - mock rosen-extractor to return event data
     * - mock verifyLockTransactionExtraConditions to return true
     * - run test
     * - check returned value
     * - check if functions got called
     * @expected
     * - it should return true
     * - network object functions should have been called with expected arguments
     */
    it('should return true when event is valid', async () => {
      //  mock an event
      const event = testData.validEvent;

      // mock a network object with mocked 'getBlockTransactionIds' and
      //   'getTransaction' functions
      const network = new TestChainNetwork();
      const getBlockTransactionIdsSpy = vi.spyOn(
        network,
        'getBlockTransactionIds'
      );
      getBlockTransactionIdsSpy.mockResolvedValueOnce([
        generateRandomId(),
        event.sourceTxId,
        generateRandomId(),
      ]);

      // mock 'getTransaction'
      const tx = 'tx';
      const getTransactionSpy = vi.spyOn(network, 'getTransaction');
      getTransactionSpy.mockResolvedValueOnce(tx);

      // mock getBlockInfo to return event block height
      const getBlockInfoSpy = vi.spyOn(network, 'getBlockInfo');
      getBlockInfoSpy.mockResolvedValueOnce({
        height: event.sourceChainHeight,
      } as any);

      // mock rosen-extractor to return event data
      const chain = generateChainObject(network);
      const extractorSpy = vi.spyOn((chain as any).extractor, 'get');
      extractorSpy.mockReturnValueOnce(event as unknown as RosenData);

      // mock verifyLockTransactionExtraConditions to return true
      const verifyLockTxSpy = vi.spyOn(
        chain,
        'verifyLockTransactionExtraConditions'
      );
      verifyLockTxSpy.mockResolvedValueOnce(true);

      // run test
      const result = await chain.verifyEvent(event, feeConfig);

      // check returned value
      expect(result).toEqual(true);

      // check if functions got called
      // eslint-disable-next-line vitest/prefer-called-exactly-once-with
      expect(getBlockTransactionIdsSpy).toHaveBeenCalledWith(
        event.sourceBlockId
      );
      // eslint-disable-next-line vitest/prefer-called-exactly-once-with
      expect(getTransactionSpy).toHaveBeenCalledWith(
        event.sourceTxId,
        event.sourceBlockId
      );
      // eslint-disable-next-line vitest/prefer-called-exactly-once-with
      expect(getBlockInfoSpy).toHaveBeenCalledWith(event.sourceBlockId);
    });

    /**
     * @target AbstractChain.verifyEvent should return false when event transaction
     * is not in event block
     * @dependencies
     * @scenario
     * - mock an event
     * - mock a network object functions
     *   - 'getBlockTransactionIds'
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when event transaction is not in event block', async () => {
      // mock an event
      const event = testData.validEvent;

      // mock a network object with mocked 'getBlockTransactionIds'
      const network = new TestChainNetwork();
      const getBlockTransactionIdsSpy = vi.spyOn(
        network,
        'getBlockTransactionIds'
      );
      getBlockTransactionIdsSpy.mockResolvedValueOnce([
        generateRandomId(),
        generateRandomId(),
      ]);

      // run test
      const chain = generateChainObject(network);
      const result = await chain.verifyEvent(event, feeConfig);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target AbstractChain.verifyEvent should return false when a field of event
     * is wrong
     * @dependencies
     * @scenario
     * - mock an event
     * - mock a network object functions
     *   - 'getBlockTransactionIds'
     *   - 'getTransaction'
     *   - 'getBlockInfo' to return event block height
     * - mock rosen-extractor to return event data (expect for a key which
     *   should be wrong)
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it.each([
      'fromChain',
      'toChain',
      'networkFee',
      'bridgeFee',
      'amount',
      'sourceChainTokenId',
      'targetChainTokenId',
      'toAddress',
      'fromAddress',
    ])('should return false when event %p is wrong', async (key: string) => {
      // mock an event
      const event = testData.validEvent;

      //  mock a network object with mocked 'getBlockTransactionIds' and
      //   'getTransaction' functions
      const network = new TestChainNetwork();
      const getBlockTransactionIdsSpy = vi.spyOn(
        network,
        'getBlockTransactionIds'
      );
      getBlockTransactionIdsSpy.mockResolvedValueOnce([
        generateRandomId(),
        event.sourceTxId,
        generateRandomId(),
      ]);

      // mock 'getTransaction'
      const tx = 'tx';
      const getTransactionSpy = vi.spyOn(network, 'getTransaction');
      getTransactionSpy.mockResolvedValueOnce(tx);

      // mock getBlockInfo to return event block height
      const getBlockInfoSpy = vi.spyOn(network, 'getBlockInfo');
      getBlockInfoSpy.mockResolvedValueOnce({
        height: event.sourceChainHeight,
      } as any);

      // mock rosen-extractor to return event data (expect for a key which
      //   should be wrong)
      const chain = generateChainObject(network);
      const invalidData = event as unknown as RosenData;
      invalidData[key as keyof RosenData] = `fake_${key}`;
      const extractorSpy = vi.spyOn((chain as any).extractor, 'get');
      extractorSpy.mockReturnValueOnce(invalidData);

      // run test
      const result = await chain.verifyEvent(event, feeConfig);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target AbstractChain.verifyEvent should return false when event
     * sourceChainHeight is wrong
     * @dependencies
     * @scenario
     * - mock an event
     * - mock a network object functions
     *   - 'getBlockTransactionIds'
     *   - 'getTransaction'
     *   - 'getBlockInfo' to return event block height
     * - mock rosen-extractor to return event data (expect for a key which
     *   should be wrong)
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when event sourceChainHeight is wrong', async () => {
      //  mock an event
      const event = testData.validEvent;

      // mock a network object with mocked 'getBlockTransactionIds' and
      //   'getTransaction' functions
      const network = new TestChainNetwork();
      const getBlockTransactionIdsSpy = vi.spyOn(
        network,
        'getBlockTransactionIds'
      );
      getBlockTransactionIdsSpy.mockResolvedValueOnce([
        generateRandomId(),
        event.sourceTxId,
        generateRandomId(),
      ]);

      // mock 'getTransaction'
      const tx = 'tx';
      const getTransactionSpy = vi.spyOn(network, 'getTransaction');
      getTransactionSpy.mockResolvedValueOnce(tx);

      // mock getBlockInfo to return -1 as event block height
      const getBlockInfoSpy = vi.spyOn(network, 'getBlockInfo');
      getBlockInfoSpy.mockResolvedValueOnce({
        height: -1,
      } as any);

      // mock rosen-extractor to return event data
      const chain = generateChainObject(network);
      const extractorSpy = vi.spyOn((chain as any).extractor, 'get');
      extractorSpy.mockReturnValueOnce(event as unknown as RosenData);

      // run test
      const result = await chain.verifyEvent(event, feeConfig);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target AbstractChain.verifyEvent should return false when event amount
     * is less than sum of event fees
     * @dependencies
     * @scenario
     * - mock an event
     * - mock a network object functions
     *   - 'getBlockTransactionIds'
     *   - 'getTransaction'
     *   - 'getBlockInfo' to return event block height
     * - mock rosen-extractor to return event data
     * - mock verifyLockTransactionExtraConditions to return true
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when event amount is less than sum of event fees', async () => {
      // mock an event
      const event = testData.invalidEvent;

      // mock a network object with mocked 'getBlockTransactionIds' and
      //   'getTransaction' functions
      const network = new TestChainNetwork();
      const getBlockTransactionIdsSpy = vi.spyOn(
        network,
        'getBlockTransactionIds'
      );
      getBlockTransactionIdsSpy.mockResolvedValueOnce([
        generateRandomId(),
        event.sourceTxId,
        generateRandomId(),
      ]);

      // mock 'getTransaction'
      const tx = 'tx';
      const getTransactionSpy = vi.spyOn(network, 'getTransaction');
      getTransactionSpy.mockResolvedValueOnce(tx);

      // mock getBlockInfo to return event block height
      const getBlockInfoSpy = vi.spyOn(network, 'getBlockInfo');
      getBlockInfoSpy.mockResolvedValueOnce({
        height: event.sourceChainHeight,
      } as any);

      // mock rosen-extractor to return event data
      const chain = generateChainObject(network);
      const extractorSpy = vi.spyOn((chain as any).extractor, 'get');
      extractorSpy.mockReturnValueOnce(event as unknown as RosenData);

      // mock verifyLockTransactionExtraConditions to return true
      const verifyLockTxSpy = vi.spyOn(
        chain,
        'verifyLockTransactionExtraConditions'
      );
      verifyLockTxSpy.mockResolvedValueOnce(true);

      // run test
      const result = await chain.verifyEvent(event, feeConfig);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target AbstractChain.verifyEvent should return false when event amount
     * is less than sum of event fees while bridgeFee is less than minimum-fee
     * @dependencies
     * @scenario
     * - mock feeConfig
     * - mock an event
     * - mock a network object functions
     *   - 'getBlockTransactionIds'
     *   - 'getTransaction'
     *   - 'getBlockInfo' to return event block height
     * - mock rosen-extractor to return event data
     * - mock verifyLockTransactionExtraConditions to return true
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when event amount is less than sum of event fees while bridgeFee is less than minimum-fee', async () => {
      // mock feeConfig
      const fee = new ChainMinimumFee({
        bridgeFee: 1200000n,
        networkFee: 0n,
        feeRatio: 0n,
        rsnRatio: 0n,
        rsnRatioDivisor: 10000000000000000n,
      });

      // mock an event
      const event = testData.validEventWithHighFee;

      // mock a network object with mocked 'getBlockTransactionIds' and
      //   'getTransaction' functions
      const network = new TestChainNetwork();
      const getBlockTransactionIdsSpy = vi.spyOn(
        network,
        'getBlockTransactionIds'
      );
      getBlockTransactionIdsSpy.mockResolvedValueOnce([
        generateRandomId(),
        event.sourceTxId,
        generateRandomId(),
      ]);

      // mock 'getTransaction'
      const tx = 'tx';
      const getTransactionSpy = vi.spyOn(network, 'getTransaction');
      getTransactionSpy.mockResolvedValueOnce(tx);

      // mock getBlockInfo to return event block height
      const getBlockInfoSpy = vi.spyOn(network, 'getBlockInfo');
      getBlockInfoSpy.mockResolvedValueOnce({
        height: event.sourceChainHeight,
      } as any);

      // mock rosen-extractor to return event data
      const chain = generateChainObject(network);
      const extractorSpy = vi.spyOn((chain as any).extractor, 'get');
      extractorSpy.mockReturnValueOnce(event as unknown as RosenData);

      // mock verifyLockTransactionExtraConditions to return true
      const verifyLockTxSpy = vi.spyOn(
        chain,
        'verifyLockTransactionExtraConditions'
      );
      verifyLockTxSpy.mockResolvedValueOnce(true);

      // run test
      const result = await chain.verifyEvent(event, fee);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target AbstractChain.verifyEvent should return false when event amount
     * is less than sum of event fees while bridgeFee is less than expected value
     * @dependencies
     * @scenario
     * - mock feeConfig
     * - mock an event
     * - mock a network object functions
     *   - 'getBlockTransactionIds'
     *   - 'getTransaction'
     *   - 'getBlockInfo' to return event block height
     * - mock rosen-extractor to return event data
     * - mock verifyLockTransactionExtraConditions to return true
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when event amount is less than sum of event fees while bridgeFee is less than expected value', async () => {
      // mock feeConfig
      const fee = new ChainMinimumFee({
        bridgeFee: 0n,
        networkFee: 0n,
        feeRatio: 1200n,
        rsnRatio: 0n,
        rsnRatioDivisor: 10000000000000000n,
      });

      // mock an event
      const event = testData.validEventWithHighFee;

      // mock a network object with mocked 'getBlockTransactionIds' and
      //   'getTransaction' functions
      const network = new TestChainNetwork();
      const getBlockTransactionIdsSpy = vi.spyOn(
        network,
        'getBlockTransactionIds'
      );
      getBlockTransactionIdsSpy.mockResolvedValueOnce([
        generateRandomId(),
        event.sourceTxId,
        generateRandomId(),
      ]);

      // mock 'getTransaction'
      const tx = 'tx';
      const getTransactionSpy = vi.spyOn(network, 'getTransaction');
      getTransactionSpy.mockResolvedValueOnce(tx);

      // mock getBlockInfo to return event block height
      const getBlockInfoSpy = vi.spyOn(network, 'getBlockInfo');
      getBlockInfoSpy.mockResolvedValueOnce({
        height: event.sourceChainHeight,
      } as any);

      // mock rosen-extractor to return event data
      const chain = generateChainObject(network);
      const extractorSpy = vi.spyOn((chain as any).extractor, 'get');
      extractorSpy.mockReturnValueOnce(event as unknown as RosenData);

      // mock verifyLockTransactionExtraConditions to return true
      const verifyLockTxSpy = vi.spyOn(
        chain,
        'verifyLockTransactionExtraConditions'
      );
      verifyLockTxSpy.mockResolvedValueOnce(true);

      // run test
      const result = await chain.verifyEvent(event, fee);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target AbstractChain.verifyEvent should return false when lock tx is not verified
     * @dependencies
     * @scenario
     * - mock an event
     * - mock a network object functions
     *   - 'getBlockTransactionIds'
     *   - 'getTransaction'
     *   - 'getBlockInfo' to return event block height
     * - mock rosen-extractor to return event d ata
     * - mock verifyLockTransactionExtraConditions to return false
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when lock tx is not verified', async () => {
      //  mock an event
      const event = testData.validEvent;

      // mock a network object with mocked 'getBlockTransactionIds' and
      //   'getTransaction' functions
      const network = new TestChainNetwork();
      const getBlockTransactionIdsSpy = vi.spyOn(
        network,
        'getBlockTransactionIds'
      );
      getBlockTransactionIdsSpy.mockResolvedValueOnce([
        generateRandomId(),
        event.sourceTxId,
        generateRandomId(),
      ]);

      // mock 'getTransaction'
      const tx = 'tx';
      const getTransactionSpy = vi.spyOn(network, 'getTransaction');
      getTransactionSpy.mockResolvedValueOnce(tx);

      // mock getBlockInfo to return event block height
      const getBlockInfoSpy = vi.spyOn(network, 'getBlockInfo');
      getBlockInfoSpy.mockResolvedValueOnce({
        height: event.sourceChainHeight,
      } as any);

      // mock rosen-extractor to return event data
      const chain = generateChainObject(network);
      const extractorSpy = vi.spyOn((chain as any).extractor, 'get');
      extractorSpy.mockReturnValueOnce(event as unknown as RosenData);

      // mock verifyLockTransactionExtraConditions to return false
      const verifyLockTxSpy = vi.spyOn(
        chain,
        'verifyLockTransactionExtraConditions'
      );
      verifyLockTxSpy.mockResolvedValueOnce(false);

      // run test
      const result = await chain.verifyEvent(event, feeConfig);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('getTxConfirmationStatus', () => {
    const txId = 'tx-id';
    const txType = TransactionType.payment;
    const requiredConfirmation = testData.paymentTxConfirmation;
    const network = new TestChainNetwork();

    /**
     * @target AbstractChain.getTxConfirmationStatus should return
     * ConfirmedEnough when tx confirmation is more than required number
     * @dependencies
     * @scenario
     * - mock a network object to return enough confirmation for mocked txId
     * - run test
     * - check returned value
     * @expected
     * - it should return `ConfirmedEnough` enum
     */
    it('should return ConfirmedEnough when tx confirmation is more than required number', async () => {
      // mock a network object to return enough confirmation for mocked txId
      const getTxConfirmationSpy = vi.spyOn(network, 'getTxConfirmation');
      getTxConfirmationSpy.mockResolvedValueOnce(requiredConfirmation + 1);

      // run test
      const chain = generateChainObject(network);
      const result = await chain.getTxConfirmationStatus(txId, txType);

      // check returned value
      expect(result).toEqual(ConfirmationStatus.ConfirmedEnough);
    });

    /**
     * @target AbstractChain.getTxConfirmationStatus should return
     * NotConfirmedEnough when payment tx confirmation is less than required number
     * @dependencies
     * @scenario
     * - mock a network object to return insufficient confirmation for mocked
     *   txId
     * - run test
     * - check returned value
     * @expected
     * - it should return `NotConfirmedEnough` enum
     */
    it('should return NotConfirmedEnough when tx confirmation is less than required number', async () => {
      // mock a network object to return insufficient confirmation for mocked
      const getTxConfirmationSpy = vi.spyOn(network, 'getTxConfirmation');
      getTxConfirmationSpy.mockResolvedValueOnce(requiredConfirmation - 1);

      // run test
      const chain = generateChainObject(network);
      const result = await chain.getTxConfirmationStatus(txId, txType);

      // check returned value
      expect(result).toEqual(ConfirmationStatus.NotConfirmedEnough);
    });

    /**
     * @target AbstractChain.getTxConfirmationStatus should return
     * NotFound when tx confirmation is -1
     * @dependencies
     * @scenario
     * - mock a network object to return -1 confirmation for mocked txId
     * - run test
     * - check returned value
     * @expected
     * - it should return `NotFound` enum
     */
    it('should return NotFound when tx confirmation is -1', async () => {
      // mock a network object to return enough confirmation for mocked txId
      const getTxConfirmationSpy = vi.spyOn(network, 'getTxConfirmation');
      getTxConfirmationSpy.mockResolvedValueOnce(-1);

      // run test
      const chain = generateChainObject(network);
      const result = await chain.getTxConfirmationStatus(txId, txType);

      // check returned value
      expect(result).toEqual(ConfirmationStatus.NotFound);
    });
  });

  describe('getAddressAssets', () => {
    const network = new TestChainNetwork();

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

      const tokenMap = new TokenMap();
      await tokenMap.updateConfigByJson(testData.testTokenMap);
      // run test
      const chain = generateChainObject(network, tokenMap);
      const result = await chain.getAddressAssets('address');

      // check returned value
      expect(result).toEqual(testData.wrappedBalance);
    });

    /**
     * @target AbstractChain.getAddressAssets should get address balance of only native token
     * @dependencies
     * @scenario
     * - stub network.getAddressAssets to return mock asset balance object
     * - call AbstractChain.getAddressAssets with tokens set to an empty array
     * @expected
     * - result tokens array should have been empty
     */
    it('should get address balance of only native token', async () => {
      // arrange
      vi.spyOn(network, 'getAddressAssets').mockResolvedValueOnce(
        testData.actualBalance
      );

      const tokenMap = new TokenMap();
      await tokenMap.updateConfigByJson(testData.testTokenMap);
      const chain = generateChainObject(network, tokenMap);

      // act
      const result = await chain.getAddressAssets('address', []);

      // assert
      expect(result).toEqual({
        nativeToken: 1000n,
        tokens: [],
      });
    });

    /**
     * @target AbstractChain.getAddressAssets should get address balance of native token and
     *  2 requested tokens, and ignore other tokens
     * @dependencies
     * @scenario
     * - stub network.getAddressAssets to return mock asset balance object
     * - call AbstractChain.getAddressAssets with tokens set to array of 2 supported and
     *   1 unsupported token ids
     * @expected
     * - result tokens array should contain 2 asset balance objects for each requested tokens
     * - result tokens array should not contain balance value for the other tokens
     */
    it('should get address balance of native token and 2 requested tokens, and ignore other tokens', async () => {
      // arrange
      vi.spyOn(network, 'getAddressAssets').mockResolvedValueOnce(
        testData.actualBalance
      );

      const tokenMap = new TokenMap();
      await tokenMap.updateConfigByJson(testData.testTokenMap);
      const chain = generateChainObject(network, tokenMap);

      // act
      const result = await chain.getAddressAssets('address', [
        'multi-decimal-token1',
        'wrapped-multi-decimal-token2',
        'multi-decimal-token3',
      ]);

      // assert
      expect(result).toEqual({
        nativeToken: 1000n,
        tokens: [
          { id: 'multi-decimal-token1', value: 45n },
          { id: 'wrapped-multi-decimal-token2', value: 56n },
        ],
      });
    });
  });

  describe('hasLockAddressEnoughAssets', () => {
    const requiredAssets = {
      nativeToken: 100n,
      tokens: [
        { id: '0x12345752e5a2f595151c94762fb38e5730357785', value: 300n },
      ],
    };
    const network = new TestChainNetwork();

    /**
     * @target AbstractChain.hasLockAddressEnoughAssets should return true when
     * assets are enough
     * @dependencies
     * @scenario
     * - mock an AssetBalance with assets more than required assets
     * - mock chain 'getLockAddressAssets' function to return mocked assets
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when assets are enough', async () => {
      // mock an AssetBalance with assets more than required assets
      const lockAssets: AssetBalance = {
        nativeToken: 200n,
        tokens: [
          { id: '0x12345752e5a2f595151c94762fb38e5730357785', value: 300n },
        ],
      };

      // mock chain 'getLockAddressAssets' function to return mocked assets
      const chain = generateChainObject(network);
      const getLockAddressAssetsSpy = vi.spyOn(chain, 'getLockAddressAssets');
      getLockAddressAssetsSpy.mockResolvedValueOnce(lockAssets);

      // run test
      const result = await chain.hasLockAddressEnoughAssets(requiredAssets);

      // Check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target AbstractChain.hasLockAddressEnoughAssets should return false when
     * native tokens are NOT enough
     * @dependencies
     * @scenario
     * - mock an AssetBalance with assets less than required assets
     * - mock chain 'getLockAddressAssets' function to return mocked assets
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when native tokens are NOT enough', async () => {
      // mock an AssetBalance with assets less than required assets
      const lockAssets: AssetBalance = {
        nativeToken: 20n,
        tokens: [
          { id: '0x12345752e5a2f595151c94762fb38e5730357785', value: 300n },
        ],
      };

      // mock chain 'getLockAddressAssets' function to return mocked assets
      const chain = generateChainObject(network);
      const getLockAddressAssetsSpy = vi.spyOn(chain, 'getLockAddressAssets');
      getLockAddressAssetsSpy.mockResolvedValueOnce(lockAssets);

      // run test
      const result = await chain.hasLockAddressEnoughAssets(requiredAssets);

      // Check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target AbstractChain.hasLockAddressEnoughAssets should return false when
     * assets are NOT enough
     * @dependencies
     * @scenario
     * - mock an AssetBalance with assets less than required assets
     * - mock chain 'getLockAddressAssets' function to return mocked assets
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when assets are NOT enough', async () => {
      // mock an AssetBalance with assets less than required assets
      const lockAssets: AssetBalance = {
        nativeToken: 200n,
        tokens: [
          { id: '0x12345752e5a2f595151c94762fb38e5730357785', value: 299n },
        ],
      };

      // mock chain 'getLockAddressAssets' function to return mocked assets
      const chain = generateChainObject(network);
      const getLockAddressAssetsSpy = vi.spyOn(chain, 'getLockAddressAssets');
      getLockAddressAssetsSpy.mockResolvedValueOnce(lockAssets);

      // run test
      const result = await chain.hasLockAddressEnoughAssets(requiredAssets);

      // Check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target AbstractChain.hasLockAddressEnoughAssets should return false when
     * address does not have the required asset at all
     * @dependencies
     * @scenario
     * - mock an AssetBalance without any tokens
     * - mock chain 'getLockAddressAssets' function to return mocked assets
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when address does not have the required asset at all', async () => {
      // mock an AssetBalance without any tokens
      const lockAssets: AssetBalance = {
        nativeToken: 200n,
        tokens: [],
      };

      // mock chain 'getLockAddressAssets' function to return mocked assets
      const chain = generateChainObject(network);
      const getLockAddressAssetsSpy = vi.spyOn(chain, 'getLockAddressAssets');
      getLockAddressAssetsSpy.mockResolvedValueOnce(lockAssets);

      // run test
      const result = await chain.hasLockAddressEnoughAssets(requiredAssets);

      // Check returned value
      expect(result).toEqual(false);
    });
  });
});
