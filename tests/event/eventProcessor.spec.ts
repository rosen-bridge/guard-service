import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import EventProcessor from '../../src/event/eventProcessor';
import {
  feeRatioDivisor,
  mockEventTrigger,
  mockToErgoEventTrigger,
  rsnRatioDivisor,
} from './testData';
import {
  mockIsEventConfirmedEnough,
  mockVerifyEvent,
} from '../verification/mocked/eventVerifier.mock';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import {
  EventTrigger,
  NotEnoughAssetsError,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import Configs from '../../src/configs/configs';
import EventSerializer from '../../src/event/eventSerializer';
import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { mockGetEventFeeConfig } from './mocked/minimumFee.mock';
import ChainHandlerMock from '../handlers/chainHandler.mock';
import {
  mockGetEventBox,
  mockGetEventValidCommitments,
  mockGetEventWIDs,
} from './mocked/eventBoxes.mock';
import {
  mockEventRewardOrder,
  mockEventSinglePayment,
} from './mocked/eventOrder.mock';
import TxAgreementMock from '../agreement/mocked/txAgreement.mock';
import { ErgoTransaction } from '@rosen-chains/ergo';
import { mockGuardTurn } from '../utils/mocked/guardTurn.mock';
import TestConfigs from '../testUtils/testConfigs';
import { mockPaymentTransaction } from 'tests/agreement/testData';
import NotificationHandlerMock from '../handlers/notificationHandler.mock';

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
      const mockedEvent = mockEventTrigger().event;
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized,
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
      const mockedEvent = mockEventTrigger().event;
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized,
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
      const mockedEvent = mockEventTrigger().event;
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized,
      );
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized,
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
     * - GuardTurn
     * @scenario
     * - mock a pending payment event and insert into db
     * - mock `processPaymentEvent`
     * - mock GuardTurn to return guard index
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
      const mockedEvent: EventTrigger = mockEventTrigger().event;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
        'boxSerialized',
        300,
        '0',
        200,
        250,
      );

      // mock `processPaymentEvent`
      const mockedProcessor = vi.fn();
      const processPaymentEventSpy = vi.spyOn(
        EventProcessor,
        'processPaymentEvent',
      );
      processPaymentEventSpy.mockImplementation(mockedProcessor);

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await EventProcessor.processConfirmedEvents();

      // processor should NOT got called
      expect(mockedProcessor).not.toHaveBeenCalled();

      // event status should be updated to spent
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents).toContain([
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
     * - GuardTurn
     * @scenario
     * - mock a pending payment event and insert into db
     * - mock `processPaymentEvent`
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * - reset mocked function
     * @expected
     * - `processPaymentEvent` should got called
     */
    it('should send event to payment processor when event is pending payment', async () => {
      // mock a pending payment event and insert into db
      const mockedEvent: EventTrigger = mockEventTrigger().event;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock `processPaymentEvent`
      const mockedProcessor = vi.fn();
      const processPaymentEventSpy = vi.spyOn(
        EventProcessor,
        'processPaymentEvent',
      );
      processPaymentEventSpy.mockImplementation(mockedProcessor);

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

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
     * - GuardTurn
     * @scenario
     * - mock a pending reward event and insert into db
     * - mock `processRewardEvent`
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * - reset mocked function
     * @expected
     * - `processRewardEvent` should got called
     */
    it('should send event to reward processor when event is pending reward distribution', async () => {
      // mock a pending reward event and insert into db
      const mockedEvent: EventTrigger = mockEventTrigger().event;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingReward,
      );

      // mock `processRewardEvent`
      const mockedProcessor = vi.fn();
      const processRewardEventSpy = vi.spyOn(
        EventProcessor,
        'processRewardEvent',
      );
      processRewardEventSpy.mockImplementation(mockedProcessor);

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await EventProcessor.processConfirmedEvents();

      // `processRewardEvent` should got called
      expect(mockedProcessor).toHaveBeenCalledOnce();

      // reset mocked function
      processRewardEventSpy.mockRestore();
    });

    /**
     * @target EventProcessor.processConfirmedEvents should do nothing
     * when turn is over
     * @dependencies
     * - database
     * - EventProcessor
     * - GuardTurn
     * @scenario
     * - mock a pending payment event and insert into db
     * - mock `processPaymentEvent`
     * - mock GuardTurn to return guard index + 1
     * - run test
     * - check if function got called
     * - reset mocked function
     * @expected
     * - `processPaymentEvent` should NOT got called
     */
    it('should do nothing when turn is over', async () => {
      // mock a pending payment event and insert into db
      const mockedEvent: EventTrigger = mockEventTrigger().event;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock `processPaymentEvent`
      const mockedProcessor = vi.fn();
      const processPaymentEventSpy = vi.spyOn(
        EventProcessor,
        'processPaymentEvent',
      );
      processPaymentEventSpy.mockImplementation(mockedProcessor);

      // mock GuardTurn to return guard index + 1
      mockGuardTurn(TestConfigs.guardIndex + 1);

      // run test
      await EventProcessor.processConfirmedEvents();

      // `processPaymentEvent` should NOT got called
      expect(mockedProcessor).not.toHaveBeenCalled();

      // reset mocked function
      processPaymentEventSpy.mockRestore();
    });

    /**
     * @target EventProcessor.processConfirmedEvents should update event status
     * to reached-limit when too much txs of the event are failed
     * @dependencies
     * - database
     * - EventProcessor
     * - GuardTurn
     * @scenario
     * - mock a pending payment event and insert into db
     * - mock `processPaymentEvent`
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * - check status of events in db
     * - reset mocked function
     * @expected
     * - `processPaymentEvent` should NOT got called
     * - event status should be updated to reached-limit
     */
    it('should update event status to reached-limit when too much txs of the event are failed', async () => {
      // mock a pending payment event and insert into db
      const mockedEvent: EventTrigger = mockEventTrigger().event;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        5,
      );

      // mock `processPaymentEvent`
      const mockedProcessor = vi.fn();
      const processPaymentEventSpy = vi.spyOn(
        EventProcessor,
        'processPaymentEvent',
      );
      processPaymentEventSpy.mockImplementation(mockedProcessor);

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await EventProcessor.processConfirmedEvents();

      // `processPaymentEvent` should got called
      expect(mockedProcessor).not.toHaveBeenCalled();

      // event status should be updated to reached-limit
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents).toContain([
        EventSerializer.getId(mockedEvent),
        EventStatus.reachedLimit,
      ]);

      // reset mocked function
      processPaymentEventSpy.mockRestore();
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
      NotificationHandlerMock.resetMock();
      NotificationHandlerMock.mock();
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
     * - GuardTurn
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
     *   - mock `getSerializedBoxInfo` of Ergo
     * - mock event box and commitments
     * - mock event payment and reward order generations
     * - mock txAgreement
     *   - mock `getChainPendingTransactions` to return empty list
     *   - mock `addTransactionToQueue`
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `addTransactionToQueue` should got called
     */
    it('should create event payment transaction on Ergo and send it to agreement process successfully', async () => {
      // mock feeConfig
      const fee: ChainMinimumFee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
        rsnRatioDivisor,
        feeRatioDivisor,
      };
      mockGetEventFeeConfig(fee);

      // mock event as verified
      const { event: mockedEvent, WIDs: eventWIDs } = mockToErgoEventTrigger();
      mockVerifyEvent(true);

      // mock ChainHandler `getChain` and `getErgoChain`
      const fromChain = mockedEvent.fromChain;
      ChainHandlerMock.mockChainName(fromChain);
      // mock `getMinimumNativeToken`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getMinimumNativeToken',
        100n,
        false,
      );
      // mock `getGuardsConfigBox`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        'serialized-guard-box',
        true,
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
        }),
      );
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'generateTransaction',
        paymentTx,
        true,
      );
      // mock `getRWTToken` of `fromChain`
      ChainHandlerMock.mockChainFunction(
        fromChain,
        'getRWTToken',
        fromChainRwt,
      );
      // mock `getBoxRWT` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getBoxRWT',
        2n * BigInt(mockedEvent.WIDsCount),
      );
      // mock `getSerializedBoxInfo` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue('getSerializedBoxInfo', {
        assets: {
          nativeToken: 100000n,
        },
      });

      // mock event box and commitments
      mockGetEventBox('serialized-event-box');
      mockGetEventValidCommitments(['serialized-commitment-box']);
      mockGetEventWIDs(eventWIDs);

      // mock event payment and reward order generations
      mockEventSinglePayment({
        address: mockedEvent.toAddress,
        assets: {
          nativeToken: 0n,
          tokens: [],
        },
      });
      mockEventRewardOrder([], []);

      // mock txAgreement pending transactions
      TxAgreementMock.mockGetChainPendingTransactions([]);
      TxAgreementMock.mockAddTransactionToQueue();

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await EventProcessor.processPaymentEvent(mockedEvent);

      // `addTransactionToQueue` should got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue'),
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
     * - GuardTurn
     * @scenario
     * - mock feeConfig
     * - mock event as verified
     * - mock ChainHandler `getChain`
     *   - mock `getMinimumNativeToken`
     *   - mock `generateTransaction`
     *   - mock `getRWTToken` of Ergo
     *   - mock `getBoxRWT` of Ergo
     *   - mock `getSerializedBoxInfo` of Ergo
     * - mock event payment order generations
     * - mock txAgreement
     *   - mock `getChainPendingTransactions` to return empty list
     *   - mock `addTransactionToQueue`
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `addTransactionToQueue` should got called
     */
    it('should create event payment transaction on `toChain` and send it to agreement process successfully', async () => {
      // mock feeConfig
      const fee: ChainMinimumFee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
        rsnRatioDivisor,
        feeRatioDivisor,
      };
      mockGetEventFeeConfig(fee);

      // mock event as verified
      const { event: mockedEvent } = mockEventTrigger();
      mockVerifyEvent(true);

      // mock ChainHandler `getChain`
      const toChain = mockedEvent.toChain;
      ChainHandlerMock.mockChainName(toChain);
      // mock `getMinimumNativeToken`
      ChainHandlerMock.mockChainFunction(
        toChain,
        'getMinimumNativeToken',
        100n,
        false,
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
        }),
      );
      ChainHandlerMock.mockChainFunction(
        toChain,
        'generateTransaction',
        paymentTx,
        true,
      );
      // mock `getRWTToken` of `Ergo`
      ChainHandlerMock.mockErgoFunctionReturnValue('getRWTToken', ergoRwt);
      // mock `getBoxRWT` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getBoxRWT',
        2n * BigInt(mockedEvent.WIDsCount),
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

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await EventProcessor.processPaymentEvent(mockedEvent);

      // `addTransactionToQueue` should got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue'),
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
      const fee: ChainMinimumFee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
        rsnRatioDivisor,
        feeRatioDivisor,
      };
      mockGetEventFeeConfig(fee);

      // insert a mocked event into db
      const { event: mockedEvent } = mockEventTrigger();
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock event as unverified
      mockVerifyEvent(false);

      // run test
      await EventProcessor.processPaymentEvent(mockedEvent);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).toContain([
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
     * - Notification
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
     *   - mock `getSerializedBoxInfo` of Ergo
     * - mock event box and commitments
     * - mock event payment and reward order generations
     * - mock txAgreement `getChainPendingTransactions` to return empty list
     * - mock Notification
     * - run test
     * - check status of event in db
     * - check if function got called
     * @expected
     * - event status should be updated in db
     * - Notification `notify` should got called
     */
    it('should set event as waiting when there is not enough assets in lock address to create payment', async () => {
      // mock feeConfig
      const fee: ChainMinimumFee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
        rsnRatioDivisor,
        feeRatioDivisor,
      };
      mockGetEventFeeConfig(fee);

      // insert a mocked event into db
      const { event: mockedEvent, WIDs: eventWIDs } = mockToErgoEventTrigger();
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock event as verified
      mockVerifyEvent(true);

      // mock ChainHandler `getChain` and `getErgoChain`
      const fromChain = mockedEvent.fromChain;
      ChainHandlerMock.mockChainName(fromChain);
      // mock `getMinimumNativeToken`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getMinimumNativeToken',
        100n,
        false,
      );
      // mock `getGuardsConfigBox`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        'serialized-guard-box',
        true,
      );
      // mock `getBoxWID`
      ChainHandlerMock.mockErgoFunctionReturnValue('getBoxWID', 'wid', true);
      // mock `generateTransaction`
      ChainHandlerMock.mockErgoFunctionToThrow(
        'generateTransaction',
        new NotEnoughAssetsError(`test version of NotEnoughAssetsError`),
        true,
      );
      // mock `getRWTToken` of `fromChain`
      ChainHandlerMock.mockChainFunction(
        fromChain,
        'getRWTToken',
        fromChainRwt,
      );
      // mock `getBoxRWT` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getBoxRWT',
        2n * BigInt(mockedEvent.WIDsCount),
      );
      // mock `getSerializedBoxInfo` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue('getSerializedBoxInfo', {
        assets: {
          nativeToken: 100000n,
        },
      });

      // mock event box and commitments
      mockGetEventBox('serialized-event-box');
      mockGetEventValidCommitments([]);
      mockGetEventWIDs(eventWIDs);

      // mock event payment and reward order generations
      mockEventSinglePayment({
        address: mockedEvent.toAddress,
        assets: {
          nativeToken: 0n,
          tokens: [],
        },
      });
      mockEventRewardOrder([], []);

      // mock txAgreement `getChainPendingTransactions` to return empty list
      TxAgreementMock.mockGetChainPendingTransactions([]);

      // mock Notification
      NotificationHandlerMock.mockNotify();

      // run test
      await EventProcessor.processPaymentEvent(mockedEvent);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).toContain([
        EventSerializer.getId(mockedEvent),
        EventStatus.paymentWaiting,
      ]);

      // Notification `notify` should got called
      expect(
        NotificationHandlerMock.getNotificationHandlerMockedFunction('notify'),
      ).toHaveBeenCalledOnce();
    });

    /**
     * @target EventProcessor.processPaymentEvent should create event payment
     * transaction on Ergo but does not send it to agreement process when turn is over
     * @dependencies
     * - database
     * - MinimumFee
     * - EventVerifier
     * - ChainHandler
     * - EventOrder
     * - EventBoxes
     * - GuardTurn
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
     *   - mock `getSerializedBoxInfo` of Ergo
     * - mock event box and commitments
     * - mock event payment and reward order generations
     * - mock txAgreement
     *   - mock `getChainPendingTransactions` to return empty list
     *   - mock `addTransactionToQueue`
     * - mock GuardTurn to return guard index + 1
     * - run test
     * - check if function got called
     * @expected
     * - `addTransactionToQueue` should NOT got called
     */
    it('should create event payment transaction on Ergo but does not send it to agreement process when turn is over', async () => {
      // mock feeConfig
      const fee: ChainMinimumFee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
        rsnRatioDivisor,
        feeRatioDivisor,
      };
      mockGetEventFeeConfig(fee);

      // mock event as verified
      const { event: mockedEvent, WIDs: eventWIDs } = mockToErgoEventTrigger();
      mockVerifyEvent(true);

      // mock ChainHandler `getChain` and `getErgoChain`
      const fromChain = mockedEvent.fromChain;
      ChainHandlerMock.mockChainName(fromChain);
      // mock `getMinimumNativeToken`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getMinimumNativeToken',
        100n,
        false,
      );
      // mock `getGuardsConfigBox`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        'serialized-guard-box',
        true,
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
        }),
      );
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'generateTransaction',
        paymentTx,
        true,
      );
      // mock `getRWTToken` of `fromChain`
      ChainHandlerMock.mockChainFunction(
        fromChain,
        'getRWTToken',
        fromChainRwt,
      );
      // mock `getBoxRWT` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getBoxRWT',
        2n * BigInt(mockedEvent.WIDsCount),
      );
      // mock `getSerializedBoxInfo` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue('getSerializedBoxInfo', {
        assets: {
          nativeToken: 100000n,
        },
      });

      // mock event box and commitments
      mockGetEventBox('serialized-event-box');
      mockGetEventValidCommitments(['serialized-commitment-box']);
      mockGetEventWIDs(eventWIDs);

      // mock event payment and reward order generations
      mockEventSinglePayment({
        address: mockedEvent.toAddress,
        assets: {
          nativeToken: 0n,
          tokens: [],
        },
      });
      mockEventRewardOrder([], []);

      // mock txAgreement pending transactions
      TxAgreementMock.mockGetChainPendingTransactions([]);
      TxAgreementMock.mockAddTransactionToQueue();

      // mock GuardTurn to return guard index + 1
      mockGuardTurn(TestConfigs.guardIndex + 1);

      // run test
      await EventProcessor.processPaymentEvent(mockedEvent);

      // `addTransactionToQueue` should NOT got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue'),
      ).not.toHaveBeenCalled();
    });
  });

  describe('processRewardEvent', () => {
    const ergoRwt = 'ergoRwt';

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
      TxAgreementMock.resetMock();
      TxAgreementMock.mock();
      NotificationHandlerMock.resetMock();
      NotificationHandlerMock.mock();
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
     * - GuardTurn
     * @scenario
     * - mock feeConfig
     * - mock event and a payment transaction for it
     * - insert mocked event and transaction into db
     * - mock ChainHandler `fromChain` and `getErgoChain`
     *   - mock `getGuardsConfigBox`
     *   - mock `getBoxWID`
     *   - mock `generateTransaction`
     *   - mock `getRWTToken` of Ergo
     *   - mock `getBoxRWT` of Ergo
     *   - mock `getSerializedBoxInfo` of Ergo
     *   - mock `getActualTxId`
     * - mock event box and commitments
     * - mock event payment and reward order generations
     * - mock txAgreement
     *   - mock `getChainPendingTransactions` to return empty list
     *   - mock `addTransactionToQueue`
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `addTransactionToQueue` should got called
     */
    it('should create event reward distribution transaction on Ergo and send it to agreement process successfully', async () => {
      // mock feeConfig
      const fee: ChainMinimumFee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
        rsnRatioDivisor,
        feeRatioDivisor,
      };
      mockGetEventFeeConfig(fee);

      // mock event and insert a mocked payment transaction for it into database
      const { event: mockedEvent, WIDs: eventWIDs } = mockEventTrigger();
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent),
      );

      // insert mocked event and transaction into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingReward,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx,
        TransactionStatus.completed,
      );

      // mock ChainHandler `fromChain` and `getErgoChain`
      const fromChain = mockedEvent.fromChain;
      ChainHandlerMock.mockChainName(fromChain);
      // mock `getGuardsConfigBox`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        'serialized-guard-box',
        true,
      );
      // mock `getBoxWID`
      ChainHandlerMock.mockErgoFunctionReturnValue('getBoxWID', 'wid', true);
      // mock `generateTransaction`
      const rewardTx = ErgoTransaction.fromJson(
        JSON.stringify({
          network: 'network',
          txId: 'txId',
          eventId: 'eventId',
          txBytes: Buffer.from('txBytes'),
          txType: 'txType',
          inputBoxes: [],
          dataInputs: [],
        }),
      );
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'generateTransaction',
        rewardTx,
        true,
      );
      // mock `getRWTToken` of Ergo
      ChainHandlerMock.mockChainFunction(fromChain, 'getRWTToken', ergoRwt);
      // mock `getBoxRWT` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getBoxRWT',
        2n * BigInt(mockedEvent.WIDsCount),
      );
      // mock `getSerializedBoxInfo` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue('getSerializedBoxInfo', {
        assets: {
          nativeToken: 100000n,
        },
      });

      // mock event box and commitments
      mockGetEventBox('serialized-event-box');
      mockGetEventValidCommitments(['serialized-commitment-box']);
      mockGetEventWIDs(eventWIDs);

      // mock event payment and reward order generations
      mockEventSinglePayment({
        address: mockedEvent.toAddress,
        assets: {
          nativeToken: 0n,
          tokens: [],
        },
      });
      mockEventRewardOrder([], []);

      // mock txAgreement pending transactions
      TxAgreementMock.mockGetChainPendingTransactions([]);
      TxAgreementMock.mockAddTransactionToQueue();

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      ChainHandlerMock.mockChainName(mockedEvent.toChain);
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'getActualTxId',
        paymentTx.txId,
      );

      // run test
      await EventProcessor.processRewardEvent(mockedEvent);

      // `addTransactionToQueue` should got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue'),
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
     * - Notification
     * - GuardTurn
     * @scenario
     * - mock feeConfig
     * - mock event and insert a mocked payment transaction for it into database
     * - mock ChainHandler `fromChain` and `getErgoChain`
     *   - mock `getGuardsConfigBox`
     *   - mock `getBoxWID`
     *   - mock `generateTransaction` to throw NotEnoughAssetsError
     *   - mock `getRWTToken` of Ergo
     *   - mock `getBoxRWT` of Ergo
     *   - mock `getSerializedBoxInfo` of Ergo
     *   - mock `getActualTxId`
     * - mock event box and commitments
     * - mock event payment and reward order generations
     * - mock txAgreement `getChainPendingTransactions` to return empty list
     * - mock Notification
     * - mock GuardTurn to return guard index
     * - run test
     * - check status of event in db
     * - check if function got called
     * @expected
     * - event status should be updated in db
     * - Notification `notify` should got called
     */
    it('should set event as waiting when there is not enough assets in lock address to create reward distribution', async () => {
      // mock feeConfig
      const fee: ChainMinimumFee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
        rsnRatioDivisor,
        feeRatioDivisor,
      };
      mockGetEventFeeConfig(fee);

      // mock event and insert a mocked payment transaction for it into database
      const { event: mockedEvent, WIDs: eventWIDs } = mockEventTrigger();
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent),
      );

      // insert mocked event and transaction into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingReward,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx,
        TransactionStatus.completed,
      );

      // mock ChainHandler `fromChain` and `getErgoChain`
      const fromChain = mockedEvent.fromChain;
      ChainHandlerMock.mockChainName(fromChain);
      // mock `getGuardsConfigBox`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        'serialized-guard-box',
        true,
      );
      // mock `getBoxWID`
      ChainHandlerMock.mockErgoFunctionReturnValue('getBoxWID', 'wid', true);
      // mock `generateTransaction`
      ChainHandlerMock.mockErgoFunctionToThrow(
        'generateTransaction',
        new NotEnoughAssetsError(`test version of NotEnoughAssetsError`),
        true,
      );
      // mock `getRWTToken` of Ergo
      ChainHandlerMock.mockChainFunction(fromChain, 'getRWTToken', ergoRwt);
      // mock `getBoxRWT` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getBoxRWT',
        2n * BigInt(mockedEvent.WIDsCount),
      );
      // mock `getSerializedBoxInfo` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue('getSerializedBoxInfo', {
        assets: {
          nativeToken: 100000n,
        },
      });

      // mock event box and commitments
      mockGetEventBox('serialized-event-box');
      mockGetEventValidCommitments([]);
      mockGetEventWIDs(eventWIDs);

      // mock event payment and reward order generations
      mockEventSinglePayment({
        address: mockedEvent.toAddress,
        assets: {
          nativeToken: 0n,
          tokens: [],
        },
      });
      mockEventRewardOrder([], []);

      // mock txAgreement `getChainPendingTransactions` to return empty list
      TxAgreementMock.mockGetChainPendingTransactions([]);

      // mock Notification
      NotificationHandlerMock.mockNotify();

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      ChainHandlerMock.mockChainName(mockedEvent.toChain);
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'getActualTxId',
        paymentTx.txId,
      );

      // run test
      await EventProcessor.processRewardEvent(mockedEvent);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).toContain([
        EventSerializer.getId(mockedEvent),
        EventStatus.rewardWaiting,
      ]);

      // Notification `notify` should got called
      expect(
        NotificationHandlerMock.getNotificationHandlerMockedFunction('notify'),
      ).toHaveBeenCalledOnce();
    });

    /**
     * @target EventProcessor.processRewardEvent should create event reward
     * distribution transaction on Ergo but does not send it to agreement process
     * when turn is over
     * @dependencies
     * - database
     * - MinimumFee
     * - ChainHandler
     * - EventOrder
     * - EventBoxes
     * - GuardTurn
     * @scenario
     * - mock feeConfig
     * - mock event and insert a mocked payment transaction for it into database
     * - mock ChainHandler `fromChain` and `getErgoChain`
     *   - mock `getGuardsConfigBox`
     *   - mock `getBoxWID`
     *   - mock `generateTransaction`
     *   - mock `getRWTToken` of Ergo
     *   - mock `getBoxRWT` of Ergo
     *   - mock `getSerializedBoxInfo` of Ergo
     *   - mock `getActualTxId`
     * - mock event box and commitments
     * - mock event payment and reward order generations
     * - mock txAgreement
     *   - mock `getChainPendingTransactions` to return empty list
     *   - mock `addTransactionToQueue`
     * - mock GuardTurn to return guard index + 1
     * - run test
     * - check if function got called
     * @expected
     * - `addTransactionToQueue` should NOT got called
     */
    it('should create event reward distribution transaction on Ergo but does not send it to agreement process when turn is over', async () => {
      // mock feeConfig
      const fee: ChainMinimumFee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
        rsnRatioDivisor,
        feeRatioDivisor,
      };
      mockGetEventFeeConfig(fee);

      // mock event and insert a mocked payment transaction for it into database
      const { event: mockedEvent, WIDs: eventWIDs } = mockEventTrigger();
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent),
      );

      // insert mocked event and transaction into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingReward,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx,
        TransactionStatus.completed,
      );

      // mock ChainHandler `fromChain` and `getErgoChain`
      const fromChain = mockedEvent.fromChain;
      ChainHandlerMock.mockChainName(fromChain);
      // mock `getGuardsConfigBox`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        'serialized-guard-box',
        true,
      );
      // mock `getBoxWID`
      ChainHandlerMock.mockErgoFunctionReturnValue('getBoxWID', 'wid', true);
      // mock `generateTransaction`
      const rewardTx = ErgoTransaction.fromJson(
        JSON.stringify({
          network: 'network',
          txId: 'txId',
          eventId: 'eventId',
          txBytes: Buffer.from('txBytes'),
          txType: 'txType',
          inputBoxes: [],
          dataInputs: [],
        }),
      );
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'generateTransaction',
        rewardTx,
        true,
      );
      // mock `getRWTToken` of Ergo
      ChainHandlerMock.mockChainFunction(fromChain, 'getRWTToken', ergoRwt);
      // mock `getBoxRWT` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getBoxRWT',
        2n * BigInt(mockedEvent.WIDsCount),
      );
      // mock `getSerializedBoxInfo` of Ergo
      ChainHandlerMock.mockErgoFunctionReturnValue('getSerializedBoxInfo', {
        assets: {
          nativeToken: 100000n,
        },
      });

      ChainHandlerMock.mockChainName(mockedEvent.toChain);
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'getActualTxId',
        paymentTx.txId,
      );

      // mock event box and commitments
      mockGetEventBox('serialized-event-box');
      mockGetEventValidCommitments(['serialized-commitment-box']);
      mockGetEventWIDs(eventWIDs);

      // mock event payment and reward order generations
      mockEventSinglePayment({
        address: mockedEvent.toAddress,
        assets: {
          nativeToken: 0n,
          tokens: [],
        },
      });
      mockEventRewardOrder([], []);

      // mock txAgreement pending transactions
      TxAgreementMock.mockGetChainPendingTransactions([]);
      TxAgreementMock.mockAddTransactionToQueue();

      // mock GuardTurn to return guard index + 1
      mockGuardTurn(TestConfigs.guardIndex + 1);

      // run test
      await EventProcessor.processRewardEvent(mockedEvent);

      // `addTransactionToQueue` should NOT got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue'),
      ).not.toHaveBeenCalled();
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
      const mockedEvent1: EventTrigger = mockEventTrigger().event;
      const firstTry2 =
        Math.round(currentTimeStamp / 1000) - Configs.eventTimeout + 100;
      const mockedEvent2: EventTrigger = mockEventTrigger().event;
      const firstTry3 =
        Math.round(currentTimeStamp / 1000) - Configs.eventTimeout + 100;
      const mockedEvent3: EventTrigger = mockEventTrigger().event;
      const firstTry4 =
        Math.round(currentTimeStamp / 1000) - Configs.eventTimeout - 100;
      const mockedEvent4: EventTrigger = mockEventTrigger().event;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent1,
        EventStatus.pendingReward,
        'boxSerialized',
        200,
        String(firstTry1),
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent2,
        EventStatus.pendingPayment,
        'boxSerialized',
        200,
        String(firstTry2),
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent3,
        EventStatus.pendingReward,
        'boxSerialized',
        200,
        String(firstTry3),
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent4,
        EventStatus.pendingPayment,
        'boxSerialized',
        200,
        String(firstTry4),
      );

      // run test
      await EventProcessor.TimeoutLeftoverEvents();

      // status of two events should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(4);
      expect(dbEvents).toContain([
        EventSerializer.getId(mockedEvent1),
        EventStatus.pendingReward,
      ]);
      expect(dbEvents).toContain([
        EventSerializer.getId(mockedEvent2),
        EventStatus.pendingPayment,
      ]);
      expect(dbEvents).toContain([
        EventSerializer.getId(mockedEvent3),
        EventStatus.pendingReward,
      ]);
      expect(dbEvents).toContain([
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
     * @target EventProcessor.RequeueWaitingEvents should mark waiting events as pending
     * @dependencies
     * - database
     * @scenario
     * - mock two events and insert into db with status waiting (different in type (payment, reward))
     * - run test
     * - check status of events in db
     * @expected
     * - status of two events should be updated in db
     */
    it('should mark waiting events as pending', async () => {
      // mock events
      const mockedEvent1: EventTrigger = mockEventTrigger().event;
      const mockedEvent2: EventTrigger = mockEventTrigger().event;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent1,
        EventStatus.rewardWaiting,
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent2,
        EventStatus.paymentWaiting,
      );

      // run test
      await EventProcessor.RequeueWaitingEvents();

      // status of two events should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(2);
      expect(dbEvents).toContain([
        EventSerializer.getId(mockedEvent1),
        EventStatus.pendingReward,
      ]);
      expect(dbEvents).toContain([
        EventSerializer.getId(mockedEvent2),
        EventStatus.pendingPayment,
      ]);
    });
  });
});
