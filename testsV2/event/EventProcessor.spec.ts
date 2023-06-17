import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import EventProcessor from '../../src/event/EventProcessor';
import { mockEventTrigger, mockToErgoEventTrigger } from './testData';
import {
  mockIsEventConfirmedEnough,
  mockVerifyEvent,
} from '../verification/mocked/EventVerifier.mock';
import { EventStatus } from '../../src/models/Models';
import {
  BoxInfo,
  EventTrigger,
  NotEnoughAssetsError,
  PaymentTransaction,
} from '@rosen-chains/abstract-chain';
import Configs from '../../src/helpers/Configs';
import EventSerializer from '../../src/event/EventSerializer';
import { Fee } from '@rosen-bridge/minimum-fee';
import { mockGetEventFeeConfig } from './mocked/MinimumFee.mock';
import ChainHandlerMock from '../handlers/ChainHandler.mock';
import {
  mockGetEventBox,
  mockGetEventValidCommitments,
} from './mocked/EventBoxes.mock';
import {
  mockEventRewardOrder,
  mockEventSinglePayment,
} from './mocked/EventOrder.mock';
import TxAgreementMock from '../agreement/TxAgreement.mock';
import { ErgoTransaction } from '@rosen-chains/ergo';
import DiscordNotificationMock from '../communication/notification/mocked/DiscordNotification.mock';

