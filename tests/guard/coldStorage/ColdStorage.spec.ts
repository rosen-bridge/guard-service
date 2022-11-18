import ErgoTestBoxes from '../../chains/ergo/testUtils/TestBoxes';
import {
  mockStartAgreementProcess,
  resetMockedTxAgreement,
  verifyStartAgreementProcessCalledOnce,
  verifyStartAgreementProcessDidntGetCalled,
} from '../mocked/MockedTxAgreement';
import { mockExplorerGetAddressAssets } from '../../chains/ergo/mocked/MockedExplorer';
import ErgoConfigs from '../../../src/chains/ergo/helpers/ErgoConfigs';
import {
  mockErgoColdStorageGenerateTx,
  resetMockedErgoColdStorage,
  verifyErgoColdStorageGenerateTxCalledOnce,
  verifyErgoColdStorageGenerateTxDidntGetCalled,
} from '../../chains/mocked/MockedErgoColdStorage';
import ColdStorage from '../../../src/guard/coldStorage/ColdStorage';
import CardanoConfigs from '../../../src/chains/cardano/helpers/CardanoConfigs';
import CardanoTestBoxes from '../../chains/cardano/testUtils/TestBoxes';
import {
  mockKoiosGetAddressAssets,
  mockKoiosGetAddressInfo,
} from '../../chains/cardano/mocked/MockedKoios';
import {
  mockCardanoColdStorageGenerateTx,
  resetMockedCardanoColdStorage,
  verifyCardanoColdStorageGenerateTxCalledOnce,
  verifyCardanoColdStorageGenerateTxDidntGetCalled,
} from '../../chains/mocked/MockedCardanoColdStorage';

