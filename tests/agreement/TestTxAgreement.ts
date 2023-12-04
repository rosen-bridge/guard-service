import { PaymentTransaction } from '@rosen-chains/abstract-chain';
import {
  ApprovedCandidate,
  CandidateTransaction,
} from '../../src/agreement/Interfaces';
import TxAgreement from '../../src/agreement/TxAgreement';

class TestTxAgreement extends TxAgreement {
  constructor() {
    super();
  }

  getTransactionQueue = (): PaymentTransaction[] => {
    return this.transactionQueue;
  };

  getTransactions = (): Map<string, CandidateTransaction> => {
    return this.transactions;
  };

  getEventAgreedTransactions = (): Map<string, string> => {
    return this.eventAgreedTransactions;
  };

  getAgreedColdStorageTransactions = (): Map<string, string> => {
    return this.agreedColdStorageTransactions;
  };

  getTransactionApprovals = (): Map<string, string[]> => {
    return this.transactionApprovals;
  };

  getApprovedTransactions = (): ApprovedCandidate[] => {
    return this.approvedTransactions;
  };

  insertTransactions = (key: string, value: CandidateTransaction): void => {
    this.transactions.set(key, value);
  };

  insertTransactionintoQueue = (value: PaymentTransaction): void => {
    this.transactionQueue.push(value);
  };

  insertEventAgreedTransactions = (key: string, value: string): void => {
    this.eventAgreedTransactions.set(key, value);
  };

  insertAgreedColdStorageTransactions = (key: string, value: string): void => {
    this.agreedColdStorageTransactions.set(key, value);
  };

  insertTransactionApprovals = (key: string, value: string[]): void => {
    this.transactionApprovals.set(key, value);
  };

  insertApprovedTransactions = (value: ApprovedCandidate): void => {
    this.approvedTransactions.push(value);
  };

  callVerifyTransactionRequest = (tx: PaymentTransaction, creatorId: number) =>
    this.verifyTransactionRequest(tx, creatorId);

  callSetTxAsApproved = (tx: PaymentTransaction) => this.setTxAsApproved(tx);

  callUpdateEventOfApprovedTx = (tx: PaymentTransaction) =>
    this.updateEventOfApprovedTx(tx);

  getSigner = () => this.signer;
}

export default TestTxAgreement;
