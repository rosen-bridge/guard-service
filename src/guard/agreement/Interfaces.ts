import { PaymentTransaction } from '../../models/Models';

interface AgreementPayload {
  guardId: number;
  signature: string;
}

interface CandidateTransaction extends AgreementPayload {
  txJson: string;
}

interface GuardsAgreement extends AgreementPayload {
  txId: string;
  agreed: boolean;
}

interface TransactionApproved {
  txJson: string;
  guardsSignatures: AgreementPayload[];
}

interface AgreementMessage {
  type: 'request' | 'response' | 'approval';
  payload: AgreementPayload | TransactionApproved;
}

interface AgreementApproved {
  tx: PaymentTransaction;
  approvals: AgreementPayload[];
}

export type {
  AgreementPayload,
  CandidateTransaction,
  GuardsAgreement,
  TransactionApproved,
  AgreementMessage,
  AgreementApproved,
};
