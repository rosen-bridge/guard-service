export interface ReprocessRequest {
  requestId: string;
  eventTxId: string;
}

export interface ReprocessResponse {
  requestId: string;
  ok: boolean;
}

export enum ReprocessMessageTypes {
  request = 'request',
  response = 'response',
}

export enum ReprocessStatus {
  noResponse = 'no-response',
  accepted = 'accepted',
}
