import type { MockInstance } from 'vitest';

import TxAgreement from '../../src/agreement/txAgreement';
import Configs from '../../src/configs/configs';
import EventProcessor from '../../src/event/eventProcessor';
import {
  agreementQueueJob,
  agreementResendJob,
  eventSyncJob,
  requeueWaitingEventsJob,
  resetJob,
  roundJob,
  scannedEventsJob,
  timeoutProcessorJob,
  transactionJob,
} from '../../src/jobs/runProcessors';
import EventSynchronization from '../../src/synchronization/eventSynchronization';
import TransactionProcessor from '../../src/transaction/transactionProcessor';
import GuardTurn from '../../src/utils/guardTurn';

/**
 * flushes pending promise continuations without relying on timers
 * (setTimeout is mocked in these tests)
 */
const flushPromises = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('runProcessors jobs', () => {
  let setTimeoutSpy: MockInstance<typeof setTimeout>;

  beforeEach(() => {
    // replace setTimeout with a no-op spy so scheduled jobs never actually run
    setTimeoutSpy = vi
      .spyOn(global, 'setTimeout')
      .mockImplementation(() => 0 as unknown as ReturnType<typeof setTimeout>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * @target scannedEventsJob should reschedule itself when processing fails
   * @dependencies
   * - EventProcessor
   * @scenario
   * - mock `processScannedEvents` to reject
   * - run the job and flush promises
   * @expected
   * - the job should schedule its next run with the configured interval
   */
  it('scannedEventsJob should reschedule itself when processing fails', async () => {
    vi.spyOn(EventProcessor, 'processScannedEvents').mockRejectedValue(
      new Error('database outage'),
    );

    scannedEventsJob();
    await flushPromises();

    expect(setTimeoutSpy).toHaveBeenCalledWith(
      scannedEventsJob,
      Configs.scannedEventProcessorInterval * 1000,
    );
  });

  /**
   * @target scannedEventsJob should reschedule itself when processing succeeds
   * @dependencies
   * - EventProcessor
   * @scenario
   * - mock `processScannedEvents` to resolve
   * - run the job and flush promises
   * @expected
   * - the job should schedule its next run with the configured interval
   */
  it('scannedEventsJob should reschedule itself when processing succeeds', async () => {
    vi.spyOn(EventProcessor, 'processScannedEvents').mockResolvedValue(
      undefined,
    );

    scannedEventsJob();
    await flushPromises();

    expect(setTimeoutSpy).toHaveBeenCalledWith(
      scannedEventsJob,
      Configs.scannedEventProcessorInterval * 1000,
    );
  });

  /**
   * @target transactionJob should reschedule itself when processing fails
   * @dependencies
   * - TransactionProcessor
   * @scenario
   * - mock `processTransactions` to reject
   * - run the job and flush promises
   * @expected
   * - the job should schedule its next run with the configured interval
   */
  it('transactionJob should reschedule itself when processing fails', async () => {
    vi.spyOn(TransactionProcessor, 'processTransactions').mockRejectedValue(
      new Error('database outage'),
    );

    transactionJob();
    await flushPromises();

    expect(setTimeoutSpy).toHaveBeenCalledWith(
      transactionJob,
      Configs.txProcessorInterval * 1000,
    );
  });

  /**
   * @target agreementQueueJob should reschedule itself when processing fails
   * @dependencies
   * - TxAgreement
   * - GuardTurn
   * @scenario
   * - mock guard turn to be within up time
   * - mock TxAgreement instance whose `processAgreementQueue` rejects
   * - run the job
   * @expected
   * - the job should resolve and schedule its next run with the configured interval
   */
  it('agreementQueueJob should reschedule itself when processing fails', async () => {
    vi.spyOn(GuardTurn, 'secondsToReset').mockReturnValue(0);
    vi.spyOn(TxAgreement, 'getInstance').mockResolvedValue({
      processAgreementQueue: () => Promise.reject(new Error('database outage')),
    } as unknown as TxAgreement);

    await agreementQueueJob();

    expect(setTimeoutSpy).toHaveBeenCalledWith(
      agreementQueueJob,
      Configs.agreementQueueInterval * 1000,
    );
  });

  /**
   * @target agreementResendJob should reschedule itself when TxAgreement is unavailable
   * @dependencies
   * - TxAgreement
   * - GuardTurn
   * @scenario
   * - mock guard turn to be within up time
   * - mock `TxAgreement.getInstance` to reject
   * - run the job
   * @expected
   * - the job should resolve and schedule its next run with the configured interval
   */
  it('agreementResendJob should reschedule itself when TxAgreement is unavailable', async () => {
    vi.spyOn(GuardTurn, 'secondsToReset').mockReturnValue(0);
    vi.spyOn(TxAgreement, 'getInstance').mockRejectedValue(
      new Error('database outage'),
    );

    await agreementResendJob();

    expect(setTimeoutSpy).toHaveBeenCalledWith(
      agreementResendJob,
      Configs.txResendInterval * 1000,
    );
  });

  /**
   * @target resetJob should reschedule itself when cleaning up fails
   * @dependencies
   * - TxAgreement
   * - GuardTurn
   * @scenario
   * - mock TxAgreement instance whose `clearAgreedTransactions` rejects
   * - mock `secondsToReset` to a fixed value
   * - run the job
   * @expected
   * - the job should resolve and schedule its next run at the reset time
   */
  it('resetJob should reschedule itself when cleaning up fails', async () => {
    vi.spyOn(GuardTurn, 'secondsToReset').mockReturnValue(5);
    vi.spyOn(TxAgreement, 'getInstance').mockResolvedValue({
      clearAgreedTransactions: () =>
        Promise.reject(new Error('database outage')),
    } as unknown as TxAgreement);

    await resetJob();

    expect(setTimeoutSpy).toHaveBeenCalledWith(resetJob, 5 * 1000);
  });

  /**
   * @target roundJob should reschedule itself when processing fails
   * @dependencies
   * - TxAgreement
   * - EventProcessor
   * - GuardTurn
   * @scenario
   * - mock TxAgreement instance with the timer-scheduled callbacks
   * - mock `processConfirmedEvents` to reject
   * - mock `secondsToNextTurn` to a fixed value
   * - run the job
   * @expected
   * - the job should resolve and schedule its next run at the next turn
   */
  it('roundJob should reschedule itself when processing fails', async () => {
    vi.spyOn(GuardTurn, 'secondsToNextTurn').mockReturnValue(7);
    vi.spyOn(TxAgreement, 'getInstance').mockResolvedValue({
      enqueueSignFailedTxs: () => undefined,
      clearTransactions: () => undefined,
    } as unknown as TxAgreement);
    vi.spyOn(EventProcessor, 'processConfirmedEvents').mockRejectedValue(
      new Error('database outage'),
    );

    await roundJob();

    expect(setTimeoutSpy).toHaveBeenCalledWith(roundJob, 7 * 1000);
  });

  /**
   * @target timeoutProcessorJob should reschedule itself when processing fails
   * @dependencies
   * - EventProcessor
   * @scenario
   * - mock `TimeoutLeftoverEvents` to reject
   * - run the job
   * @expected
   * - the job should resolve and schedule its next run with the configured interval
   */
  it('timeoutProcessorJob should reschedule itself when processing fails', async () => {
    vi.spyOn(EventProcessor, 'TimeoutLeftoverEvents').mockRejectedValue(
      new Error('database outage'),
    );

    await timeoutProcessorJob();

    expect(setTimeoutSpy).toHaveBeenCalledWith(
      timeoutProcessorJob,
      Configs.timeoutProcessorInterval * 1000,
    );
  });

  /**
   * @target requeueWaitingEventsJob should reschedule itself when processing fails
   * @dependencies
   * - EventProcessor
   * @scenario
   * - mock `RequeueWaitingEvents` to reject
   * - run the job
   * @expected
   * - the job should resolve and schedule its next run with the configured interval
   */
  it('requeueWaitingEventsJob should reschedule itself when processing fails', async () => {
    vi.spyOn(EventProcessor, 'RequeueWaitingEvents').mockRejectedValue(
      new Error('database outage'),
    );

    await requeueWaitingEventsJob();

    expect(setTimeoutSpy).toHaveBeenCalledWith(
      requeueWaitingEventsJob,
      Configs.requeueWaitingEventsInterval * 1000,
    );
  });

  /**
   * @target eventSyncJob should reschedule itself when processing fails
   * @dependencies
   * - EventSynchronization
   * @scenario
   * - mock EventSynchronization instance whose `processSyncQueue` rejects
   * - run the job
   * @expected
   * - the job should resolve and schedule its next run with the configured interval
   */
  it('eventSyncJob should reschedule itself when processing fails', async () => {
    vi.spyOn(EventSynchronization, 'getInstance').mockReturnValue({
      processSyncQueue: () => Promise.reject(new Error('database outage')),
      sendSyncBatch: () => Promise.resolve(),
    } as unknown as EventSynchronization);

    await eventSyncJob();

    expect(setTimeoutSpy).toHaveBeenCalledWith(
      eventSyncJob,
      Configs.eventSyncInterval * 1000,
    );
  });
});
