import { Mock } from 'vitest';
import { txAgreement } from '../../src/guard/agreement/TxAgreement';
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
   * mocks TxAgreement.getChainPendingTransactions to return `result`
   * @param result
   */
  static mockGetChainPendingTransactions = (result: PaymentTransaction[]) => {
    const functionSpy = vi.spyOn(txAgreement, 'getChainPendingTransactions');
    functionSpy.mockReturnValue(result);
  };

  /**
   * mocks TxAgreement.startAgreementProcess
   * @param result
   */
  static mockStartAgreementProcess = () => {
    this.mockedTxAgreement.startAgreementProcess = vi.fn();
    const functionSpy = vi.spyOn(txAgreement, 'startAgreementProcess');
    functionSpy.mockImplementation(
      this.mockedTxAgreement.startAgreementProcess
    );
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
