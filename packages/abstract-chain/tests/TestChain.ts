import {
  AbstractChain,
  PaymentOrder,
  PaymentTransaction,
  TransactionAssetBalance,
  TransactionType,
} from '../lib';
import TestRosenDataExtractor from './extractor/TestRosenDataExtractor';

class TestChain extends AbstractChain<string> {
  NATIVE_TOKEN_ID = 'test-native-token';
  CHAIN = 'test';
  protected extractor = new TestRosenDataExtractor();

  notImplemented = () => {
    throw Error('Not implemented');
  };

  extractTransactionOrder = this.notImplemented;
  verifyTransactionFee = this.notImplemented;
  verifyTransactionExtraConditions = this.notImplemented;
  isTxValid = this.notImplemented;
  signTransaction = this.notImplemented;
  submitTransaction = this.notImplemented;
  isTxInMempool = this.notImplemented;
  getMinimumNativeToken = this.notImplemented;
  PaymentTransactionFromJson = this.notImplemented;
  rawTxToPaymentTransaction = this.notImplemented;
  verifyPaymentTransaction = this.notImplemented;

  generateMultipleTransactions = (
    eventId: string,
    txType: TransactionType,
    order: PaymentOrder,
    unsignedTransactions: PaymentTransaction[],
    serializedSignedTransactions: string[],
    ...extra: Array<any>
  ): Promise<PaymentTransaction[]> => {
    throw Error('Not mocked');
  };

  getTransactionAssets = (
    transaction: PaymentTransaction
  ): Promise<TransactionAssetBalance> => {
    throw Error('Not mocked');
  };

  serializeTx = (tx: string) => tx;
}

export default TestChain;
