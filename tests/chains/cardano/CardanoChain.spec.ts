import CardanoChain from '../../../src/chains/cardano/CardanoChain';
import {
  EventTrigger,
  TransactionStatus,
  TransactionTypes,
} from '../../../src/models/Models';
import TestBoxes from './testUtils/TestBoxes';
import { expect } from 'chai';
import { Utxo } from '../../../src/chains/cardano/models/Interfaces';
import { anything, deepEqual, spy, verify, when } from 'ts-mockito';
import { hash_transaction } from '@emurgo/cardano-serialization-lib-nodejs';
import MockedBlockFrost from './mocked/MockedBlockFrost';
import TestUtils from '../../testUtils/TestUtils';
import { beforeEach } from 'mocha';
import TssSigner from '../../../src/guard/TssSigner';
import {
  allTxRecords,
  clearTables,
  insertTxRecord,
} from '../../db/mocked/MockedScannerModel';
import CardanoTransaction from '../../../src/chains/cardano/models/CardanoTransaction';
import ChainsConstants from '../../../src/chains/ChainsConstants';
import Utils from '../../../src/helpers/Utils';
import {
  TssFailedSign,
  TssSuccessfulSign,
} from '../../../src/models/Interfaces';
import { Fee } from '@rosen-bridge/minimum-fee';
import CardanoTxVerifier from '../../../src/chains/cardano/CardanoTxVerifier';
import {
  mockCardanoHasLockAddressEnoughAssets,
  mockTrackAndFilterLockBoxes,
} from '../mocked/MockedCardanoTrack';
import { NotEnoughAssetsError } from '../../../src/helpers/errors';
import TestConfigs from '../../testUtils/TestConfigs';

