import { mockGetAddressBoxes, mockKoiosGetTxInfo } from './mocked/MockedKoios';
import CardanoChain from '../../../src/chains/cardano/CardanoChain';
import {
  EventTrigger,
  TransactionStatus,
  TransactionTypes,
} from '../../../src/models/Models';
import TestBoxes from './testUtils/TestBoxes';
import TestData from './testUtils/TestData';
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
import sinon from 'sinon';
import CardanoUtils from '../../../src/chains/cardano/helpers/CardanoUtils';
import {
  TssFailedSign,
  TssSuccessfulSign,
} from '../../../src/models/Interfaces';
import CardanoConfigs from '../../../src/chains/cardano/helpers/CardanoConfigs';
import { Fee } from '@rosen-bridge/minimum-fee';

describe('CardanoChain', () => {
  const testBankAddress = TestBoxes.testBankAddress;

  describe('getCoveringUtxo', () => {
    // mock getting bankBoxes
    const bankBoxes: Utxo[] = TestBoxes.mockBankBoxes();
    const mockedFeeConfig: Fee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };

    /**
     * Target: testing getCoveringUtxo
     * Dependencies:
     *    BlockFrostApi
     *    KoiosApi
     * Expected Output:
     *    The function should return 1 specific box
     */
    it('should return 1 boxes for ADA payment', async () => {
      // mock ada payment event
      const mockedEvent: EventTrigger = TestBoxes.mockADAPaymentEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const boxes = cardanoChain.getCoveringUtxo(
        [bankBoxes[5], bankBoxes[4]],
        mockedEvent,
        mockedFeeConfig
      );

      // verify output boxes
      expect(boxes.length).greaterThanOrEqual(1);
    });

    /**
     * Target: testing getCoveringUtxo
     * Dependencies:
     *    BlockFrostApi
     *    KoiosApi
     * Expected Output:
     *    The function should return 2 specific box
     */
    it('should return 2 boxes for ADA payment', async () => {
      // mock ada payment event
      const mockedEvent: EventTrigger = TestBoxes.mockADAPaymentEventTrigger();
      mockedEvent.amount = '111300000';

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const boxes = cardanoChain.getCoveringUtxo(
        [bankBoxes[5], bankBoxes[1]],
        mockedEvent,
        mockedFeeConfig
      );

      // verify output boxes
      expect(boxes.length).to.equal(2);
    });

    /**
     * Target: testing getCoveringUtxo
     * Dependencies:
     *    BlockFrostApi
     *    KoiosApi
     * Expected Output:
     *    The function should return more than or equal 1 box
     */
    it('should return more than or equal 1 box', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      mockedEvent.targetChainTokenId =
        'asset1nl000000000000000000000000000000000000';

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const boxes = cardanoChain.getCoveringUtxo(
        bankBoxes,
        mockedEvent,
        mockedFeeConfig
      );

      // verify output boxes
      expect(boxes.length).to.greaterThanOrEqual(1);
    });

    /**
     * Target: testing getCoveringUtxo
     * Dependencies:
     *    BlockFrostApi
     *    KoiosApi
     * Expected Output:
     *    The function should return 3 box
     */
    it('should return 3 box for asset payment', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      mockedEvent.targetChainTokenId =
        'asset1nl000000000000000000000000000000000000';

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const boxes = cardanoChain.getCoveringUtxo(
        [bankBoxes[8], bankBoxes[6], bankBoxes[5]],
        mockedEvent,
        mockedFeeConfig
      );

      // verify output boxes
      expect(boxes.length).to.be.equal(3);
    });

    /**
     * Target: testing getCoveringUtxo
     * Dependencies:
     *    BlockFrostApi
     *    KoiosApi
     * Expected Output:
     *    The function should return 2 box
     */
    it('should return 2 box for asset payment', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      mockedEvent.targetChainTokenId =
        'asset1nl000000000000000000000000000000000000';
      mockedEvent.amount = '20';

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const boxes = cardanoChain.getCoveringUtxo(
        [bankBoxes[6], bankBoxes[5]],
        mockedEvent,
        mockedFeeConfig
      );

      // verify output boxes
      expect(boxes.length).to.be.equal(2);
    });
  });

  describe('generateTransaction', () => {
    // mock getting bankBoxes
    const bankBoxes: Utxo[] = TestBoxes.mockBankBoxes();
    mockGetAddressBoxes(testBankAddress, bankBoxes);
    const mockedFeeConfig: Fee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };

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
      const isValid = await cardanoChain.verifyTransactionWithEvent(
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
      const isValid = await cardanoChain.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.true;
    });
  });

  describe('verifyTransactionWithEvent', () => {
    const mockedFeeConfig: Fee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject an ADA payment tx that transferring asset', async () => {
      // mock ada payment event
      const mockedEvent: EventTrigger = TestBoxes.mockADAPaymentEventTrigger();
      const tx = TestBoxes.mockAssetTransferringPaymentTransaction(
        mockedEvent,
        testBankAddress
      );

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject an Asset payment tx with no asset transferring', async () => {
      // mock asset payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      const tx = TestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent,
        testBankAddress
      );

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject an Asset payment tx that transferring multiple asset with same policyId', async () => {
      // mock asset payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      const tx = TestBoxes.mockMultiAssetsTransferringPaymentTransaction(
        mockedEvent,
        testBankAddress
      );

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject an Asset payment tx that transferring multiple asset with different policyId', async () => {
      // mock asset payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      const tx = TestBoxes.mockTwoAssetsTransferringPaymentTransaction(
        mockedEvent,
        testBankAddress
      );

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Scenario:
     *    Mock a valid eventTrigger
     *    Create a valid mock payment transaction for the eventTrigger
     *    Validates the transaction
     * Expected Output:
     *    It should verify the transaction
     */
    it('should accept a valid payment tx', async () => {
      // mock asset payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      const tx = TestBoxes.mockValidPaymentTransaction(
        mockedEvent,
        testBankAddress
      );

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.true;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Scenario:
     *    Mock a valid eventTrigger
     *    Create an invalid mock payment transaction with metadata
     *    Validates the transaction to false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject an invalid payment tx containing metadata', async () => {
      // mock asset payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      const tx = TestBoxes.mockPaymentTransactionWithMetadata(
        mockedEvent,
        testBankAddress
      );

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
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
      expect(dbTxs.map((tx) => [tx.txId, tx.status])[0]).to.deep.equal([
        cardanoTx.txId,
        TransactionStatus.signed,
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

  describe('verifyEventWithPayment', () => {
    beforeEach('reset mocked koios api', () => {
      mockKoiosGetTxInfo(
        TestData.observationTxInfo.tx_hash,
        TestData.observationTxInfo
      );
      mockKoiosGetTxInfo(
        TestData.nonObservationTxInfo.tx_hash,
        TestData.nonObservationTxInfo
      );
      mockKoiosGetTxInfo(
        TestData.adaObservationTxInfo.tx_hash,
        TestData.adaObservationTxInfo
      );
      mockKoiosGetTxInfo(
        TestData.noMetadataTxInfo.tx_hash,
        TestData.noMetadataTxInfo
      );
      mockKoiosGetTxInfo(
        TestData.fakeTokenObservationTxInfo.tx_hash,
        TestData.fakeTokenObservationTxInfo
      );
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should verify the event
     */
    it('should return true when the event is correct', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockValidEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.true;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should verify the event
     */
    it('should return true when the event is correct locking ada', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockValidAdaEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.true;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event has no metadata', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInValidMetadataEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it("should return false when the event token doesn't match", async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInValidTokenEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event has incorrect toChain', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidToChainEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event has incorrect fromAddress', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidFromAddressEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event has incorrect toAddress', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidToAddressEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event has incorrect amount', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidAmountEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event has incorrect networkFee', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidNetworkFeeEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event has incorrect bridgeFee', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidBridgeFeeEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event has incorrect sourceTokenId', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidSourceTokenEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event has incorrect targetTokenId', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidTargetTokenEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event has incorrect blockId', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidBlockEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event has incorrect sourceTxId', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidSourceTxEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    CardanoUtils
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event can not be retrieved from tx info', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockValidEventTrigger();
      sinon.stub(CardanoUtils, 'getRosenData').returns(undefined);

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
      sinon.restore();
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Scenario:
     *    Mock a valid eventTrigger
     *    Pass the valid trigger event with an invalid RWTId
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event RWT is not compatible with cardano rwt', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockValidEventTrigger();

      // run test
      const cardanoChain: CardanoChain = new CardanoChain();
      const isValid = await cardanoChain.verifyEventWithPayment(
        mockedEvent,
        'fake'
      );
      expect(isValid).to.be.false;
    });
  });
});
