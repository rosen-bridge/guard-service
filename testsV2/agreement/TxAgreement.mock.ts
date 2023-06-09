import { Mock } from 'vitest';
import TxAgreement from '../../src/agreement/TxAgreement';
import { PaymentTransaction } from '../../src/models/Models';

class TxAgreementMock {
  private static mockedTxAgreement: Record<string, any>;

  /**
   * resets all mocked functions of txAgreement
   */
  static resetMock = () => {
    this.mockedTxAgreement = {};
  };

  /**
   * mocks TxAgreement.getInstance to return mocked object
   */
  static mock = () => {
    const functionSpy = vi.spyOn(TxAgreement, 'getInstance');
    functionSpy.mockResolvedValue(this.mockedTxAgreement as TxAgreement);
  };

  /**
   * mocks TxAgreement.getChainPendingTransactions to return `result`
   * @param result
   */
  static mockGetChainPendingTransactions = (result: PaymentTransaction[]) => {
    this.mockedTxAgreement.getChainPendingTransactions = vi.fn();
    const functionSpy = vi.spyOn(
      this.mockedTxAgreement,
      'getChainPendingTransactions'
    );
    functionSpy.mockReturnValue(result);
  };

  /**
   * mocks TxAgreement.addTransactionToQueue
   * @param result
   */
  static mockAddTransactionToQueue = () => {
    this.mockedTxAgreement.addTransactionToQueue = vi.fn();
    const functionSpy = vi.spyOn(
      this.mockedTxAgreement,
      'addTransactionToQueue'
    );
    functionSpy.mockImplementation(() => null);
  };

  /**
   * returns vitest mock object of the corresponding function
   * @param name function name
   * @returns the mock object
   */
  static getMockedFunction = (name: string): Mock<any, any> => {
    return this.mockedTxAgreement[name];
  };
}

export default TxAgreementMock;
