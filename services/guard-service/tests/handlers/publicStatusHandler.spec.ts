import { TransactionType } from '@rosen-chains/abstract-chain';
import { TransactionType as bchPublicStatus_TransactionType } from '@rosen-chains/abstract-chain';

import EventSerializer from '../../src/event/eventSerializer';
import bchPublicStatus_EventSerializer from '../../src/event/eventSerializer';
import { UpdateStatusDTO } from '../../src/handlers/publicStatusHandler';
import { UpdateStatusDTO as bchPublicStatus_UpdateStatusDTO } from '../../src/handlers/publicStatusHandler';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import {
  EventStatus as bchPublicStatus_EventStatus,
  TransactionStatus as bchPublicStatus_TransactionStatus,
} from '../../src/utils/constants';
import * as TxTestData from '../agreement/testData';
import { mockPaymentTransaction as bchPublicStatus_mockPaymentTransaction } from '../agreement/testData';
import {
  insertNamespaceEvent as bchPublicStatus_insertNamespaceEvent,
  namespaceEvent as bchPublicStatus_namespaceEvent,
} from '../db/bitcoinCashNamespaceTestUtils';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import bchPublicStatus_DatabaseActionMock from '../db/mocked/databaseAction.mock';
import * as EventTestData from '../event/testData';
import TestUtils from '../testUtils/testUtils';
import TestPublicStatusHandler from './testPublicStatusHandler';
import bchPublicStatus_TestPublicStatusHandler from './testPublicStatusHandler';

