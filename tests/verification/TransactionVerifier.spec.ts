import TransactionVerifier from '../../src/verification/TransactionVerifier';
import {
  feeRatioDivisor,
  mockEventTrigger,
  mockTokenPaymentFromErgoEvent,
  rsnRatioDivisor,
} from '../event/testData';
import ChainHandlerMock, {
  chainHandlerInstance,
} from '../handlers/ChainHandler.mock';
import {
  AssetBalance,
  ChainUtils,
  PaymentOrder,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { mockPaymentTransaction } from '../agreement/testData';
import EventSerializer from '../../src/event/EventSerializer';
import {
  mockCreateEventPaymentOrder,
  mockCreateEventRewardOrder,
} from '../event/mocked/EventOrder.mock';
import { mockGetEventFeeConfig } from '../event/mocked/MinimumFee.mock';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import TestUtils from '../testUtils/TestUtils';

describe('TransactionVerifier', () => {
  describe('verifyTxCommonConditions', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();
    });

    /**
     * @target TransactionVerifier.verifyTxCommonConditions should return true
     * when all common conditions are met
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `verifyPaymentTransaction`
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all common conditions are met', async () => {
      // mock transaction
      const tx = mockPaymentTransaction();

      // mock ChainHandler
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyPaymentTransaction',
        true
      );
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockChainFunction(chain, 'verifyTransactionFee', true);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyNoTokenBurned',
        true,
        true
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyTransactionExtraConditions',
        true
      );

      // run test
      const result = await TransactionVerifier.verifyTxCommonConditions(tx);

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target TransactionVerifier.verifyTxCommonConditions should return false
     * when tx object has inconsistency
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `verifyPaymentTransaction`
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when tx object has inconsistency', async () => {
      // mock transaction
      const tx = mockPaymentTransaction();

      // mock ChainHandler
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyPaymentTransaction',
        false
      );
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockChainFunction(chain, 'verifyTransactionFee', true);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyNoTokenBurned',
        true,
        true
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyTransactionExtraConditions',
        true
      );

      // run test
      const result = await TransactionVerifier.verifyTxCommonConditions(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyTxCommonConditions should return false
     * when fee is not verified
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `verifyPaymentTransaction`
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when fee is not verified', async () => {
      // mock transaction
      const tx = mockPaymentTransaction();

      // mock ChainHandler
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyPaymentTransaction',
        true
      );
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockChainFunction(chain, 'verifyTransactionFee', false);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyNoTokenBurned',
        true,
        true
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyTransactionExtraConditions',
        true
      );

      // run test
      const result = await TransactionVerifier.verifyTxCommonConditions(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyTxCommonConditions should return false
     * when some tokens are burned
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `verifyPaymentTransaction`
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when some tokens are burned', async () => {
      // mock transaction
      const tx = mockPaymentTransaction();

      // mock ChainHandler
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyPaymentTransaction',
        true
      );
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockChainFunction(chain, 'verifyTransactionFee', true);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyNoTokenBurned',
        false,
        true
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyTransactionExtraConditions',
        true
      );

      // run test
      const result = await TransactionVerifier.verifyTxCommonConditions(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyTxCommonConditions should return false
     * when chain extra conditions are not verified
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `verifyPaymentTransaction`
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when chain extra conditions are not verified', async () => {
      // mock transaction
      const tx = mockPaymentTransaction();

      // mock ChainHandler
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyPaymentTransaction',
        true
      );
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockChainFunction(chain, 'verifyTransactionFee', true);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyNoTokenBurned',
        true,
        true
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        chain,
        'verifyTransactionExtraConditions',
        false
      );

      // run test
      const result = await TransactionVerifier.verifyTxCommonConditions(tx);

      // verify returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyEventTransaction', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();
      await DatabaseActionMock.clearTables();
      mockGetEventFeeConfig({
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 100n,
        rsnRatioDivisor,
        feeRatioDivisor,
      });
    });

    /**
     * @target TransactionVerifier.verifyEventTransaction should return true
     * when all conditions for payment tx are met
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock event and transaction
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `extractTransactionOrder` to return mocked order
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all conditions for payment tx are met', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger().event;
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      const chain = mockedEvent.toChain;
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        mockedOrder
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventPaymentOrder(mockedOrder);

      // run test
      const result = await TransactionVerifier.verifyEventTransaction(
        paymentTx,
        mockedEvent
      );

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target TransactionVerifier.verifyEventTransaction should return true
     * when all conditions for reward distribution tx are met
     * @dependencies
     * - database
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock event and two transactions
     * - insert event and payment transaction into database
     * - insert event commitment boxes into db
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `extractTransactionOrder` to return mocked order
     * - mock EventOrder.createEventRewardOrder to return mocked order
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all conditions for reward distribution tx are met', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger();
      const eventId = EventSerializer.getId(mockedEvent.event);
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.event.toChain,
        eventId
      );
      const rewardTx = mockPaymentTransaction(
        TransactionType.reward,
        ERGO_CHAIN,
        eventId
      );

      // insert payment transaction into database
      await DatabaseActionMock.insertEventRecord(
        mockedEvent.event,
        EventStatus.pendingReward
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx,
        TransactionStatus.completed
      );

      // insert event commitment boxes into db
      for (let i = 1; i < mockedEvent.WIDs.length; i++) {
        await DatabaseActionMock.insertCommitmentBoxRecord(
          mockedEvent.event,
          eventId,
          Buffer.from(`event-serialized-box-${i}`).toString('base64'),
          mockedEvent.WIDs[i],
          mockedEvent.event.height - 4,
          '1',
          'event-creation-tx-id',
          i
        );
      }

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'extractTransactionOrder',
        mockedOrder
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventRewardOrder(mockedOrder);

      // run test
      const result = await TransactionVerifier.verifyEventTransaction(
        rewardTx,
        mockedEvent.event
      );

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target TransactionVerifier.verifyEventTransaction should return false
     * when tx order is different from expected one
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock event and transaction
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     * - mock EventOrder.createEventPaymentOrder
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when tx order is different from expected one', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger().event;
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );

      // mock a PaymentOrder
      const txOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];
      const expectedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 20n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      const chain = mockedEvent.toChain;
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        txOrder
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventPaymentOrder(expectedOrder);

      // run test
      const result = await TransactionVerifier.verifyEventTransaction(
        paymentTx,
        mockedEvent
      );

      // verify returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyColdStorageTransaction', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return true
     * when all conditions for cold storage tx are met
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all conditions for cold storage tx are met', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when transaction order size is not valid
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transaction order size is not valid', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 500000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 50000000000n,
              },
            ],
          },
        },
        {
          address: coldAddress,
          assets: {
            nativeToken: 500000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 50000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when transaction is transferring to wrong address
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transaction is transferring to wrong address', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: `invalidAddress`,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when remaining native token in lock address will be less than low threshold
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when remaining native token in lock address will be less than low threshold', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1010000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when remaining native token in lock address will be more than high threshold
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when remaining native token in lock address will be more than high threshold', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1400000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when remaining token in lock address will be less than low threshold
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when remaining token in lock address will be less than low threshold', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 499000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when token is fully transferred
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when token is fully transferred', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 500000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when remaining token in lock address will be more than high threshold
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when remaining token in lock address will be more than high threshold', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 700000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when one of transferring tokens is forbidden
     * @dependencies
     * - ChainHandler
     * - database
     * @scenario
     * - mock an event and insert mocked event into db as paymentWaiting
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when one of transferring tokens is forbidden', async () => {
      // mock an event and insert mocked event into db as paymentWaiting
      const event = mockTokenPaymentFromErgoEvent().event;
      await DatabaseActionMock.insertEventRecord(
        event,
        EventStatus.paymentWaiting
      );

      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return true
     * when only forbidden tokens remain more than high threshold
     * @dependencies
     * - ChainHandler
     * - database
     * @scenario
     * - mock an event and insert mocked event into db as paymentWaiting
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when only forbidden tokens remain more than high threshold', async () => {
      // mock an event and insert mocked event into db as paymentWaiting
      const event = mockTokenPaymentFromErgoEvent().event;
      await DatabaseActionMock.insertEventRecord(
        event,
        EventStatus.paymentWaiting
      );

      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
                value: 600000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 725000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when tx is transferring unexpected token
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when tx is transferring unexpected token', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
                value: 100000000000n,
              },
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 497000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when no asset requires transfer
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when no asset requires transfer', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 9000000n,
            tokens: [],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 200000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 200000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when transferring native token exceeds allowed limit
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transferring native token exceeds allowed limit', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 20000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 497000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        order
      );
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 200000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return true
     * when active cold storage txs are transferring other tokens
     * @dependencies
     * - ChainHandler
     * - database
     * @scenario
     * - mock transaction
     * - insert a cold storage transaction into database
     * - mock ChainHandler
     *   - mock `extractTransactionOrder` implementation
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when active cold storage txs are transferring other tokens', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // insert a cold storage transaction into database
      const coldTx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      await DatabaseActionMock.insertTxRecord(
        coldTx,
        TransactionStatus.approved
      );
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder` implementation
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      const activeColdTxOrder: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000n,
            tokens: [
              {
                id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      const mockedExtractTransactionOrder =
        ChainHandlerMock.mockAndGetChainFunction(
          chain,
          'extractTransactionOrder'
        );
      mockedExtractTransactionOrder.mockImplementation((givenTx: any) => {
        if (givenTx.txId === tx.txId) return order;
        else if (givenTx.txId === coldTx.txId) return activeColdTxOrder;
        else
          throw Error(
            `'extractTransactionOrder' is not mocked for txId [${givenTx.txId}]`
          );
      });
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when there is an active cold storage tx that is transferring the same token
     * @dependencies
     * - ChainHandler
     * - database
     * @scenario
     * - mock transaction
     * - insert a cold storage transaction into database
     * - mock ChainHandler
     *   - mock `extractTransactionOrder` implementation
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when there is an active cold storage tx that is transferring the same token', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // insert a cold storage transaction into database
      const coldTx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      await DatabaseActionMock.insertTxRecord(
        coldTx,
        TransactionStatus.approved
      );
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder` implementation
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      const activeColdTxOrder: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000n,
            tokens: [
              {
                id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      const mockedExtractTransactionOrder =
        ChainHandlerMock.mockAndGetChainFunction(
          chain,
          'extractTransactionOrder'
        );
      mockedExtractTransactionOrder.mockImplementation((givenTx: any) => {
        if (givenTx.txId === tx.txId) return order;
        else if (givenTx.txId === coldTx.txId) return activeColdTxOrder;
        else
          throw Error(
            `'extractTransactionOrder' is not mocked for txId [${givenTx.txId}]`
          );
      });
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when there is an active cold storage tx that is transferring the native token
     * @dependencies
     * - ChainHandler
     * - database
     * @scenario
     * - mock transaction
     * - insert a cold storage transaction into database
     * - mock ChainHandler
     *   - mock `extractTransactionOrder` implementation
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when there is an active cold storage tx that is transferring the native token', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // insert a cold storage transaction into database
      const coldTx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      await DatabaseActionMock.insertTxRecord(
        coldTx,
        TransactionStatus.approved
      );
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder` implementation
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [],
          },
        },
      ];
      const activeColdTxOrder: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [],
          },
        },
      ];
      const mockedExtractTransactionOrder =
        ChainHandlerMock.mockAndGetChainFunction(
          chain,
          'extractTransactionOrder'
        );
      mockedExtractTransactionOrder.mockImplementation((givenTx: any) => {
        if (givenTx.txId === tx.txId) return order;
        else if (givenTx.txId === coldTx.txId) return activeColdTxOrder;
        else
          throw Error(
            `'extractTransactionOrder' is not mocked for txId [${givenTx.txId}]`
          );
      });
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyArbitraryTransaction', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target TransactionVerifier.verifyArbitraryTransaction should return true
     * when all conditions for payment tx are met
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `extractTransactionOrder` to return mocked order
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all conditions for payment tx are met', async () => {
      // mock transaction
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        chain,
        TestUtils.generateRandomId()
      );

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockChainFunction(
        chain,
        'extractTransactionOrder',
        mockedOrder
      );

      // run test
      const result = await TransactionVerifier.verifyArbitraryTransaction(
        paymentTx,
        ChainUtils.encodeOrder(mockedOrder)
      );

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target TransactionVerifier.verifyArbitraryTransaction should return false
     * when tx order is different
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     * - run test with different order
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when tx order is different', async () => {
      // mock transaction
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        chain,
        TestUtils.generateRandomId()
      );

      // mock ChainHandler
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockChainFunction(chain, 'extractTransactionOrder', [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ]);

      // run test
      const result = await TransactionVerifier.verifyArbitraryTransaction(
        paymentTx,
        ChainUtils.encodeOrder([
          { address: 'address', assets: { nativeToken: 20n, tokens: [] } },
        ])
      );

      // verify returned value
      expect(result).toEqual(false);
    });
  });
});
