import { PaymentTransaction } from '@rosen-chains/abstract-chain';

export interface ActiveSync {
  timestamp: number;
  responses: Array<PaymentTransaction | undefined>;
}

export interface SyncRequest {
  eventId: string;
}

export interface SyncResponse {
  txJson: string;
}

export enum SynchronizationMessageTypes {
  request = 'request',
  response = 'response',
}
