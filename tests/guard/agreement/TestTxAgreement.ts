import TxAgreement from '../../../src/guard/agreement/TxAgreement';
import { PaymentTransaction } from '../../../src/models/Models';
import { AgreementPayload } from '../../../src/guard/agreement/Interfaces';

class TestTxAgreement extends TxAgreement {
  getTransactions = (): Map<string, PaymentTransaction> => {
    return this.transactions;
  };

  getEventAgreedTransactions = (): Map<string, string> => {
    return this.eventAgreedTransactions;
  };

  getTransactionApprovals = (): Map<string, AgreementPayload[]> => {
    return this.transactionApprovals;
  };

  insertTransactions = (key: string, value: PaymentTransaction): void => {
    this.transactions.set(key, value);
  };

  insertEventAgreedTransactions = (key: string, value: string): void => {
    this.eventAgreedTransactions.set(key, value);
  };

  insertTransactionApprovals = (
    key: string,
    value: AgreementPayload[]
  ): void => {
    this.transactionApprovals.set(key, value);
  };
}

export default TestTxAgreement;
