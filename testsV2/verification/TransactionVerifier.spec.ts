import TransactionVerifier from '../../src/verification/TransactionVerifier';
import { mockEventTrigger } from '../event/testData';
import ChainHandlerMock from '../handlers/ChainHandler.mock';
import { PaymentOrder, TransactionTypes } from '@rosen-chains/abstract-chain';
import { mockPaymentTransaction } from '../agreement/testData';
import EventSerializer from '../../src/event/EventSerializer';
import {
  mockCreateEventPaymentOrder,
  mockCreateEventRewardOrder,
} from '../event/mocked/EventOrder.mock';
import { mockGetEventFeeConfig } from '../event/mocked/MinimumFee.mock';

describe('TransactionVerifier', () => {
  describe('verifyEventTransactionRequest', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();
      mockGetEventFeeConfig({
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 100n,
      });
    });

    /**
     * @target TransactionVerifier.verifyEventTransactionRequest should return true
     * when all conditions for payment tx are met
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock event and transaction
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
     *   - mock `extractTransactionOrder` to return mocked order
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all conditions for payment tx are met', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger();
      const paymentTx = mockPaymentTransaction(
        TransactionTypes.payment,
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
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockToChainFunction('verifyTransactionFee', true);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockToChainFunction('verifyNoTokenBurned', true, true);
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockToChainFunction(
        'verifyTransactionExtraConditions',
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockToChainFunction(
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
     * @target TransactionVerifier.verifyEventTransactionRequest should return true
     * when all conditions for reward distribution tx are met
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock event and transaction
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
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
      const paymentTx = mockPaymentTransaction(
        TransactionTypes.payment,
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
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockToChainFunction('verifyTransactionFee', true);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockToChainFunction('verifyNoTokenBurned', true, true);
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockToChainFunction(
        'verifyTransactionExtraConditions',
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockToChainFunction(
        'extractTransactionOrder',
        mockedOrder
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventRewardOrder(mockedOrder);

      // run test
      const result = await TransactionVerifier.verifyEventTransaction(
        paymentTx,
        mockedEvent
      );

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target TransactionVerifier.verifyEventTransactionRequest should return false
     * when fee is not verified
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock event and transaction
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `verifyTransactionFee` to return false
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
     *   - mock `extractTransactionOrder` to return mocked order
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when fee is not verified', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger();
      const paymentTx = mockPaymentTransaction(
        TransactionTypes.payment,
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
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockToChainFunction('verifyTransactionFee', false);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockToChainFunction('verifyNoTokenBurned', true, true);
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockToChainFunction(
        'verifyTransactionExtraConditions',
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockToChainFunction(
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
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyEventTransactionRequest should return false
     * when some tokens are burned
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock event and transaction
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned` to return false
     *   - mock `verifyTransactionExtraConditions`
     *   - mock `extractTransactionOrder` to return mocked order
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when some tokens are burned', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger();
      const paymentTx = mockPaymentTransaction(
        TransactionTypes.payment,
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
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockToChainFunction('verifyTransactionFee', true);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockToChainFunction('verifyNoTokenBurned', false, true);
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockToChainFunction(
        'verifyTransactionExtraConditions',
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockToChainFunction(
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
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyEventTransactionRequest should return false
     * when chain extra conditions are not verified
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock event and transaction
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions` to return false
     *   - mock `extractTransactionOrder` to return mocked order
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when chain extra conditions are not verified', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger();
      const paymentTx = mockPaymentTransaction(
        TransactionTypes.payment,
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
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockToChainFunction('verifyTransactionFee', true);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockToChainFunction('verifyNoTokenBurned', true, true);
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockToChainFunction(
        'verifyTransactionExtraConditions',
        false
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockToChainFunction(
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
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyEventTransactionRequest should return false
     * when tx order is different from expected one
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock event and transaction
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
     *   - mock `extractTransactionOrder`
     * - mock EventOrder.createEventPaymentOrder
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when tx order is different from expected one', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger();
      const paymentTx = mockPaymentTransaction(
        TransactionTypes.payment,
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
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockToChainFunction('verifyTransactionFee', true);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockToChainFunction('verifyNoTokenBurned', true, true);
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockToChainFunction(
        'verifyTransactionExtraConditions',
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockToChainFunction('extractTransactionOrder', txOrder);

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
});
