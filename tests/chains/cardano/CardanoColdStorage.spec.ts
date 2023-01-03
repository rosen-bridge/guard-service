import TestBoxes from './testUtils/TestBoxes';
import { expect } from 'chai';
import CardanoColdStorage from '../../../src/chains/cardano/CardanoColdStorage';
import { UtxoBoxesAssets } from '../../../src/chains/cardano/models/Interfaces';
import {
  AssetName,
  BigNum,
  MultiAsset,
  ScriptHash,
} from '@emurgo/cardano-serialization-lib-nodejs';
import {
  mockKoiosGetAddressAssets,
  mockKoiosGetAddressInfo,
} from './mocked/MockedKoios';
import Utils from '../../../src/helpers/Utils';
import { mockTrackAndFilterLockBoxes } from '../mocked/MockedCardanoTrack';

describe('CardanoColdStorage', () => {
  const testBankAddress = TestBoxes.testBankAddress;

  describe('generateTransaction', () => {
    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock transferringAssets contains no token (ada only)
     *    Mock KoiosApi getAddressBoxes to return test bank boxes (only ada greater than high threshold)
     *    Mock KoiosApi getAddressInfo to return lock address balance
     *    Mock KoiosApi getAddressAssets to return test assets (only ada greater than high threshold)
     *    Run test
     *    Run CardanoColdStorage verifyTransaction method. It should return true
     * Expected Output:
     *    Tx generated and verified successfully
     */
    it('should generate a valid transaction when ada is more than its high threshold', async () => {
      const mockedLockInfoAndAssets =
        TestBoxes.mockHighAdaAddressInfoAndAssets();
      // mock transferringAssets
      const transferringAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('260000000'),
        assets: MultiAsset.new(),
      };
      // mock bank boxes
      mockTrackAndFilterLockBoxes(mockedLockInfoAndAssets[0].utxo_set);
      mockKoiosGetAddressInfo(testBankAddress, mockedLockInfoAndAssets[0]);
      mockKoiosGetAddressAssets(testBankAddress, mockedLockInfoAndAssets[1]);

      // run test
      const tx = await CardanoColdStorage.generateTransaction(
        transferringAssets
      );

      // verify
      const res = await CardanoColdStorage.verifyTransaction(tx);
      expect(res).to.be.true;
    });

    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock transferringAssets contains no token (ada only)
     *    Mock KoiosApi getAddressBoxes to return test bank boxes (ada and one token are greater than high threshold)
     *    Mock KoiosApi getAddressInfo to return lock address balance
     *    Mock KoiosApi getAddressAssets to return test assets (ada and one token are greater than high threshold)
     *    Run test
     *    Run CardanoColdStorage verifyTransaction method. It should return true
     * Expected Output:
     *    Tx generated and verified successfully
     */
    it('should generate a valid transaction when ada and at least one token are more than their high threshold', async () => {
      const mockedLockInfoAndAssets =
        TestBoxes.mockHighAssetAddressInfoAndAssets();
      // mock transferringAssets
      const assets = MultiAsset.new();
      assets.set_asset(
        ScriptHash.from_hex(
          '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130'
        ),
        AssetName.new(Utils.hexStringToUint8Array('1111111111')),
        BigNum.from_str('515000000000')
      );
      const transferringAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('260000000'),
        assets: assets,
      };
      // mock bank boxes
      mockTrackAndFilterLockBoxes(mockedLockInfoAndAssets[0].utxo_set);
      mockKoiosGetAddressInfo(testBankAddress, mockedLockInfoAndAssets[0]);
      mockKoiosGetAddressAssets(testBankAddress, mockedLockInfoAndAssets[1]);

      // run test
      const tx = await CardanoColdStorage.generateTransaction(
        transferringAssets
      );

      // verify
      const res = await CardanoColdStorage.verifyTransaction(tx);
      expect(res).to.be.true;
    });
  });

  describe('verifyTransaction', () => {
    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return lock address balance
     *    Mock KoiosApi getAddressAssets to return test assets (only ada greater than high threshold)
     *    Mock a valid cold storage transaction
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should verify the transaction
     */
    it('should agree to a fine cold storage tx', async () => {
      const mockedLockInfoAndAssets =
        TestBoxes.mockHighAdaAddressInfoAndAssets();
      // mock lock address info and assets
      mockKoiosGetAddressInfo(testBankAddress, mockedLockInfoAndAssets[0]);
      mockKoiosGetAddressAssets(testBankAddress, mockedLockInfoAndAssets[1]);
      // mock test tx
      const tx = TestBoxes.mockFineColdStorageTx();

      // run test
      const res = await CardanoColdStorage.verifyTransaction(tx);
      expect(res).to.be.true;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return lock address balance
     *    Mock KoiosApi getAddressAssets to return test assets (only ada greater than high threshold)
     *    Mock a cold storage transaction containing additional output box
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx with additional outputs', async () => {
      const mockedLockInfoAndAssets =
        TestBoxes.mockHighAdaAddressInfoAndAssets();
      // mock lock address info and assets
      mockKoiosGetAddressInfo(testBankAddress, mockedLockInfoAndAssets[0]);
      mockKoiosGetAddressAssets(testBankAddress, mockedLockInfoAndAssets[1]);
      // mock test tx
      const tx = TestBoxes.mock3outBoxColdStorageTx();

      // run test
      const res = await CardanoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return lock address balance
     *    Mock KoiosApi getAddressAssets to return test assets (only ada greater than high threshold)
     *    Mock a cold storage transaction containing invalid coldBox address
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx with wrong cold box address', async () => {
      const mockedLockInfoAndAssets =
        TestBoxes.mockHighAdaAddressInfoAndAssets();
      // mock lock address info and assets
      mockKoiosGetAddressInfo(testBankAddress, mockedLockInfoAndAssets[0]);
      mockKoiosGetAddressAssets(testBankAddress, mockedLockInfoAndAssets[1]);
      // mock test tx
      const tx = TestBoxes.mockInvalidColdAddressColdStorageTx();

      // run test
      const res = await CardanoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return lock address balance
     *    Mock KoiosApi getAddressAssets to return test assets (only ada greater than high threshold)
     *    Mock a cold storage transaction containing invalid changeBox address
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx with wrong change box address', async () => {
      const mockedLockInfoAndAssets =
        TestBoxes.mockHighAdaAddressInfoAndAssets();
      // mock lock address info and assets
      mockKoiosGetAddressInfo(testBankAddress, mockedLockInfoAndAssets[0]);
      mockKoiosGetAddressAssets(testBankAddress, mockedLockInfoAndAssets[1]);
      // mock test tx
      const tx = TestBoxes.mockInvalidChangeAddressColdStorageTx();

      // run test
      const res = await CardanoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return lock address balance
     *    Mock KoiosApi getAddressAssets to return test assets (only ada greater than high threshold)
     *    Mock a cold storage transaction containing metadata
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx with metadata', async () => {
      const mockedLockInfoAndAssets =
        TestBoxes.mockHighAdaAddressInfoAndAssets();
      // mock lock address info and assets
      mockKoiosGetAddressInfo(testBankAddress, mockedLockInfoAndAssets[0]);
      mockKoiosGetAddressAssets(testBankAddress, mockedLockInfoAndAssets[1]);
      // mock test tx
      const tx = TestBoxes.mockColdStorageTxWithMetadata();

      // run test
      const res = await CardanoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return lock address balance
     *    Mock KoiosApi getAddressAssets to return test assets (only ada greater than high threshold)
     *    Mock a cold storage transaction containing invalid tx fee
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx with additional tx fee', async () => {
      const mockedLockInfoAndAssets =
        TestBoxes.mockHighAdaAddressInfoAndAssets();
      // mock lock address info and assets
      mockKoiosGetAddressInfo(testBankAddress, mockedLockInfoAndAssets[0]);
      mockKoiosGetAddressAssets(testBankAddress, mockedLockInfoAndAssets[1]);
      // mock test tx
      const tx = TestBoxes.mockColdStorageTxWithAdditionalFee();

      // run test
      const res = await CardanoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return lock address balance
     *    Mock KoiosApi getAddressAssets to return test assets (only ada greater than high threshold)
     *    Mock a cold storage transaction that transfers more than allowed amount of ada
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx that transfers more than allowed amount of ada', async () => {
      const mockedLockInfoAndAssets =
        TestBoxes.mockHighAdaAddressInfoAndAssets();
      // mock lock address info and assets
      mockKoiosGetAddressInfo(testBankAddress, mockedLockInfoAndAssets[0]);
      mockKoiosGetAddressAssets(testBankAddress, mockedLockInfoAndAssets[1]);
      // mock test tx
      const tx = TestBoxes.mockHighAdaColdStorageTx();

      // run test
      const res = await CardanoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return lock address balance
     *    Mock KoiosApi getAddressAssets to return test assets (only ada greater than high threshold)
     *    Mock a cold storage transaction that transfers more than allowed amount of an asset
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx that transfers more than allowed amount of an asset', async () => {
      const mockedLockInfoAndAssets =
        TestBoxes.mockHighAssetAddressInfoAndAssets();
      // mock lock address info and assets
      mockKoiosGetAddressInfo(testBankAddress, mockedLockInfoAndAssets[0]);
      mockKoiosGetAddressAssets(testBankAddress, mockedLockInfoAndAssets[1]);
      // mock test tx
      const tx = TestBoxes.mockHighAssetColdStorageTx();

      // run test
      const res = await CardanoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return lock address balance
     *    Mock KoiosApi getAddressAssets to return test assets (only ada greater than high threshold)
     *    Mock a cold storage transaction that does NOT transfer enough ada
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx that does NOT transfer enough ada', async () => {
      const mockedLockInfoAndAssets =
        TestBoxes.mockHighAdaAddressInfoAndAssets();
      // mock lock address info and assets
      mockKoiosGetAddressInfo(testBankAddress, mockedLockInfoAndAssets[0]);
      mockKoiosGetAddressAssets(testBankAddress, mockedLockInfoAndAssets[1]);
      // mock test tx
      const tx = TestBoxes.mockLowAdaColdStorageTx();

      // run test
      const res = await CardanoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });
  });
});
