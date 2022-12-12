import { anything, deepEqual, resetCalls, spy, verify, when } from 'ts-mockito';
import { EventTrigger, PaymentTransaction } from '../../../src/models/Models';
import CardanoChain from '../../../src/chains/cardano/CardanoChain';
import CardanoTransaction from '../../../src/chains/cardano/models/CardanoTransaction';

class MockedCardanoChain {
  mockedObject: CardanoChain;
  realCardanoChain = new CardanoChain();

  constructor(cardanoChain: CardanoChain) {
    this.mockedObject = spy(cardanoChain);
    when(this.mockedObject.deserialize(anything())).thenCall(
      this.realCardanoChain.deserialize
    );
    when(this.mockedObject.serialize(anything())).thenCall(
      this.realCardanoChain.serialize
    );
  }

  /**
   * mocks CardanoChain generateTransaction method to return tx when called for an event
   * @param event
   * @param tx
   */
  mockGenerateTransaction = (
    event: EventTrigger,
    tx: CardanoTransaction
  ): void => {
    when(
      this.mockedObject.generateTransaction(deepEqual(event), anything())
    ).thenResolve(tx);
  };

  /**
   * mocks CardanoChain generateTransaction method to throw error when called for an event
   * @param event
   * @param error
   */
  mockGenerateTransactionToThrowError = (
    event: EventTrigger,
    error: Error
  ): void => {
    when(
      this.mockedObject.generateTransaction(deepEqual(event), anything())
    ).thenThrow(error);
  };

  /**
   * mocks CardanoChain requestToSignTransaction method when called for a tx
   *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with PaymentTransaction type.
   * @param tx
   */
  mockRequestToSignTransaction = (tx: PaymentTransaction): void => {
    when(this.mockedObject.requestToSignTransaction(anything())).thenResolve();
  };

  /**
   * verifies CardanoChain requestToSignTransaction method called once for tx
   *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with PaymentTransaction type.
   * @param tx
   */
  verifyRequestToSignTransactionCalledOnce = (tx: PaymentTransaction): void => {
    verify(this.mockedObject.requestToSignTransaction(anything())).once();
  };

  /**
   * verifies CardanoChain requestToSignTransaction method didn't get called for tx
   * @param tx
   */
  verifyRequestToSignTransactionDidntCalled = (
    tx: PaymentTransaction
  ): void => {
    verify(this.mockedObject.requestToSignTransaction(deepEqual(tx))).never();
  };

  /**
   * mocks CardanoChain submitTransaction method when called for a tx
   * @param tx
   */
  mockSubmitTransaction = (tx: PaymentTransaction): void => {
    when(this.mockedObject.submitTransaction(anything())).thenResolve();
  };

  /**
   * verifies CardanoChain submitTransaction method called once for tx
   * @param tx
   */
  verifySubmitTransactionCalledOnce = (tx: PaymentTransaction): void => {
    verify(this.mockedObject.submitTransaction(anything())).once();
  };

  /**
   * reset call counts for mocked methods
   */
  resetMockCalls = (): void => {
    resetCalls(this.mockedObject);
  };
}

export default MockedCardanoChain;
