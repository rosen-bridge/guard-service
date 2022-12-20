import ErgoTestBoxes from '../../chains/ergo/testUtils/TestBoxes';
import {
  mockStartAgreementProcess,
  resetMockedTxAgreement,
  verifyStartAgreementProcessCalledOnce,
  verifyStartAgreementProcessDidntGetCalled,
} from '../mocked/MockedTxAgreement';
import {
  mockExplorerGetAddressAssets,
  resetMockedExplorerApi,
  verifyExplorerGetAddressAssetsDidntGetCalled,
} from '../../chains/ergo/mocked/MockedExplorer';
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
  resetKoiosApiCalls,
  verifyKoiosGetAddressInfoDidntGetCalled,
} from '../../chains/cardano/mocked/MockedKoios';
import {
  mockCardanoColdStorageGenerateTx,
  resetMockedCardanoColdStorage,
  verifyCardanoColdStorageGenerateTxCalledOnce,
  verifyCardanoColdStorageGenerateTxDidntGetCalled,
} from '../../chains/mocked/MockedCardanoColdStorage';
import { reset, spy, when } from 'ts-mockito';
import { expect } from 'chai';
import ColdStorageConfig from '../../../src/guard/coldStorage/ColdStorageConfig';
import TestBoxes from '../../chains/ergo/testUtils/TestBoxes';
import {
  clearTables,
  insertTxRecord,
} from '../../db/mocked/MockedScannerModel';
import { TransactionStatus } from '../../../src/models/Models';

describe('ColdStorage', () => {
  describe('processErgoStorageAssets', () => {
    beforeEach('reset mocks', async () => {
      await clearTables();
      resetMockedExplorerApi();
      resetMockedErgoColdStorage();
      resetMockedTxAgreement();
    });

    /**
     * Target: testing processErgoStorageAssets
     * Dependencies:
     *    ExplorerApi
     *    ErgoColdStorage
     * Scenario:
     *    Mock a cold storage tx and insert into database
     *    Run test
     *    Check ExplorerApi getAddressAssets method. It should not have called
     *    Check CardanoColdStorage generateTransaction method. It should not have called
     *    Check TxAgreement startAgreementProcess method. It should not have called
     * Expected Output:
     *    No tx generated
     */
    it('should not do anything if there is already an active cold storage transaction in progress', async () => {
      // mock tx
      const inProgressTx = ErgoTestBoxes.mockFineColdStorageTransaction(
        TestBoxes.mockHighErgAssetsAndBankBoxes()[1].boxes
      );
      await insertTxRecord(
        inProgressTx,
        inProgressTx.txType,
        inProgressTx.network,
        TransactionStatus.approved,
        0,
        inProgressTx.eventId
      );

      // run test
      await ColdStorage.processErgoStorageAssets();

      // verify
      verifyExplorerGetAddressAssetsDidntGetCalled();
      verifyErgoColdStorageGenerateTxDidntGetCalled();
      verifyStartAgreementProcessDidntGetCalled();
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
        ErgoTestBoxes.highTokenAddressAssets
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
      await clearTables();
      resetKoiosApiCalls();
      resetMockedCardanoColdStorage();
      resetMockedTxAgreement();
    });

    /**
     * Target: testing processCardanoStorageAssets
     * Dependencies:
     *    KoiosApi
     *    CardanoColdStorage
     * Scenario:
     *    Mock a cold storage tx and insert into database
     *    Run test
     *    Check KoiosApi getAddressInfo method. It should not have called
     *    Check CardanoColdStorage generateTransaction method. It should not have called
     *    Check TxAgreement startAgreementProcess method. It should not have called
     * Expected Output:
     *    No tx generated
     */
    it('should not do anything if there is already an active cold storage transaction in progress', async () => {
      // mock tx
      const inProgressTx = CardanoTestBoxes.mockFineColdStorageTx();
      await insertTxRecord(
        inProgressTx,
        inProgressTx.txType,
        inProgressTx.network,
        TransactionStatus.approved,
        0,
        inProgressTx.eventId
      );

      // run test
      await ColdStorage.processCardanoStorageAssets();

      // verify
      verifyKoiosGetAddressInfoDidntGetCalled();
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

  describe('ColdStorageConfig', () => {
    describe('isWithinTime', () => {
      const currentTimeStamp = 1658005354291000;

      /**
       * Target: testing ColdStorageConfig.isWithinTime
       * Dependencies:
       *    Date.now()
       * Scenario:
       *    Mock Date to return testing currentTimeStamp
       *    Run test
       *    Check return value. it should be true.
       *    Reset mocked Date
       * Expected Output:
       *    No tx generated
       */
      it('should return true when current timestamp is within config hours', async () => {
        // mock Date
        const date = spy(Date);
        when(date.now()).thenReturn(currentTimeStamp);

        // run test
        const result = ColdStorageConfig.isWithinTime();
        expect(result).to.equal(true);

        // reset mocked Date object
        reset(date);
      });
    });
  });
});
