import { mockPaymentTransaction } from 'tests/agreement/testData';

import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { ChainMinimumFee as BchConsumers_ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { TokenMap as bchFee_TokenMap } from '@rosen-bridge/tokens';
import {
  EventTrigger,
  NotEnoughAssetsError,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import {
  AbstractChain as BchConsumers_AbstractChain,
  EventTrigger as BchConsumers_EventTrigger,
  PaymentTransaction as BchConsumers_PaymentTransaction,
  TransactionType as BchConsumers_TransactionType,
} from '@rosen-chains/abstract-chain';
import { ErgoTransaction } from '@rosen-chains/ergo';

import BchConsumers_TxAgreement from '../../src/agreement/txAgreement';
import Configs from '../../src/configs/configs';
import { DatabaseAction as bchGuardNamespace_DatabaseAction } from '../../src/db/databaseAction';
import { DatabaseAction as BchConsumers_DatabaseAction } from '../../src/db/databaseAction';
import { DatabaseAction as bchFee_DatabaseAction } from '../../src/db/databaseAction';
import BchConsumers_EventBoxes from '../../src/event/eventBoxes';
import BchConsumers_EventOrder from '../../src/event/eventOrder';
import EventProcessor from '../../src/event/eventProcessor';
import bchGuardNamespace_EventProcessor from '../../src/event/eventProcessor';
import BchConsumers_EventProcessor from '../../src/event/eventProcessor';
import bchFee_EventProcessor from '../../src/event/eventProcessor';
import EventSerializer from '../../src/event/eventSerializer';
import bchGuardNamespace_EventSerializer from '../../src/event/eventSerializer';
import BchConsumers_EventSerializer from '../../src/event/eventSerializer';
import bchFee_EventSerializer from '../../src/event/eventSerializer';
import BchConsumers_ChainHandler from '../../src/handlers/chainHandler';
import bchGuardNamespace_MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import bchFee_MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import { TokenHandler as bchFee_TokenHandler } from '../../src/handlers/tokenHandler';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import bchGuardNamespace_EventVerifier from '../../src/verification/eventVerifier';
import bchFee_EventVerifier from '../../src/verification/eventVerifier';
import TxAgreementMock from '../agreement/mocked/txAgreement.mock';
import {
  wrapped as bchFee_wrapped,
  event as bchFee_event,
  feeBox as bchFee_feeBox,
} from '../bitcoinCashFeeTestUtils';
import { bchTokenSet as bchFee_bchTokenSet } from '../configs/bitcoinCashFixtures';
import {
  insertNamespaceEvent as bchGuardNamespace_insertNamespaceEvent,
  namespaceEvent as bchGuardNamespace_namespaceEvent,
} from '../db/bitcoinCashNamespaceFixtures';
import { namespaceEvent as BchConsumers_namespaceEvent } from '../db/bitcoinCashNamespaceFixtures';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import bchGuardNamespace_DatabaseActionMock from '../db/mocked/databaseAction.mock';
import BchConsumers_DatabaseActionMock from '../db/mocked/databaseAction.mock';
import ChainHandlerMock from '../handlers/chainHandler.mock';
import { chainHandlerInstance as BchConsumers_chainHandlerInstance } from '../handlers/chainHandler.mock';
import NotificationHandlerMock from '../handlers/notificationHandler.mock';
import { preserveBitcoinCashMocks } from '../testUtils/mocked/bitcoinCashMockScope.mock';
import TestConfigs from '../testUtils/testConfigs';
import { mockGuardTurn } from '../utils/mocked/guardTurn.mock';
import {
  mockIsEventConfirmedEnough,
  mockVerifyEvent,
} from '../verification/mocked/eventVerifier.mock';
import {
  mockGetEventBox,
  mockGetEventValidCommitments,
  mockGetEventWIDs,
} from './mocked/eventBoxes.mock';
import {
  mockEventRewardOrder,
  mockEventSinglePayment,
} from './mocked/eventOrder.mock';
import { mockGetEventFeeConfig } from './mocked/minimumFee.mock';
import {
  feeRatioDivisor,
  mockEventTrigger,
  mockToErgoEventTrigger,
  rsnRatioDivisor,
} from './testData';

describe('EventProcessor', () => {
  describe('processScannedEvents', () => {
    const boxSerialized = 'box-serialized';

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventProcessor.processScannedEvents should insert event into ConfirmedEvent
     * table when it is confirmed and verified
     * @dependencies
     * - database
     * - MinimumFee
     * - EventVerifier
     * @scenario
     * - insert a mocked event into db
     * - mock feeConfig
     * - mock EventVerifier
     *   - to return confirmed
     *   - to return verified
     * - run test
     * - check events in db
     * @expected
     * - mocked event should be in ConfirmedEvent table
     * - event status should be pending-payment
     * - no event should be in RejectedEvent table
     */
    it('should insert event into ConfirmedEvent table when it is confirmed and verified', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger().event;
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized,
      );

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

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(true);

      // run test
      await EventProcessor.processScannedEvents();

      // check events in db
      const dbEvents = await DatabaseActionMock.allEventRecords();
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents[0].status).toEqual(EventStatus.pendingPayment);
      const rejectedEvents = await DatabaseActionMock.allRejectedEventRecords();
      expect(rejectedEvents.length).toEqual(0);
    });

    /**
     * @target EventProcessor.processScannedEvents should do nothing when
     * event is not confirmed enough
     * @dependencies
     * - database
     * - MinimumFee
     * - EventVerifier
     * @scenario
     * - insert a mocked event into db
     * - mock feeConfig
     * - mock EventVerifier
     *   - to return unconfirmed
     *   - to return verified
     * - run test
     * - check events in db
     * @expected
     * - no event should be in ConfirmedEvent table
     * - no event should be in RejectedEvent table
     */
    it('should do nothing when event is not confirmed enough', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger().event;
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized,
      );

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

      // mock EventVerifier
      mockIsEventConfirmedEnough(false);
      mockVerifyEvent(true);

      // run test
      await EventProcessor.processScannedEvents();

      // check events in db
      const dbEvents = await DatabaseActionMock.allEventRecords();
      expect(dbEvents.length).to.equal(0);
      const rejectedEvents = await DatabaseActionMock.allRejectedEventRecords();
      expect(rejectedEvents.length).toEqual(0);
    });

    /**
     * @target EventProcessor.processPaymentEvent should insert event into RejectedEvent
     * table when it's not verified
     * @dependencies
     * - database
     * - MinimumFee
     * - EventVerifier
     * @scenario
     * - mock feeConfig
     * - insert a mocked event into db
     * - mock EventVerifier
     *   - to return confirmed
     *   - to return unverified (invalid)
     * - run test
     * - check events in db
     * @expected
     * - no event should be in ConfirmedEvent table
     * - mocked event should be in RejectedEvent table
     */
    it("should insert event into RejectedEvent table when it's not verified", async () => {
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
      const id = await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized,
      );

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(false);

      // run test
      await EventProcessor.processScannedEvents();

      // check events in db
      const dbEvents = await DatabaseActionMock.allEventRecords();
      expect(dbEvents.length).toEqual(0);
      const rejectedEvents = await DatabaseActionMock.allRejectedEventRecords();
      expect(rejectedEvents.length).toEqual(1);
      expect(rejectedEvents[0].eventDataId).toEqual(id);
      expect(rejectedEvents[0].eventData.id).toEqual(id);
      expect(rejectedEvents[0].reason).toEqual('unknown');
    });

    /**
     * @target EventProcessor.processScannedEvents should insert only one event
     * per sourceTxId into ConfirmedEvent table
     * @dependencies
     * - database
     * - MinimumFee
     * - EventVerifier
     * @scenario
     * - insert a mocked event into db twice
     * - mock feeConfig
     * - mock EventVerifier
     *   - to return confirmed
     *   - to return verified
     * - run test
     * - verify event insertion into db
     * @expected
     * - 1st trigger should be in ConfirmedEvent table
     * - 2nd trigger should be in RejectedEvent table
     */
    it('should only inserts one event per sourceTxId into ConfirmedEvent table', async () => {
      // insert a mocked event into db twice
      const mockedEvent = mockEventTrigger().event;
      const id1 = await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized + '-0',
      );
      const id2 = await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent,
        boxSerialized + '-1',
      );

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

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(true);

      // run test
      await EventProcessor.processScannedEvents();

      // verify event insertion into db
      const dbEvents = await DatabaseActionMock.allEventRecords();
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents[0].eventData.id).toEqual(id1);
      const rejectedEvents = await DatabaseActionMock.allRejectedEventRecords();
      expect(rejectedEvents.length).toEqual(1);
      expect(rejectedEvents[0].eventDataId).toEqual(id2);
      expect(rejectedEvents[0].eventData.id).toEqual(id2);
      expect(rejectedEvents[0].reason).toEqual('duplicate-trigger');
    });

    describe('BCH RCS bitcoinCashGuardNamespace', () => {
      let restoreBchMocks: () => void;
      beforeEach(() => {
        restoreBchMocks = preserveBitcoinCashMocks([
          [
            bchGuardNamespace_EventVerifier,
            ['isEventConfirmedEnough', 'verifyEvent'],
          ],
          [bchGuardNamespace_MinimumFeeHandler, ['getEventFeeConfig']],
          [
            bchGuardNamespace_DatabaseAction.getInstance(),
            ['getUnconfirmedEvents'],
          ],
        ]);
      });
      afterEach(() => restoreBchMocks());

      beforeEach(async () =>
        bchGuardNamespace_DatabaseActionMock.clearTables(),
      );

      /**
       * @target EventProcessor.processScannedEvents - verifies and admits
       * same-txid %s then %s independently
       * @dependencies EventSerializer, namespace fixture generator, SQLite
       * DatabaseActionMock, ErgoTransaction and mocked fee/event verification
       * seams.
       * @scenario verifies and admits same-txid %s then %s independently.
       * @expected Admit colliding BTC/BCH requests independently and reject a
       * duplicate verified BCH trigger.
       */
      it.each([
        ['bitcoin', 'bitcoin-cash'],
        ['bitcoin-cash', 'bitcoin'],
      ])(
        'verifies and admits same-txid %s then %s independently',
        async (first, second) => {
          const raws = [
            await bchGuardNamespace_insertNamespaceEvent(
              bchGuardNamespace_namespaceEvent(first),
              `${first}-trigger`,
            ),
            await bchGuardNamespace_insertNamespaceEvent(
              bchGuardNamespace_namespaceEvent(second),
              `${second}-trigger`,
            ),
          ];
          const db = bchGuardNamespace_DatabaseAction.getInstance();
          await db.ConfirmedEventRepository.clear();
          vi.spyOn(db, 'getUnconfirmedEvents').mockResolvedValue(raws);
          vi.spyOn(
            bchGuardNamespace_EventVerifier,
            'isEventConfirmedEnough',
          ).mockResolvedValue(true);
          const verify = vi
            .spyOn(bchGuardNamespace_EventVerifier, 'verifyEvent')
            .mockResolvedValue(true);
          vi.spyOn(
            bchGuardNamespace_MinimumFeeHandler,
            'getEventFeeConfig',
          ).mockReturnValue(
            {} as ReturnType<
              typeof bchGuardNamespace_MinimumFeeHandler.getEventFeeConfig
            >,
          );
          await bchGuardNamespace_EventProcessor.processScannedEvents();
          expect(verify).toHaveBeenCalledTimes(2);
          expect(await db.ConfirmedEventRepository.count()).toEqual(2);
          expect(await db.RejectedEventRepository.count()).toEqual(0);
        },
      );
      /**
       * @target EventProcessor.processScannedEvents - still rejects a second
       * verified trigger for the same BCH source txid
       * @dependencies EventSerializer, namespace fixture generator, SQLite
       * DatabaseActionMock, ErgoTransaction and mocked fee/event verification
       * seams.
       * @scenario still rejects a second verified trigger for the same BCH
       * source txid.
       * @expected Admit colliding BTC/BCH requests independently and reject a
       * duplicate verified BCH trigger.
       */
      it('still rejects a second verified trigger for the same BCH source txid', async () => {
        const first = await bchGuardNamespace_insertNamespaceEvent(
          bchGuardNamespace_namespaceEvent(),
          'first-trigger',
        );
        const second = await bchGuardNamespace_insertNamespaceEvent(
          bchGuardNamespace_namespaceEvent('bitcoin-cash', {
            sourceTxId: '55'.repeat(32),
          }),
          'second-trigger',
        );
        const db = bchGuardNamespace_DatabaseAction.getInstance();
        await db.ConfirmedEventRepository.delete(
          bchGuardNamespace_EventSerializer.getId(second),
        );
        await db.EventRepository.update(second.id, {
          sourceTxId: first.sourceTxId,
          eventId: first.eventId,
        });
        second.sourceTxId = first.sourceTxId;
        second.eventId = first.eventId;
        vi.spyOn(db, 'getUnconfirmedEvents').mockResolvedValue([second]);
        vi.spyOn(
          bchGuardNamespace_EventVerifier,
          'isEventConfirmedEnough',
        ).mockResolvedValue(true);
        const verify = vi.spyOn(bchGuardNamespace_EventVerifier, 'verifyEvent');
        await bchGuardNamespace_EventProcessor.processScannedEvents();
        expect(verify).not.toHaveBeenCalled();
        expect(
          (
            await db.RejectedEventRepository.findOneByOrFail({
              eventDataId: second.id,
            })
          ).reason,
        ).toEqual('duplicate-trigger');
      });
    });

    describe('BCH RCS bitcoinCashFeeContract', () => {
      let restoreBchMocks: () => void;
      beforeEach(() => {
        restoreBchMocks = preserveBitcoinCashMocks([
          [bchFee_TokenHandler, ['getInstance']],
          [bchFee_MinimumFeeHandler, ['getInstance']],
          [bchFee_DatabaseAction, ['getInstance']],
          [bchFee_EventVerifier, ['isEventConfirmedEnough', 'verifyEvent']],
        ]);
      });
      afterEach(() => restoreBchMocks());

      let tokens: bchFee_TokenMap;

      beforeEach(async () => {
        tokens = new bchFee_TokenMap();
        const config = bchFee_bchTokenSet();
        config[0].ergo.decimals = 6;
        await tokens.updateConfigByJson(config);
        vi.spyOn(bchFee_TokenHandler, 'getInstance').mockReturnValue({
          /** Return the mutable synthetic token map used by this scenario. */
          getTokenMap: () => tokens,
        } as bchFee_TokenHandler);
        const fees = await bchFee_feeBox();
        /** Record token lookup arguments while returning the selected synthetic mapping. */
        const lookup = vi.fn((tokenId: string) => {
          if (tokenId !== bchFee_wrapped)
            throw Error('Wrong source token join');
          return fees;
        });
        vi.spyOn(bchFee_MinimumFeeHandler, 'getInstance').mockReturnValue({
          getMinimumFeeBoxObject: lookup,
        } as unknown as bchFee_MinimumFeeHandler);
      });
      /**
       * @target EventProcessor.processScannedEvents - verifies a BCH trigger
       * independently when Bitcoin shares its source txid
       * @dependencies Reusable synthetic fee box/trigger helper, real
       * BCH8/wrapped6 TokenMap and mocked TokenHandler, fee provider, database
       * and verification seams.
       * @scenario verifies a BCH trigger independently when Bitcoin shares its
       * source txid.
       * @expected Verify and confirm the BCH trigger independently from a
       * Bitcoin event with the same wire request ID.
       */
      it('verifies a BCH trigger independently when Bitcoin shares its source txid', async () => {
        const bch = {
          ...bchFee_event(),
          id: 2,
          eventId: bchFee_EventSerializer.getRequestId(bchFee_event()),
          txId: 'bch-trigger',
        };
        const bitcoin = {
          id: bchFee_EventSerializer.getId(
            bchFee_event({ fromChain: 'bitcoin' }),
          ),
          eventData: {
            ...bchFee_event({ fromChain: 'bitcoin' }),
            id: 1,
            txId: 'bitcoin-trigger',
          },
        };
        const db = {
          /** Provide the getUnconfirmedEvents test seam for the current scenario without external requests. */
          getUnconfirmedEvents: vi.fn(async () => [bch]),
          /** Provide the getEventById test seam for the current scenario without external requests. */
          getEventById: vi.fn(async (id: string) =>
            id === bitcoin.id ? bitcoin : null,
          ),
          insertRejectedEvent: vi.fn(),
          insertConfirmedEvent: vi.fn(),
        };
        vi.spyOn(bchFee_DatabaseAction, 'getInstance').mockReturnValue(
          db as unknown as bchFee_DatabaseAction,
        );
        vi.spyOn(
          bchFee_EventVerifier,
          'isEventConfirmedEnough',
        ).mockResolvedValue(true);
        const verify = vi
          .spyOn(bchFee_EventVerifier, 'verifyEvent')
          .mockResolvedValue(true);
        await bchFee_EventProcessor.processScannedEvents();
        expect(db.getEventById).toHaveBeenCalledWith(
          bchFee_EventSerializer.getId(bchFee_event()),
        );
        expect(db.insertRejectedEvent).not.toHaveBeenCalled();
        expect(db.insertConfirmedEvent).toHaveBeenCalledWith(bch);
        expect(verify).toHaveBeenCalledWith(bch, bch.txId, expect.anything());
      });
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
      expect(dbEvents).toContainEqual([
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
      expect(dbEvents).toContainEqual([
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
      await EventProcessor.processPaymentEvent(mockedEvent, 'event-box-tx-id');

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
      await EventProcessor.processPaymentEvent(mockedEvent, 'event-box-tx-id');

      // `addTransactionToQueue` should got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue'),
      ).toHaveBeenCalledOnce();
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
      await EventProcessor.processPaymentEvent(mockedEvent, 'event-box-tx-id');

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).toContainEqual([
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
      await EventProcessor.processPaymentEvent(mockedEvent, 'event-box-tx-id');

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
      await EventProcessor.processRewardEvent(mockedEvent, 'event-box-tx-id');

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
      await EventProcessor.processRewardEvent(mockedEvent, 'event-box-tx-id');

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).toContainEqual([
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
      await EventProcessor.processRewardEvent(mockedEvent, 'event-box-tx-id');

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
      expect(dbEvents).toContainEqual([
        EventSerializer.getId(mockedEvent1),
        EventStatus.pendingReward,
      ]);
      expect(dbEvents).toContainEqual([
        EventSerializer.getId(mockedEvent2),
        EventStatus.pendingPayment,
      ]);
      expect(dbEvents).toContainEqual([
        EventSerializer.getId(mockedEvent3),
        EventStatus.pendingReward,
      ]);
      expect(dbEvents).toContainEqual([
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
      expect(dbEvents).toContainEqual([
        EventSerializer.getId(mockedEvent1),
        EventStatus.pendingReward,
      ]);
      expect(dbEvents).toContainEqual([
        EventSerializer.getId(mockedEvent2),
        EventStatus.pendingPayment,
      ]);
    });
  });

  describe('createEventPayment', () => {
    describe('BCH RCS bitcoinCashNamespaceConsumers', () => {
      let restoreBchMocks: () => void;
      beforeEach(() => {
        restoreBchMocks = preserveBitcoinCashMocks([
          [BchConsumers_ChainHandler, ['getInstance']],
          [BchConsumers_chainHandlerInstance, ['getChain', 'getErgoChain']],
          [BchConsumers_TxAgreement, ['getInstance']],
          [
            BchConsumers_EventOrder,
            ['createEventPaymentOrder', 'createEventRewardOrder'],
          ],
          [
            BchConsumers_EventBoxes,
            ['getEventBox', 'getEventWIDs', 'getEventValidCommitments'],
          ],
        ]);
      });
      afterEach(() => restoreBchMocks());

      beforeEach(async () => {
        await BchConsumers_DatabaseActionMock.clearTables();
        vi.spyOn(BchConsumers_ChainHandler, 'getInstance').mockReturnValue(
          BchConsumers_chainHandlerInstance as unknown as BchConsumers_ChainHandler,
        );
      });

      /**
       * @target EventProcessor.createEventPayment - propagates the BCH guard
       * ID through the actual %s creation boundary
       * @dependencies SQLite namespace fixtures,
       * TestTxAgreement/TestEventSynchronization wrappers, mocked chain, fee,
       * order, verification and active-sync seams.
       * @scenario propagates the BCH guard ID through the actual %s creation
       * boundary.
       * @expected Propagate the BCH guard identity and payment type into the
       * generated transaction without looking up by wire request ID.
       */
      it.each([BchConsumers_TransactionType.payment])(
        'propagates the BCH guard ID through the actual %s creation boundary',
        async (type) => {
          const event = BchConsumers_namespaceEvent('bitcoin-cash', {
            toChain: 'cardano',
          });
          /** Record the requested transaction generation without signing or submitting. */
          const generate = vi.fn(
            async (eventId: string, txType: BchConsumers_TransactionType) =>
              new BchConsumers_PaymentTransaction(
                type === BchConsumers_TransactionType.reward
                  ? 'ergo'
                  : 'cardano',
                'generated-tx',
                eventId,
                Buffer.from('bytes'),
                txType,
              ),
          );
          const chain = {
            generateTransaction: generate,
            /** Provide the getBoxRWT test seam for the current scenario without external requests. */
            getBoxRWT: () => 2n,
            /** Provide the getGuardsConfigBox test seam for the current scenario without external requests. */
            getGuardsConfigBox: async () => 'guards-config',
          };
          vi.spyOn(
            BchConsumers_chainHandlerInstance,
            'getChain',
          ).mockReturnValue(
            chain as unknown as BchConsumers_AbstractChain<unknown>,
          );
          vi.spyOn(
            BchConsumers_chainHandlerInstance,
            'getErgoChain',
          ).mockReturnValue(
            chain as unknown as ReturnType<
              BchConsumers_ChainHandler['getErgoChain']
            >,
          );
          vi.spyOn(BchConsumers_TxAgreement, 'getInstance').mockResolvedValue({
            /** Provide the getChainPendingTransactions test seam for the current scenario without external requests. */
            getChainPendingTransactions: () => [],
          } as unknown as BchConsumers_TxAgreement);
          vi.spyOn(
            BchConsumers_EventOrder,
            'createEventPaymentOrder',
          ).mockResolvedValue([]);
          vi.spyOn(
            BchConsumers_EventOrder,
            'createEventRewardOrder',
          ).mockResolvedValue([]);
          vi.spyOn(BchConsumers_EventBoxes, 'getEventBox').mockResolvedValue(
            'unchanged-event-box',
          );
          vi.spyOn(BchConsumers_EventBoxes, 'getEventWIDs').mockResolvedValue([
            'ab'.repeat(32),
          ]);
          vi.spyOn(
            BchConsumers_EventBoxes,
            'getEventValidCommitments',
          ).mockResolvedValue([]);
          const tx =
            type === BchConsumers_TransactionType.payment
              ? await TestBchConsumers_NamespaceProcessor.payment(
                  event,
                  'bch-trigger',
                )
              : await TestBchConsumers_NamespaceProcessor.reward(
                  event,
                  'bch-trigger',
                );
          expect(tx.eventId).toEqual(BchConsumers_EventSerializer.getId(event));
          expect(generate.mock.calls[0][0]).toEqual(
            BchConsumers_EventSerializer.getId(event),
          );
          expect(generate.mock.calls[0][1]).toEqual(type);
          expect(
            await BchConsumers_DatabaseAction.getInstance().getEventById(
              event.sourceTxId,
            ),
          ).toBeNull();
        },
      );
    });
  });

  describe('createEventRewardDistribution', () => {
    describe('BCH RCS bitcoinCashNamespaceConsumers', () => {
      let restoreBchMocks: () => void;
      beforeEach(() => {
        restoreBchMocks = preserveBitcoinCashMocks([
          [BchConsumers_ChainHandler, ['getInstance']],
          [BchConsumers_chainHandlerInstance, ['getChain', 'getErgoChain']],
          [BchConsumers_TxAgreement, ['getInstance']],
          [
            BchConsumers_EventOrder,
            ['createEventPaymentOrder', 'createEventRewardOrder'],
          ],
          [
            BchConsumers_EventBoxes,
            ['getEventBox', 'getEventWIDs', 'getEventValidCommitments'],
          ],
        ]);
      });
      afterEach(() => restoreBchMocks());

      beforeEach(async () => {
        await BchConsumers_DatabaseActionMock.clearTables();
        vi.spyOn(BchConsumers_ChainHandler, 'getInstance').mockReturnValue(
          BchConsumers_chainHandlerInstance as unknown as BchConsumers_ChainHandler,
        );
      });

      /**
       * @target EventProcessor.createEventRewardDistribution - propagates the
       * BCH guard ID through the actual %s creation boundary
       * @dependencies SQLite namespace fixtures,
       * TestTxAgreement/TestEventSynchronization wrappers, mocked chain, fee,
       * order, verification and active-sync seams.
       * @scenario propagates the BCH guard ID through the actual %s creation
       * boundary.
       * @expected Propagate the BCH guard identity and reward type into the
       * generated transaction without looking up by wire request ID.
       */
      it.each([BchConsumers_TransactionType.reward])(
        'propagates the BCH guard ID through the actual %s creation boundary',
        async (type) => {
          const event = BchConsumers_namespaceEvent('bitcoin-cash', {
            toChain: 'cardano',
          });
          /** Record the requested transaction generation without signing or submitting. */
          const generate = vi.fn(
            async (eventId: string, txType: BchConsumers_TransactionType) =>
              new BchConsumers_PaymentTransaction(
                type === BchConsumers_TransactionType.reward
                  ? 'ergo'
                  : 'cardano',
                'generated-tx',
                eventId,
                Buffer.from('bytes'),
                txType,
              ),
          );
          const chain = {
            generateTransaction: generate,
            /** Provide the getBoxRWT test seam for the current scenario without external requests. */
            getBoxRWT: () => 2n,
            /** Provide the getGuardsConfigBox test seam for the current scenario without external requests. */
            getGuardsConfigBox: async () => 'guards-config',
          };
          vi.spyOn(
            BchConsumers_chainHandlerInstance,
            'getChain',
          ).mockReturnValue(
            chain as unknown as BchConsumers_AbstractChain<unknown>,
          );
          vi.spyOn(
            BchConsumers_chainHandlerInstance,
            'getErgoChain',
          ).mockReturnValue(
            chain as unknown as ReturnType<
              BchConsumers_ChainHandler['getErgoChain']
            >,
          );
          vi.spyOn(BchConsumers_TxAgreement, 'getInstance').mockResolvedValue({
            /** Provide the getChainPendingTransactions test seam for the current scenario without external requests. */
            getChainPendingTransactions: () => [],
          } as unknown as BchConsumers_TxAgreement);
          vi.spyOn(
            BchConsumers_EventOrder,
            'createEventPaymentOrder',
          ).mockResolvedValue([]);
          vi.spyOn(
            BchConsumers_EventOrder,
            'createEventRewardOrder',
          ).mockResolvedValue([]);
          vi.spyOn(BchConsumers_EventBoxes, 'getEventBox').mockResolvedValue(
            'unchanged-event-box',
          );
          vi.spyOn(BchConsumers_EventBoxes, 'getEventWIDs').mockResolvedValue([
            'ab'.repeat(32),
          ]);
          vi.spyOn(
            BchConsumers_EventBoxes,
            'getEventValidCommitments',
          ).mockResolvedValue([]);
          const tx =
            type === BchConsumers_TransactionType.payment
              ? await TestBchConsumers_NamespaceProcessor.payment(
                  event,
                  'bch-trigger',
                )
              : await TestBchConsumers_NamespaceProcessor.reward(
                  event,
                  'bch-trigger',
                );
          expect(tx.eventId).toEqual(BchConsumers_EventSerializer.getId(event));
          expect(generate.mock.calls[0][0]).toEqual(
            BchConsumers_EventSerializer.getId(event),
          );
          expect(generate.mock.calls[0][1]).toEqual(type);
          expect(
            await BchConsumers_DatabaseAction.getInstance().getEventById(
              event.sourceTxId,
            ),
          ).toBeNull();
        },
      );
    });
  });
});

class TestBchConsumers_NamespaceProcessor extends BchConsumers_EventProcessor {
  static payment = (event: BchConsumers_EventTrigger, trigger: string) =>
    this.createEventPayment(event, trigger, {} as BchConsumers_ChainMinimumFee);
  static reward = (event: BchConsumers_EventTrigger, trigger: string) =>
    this.createEventRewardDistribution(
      event,
      trigger,
      {} as BchConsumers_ChainMinimumFee,
      'actual-payment-id',
    );
}