describe('ColdStorage', () => {
  describe('processErgoStorageAssets', () => {
    beforeEach('reset mocks', async () => {
      resetMockedErgoColdStorage();
      resetMockedTxAgreement();
    });

    /**
     * Target: testing processErgoStorageAssets
     * Dependencies:
     *    ExplorerApi
     *    ErgoColdStorage
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets (no asset is more than its high threshold)
     *    Run test
     *    Check ErgoColdStorage generateTransaction method. It should not have called
     *    Check TxAgreement startAgreementProcess method. It should not have called
     * Expected Output:
     *    No tx generated
     */
    it('should not generate any transaction if erg and all tokens are less than their high threshold', async () => {
      // mock address assets
      mockExplorerGetAddressAssets(
        ErgoConfigs.ergoContractConfig.lockAddress,
        ErgoTestBoxes.mediumAddressAssets
      );

      // run test
      await ColdStorage.processErgoStorageAssets();

      // verify
      verifyErgoColdStorageGenerateTxDidntGetCalled();
      verifyStartAgreementProcessDidntGetCalled();
    });

    /**
     * Target: testing processErgoStorageAssets
     * Dependencies:
     *    ExplorerApi
     *    ErgoColdStorage
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets (only erg is more than its high threshold)
     *    Mock ErgoColdStorage generateTransaction
     *    Mock TxAgreement startAgreementProcess
     *    Run test
     *    Check ErgoColdStorage generateTransaction method. It should have called once
     *    Check TxAgreement startAgreementProcess method. It should have called once
     * Expected Output:
     *    No tx generated
     */
    it('should generate a transaction if only erg is more than its high threshold', async () => {
      // mock address assets
      mockExplorerGetAddressAssets(
        ErgoConfigs.ergoContractConfig.lockAddress,
        ErgoTestBoxes.highErgAddressAssets
      );

      // mock generateTransaction and startAgreementProcess
      const mockedTx = ErgoTestBoxes.mockErgoTransaction();
      mockErgoColdStorageGenerateTx(mockedTx);
      mockStartAgreementProcess(mockedTx);

      // run test
      await ColdStorage.processErgoStorageAssets();

      // verify
      verifyErgoColdStorageGenerateTxCalledOnce();
      verifyStartAgreementProcessCalledOnce(mockedTx);
    });

    /**
     * Target: testing processErgoStorageAssets
     * Dependencies:
     *    ExplorerApi
     *    ErgoColdStorage
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets (one tokens is more than its high threshold)
     *    Mock ErgoColdStorage generateTransaction
     *    Mock TxAgreement startAgreementProcess
     *    Run test
     *    Check ErgoColdStorage generateTransaction method. It should have called once
     *    Check TxAgreement startAgreementProcess method. It should have called once
     * Expected Output:
     *    No tx generated
     */
    it('should generate a transaction if at least one token is more than its high threshold', async () => {
      // mock address assets
      mockExplorerGetAddressAssets(
        ErgoConfigs.ergoContractConfig.lockAddress,
        ErgoTestBoxes.highErgAddressAssets
      );

      // mock generateTransaction and startAgreementProcess
      const mockedTx = ErgoTestBoxes.mockErgoTransaction();
      mockErgoColdStorageGenerateTx(mockedTx);
      mockStartAgreementProcess(mockedTx);

      // run test
      await ColdStorage.processErgoStorageAssets();

      // verify
      verifyErgoColdStorageGenerateTxCalledOnce();
      verifyStartAgreementProcessCalledOnce(mockedTx);
    });
  });

  describe('processCardanoStorageAssets', () => {
    beforeEach('reset mocks', async () => {
      resetMockedCardanoColdStorage();
      resetMockedTxAgreement();
    });

    /**
     * Target: testing processCardanoStorageAssets
     * Dependencies:
     *    KoiosApi
     *    CardanoColdStorage
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return test lovelace balance (within threshold)
     *    Mock KoiosApi getAddressAssets to return test assets (no asset is more than its high threshold)
     *    Run test
     *    Check CardanoColdStorage generateTransaction method. It should not have called
     *    Check TxAgreement startAgreementProcess method. It should not have called
     * Expected Output:
     *    No tx generated
     */
    it('should not generate any transaction if lovelace and all assets are less than their high threshold', async () => {
      // mock address info and assets
      mockKoiosGetAddressInfo(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumLovelaceAddressInfo
      );
      mockKoiosGetAddressAssets(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumAddressAssets
      );

      // run test
      await ColdStorage.processCardanoStorageAssets();

      // verify
      verifyCardanoColdStorageGenerateTxDidntGetCalled();
      verifyStartAgreementProcessDidntGetCalled();
    });

    /**
     * Target: testing processCardanoStorageAssets
     * Dependencies:
     *    KoiosApi
     *    CardanoColdStorage
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return test lovelace balance (within threshold)
     *    Mock KoiosApi getAddressAssets to return test assets (only lovelace is more than its high threshold)
     *    Mock CardanoColdStorage generateTransaction
     *    Mock TxAgreement startAgreementProcess
     *    Run test
     *    Check CardanoColdStorage generateTransaction method. It should have called once
     *    Check TxAgreement startAgreementProcess method. It should have called once
     * Expected Output:
     *    No tx generated
     */
    it('should generate a transaction if only lovelace is more than its high threshold', async () => {
      // mock address info and assets
      mockKoiosGetAddressInfo(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.highLovelaceAddressInfo
      );
      mockKoiosGetAddressAssets(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumAddressAssets
      );

      // mock generateTransaction and startAgreementProcess
      const mockedTx = CardanoTestBoxes.mockCardanoTransaction();
      mockCardanoColdStorageGenerateTx(mockedTx);
      mockStartAgreementProcess(mockedTx);

      // run test
      await ColdStorage.processCardanoStorageAssets();

      // verify
      verifyCardanoColdStorageGenerateTxCalledOnce();
      verifyStartAgreementProcessCalledOnce(mockedTx);
    });

    /**
     * Target: testing processCardanoStorageAssets
     * Dependencies:
     *    KoiosApi
     *    CardanoColdStorage
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return test lovelace balance (within threshold)
     *    Mock KoiosApi getAddressAssets to return test assets (one asset is more than its high threshold)
     *    Mock CardanoColdStorage generateTransaction
     *    Mock TxAgreement startAgreementProcess
     *    Run test
     *    Check CardanoColdStorage generateTransaction method. It should have called once
     *    Check TxAgreement startAgreementProcess method. It should have called once
     * Expected Output:
     *    No tx generated
     */
    it('should generate a transaction if at least one asset is more than its high threshold', async () => {
      // mock address info and assets
      mockKoiosGetAddressInfo(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumLovelaceAddressInfo
      );
      mockKoiosGetAddressAssets(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.highAssetAddressAssets
      );

      // mock generateTransaction and startAgreementProcess
      const mockedTx = CardanoTestBoxes.mockCardanoTransaction();
      mockCardanoColdStorageGenerateTx(mockedTx);
      mockStartAgreementProcess(mockedTx);

      // run test
      await ColdStorage.processCardanoStorageAssets();

      // verify
      verifyCardanoColdStorageGenerateTxCalledOnce();
      verifyStartAgreementProcessCalledOnce(mockedTx);
    });
  });
});
