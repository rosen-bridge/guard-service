import { PaymentTransaction } from '@rosen-chains/abstract-chain';
import GuardPkHandler from '../../src/handlers/GuardPkHandler';
import EventSynchronization from '../../src/synchronization/EventSynchronization';
import { ActiveSync } from '../../src/synchronization/Interfaces';

class TestEventSynchronization extends EventSynchronization {
  constructor() {
    super(GuardPkHandler.getInstance().publicKeys, {
      activeGuards: vi.fn(),
    } as any);
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
    activeSync: ActiveSync
  ): void => {
    this.activeSyncMap.set(eventId, activeSync);
  };

  callVerifySynchronizationResponse = (tx: PaymentTransaction) =>
    this.verifySynchronizationResponse(tx);

  callSetTxAsApproved = (tx: PaymentTransaction) => this.setTxAsApproved(tx);
}

export default TestEventSynchronization;