describe('EventProcessor', () => {
  describe('processScannedEvents', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventProcessor.processScannedEvents should insert confirmed
     * events into ConfirmedEvent table with pending-payment status
     * @dependencies
     * - database
     * - EventVerifier
     * @scenario
     * - insert a mocked event into db
     * - mock event as confirmed
     * - run test
     * - verify event insertion into db
     * @expected
     * - mocked event should be in ConfirmedEvent table
     * - event status should be pending-payment
     */
    it('should insert confirmed events into ConfirmedEvent table', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger();
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized
      );

      // mock event as confirmed
      mockIsEventConfirmedEnough(true);

      // run test
      await EventProcessor.processScannedEvents();

      // verify event insertion into db
      const dbEvents = await DatabaseActionMock.allEventRecords();
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents[0].status).toEqual(EventStatus.pendingPayment);
    });

    /**
     * @target EventProcessor.processScannedEvents should NOT insert unconfirmed
     * events into ConfirmedEvent table
     * @dependencies
     * - database
     * - EventVerifier
     * @scenario
     * - insert a mocked event into db
     * - mock event as unconfirmed
     * - run test
     * - verify no event inserted into db
     * @expected
     * - no event should be in ConfirmedEvent table
     */
    it('should NOT insert unconfirmed events into ConfirmedEvent table', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger();
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized
      );

      // mock event as unconfirmed
      mockIsEventConfirmedEnough(false);

      // run test
      await EventProcessor.processScannedEvents();

      // verify no event inserted into db
      const dbEvents = await DatabaseActionMock.allEventRecords();
      expect(dbEvents.length).to.equal(0);
    });

    /**
     * @target EventProcessor.processScannedEvents should insert only one event
     * per sourceTxId into ConfirmedEvent table
     * @dependencies
     * - database
     * - EventVerifier
     * @scenario
     * - insert a mocked event into db twice
     * - mock event as confirmed
     * - run test
     * - verify event insertion into db
     * @expected
     * - only one event should be in ConfirmedEvent table
     */
    it('should only inserts one event per sourceTxId into ConfirmedEvent table', async () => {
      // insert a mocked event into db twice
      const mockedEvent = mockEventTrigger();
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized
      );
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized
      );

      // mock event as confirmed
      mockIsEventConfirmedEnough(true);

      // run test
      await EventProcessor.processScannedEvents();

      // verify event insertion into db
      const dbEvents = await DatabaseActionMock.allEventRecords();
      expect(dbEvents.length).toEqual(1);
    });
  });

  describe('processConfirmedEvents', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventProcessor.processConfirmedEvents should update event status to
     * spent when event box is spent
     * @dependencies
     * - database
     * - EventProcessor
     * @scenario
     * - mock a pending payment event and insert into db
     * - mock `processPaymentEvent`
     * - run test
     * - check if function got called
     * - check status of events in db
     * - reset mocked function
     * @expected
     * - processor should NOT got called
     * - event status should be updated to spent
     */
    it('should update event status to spent when event box is spent', async () => {
      // mock a pending payment event and insert into db
      const mockedEvent: EventTrigger = mockEventTrigger();
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
        'boxSerialized',
        300,
        '0',
        200,
        250
      );

      // mock `processPaymentEvent`
      const mockedProcessor = vi.fn();
      const processPaymentEventSpy = vi.spyOn(
        EventProcessor,
        'processPaymentEvent'
      );
      processPaymentEventSpy.mockImplementation(mockedProcessor);

      // run test
      await EventProcessor.processConfirmedEvents();

      // processor should NOT got called
      expect(mockedProcessor).not.toHaveBeenCalled();

      // event status should be updated to spent
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents).to.deep.contain([
        EventSerializer.getId(mockedEvent),
        EventStatus.spent,
      ]);

      // reset mocked function
      processPaymentEventSpy.mockRestore();
    });

    /**
     * @target EventProcessor.processConfirmedEvents should send event to payment
     * processor when event is pending payment
     * @dependencies
     * - database
     * - EventProcessor
     * @scenario
     * - mock a pending payment event and insert into db
     * - mock `processPaymentEvent`
     * - run test
     * - check if function got called
     * - reset mocked function
     * @expected
     * - `processPaymentEvent` should got called
     */
    it('should send event to payment processor when event is pending payment', async () => {
      // mock a pending payment event and insert into db
      const mockedEvent: EventTrigger = mockEventTrigger();
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // mock `processPaymentEvent`
      const mockedProcessor = vi.fn();
      const processPaymentEventSpy = vi.spyOn(
        EventProcessor,
        'processPaymentEvent'
      );
      processPaymentEventSpy.mockImplementation(mockedProcessor);

      // run test
      await EventProcessor.processConfirmedEvents();

      // `processPaymentEvent` should got called
      expect(mockedProcessor).toHaveBeenCalledOnce();

      // reset mocked function
      processPaymentEventSpy.mockRestore();
    });

    /**
     * @target EventProcessor.processConfirmedEvents should send event to reward
     * processor when event is pending reward distribution
     * @dependencies
     * - database
     * - EventProcessor
     * @scenario
     * - mock a pending reward event and insert into db
     * - mock `processRewardEvent`
     * - run test
     * - check if function got called
     * - reset mocked function
     * @expected
     * - `processRewardEvent` should got called
     */
    it('should send event to reward processor when event is pending reward distribution', async () => {
      // mock a pending reward event and insert into db
      const mockedEvent: EventTrigger = mockEventTrigger();
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingReward
      );

      // mock `processRewardEvent`
      const mockedProcessor = vi.fn();
      const processRewardEventSpy = vi.spyOn(
        EventProcessor,
        'processRewardEvent'
      );
      processRewardEventSpy.mockImplementation(mockedProcessor);

      // run test
      await EventProcessor.processConfirmedEvents();

      // `processRewardEvent` should got called
      expect(mockedProcessor).toHaveBeenCalledOnce();

      // reset mocked function
      processRewardEventSpy.mockRestore();
    });
  });

  describe('processPaymentEvent', () => {
    const fromChainRwt = 'fromChainRwt';
    const ergoRwt = 'ergoRwt';

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
      TxAgreementMock.resetMock();
      TxAgreementMock.mock();
      DiscordNotificationMock.resetMock();
    });

    /**
     * @target EventProcessor.processPaymentEvent should create event payment
     * transaction on Ergo and send it to agreement process successfully
     * @dependencies
     * - database
     * - MinimumFee
     * - EventVerifier
     * - ChainHandler
     * - EventOrder
     * - EventBoxes
     * @scenario
     * - mock feeConfig
     * - mock event as verified
     * - mock ChainHandler `getChain` and `getErgoChain`
     *   - mock `getMinimumNativeToken`
     *   - mock `getGuardsConfigBox`
     *   - mock `getBoxWID`
     *   - mock `generateTransaction`
     *   - mock `getRWTToken` of `fromChain`
     *   - mock `getBoxRWT` of Ergo
     * - mock event box and valid commitments
     * - mock event payment and reward order generations
     * - mock txAgreement
     *   - mock `getChainPendingTransactions` to return empty list
     *   - mock `addTransactionToQueue`
     * - run test
     * - check if function got called
     * @expected
     * - `addTransactionToQueue` should got called
     */
    it('should create event payment transaction on Ergo and send it to agreement process successfully', async () => {
      // mock feeConfig
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      mockGetEventFeeConfig(fee);

      // mock event as verified
      const mockedEvent: EventTrigger = mockToErgoEventTrigger();
      mockVerifyEvent(true);

      // mock ChainHandler `getChain` and `getErgoChain`
      // mock `getMinimumNativeToken`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getMinimumNativeToken',
        100n,
        false
      );
      // mock `getGuardsConfigBox`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        'serialized-guard-box',
        true
      );
      // mock `getBoxWID`
      ChainHandlerMock.mockErgoFunctionReturnValue('getBoxWID', 'wid', true);
      // mock `generateTransaction`
      const paymentTx = ErgoTransaction.fromJson(
        JSON.stringify({
          network: 'network',
          txId: 'txId',
          eventId: 'eventId',
          txBytes: Buffer.from('txBytes'),
          txType: 'txType',
          inputBoxes: [],
          dataInputs: [],
        })
      );
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'generateTransaction',
        paymentTx,
        true
      );
      // mock `getRWTToken` of `fromChain`
      ChainHandlerMock.mockFromChainFunction('getRWTToken', fromChainRwt);
      // mock `getBoxRWT` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getBoxRWT',
        2n * BigInt(mockedEvent.WIDs.length)
      );

      // mock event box and valid commitments
      mockGetEventBox('serialized-event-box');
      mockGetEventValidCommitments([]);

      // mock event payment and reward order generations
      mockEventSinglePayment({
        address: mockedEvent.toAddress,
        assets: {
          nativeToken: 0n,
          tokens: [],
        },
      });
      mockEventRewardOrder([]);

      // mock txAgreement pending transactions
      TxAgreementMock.mockGetChainPendingTransactions([]);
      TxAgreementMock.mockAddTransactionToQueue();

      // run test
      await EventProcessor.processPaymentEvent(mockedEvent);

      // `addTransactionToQueue` should got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue')
      ).toHaveBeenCalledOnce();
    });

    /**
     * @target EventProcessor.processPaymentEvent should create event payment
     * transaction on Ergo and send it to agreement process successfully
     * @dependencies
     * - database
     * - MinimumFee
     * - EventVerifier
     * - ChainHandler
     * - EventOrder
     * - EventBoxes
     * @scenario
     * - mock feeConfig
     * - mock event as verified
     * - mock ChainHandler `getChain`
     *   - mock `getMinimumNativeToken`
     *   - mock `generateTransaction`
     *   - mock `getRWTToken` of Ergo
     *   - mock `getBoxRWT` of Ergo
     * - mock event payment order generations
     * - mock txAgreement
     *   - mock `getChainPendingTransactions` to return empty list
     *   - mock `addTransactionToQueue`
     * - run test
     * - check if function got called
     * @expected
     * - `addTransactionToQueue` should got called
     */
    it('should create event payment transaction on `toChain` and send it to agreement process successfully', async () => {
      // mock feeConfig
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      mockGetEventFeeConfig(fee);

      // mock event as verified
      const mockedEvent: EventTrigger = mockEventTrigger();
      mockVerifyEvent(true);

      // mock ChainHandler `getChain`
      // mock `getMinimumNativeToken`
      ChainHandlerMock.mockToChainFunction(
        'getMinimumNativeToken',
        100n,
        false
      );
      // mock `generateTransaction`
      const paymentTx = ErgoTransaction.fromJson(
        JSON.stringify({
          network: 'network',
          txId: 'txId',
          eventId: 'eventId',
          txBytes: Buffer.from('txBytes'),
          txType: 'txType',
          inputBoxes: [],
          dataInputs: [],
        })
      );
      ChainHandlerMock.mockToChainFunction(
        'generateTransaction',
        paymentTx,
        true
      );
      // mock `getRWTToken` of `Ergo`
      ChainHandlerMock.mockErgoFunctionReturnValue('getRWTToken', ergoRwt);
      // mock `getBoxRWT` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getBoxRWT',
        2n * BigInt(mockedEvent.WIDs.length)
      );

      // mock event payment order generations
      mockEventSinglePayment({
        address: mockedEvent.toAddress,
        assets: {
          nativeToken: 0n,
          tokens: [],
        },
      });

      // mock txAgreement pending transactions
      TxAgreementMock.mockGetChainPendingTransactions([]);
      TxAgreementMock.mockAddTransactionToQueue();

      // run test
      await EventProcessor.processPaymentEvent(mockedEvent);

      // `addTransactionToQueue` should got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue')
      ).toHaveBeenCalledOnce();
    });

    /**
     * @target EventProcessor.processPaymentEvent should set event as rejected
     * when event has not verified
     * @dependencies
     * - database
     * - MinimumFee
     * - EventVerifier
     * @scenario
     * - mock feeConfig
     * - insert a mocked event into db
     * - mock event as unverified
     * - run test
     * - check status of event in db
     * @expected
     * - event status should be updated in db
     */
    it('should set event as rejected when event has not verified', async () => {
      // mock feeConfig
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      mockGetEventFeeConfig(fee);

      // insert a mocked event into db
      const mockedEvent: EventTrigger = mockEventTrigger();
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // mock event as unverified
      mockVerifyEvent(false);

      // run test
      await EventProcessor.processPaymentEvent(mockedEvent);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).to.deep.contain([
        EventSerializer.getId(mockedEvent),
        EventStatus.rejected,
      ]);
    });

    /**
     * @target EventProcessor.processPaymentEvent should set event as waiting
     * when there is not enough assets in lock address to create payment
     * @dependencies
     * - database
     * - MinimumFee
     * - EventVerifier
     * - ChainHandler
     * - EventOrder
     * - EventBoxes
     * - DiscordNotification
     * @scenario
     * - mock feeConfig
     * - insert a mocked event into db
     * - mock event as verified
     * - mock ChainHandler `getChain` and `getErgoChain`
     *   - mock `getMinimumNativeToken`
     *   - mock `getGuardsConfigBox`
     *   - mock `getBoxWID`
     *   - mock `generateTransaction` to throw NotEnoughAssetsError
     *   - mock `getRWTToken` of `fromChain`
     *   - mock `getBoxRWT` of Ergo
     * - mock event box and valid commitments
     * - mock event payment and reward order generations
     * - mock txAgreement `getChainPendingTransactions` to return empty list
     * - mock DiscordNotification
     * - run test
     * - check status of event in db
     * - check if function got called
     * @expected
     * - event status should be updated in db
     * - DiscordNotification `sendMessage` should got called
     */
    it('should set event as waiting when there is not enough assets in lock address to create payment', async () => {
      // mock feeConfig
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      mockGetEventFeeConfig(fee);

      // insert a mocked event into db
      const mockedEvent: EventTrigger = mockToErgoEventTrigger();
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // mock event as verified
      mockVerifyEvent(true);

      // mock ChainHandler `getChain` and `getErgoChain`
      // mock `getMinimumNativeToken`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getMinimumNativeToken',
        100n,
        false
      );
      // mock `getGuardsConfigBox`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        'serialized-guard-box',
        true
      );
      // mock `getBoxWID`
      ChainHandlerMock.mockErgoFunctionReturnValue('getBoxWID', 'wid', true);
      // mock `generateTransaction`
      const paymentTx = ErgoTransaction.fromJson(
        JSON.stringify({
          network: 'network',
          txId: 'txId',
          eventId: 'eventId',
          txBytes: Buffer.from('txBytes'),
          txType: 'txType',
          inputBoxes: [],
          dataInputs: [],
        })
      );
      ChainHandlerMock.mockErgoFunctionToThrow(
        'generateTransaction',
        new NotEnoughAssetsError(`test version of NotEnoughAssetsError`),
        true
      );
      // mock `getRWTToken` of `fromChain`
      ChainHandlerMock.mockFromChainFunction('getRWTToken', fromChainRwt);
      // mock `getBoxRWT` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getBoxRWT',
        2n * BigInt(mockedEvent.WIDs.length)
      );

      // mock event box and valid commitments
      mockGetEventBox('serialized-event-box');
      mockGetEventValidCommitments([]);

      // mock event payment and reward order generations
      mockEventSinglePayment({
        address: mockedEvent.toAddress,
        assets: {
          nativeToken: 0n,
          tokens: [],
        },
      });
      mockEventRewardOrder([]);

      // mock txAgreement `getChainPendingTransactions` to return empty list
      TxAgreementMock.mockGetChainPendingTransactions([]);

      // mock DiscordNotification
      DiscordNotificationMock.mockSendMessage();

      // run test
      await EventProcessor.processPaymentEvent(mockedEvent);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).to.deep.contain([
        EventSerializer.getId(mockedEvent),
        EventStatus.paymentWaiting,
      ]);

      // DiscordNotification `sendMessage` should got called
      expect(
        DiscordNotificationMock.getMockedFunction('sendMessage')
      ).toHaveBeenCalledOnce();
    });
  });

  describe('processRewardEvent', () => {
    const ergoRwt = 'ergoRwt';

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
      TxAgreementMock.resetMock();
      TxAgreementMock.mock();
      DiscordNotificationMock.resetMock();
    });

    /**
     * @target EventProcessor.processRewardEvent should create event reward
     * distribution transaction on Ergo and send it to agreement process successfully
     * @dependencies
     * - database
     * - MinimumFee
     * - ChainHandler
     * - EventOrder
     * - EventBoxes
     * @scenario
     * - mock feeConfig
     * - mock ChainHandler `fromChain` and `getErgoChain`
     *   - mock `getGuardsConfigBox`
     *   - mock `getBoxWID`
     *   - mock `generateTransaction`
     *   - mock `getRWTToken` of Ergo
     *   - mock `getBoxRWT` of Ergo
     * - mock event box and valid commitments
     * - mock event payment and reward order generations
     * - mock txAgreement
     *   - mock `getChainPendingTransactions` to return empty list
     *   - mock `addTransactionToQueue`
     * - run test
     * - check if function got called
     * @expected
     * - `addTransactionToQueue` should got called
     */
    it('should create event reward distribution transaction on Ergo and send it to agreement process successfully', async () => {
      // mock feeConfig
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      mockGetEventFeeConfig(fee);

      const mockedEvent: EventTrigger = mockEventTrigger();

      // mock ChainHandler `fromChain` and `getErgoChain`
      // mock `getGuardsConfigBox`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        'serialized-guard-box',
        true
      );
      // mock `getBoxWID`
      ChainHandlerMock.mockErgoFunctionReturnValue('getBoxWID', 'wid', true);
      // mock `generateTransaction`
      const paymentTx = ErgoTransaction.fromJson(
        JSON.stringify({
          network: 'network',
          txId: 'txId',
          eventId: 'eventId',
          txBytes: Buffer.from('txBytes'),
          txType: 'txType',
          inputBoxes: [],
          dataInputs: [],
        })
      );
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'generateTransaction',
        paymentTx,
        true
      );
      // mock `getRWTToken` of Ergo
      ChainHandlerMock.mockFromChainFunction('getRWTToken', ergoRwt);
      // mock `getBoxRWT` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getBoxRWT',
        2n * BigInt(mockedEvent.WIDs.length)
      );

      // mock event box and valid commitments
      mockGetEventBox('serialized-event-box');
      mockGetEventValidCommitments([]);

      // mock event payment and reward order generations
      mockEventSinglePayment({
        address: mockedEvent.toAddress,
        assets: {
          nativeToken: 0n,
          tokens: [],
        },
      });
      mockEventRewardOrder([]);

      // mock txAgreement pending transactions
      TxAgreementMock.mockGetChainPendingTransactions([]);
      TxAgreementMock.mockAddTransactionToQueue();

      // run test
      await EventProcessor.processRewardEvent(mockedEvent);

      // `addTransactionToQueue` should got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue')
      ).toHaveBeenCalledOnce();
    });

    /**
     * @target EventProcessor.processRewardEvent should set event as waiting
     * when there is not enough assets in lock address to create reward distribution
     * @dependencies
     * - database
     * - MinimumFee
     * - ChainHandler
     * - EventOrder
     * - EventBoxes
     * - DiscordNotification
     * @scenario
     * - mock feeConfig
     * - insert a mocked event into db
     * - mock ChainHandler `fromChain` and `getErgoChain`
     *   - mock `getGuardsConfigBox`
     *   - mock `getBoxWID`
     *   - mock `generateTransaction` to throw NotEnoughAssetsError
     *   - mock `getRWTToken` of Ergo
     *   - mock `getBoxRWT` of Ergo
     * - mock event box and valid commitments
     * - mock event payment and reward order generations
     * - mock txAgreement `getChainPendingTransactions` to return empty list
     * - mock DiscordNotification
     * - run test
     * - check status of event in db
     * - check if function got called
     * @expected
     * - event status should be updated in db
     * - DiscordNotification `sendMessage` should got called
     */
    it('should set event as waiting when there is not enough assets in lock address to create reward distribution', async () => {
      // mock feeConfig
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      mockGetEventFeeConfig(fee);

      // insert a mocked event into db
      const mockedEvent: EventTrigger = mockEventTrigger();
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingReward
      );

      // mock ChainHandler `fromChain` and `getErgoChain`
      // mock `getGuardsConfigBox`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        'serialized-guard-box',
        true
      );
      // mock `getBoxWID`
      ChainHandlerMock.mockErgoFunctionReturnValue('getBoxWID', 'wid', true);
      // mock `generateTransaction`
      const paymentTx = ErgoTransaction.fromJson(
        JSON.stringify({
          network: 'network',
          txId: 'txId',
          eventId: 'eventId',
          txBytes: Buffer.from('txBytes'),
          txType: 'txType',
          inputBoxes: [],
          dataInputs: [],
        })
      );
      ChainHandlerMock.mockErgoFunctionToThrow(
        'generateTransaction',
        new NotEnoughAssetsError(`test version of NotEnoughAssetsError`),
        true
      );
      // mock `getRWTToken` of Ergo
      ChainHandlerMock.mockFromChainFunction('getRWTToken', ergoRwt);
      // mock `getBoxRWT` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getBoxRWT',
        2n * BigInt(mockedEvent.WIDs.length)
      );

      // mock event box and valid commitments
      mockGetEventBox('serialized-event-box');
      mockGetEventValidCommitments([]);

      // mock event payment and reward order generations
      mockEventSinglePayment({
        address: mockedEvent.toAddress,
        assets: {
          nativeToken: 0n,
          tokens: [],
        },
      });
      mockEventRewardOrder([]);

      // mock txAgreement `getChainPendingTransactions` to return empty list
      TxAgreementMock.mockGetChainPendingTransactions([]);

      // mock DiscordNotification
      DiscordNotificationMock.mockSendMessage();

      // run test
      await EventProcessor.processRewardEvent(mockedEvent);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).to.deep.contain([
        EventSerializer.getId(mockedEvent),
        EventStatus.rewardWaiting,
      ]);

      // DiscordNotification `sendMessage` should got called
      expect(
        DiscordNotificationMock.getMockedFunction('sendMessage')
      ).toHaveBeenCalledOnce();
    });
  });

  describe('TimeoutLeftoverEvents', () => {
    const currentTimeStamp = 1658005354291000;

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventProcessor.TimeoutLeftoverEvents should mark only pending-payment
     * events as timeout if enough seconds passed from firstTry
     * @dependencies
     * - database
     * @scenario
     * - mock Date to return testing currentTimeStamp
     * - mock four events and insert into db (different in firstTry column and type (payment, reward))
     * - run test
     * - check status of events in db
     * - reset mocked Date
     * @expected
     * - status of two events should be updated in db
     */
    it('should mark only pending-payment events as timeout if enough seconds passed from firstTry', async () => {
      // mock Date to return testing currentTimeStamp
      const dateSpy = vi.spyOn(Date, 'now');
      dateSpy.mockReturnValue(currentTimeStamp);

      // mock four events and insert into db (different in firstTry column and type (payment, reward))
      const firstTry1 =
        Math.round(currentTimeStamp / 1000) - Configs.eventTimeout - 100;
      const mockedEvent1: EventTrigger = mockEventTrigger();
      const firstTry2 =
        Math.round(currentTimeStamp / 1000) - Configs.eventTimeout + 100;
      const mockedEvent2: EventTrigger = mockEventTrigger();
      const firstTry3 =
        Math.round(currentTimeStamp / 1000) - Configs.eventTimeout + 100;
      const mockedEvent3: EventTrigger = mockEventTrigger();
      const firstTry4 =
        Math.round(currentTimeStamp / 1000) - Configs.eventTimeout - 100;
      const mockedEvent4: EventTrigger = mockEventTrigger();
      await DatabaseActionMock.insertEventRecord(
        mockedEvent1,
        EventStatus.pendingReward,
        'boxSerialized',
        200,
        String(firstTry1)
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent2,
        EventStatus.pendingPayment,
        'boxSerialized',
        200,
        String(firstTry2)
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent3,
        EventStatus.pendingReward,
        'boxSerialized',
        200,
        String(firstTry3)
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent4,
        EventStatus.pendingPayment,
        'boxSerialized',
        200,
        String(firstTry4)
      );

      // run test
      await EventProcessor.TimeoutLeftoverEvents();

      // status of two events should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(4);
      expect(dbEvents).to.deep.contain([
        EventSerializer.getId(mockedEvent1),
        EventStatus.pendingReward,
      ]);
      expect(dbEvents).to.deep.contain([
        EventSerializer.getId(mockedEvent2),
        EventStatus.pendingPayment,
      ]);
      expect(dbEvents).to.deep.contain([
        EventSerializer.getId(mockedEvent3),
        EventStatus.pendingReward,
      ]);
      expect(dbEvents).to.deep.contain([
        EventSerializer.getId(mockedEvent4),
        EventStatus.timeout,
      ]);

      // reset mocked Date
      dateSpy.mockRestore();
    });
  });

  describe('RequeueWaitingEvents', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventProcessor.RequeueWaitingEvents should mark timeout events as pending
     * @dependencies
     * - database
     * @scenario
     * - mock two events and insert into db with status waiting (different in type (payment, reward))
     * - run test
     * - check status of events in db
     * @expected
     * - status of two events should be updated in db
     */
    it('should mark timeout events as pending', async () => {
      // mock events
      const mockedEvent1: EventTrigger = mockEventTrigger();
      const mockedEvent2: EventTrigger = mockEventTrigger();
      await DatabaseActionMock.insertEventRecord(
        mockedEvent1,
        EventStatus.rewardWaiting
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent2,
        EventStatus.paymentWaiting
      );

      // run test
      await EventProcessor.RequeueWaitingEvents();

      // status of two events should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(2);
      expect(dbEvents).to.deep.contain([
        EventSerializer.getId(mockedEvent1),
        EventStatus.pendingReward,
      ]);
      expect(dbEvents).to.deep.contain([
        EventSerializer.getId(mockedEvent2),
        EventStatus.pendingPayment,
      ]);
    });
  });
});