describe('PublicStatusHandler', () => {
  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
  });

  describe('updatePublicEventStatus', () => {
    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with event and tx info when status is "inPayment"
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - insert a mock event with "inPayment" status in database
     * - insert a mock "payment" transaction in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with status set to "inPayment"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto containing the payment tx
     */
    it('should call submitRequest with event and tx info when status is "inPayment"', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
      );
      const event =
        await DatabaseActionMock.testDatabase.ConfirmedEventRepository.findOneOrFail(
          {
            relations: ['eventData'],
            where: { id: eventId },
          },
        );

      const paymentTx = TxTestData.mockPaymentTransaction(
        TransactionType.payment,
        event.eventData.toChain,
        eventId,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx,
        TransactionStatus.approved,
      );
      const tx =
        await DatabaseActionMock.testDatabase.TransactionRepository.findOneOrFail(
          {
            where: { txId: paymentTx.txId },
          },
        );

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, event.status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        triggerTxId: event.eventData.txId,
        status: event.status,
        tx: {
          txId: tx.txId,
          chain: tx.chain,
          txType: tx.type,
          txStatus: tx.status,
        },
      });
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with a valid payment tx when event status is inPayment
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - insert a mock event with "inPayment" status in database
     * - insert 2 mock "payment" transactions with "invalid" and "approved" statuses in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with status set to "inPayment"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the valid "payment" tx
     */
    it('should call submitRequest with a valid payment tx when event status is inPayment', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
      );
      const event =
        await DatabaseActionMock.testDatabase.ConfirmedEventRepository.findOneOrFail(
          {
            relations: ['eventData'],
            where: { id: eventId },
          },
        );

      const paymentTx1 = TxTestData.mockPaymentTransaction(
        TransactionType.payment,
        event.eventData.toChain,
        eventId,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx1,
        TransactionStatus.invalid,
      );

      const paymentTx2 = TxTestData.mockPaymentTransaction(
        TransactionType.payment,
        event.eventData.toChain,
        eventId,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx2,
        TransactionStatus.approved,
      );
      const tx2 =
        await DatabaseActionMock.testDatabase.TransactionRepository.findOneOrFail(
          {
            where: { txId: paymentTx2.txId },
          },
        );

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, event.status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        triggerTxId: event.eventData.txId,
        status: event.status,
        tx: {
          txId: tx2.txId,
          chain: tx2.chain,
          txType: tx2.type,
          txStatus: tx2.status,
        },
      });
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with a reward tx when event status is inReward
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - insert a mock event with "inReward" status in database
     * - insert 2 mock transactions with "payment" and "reward" types in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with status set to "inReward"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the "reward" tx
     */
    it('should call submitRequest with a reward tx when event status is inReward', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inReward,
      );
      const event =
        await DatabaseActionMock.testDatabase.ConfirmedEventRepository.findOneOrFail(
          {
            relations: ['eventData'],
            where: { id: eventId },
          },
        );

      const paymentTx1 = TxTestData.mockPaymentTransaction(
        TransactionType.payment,
        event.eventData.toChain,
        eventId,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx1,
        TransactionStatus.completed,
      );

      const paymentTx2 = TxTestData.mockPaymentTransaction(
        TransactionType.reward,
        event.eventData.toChain,
        eventId,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx2,
        TransactionStatus.approved,
      );
      const tx2 =
        await DatabaseActionMock.testDatabase.TransactionRepository.findOneOrFail(
          {
            where: { txId: paymentTx2.txId },
          },
        );

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, event.status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        triggerTxId: event.eventData.txId,
        status: event.status,
        tx: {
          txId: tx2.txId,
          chain: tx2.chain,
          txType: tx2.type,
          txStatus: tx2.status,
        },
      });
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest without transaction details when status is neither "inPayment" nor "inReward"
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - insert a mock event with "pendingPayment" status in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with "pendingPayment" status
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once without a transaction property
     */
    it('should call submitRequest without transaction details when status is neither "inPayment" nor "inReward"', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const status = EventStatus.pendingPayment;

      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(mockedEvent, status);
      const event =
        await DatabaseActionMock.testDatabase.ConfirmedEventRepository.findOneOrFail(
          {
            relations: ['eventData'],
            where: { id: eventId },
          },
        );

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        triggerTxId: event.eventData.txId,
        status,
        tx: undefined,
      });
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should read the event data from RejectedEventEntity table when status is rejected
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - insert a mock event with "rejected" status in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with "rejected" status
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once without a transaction property
     */
    it('should read the event data from RejectedEventEntity table when status is rejected', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const status = EventStatus.rejected;

      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertRejectedEventRecord(mockedEvent, '');
      const event =
        await DatabaseActionMock.testDatabase.RejectedEventRepository.findOneOrFail(
          {
            relations: ['eventData'],
            where: { id: eventId },
          },
        );

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        triggerTxId: event.eventData.txId,
        status,
        tx: undefined,
      });
    });

    describe('BCH RCS bitcoinCashPublicStatusNamespace', () => {
      beforeEach(async () => bchPublicStatus_DatabaseActionMock.clearTables());

      /**
       * @target PublicStatusHandler.updatePublicEventStatus - looks up by
       * guard identity and emits wire identity for a BCH %s status
       * @dependencies SQLite namespace and transaction fixtures,
       * TestPublicStatusHandler and mocked processor jobFn.
       * @scenario looks up by guard identity and emits wire identity for a BCH
       * %s status.
       * @expected Resolve the BCH guard identity and publish the unchanged
       * wire identity plus the selected transaction status.
       */
      it.each(['event'])(
        'looks up by guard identity and emits wire identity for a BCH %s status',
        async (kind) => {
          await bchPublicStatus_insertNamespaceEvent(
            bchPublicStatus_namespaceEvent('bitcoin'),
            'btc-trigger',
            bchPublicStatus_EventStatus.inPayment,
          );
          const bch = await bchPublicStatus_insertNamespaceEvent(
            bchPublicStatus_namespaceEvent(),
            'bch-trigger',
            bchPublicStatus_EventStatus.inPayment,
          );
          const tx = bchPublicStatus_mockPaymentTransaction(
            bchPublicStatus_TransactionType.payment,
            'ergo',
            bchPublicStatus_EventSerializer.getId(bch),
          );
          await bchPublicStatus_DatabaseActionMock.insertTxRecord(
            tx,
            bchPublicStatus_TransactionStatus.approved,
          );
          const handler = new bchPublicStatus_TestPublicStatusHandler(
            bchPublicStatus_DatabaseActionMock.testDataSource,
          );
          const submit = vi
            .spyOn(
              handler.processor as unknown as {
                jobFn(dto: bchPublicStatus_UpdateStatusDTO): Promise<void>;
              },
              'jobFn',
            )
            .mockResolvedValue(undefined);
          if (kind === 'event')
            await handler.updatePublicEventStatus(
              bchPublicStatus_EventSerializer.getId(bch),
              bchPublicStatus_EventStatus.inPayment,
            );
          else
            await handler.updatePublicTxStatus(
              tx.txId,
              bchPublicStatus_TransactionStatus.approved,
            );
          expect(submit).toHaveBeenCalledExactlyOnceWith({
            eventId: bch.eventId,
            triggerTxId: bch.txId,
            status: bchPublicStatus_EventStatus.inPayment,
            tx: {
              txId: tx.txId,
              chain: 'ergo',
              txType: bchPublicStatus_TransactionType.payment,
              txStatus: bchPublicStatus_TransactionStatus.approved,
            },
          });
        },
      );
    });
  });

  describe('updatePublicTxStatus', () => {
    /**
     * @target PublicStatusHandler.updatePublicTxStatus should call submitRequest with a dto object containing transaction details
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - insert a mock event with "inReward" status in database
     * - insert a mock "reward" transaction in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicTxStatus with the tx status
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the tx details
     */
    it('should call submitRequest with a dto object containing transaction details', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inReward,
      );
      const event =
        await DatabaseActionMock.testDatabase.ConfirmedEventRepository.findOneOrFail(
          {
            relations: ['eventData'],
            where: { id: eventId },
          },
        );

      const paymentTx = TxTestData.mockPaymentTransaction(
        TransactionType.reward,
        event.eventData.toChain,
        eventId,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx,
        TransactionStatus.inSign,
      );
      const tx =
        await DatabaseActionMock.testDatabase.TransactionRepository.findOneOrFail(
          {
            where: { txId: paymentTx.txId },
          },
        );

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicTxStatus(tx.txId, tx.status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        triggerTxId: event.eventData.txId,
        status: event.status,
        tx: {
          txId: tx.txId,
          chain: tx.chain,
          txType: tx.type,
          txStatus: tx.status,
        },
      });
    });

    describe('BCH RCS bitcoinCashPublicStatusNamespace', () => {
      beforeEach(async () => bchPublicStatus_DatabaseActionMock.clearTables());

      /**
       * @target PublicStatusHandler.updatePublicTxStatus - looks up by guard
       * identity and emits wire identity for a BCH %s status
       * @dependencies SQLite namespace and transaction fixtures,
       * TestPublicStatusHandler and mocked processor jobFn.
       * @scenario looks up by guard identity and emits wire identity for a BCH
       * %s status.
       * @expected Resolve the BCH guard identity and publish the unchanged
       * wire identity plus the selected transaction status.
       */
      it.each(['transaction'])(
        'looks up by guard identity and emits wire identity for a BCH %s status',
        async (kind) => {
          await bchPublicStatus_insertNamespaceEvent(
            bchPublicStatus_namespaceEvent('bitcoin'),
            'btc-trigger',
            bchPublicStatus_EventStatus.inPayment,
          );
          const bch = await bchPublicStatus_insertNamespaceEvent(
            bchPublicStatus_namespaceEvent(),
            'bch-trigger',
            bchPublicStatus_EventStatus.inPayment,
          );
          const tx = bchPublicStatus_mockPaymentTransaction(
            bchPublicStatus_TransactionType.payment,
            'ergo',
            bchPublicStatus_EventSerializer.getId(bch),
          );
          await bchPublicStatus_DatabaseActionMock.insertTxRecord(
            tx,
            bchPublicStatus_TransactionStatus.approved,
          );
          const handler = new bchPublicStatus_TestPublicStatusHandler(
            bchPublicStatus_DatabaseActionMock.testDataSource,
          );
          const submit = vi
            .spyOn(
              handler.processor as unknown as {
                jobFn(dto: bchPublicStatus_UpdateStatusDTO): Promise<void>;
              },
              'jobFn',
            )
            .mockResolvedValue(undefined);
          if (kind === 'event')
            await handler.updatePublicEventStatus(
              bchPublicStatus_EventSerializer.getId(bch),
              bchPublicStatus_EventStatus.inPayment,
            );
          else
            await handler.updatePublicTxStatus(
              tx.txId,
              bchPublicStatus_TransactionStatus.approved,
            );
          expect(submit).toHaveBeenCalledExactlyOnceWith({
            eventId: bch.eventId,
            triggerTxId: bch.txId,
            status: bchPublicStatus_EventStatus.inPayment,
            tx: {
              txId: tx.txId,
              chain: 'ergo',
              txType: bchPublicStatus_TransactionType.payment,
              txStatus: bchPublicStatus_TransactionStatus.approved,
            },
          });
        },
      );
    });
  });

  describe('dtoToSignMessage', () => {
    /**
     * @target PublicStatusHandler.dtoToSignMessage should return a sign message without tx information when dto.tx field is undefined
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock UpdateStatusDTO object
     * - call PublicStatusHandler.dtoToSignMessage with the dto
     * @expected
     * - should have returned the string sign message
     */
    it('should return a sign message without tx information when dto.tx field is undefined', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const dto: UpdateStatusDTO = {
        eventId: TestUtils.generateRandomId(),
        triggerTxId: TestUtils.generateRandomId(),
        status: EventStatus.inPayment,
      };

      // act
      const result = instance.callDTOToSignMessage(dto, 0);

      // assert
      expect(result).toBe(`${dto.triggerTxId}${dto.eventId}${dto.status}0`);
    });

    /**
     * @target PublicStatusHandler.dtoToSignMessage should return a sign message with tx information when dto contains a tx
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock UpdateStatusDTO object
     * - call PublicStatusHandler.dtoToSignMessage with the dto
     * @expected
     * - should have returned the string sign message also containing the tx info
     */
    it('should return a sign message with tx information when dto contains a tx', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const dto: UpdateStatusDTO = {
        eventId: TestUtils.generateRandomId(),
        triggerTxId: TestUtils.generateRandomId(),
        status: EventStatus.inPayment,
        tx: {
          txId: 'txId',
          chain: 'chain',
          txType: TransactionType.payment,
          txStatus: TransactionStatus.approved,
        },
      };

      // act
      const result = instance.callDTOToSignMessage(dto, 0);

      // assert
      expect(result).toBe(
        `${dto.triggerTxId}${dto.eventId}${dto.status}${dto.tx!.txId}${dto.tx!.chain}${
          dto.tx!.txType
        }${dto.tx!.txStatus}0`,
      );
    });
  });
});
