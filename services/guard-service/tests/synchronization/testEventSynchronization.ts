import { PaymentTransaction } from '@rosen-chains/abstract-chain';

import EventSynchronization from '../../src/synchronization/eventSynchronization';
import { ActiveSync } from '../../src/synchronization/interfaces';

class TestEventSynchronization extends EventSynchronization {
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super({ activeGuards: vi.fn() } as any);
  }

  getEventQueue = (): string[] => {
    return this.eventQueue;
  };

  getActiveSyncMap = (): Map<string, ActiveSync> => {
    return this.activeSyncMap;
  };

  insertEventIntoQueue = (value: string): void => {
    this.eventQueue.push(value);
  };

  insertEventIntoActiveSync = (
    eventId: string,
    activeSync: ActiveSync,
  ): void => {
    this.activeSyncMap.set(eventId, activeSync);
  };

  callVerifySynchronizationResponse = (
    tx: PaymentTransaction,
    actualTxId: string,
  ) => this.verifySynchronizationResponse(tx, actualTxId);

  callSetTxAsApproved = (tx: PaymentTransaction) => this.setTxAsApproved(tx);
}

export default TestEventSynchronization;
