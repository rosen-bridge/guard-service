import { PaymentTransaction } from '@rosen-chains/abstract-chain';

interface CandidateTransaction {
  tx: PaymentTransaction;
  timestamp: number;
}

interface TransactionRequest {
  txJson: string;
}

interface GuardResponse {
  txId: string;
}

interface TransactionApproved {
  txJson: string;
  signatures: string[];
}

interface ApprovedCandidate {
  tx: PaymentTransaction;
  signatures: string[];
  timestamp: number;
}

class AgreementMessageTypes {
  static request = 'request';
  static response = 'response';
  static approval = 'approval';
}

export type {
  CandidateTransaction,
  TransactionRequest,
  GuardResponse,
  TransactionApproved,
  ApprovedCandidate,
};

export { AgreementMessageTypes };