describe('CardanoChain', () => {
  const testBankAddress = TestBoxes.testBankAddress;

  describe('generateTransaction', () => {
    // mock getting bankBoxes
    const bankBoxes: Utxo[] = TestBoxes.mockBankBoxes();
    const mockedFeeConfig: Fee = {
      feeRatio: 1n,
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };

    beforeEach('mock dependencies', () => {
      mockTrackAndFilterLockBoxes(bankBoxes);
      mockCardanoHasLockAddressEnoughAssets(true);
    });

    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    BlockFrostApi
     *    KoiosApi
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should generate an ADA payment tx and verify it successfully', async () => {
      // mock ada payment event
      const mockedEvent: EventTrigger = TestBoxes.mockADAPaymentEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const tx = await cardanoChain.generateTransaction(
        mockedEvent,
        mockedFeeConfig
      );

      // verify tx
      const isValid = await CardanoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.true;
    });

    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    BlockFrostApi
     *    KoiosApi
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should generate an Asset payment tx and verify it successfully', async () => {
      // mock asset payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const tx = await cardanoChain.generateTransaction(
        mockedEvent,
        mockedFeeConfig
      );

      // verify tx
      const isValid = await CardanoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.true;
    });

    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    KoiosApi
     * Expected Output:
     *    The function should throw error
     */
    it('should throw NotEnoughAssetsError when there is not enough assets to generate transaction', async () => {
      // mock ada payment event
      const mockedEvent: EventTrigger = TestBoxes.mockADAPaymentEventTrigger();
      mockCardanoHasLockAddressEnoughAssets(false);

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      await expect(
        cardanoChain.generateTransaction(mockedEvent, mockedFeeConfig)
      ).to.eventually.be.rejectedWith(NotEnoughAssetsError);
    });
  });

  describe('requestToSignTransaction', () => {
    beforeEach('clear database tables', async () => {
      await clearTables();
    });

    /**
     * Target: testing requestToSignTransaction
     * Dependencies:
     *    -
     * Expected Output:
     *    It should insert right record into database
     */
    it('should update tx status in db and send request to TSS signer successfully', async () => {
      // create test data
      const cardanoChain: CardanoChain = new CardanoChain();
      const tx = TestBoxes.mockTwoAssetsTransferringPaymentTransaction(
        TestBoxes.mockAssetPaymentEventTrigger(),
        testBankAddress
      );
      await insertTxRecord(
        tx,
        TransactionTypes.payment,
        ChainsConstants.cardano,
        TransactionStatus.approved,
        0,
        tx.eventId
      );
      const mockedTssSigner = spy(TssSigner);
      const txHash = hash_transaction(
        cardanoChain.deserialize(tx.txBytes).body()
      ).to_bytes();
      when(mockedTssSigner.signTxHash(anything())).thenResolve();

      // run test
      await cardanoChain.requestToSignTransaction(tx);

      // verify db changes
      verify(mockedTssSigner.signTxHash(deepEqual(txHash))).once();
      const dbTxs = await allTxRecords();
      expect(dbTxs.map((tx) => [tx.txId, tx.status])[0]).to.deep.equal([
        tx.txId,
        TransactionStatus.inSign,
      ]);
    });
  });

  describe('signTransaction', () => {
    beforeEach('clear test sign database Cardano signs table', async () => {
      await clearTables();
    });

    /**
     * Target: testing signTransaction
     * Dependencies:
     *    -
     * Expected Output:
     *    It should return the signed tx with the same body and the signature as it's witness
     */
    it('should sign a transaction successfully', async () => {
      // mock TssSigner return value
      const mockedSignTxHash =
        '4d9794972a26d36ebc35c819ef3c8eea80bd451e497ac89a7303dd3025714cb235fcad6621778fdbd99b56753e6493ea646ac7ade8f30fed7dca7138c741fe02';
      const expectedResult =
        '825820bcb07faa6c0f19e2f2587aa9ef6f43a68fc0135321216a71dc87c8527af4ca6a58404d9794972a26d36ebc35c819ef3c8eea80bd451e497ac89a7303dd3025714cb235fcad6621778fdbd99b56753e6493ea646ac7ade8f30fed7dca7138c741fe02';

      // create test data
      const cardanoChain: CardanoChain = new CardanoChain();
      const cardanoTx = TestBoxes.mockTwoAssetsTransferringPaymentTransaction(
        TestBoxes.mockAssetPaymentEventTrigger(),
        testBankAddress
      );
      await insertTxRecord(
        cardanoTx,
        TransactionTypes.payment,
        ChainsConstants.cardano,
        TransactionStatus.inSign,
        0,
        cardanoTx.eventId
      );
      const mockedResponse: TssSuccessfulSign = {
        signature: mockedSignTxHash,
        r: '',
        s: '',
        m: cardanoTx.txId,
      };

      // run test
      await cardanoChain.signTransaction(JSON.stringify(mockedResponse), 'ok');

      // verify db changes
      const dbTxs = await allTxRecords();
      expect(
        dbTxs.map((tx) => [tx.txId, tx.status, tx.lastCheck])[0]
      ).to.deep.equal([
        cardanoTx.txId,
        TransactionStatus.signed,
        TestConfigs.cardano.blockchainHeight,
      ]);
      const newCardanoTx = CardanoTransaction.fromJson(dbTxs[0].txJson);

      // verify signedTx txId
      const signedTx = cardanoChain.deserialize(newCardanoTx.txBytes);
      expect(signedTx).to.not.equal(null);
      const signedTxId = Utils.Uint8ArrayToHexString(
        hash_transaction(signedTx.body()).to_bytes()
      );
      expect(signedTxId).to.equal(cardanoTx.txId);

      // verify signedTx signature
      const vKeyWitness = signedTx.witness_set().vkeys()?.get(0);
      expect(vKeyWitness).to.not.equal(undefined);
      const vKeyWitnessHex = Utils.Uint8ArrayToHexString(
        vKeyWitness!.to_bytes()
      );
      expect(vKeyWitnessHex).to.equal(expectedResult);
    });

    /**
     * Target: testing signTransaction
     * Dependencies:
     *    -
     * Scenario:
     *    Mock a Cardano event trigger and insert into db
     *    Mock a Cardano payment transaction based on mocked event and insert into db
     *    Run test (execute signTransaction method of cardanoChain with a failed message)
     *    Check transactions in db. Mocked transaction status should be updated to sign-failed
     * Expected Output:
     *    It should mark the tx as sign-failed
     */
    it('should update the transaction status to sign-failed in db', async () => {
      // create test data
      const cardanoChain: CardanoChain = new CardanoChain();
      const cardanoTx = TestBoxes.mockTwoAssetsTransferringPaymentTransaction(
        TestBoxes.mockAssetPaymentEventTrigger(),
        testBankAddress
      );
      await insertTxRecord(
        cardanoTx,
        TransactionTypes.payment,
        ChainsConstants.cardano,
        TransactionStatus.inSign,
        0,
        cardanoTx.eventId
      );
      const mockedResponse: TssFailedSign = {
        error: 'error message',
        m: cardanoTx.txId,
      };

      // run test
      await cardanoChain.signTransaction(
        JSON.stringify(mockedResponse),
        'error'
      );

      // verify db changes
      const dbTxs = await allTxRecords();
      expect(dbTxs.map((tx) => [tx.txId, tx.status])[0]).to.deep.equal([
        cardanoTx.txId,
        TransactionStatus.signFailed,
      ]);
    });
  });

  describe('submitTransaction', () => {
    beforeEach('reset MockedBlockFrost', () => {
      MockedBlockFrost.resetMockedBlockFrostApi();
    });

    /**
     * Target: testing submitTransaction
     * Dependencies:
     *    BlockFrostApi
     * Expected Output:
     *    It should return true and submit tx without problem
     */
    it('should has called Blockfrost.submit when submit a transaction successfully', async () => {
      const cardanoChain: CardanoChain = new CardanoChain();
      const tx = TestBoxes.mockTwoAssetsTransferringPaymentTransaction(
        TestBoxes.mockAssetPaymentEventTrigger(),
        testBankAddress
      );

      // mock tx submit method
      MockedBlockFrost.mockTxSubmit(anything(), TestUtils.generateRandomId());

      // run test
      await cardanoChain.submitTransaction(tx);
      MockedBlockFrost.verifyTxSubmitCalledOnce(
        cardanoChain.deserialize(tx.txBytes)
      );
    });

    /**
     * Target: testing submitTransaction
     * Dependencies:
     *    BlockFrostApi
     * Expected Output:
     *    It should try to submit and return false
     */
    it('should has called Blockfrost.submit when catch an error while submitting a transaction', async () => {
      const cardanoChain: CardanoChain = new CardanoChain();
      const tx = TestBoxes.mockTwoAssetsTransferringPaymentTransaction(
        TestBoxes.mockAssetPaymentEventTrigger(),
        testBankAddress
      );

      // mock tx submit method
      MockedBlockFrost.mockTxSubmitError(anything());

      // run test
      await cardanoChain.submitTransaction(tx);
      MockedBlockFrost.verifyTxSubmitCalledOnce(
        cardanoChain.deserialize(tx.txBytes)
      );
    });
  });
});
