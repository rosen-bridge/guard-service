import {
  resetDialerCalls,
  verifySendMessageCalledOnce,
  verifySendMessageCalledTwice,
  verifySendMessageDidntGetCalled,
  verifySendMessageWithReceiverCalledOnce,
} from '../../communication/mocked/MockedDialer';
import ErgoTestBoxes from '../../chains/ergo/testUtils/TestBoxes';
import {
  EventStatus,
  EventTrigger,
  TransactionStatus,
  TransactionTypes,
} from '../../../src/models/Models';
import TxAgreement from '../../../src/guard/agreement/TxAgreement';
import CardanoTestBoxes from '../../chains/cardano/testUtils/TestBoxes';
import TestUtils from '../../testUtils/TestUtils';
import {
  allEventRecords,
  allTxRecords,
  clearTables,
  insertEventRecord,
  insertTxRecord,
} from '../../db/mocked/MockedScannerModel';
import { resetMockedEventProcessor } from '../mocked/MockedEventProcessor';
import { mockGuardTurn } from '../../testUtils/MockedGuardTurn';
import { expect } from 'chai';
import TestTxAgreement from './TestTxAgreement';
import {
  AgreementPayload,
  GuardsAgreement,
  TransactionApproved,
} from '../../../src/guard/agreement/Interfaces';
import { anything, deepEqual, reset, spy, verify, when } from 'ts-mockito';
import ChainsConstants from '../../../src/chains/ChainsConstants';
import { guardConfig } from '../../../src/helpers/GuardConfig';
import {
  mockIsEventConfirmedEnough,
  mockVerifyColdStorageTx,
  mockVerifyEvent,
  mockVerifyPaymentTransactionWithEvent,
} from '../mocked/MockedEventVerifier';

describe('TxAgreement', () => {
  const eventBoxAndCommitments =
    ErgoTestBoxes.mockEventBoxWithSomeCommitments();

  describe('startAgreementProcess', () => {
    /**
     * Target: testing startAgreementProcess
     * Dependencies:
     *    -
     * Expected Output:
     *    The function should broadcast tx agreement request to other guards
     */
    it('should broadcast agreement request for the transaction', () => {
      // mock an event
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      const tx = ErgoTestBoxes.mockTokenBurningTokenPaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // generate test data
      const guardId = guardConfig.guardId;
      const signature = tx.signMetaData();
      const creatorAgreement = {
        guardId: guardId,
        signature: signature,
      };

      // run test
      const txAgreement = new TestTxAgreement();
      txAgreement.startAgreementProcess(tx);

      // verify out request
      verifySendMessageCalledOnce(
        'tx-agreement',
        JSON.stringify({
          type: 'request',
          payload: {
            txJson: tx.toJson(),
            guardId: guardId,
            signature: signature,
          },
        })
      );
      expect(txAgreement.getTransactions().get(tx.txId)).to.deep.equal(tx);
      expect(txAgreement.getTransactionApprovals().get(tx.txId)).to.deep.equal([
        creatorAgreement,
      ]);
    });
  });

  describe('processTransactionRequest', () => {
    const senderId = 0;

    beforeEach('clear scanner database tables', async () => {
      await clearTables();
      resetMockedEventProcessor();
      resetDialerCalls();
    });

    /**
     * Target: testing processTransactionRequest
     * Dependencies:
     *    KoiosApi
     *    scannerAction
     * Expected Output:
     *    The function should agree with request
     */
    it('should agree with request', async () => {
      // mock event and tx
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockADAPaymentEventTrigger();
      const tx = CardanoTestBoxes.mockAssetTransferringPaymentTransaction(
        mockedEvent,
        CardanoTestBoxes.testBankAddress
      );
      await insertEventRecord(mockedEvent, EventStatus.pendingPayment);

      // mock isConfirmedEnough
      mockIsEventConfirmedEnough(mockedEvent, true);
      mockVerifyEvent(mockedEvent, true);
      mockVerifyPaymentTransactionWithEvent(tx, mockedEvent, true);

      // mock guard turn
      mockGuardTurn(0);

      // generate test data
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify out request
      verifySendMessageWithReceiverCalledOnce(
        'tx-agreement',
        JSON.stringify({
          type: 'response',
          payload: {
            guardId: guardConfig.guardId,
            signature: tx.signMetaData(),
            txId: tx.txId,
            agreed: true,
          },
        }),
        receiver
      );
      expect(txAgreement.getTransactions().get(tx.txId)).to.deep.equal(tx);
      expect(
        txAgreement.getEventAgreedTransactions().get(tx.eventId)
      ).to.deep.equal(tx.txId);
    });

    /**
     * Target: testing processTransactionRequest
     * Dependencies:
     *    scannerAction
     * Expected Output:
     *    The function should not respond to request
     */
    it("should not respond to request when event doesn't exist in db", async () => {
      // mock event and tx
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      const tx = ErgoTestBoxes.mockWrongAmountTokenDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // generate test data
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify no agree or reject out request
      verifySendMessageDidntGetCalled('tx-agreement', anything(), anything());
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
      expect(
        Array.from(txAgreement.getEventAgreedTransactions()).length
      ).to.equal(0);
    });

    /**
     * Target: testing processTransactionRequest
     * Dependencies:
     *    scannerAction
     *    EventProcessor
     * Expected Output:
     *    The function should not respond to request
     */
    it("should not respond to request when event doesn't confirmed enough", async () => {
      // mock event and tx
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      await insertEventRecord(mockedEvent, EventStatus.pendingPayment);
      const tx = ErgoTestBoxes.mockWrongAmountTokenDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // mock isConfirmedEnough
      mockIsEventConfirmedEnough(mockedEvent, false);

      // generate test data
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify no agree or reject out request
      verifySendMessageDidntGetCalled('tx-agreement', anything(), anything());
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
      expect(
        Array.from(txAgreement.getEventAgreedTransactions()).length
      ).to.equal(0);
    });

    /**
     * Target: testing processTransactionRequest
     * Dependencies:
     *    scannerAction
     *    EventProcessor
     * Expected Output:
     *    The function should reject the request
     */
    it("should reject the request when signature doesn't verify", async () => {
      // mock event and tx
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      await insertEventRecord(mockedEvent, '');
      const tx = ErgoTestBoxes.mockWrongTokenDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // mock isConfirmedEnough
      mockIsEventConfirmedEnough(mockedEvent, true);
      mockVerifyEvent(mockedEvent, true);

      // generate test data
      const wrongSenderId = 2;
      const guardSignature = TestUtils.signTxMetaData(
        tx.txBytes,
        wrongSenderId
      );
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify out request
      verifySendMessageDidntGetCalled('tx-agreement', anything(), anything());
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
      expect(
        Array.from(txAgreement.getEventAgreedTransactions()).length
      ).to.equal(0);
    });

    /**
     * Target: testing processTransactionRequest
     * Dependencies:
     *    scannerAction
     *    EventProcessor
     * Expected Output:
     *    The function should reject the request
     */
    it("should reject the request when event doesn't verify", async () => {
      // mock event and tx
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      await insertEventRecord(mockedEvent, '');
      const tx = ErgoTestBoxes.mockWrongTokenDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // mock isConfirmedEnough
      mockIsEventConfirmedEnough(mockedEvent, true);
      mockVerifyEvent(mockedEvent, false);

      // generate test data
      const senderId = 0;
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify out request
      verifySendMessageDidntGetCalled('tx-agreement', anything(), anything());
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
      expect(
        Array.from(txAgreement.getEventAgreedTransactions()).length
      ).to.equal(0);
    });

    /**
     * Target: testing processTransactionRequest
     * Dependencies:
     *    scannerAction
     *    eventProcessor
     *    Utils
     * Expected Output:
     *    The function should reject the request
     */
    it('should reject the request when its not creator guard turn', async () => {
      // mock event and tx
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      await insertEventRecord(mockedEvent, '');
      const tx = ErgoTestBoxes.mockIllegalChangeBoxDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // mock isConfirmedEnough
      mockIsEventConfirmedEnough(mockedEvent, true);
      mockVerifyEvent(mockedEvent, true);

      // mock guard turn
      mockGuardTurn(1);

      // generate test data
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify out request
      verifySendMessageDidntGetCalled('tx-agreement', anything(), anything());
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
      expect(
        Array.from(txAgreement.getEventAgreedTransactions()).length
      ).to.equal(0);
    });

    /**
     * Target: testing processTransactionRequest
     * Dependencies:
     *    scannerAction
     *    eventProcessor
     *    Utils
     * Expected Output:
     *    The function should reject the request
     */
    it('should reject the request when event already has transaction', async () => {
      // mock event and tx
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      const tx =
        ErgoTestBoxes.mockMissingValidCommitmentDistributionTransaction(
          mockedEvent,
          eventBoxAndCommitments
        );
      const previousTx =
        ErgoTestBoxes.mockIllegalChangeBoxDistributionTransaction(
          mockedEvent,
          eventBoxAndCommitments
        );
      await insertEventRecord(mockedEvent, EventStatus.pendingReward);
      await insertTxRecord(
        previousTx,
        TransactionTypes.reward,
        ChainsConstants.cardano,
        TransactionStatus.approved,
        0,
        tx.eventId
      );

      // mock isConfirmedEnough
      mockIsEventConfirmedEnough(mockedEvent, true);
      mockVerifyEvent(mockedEvent, true);

      // mock guard turn
      mockGuardTurn(0);

      // generate test data
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify out request
      verifySendMessageDidntGetCalled('tx-agreement', anything(), anything());
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
      expect(
        Array.from(txAgreement.getEventAgreedTransactions()).length
      ).to.equal(0);
    });

    /**
     * Target: testing processTransactionRequest
     * Dependencies:
     *    scannerAction
     *    EventProcessor
     *    Utils
     * Expected Output:
     *    The function should reject the request
     */
    it("should reject the request when tx doesn't verify event condition", async () => {
      // mock event and tx
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      const tx = ErgoTestBoxes.mockTransferToIllegalWIDDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );
      await insertEventRecord(mockedEvent, EventStatus.pendingReward);

      // mock isConfirmedEnough
      mockIsEventConfirmedEnough(mockedEvent, true);
      mockVerifyEvent(mockedEvent, true);
      mockVerifyPaymentTransactionWithEvent(tx, mockedEvent, false);

      // mock guard turn
      mockGuardTurn(0);

      // generate test data
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify out request
      verifySendMessageDidntGetCalled('tx-agreement', anything(), anything());
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
      expect(
        Array.from(txAgreement.getEventAgreedTransactions()).length
      ).to.equal(0);
    });
  });

  describe('processColdStorageTransactionRequest', () => {
    const senderId = 0;

    beforeEach('clear scanner database tables', async () => {
      await clearTables();
      resetMockedEventProcessor();
      resetDialerCalls();
    });

    /**
     * Target: testing processColdStorageTransactionRequest
     * Dependencies:
     *    EventVerifier
     * Scenario:
     *    Mock cold storage tx
     *    Mock GuardTurn
     *    Mock cold storage tx verification for test tx
     *    Mock agreement data (signature, sender and receiver)
     *    Run test
     *    Expect one out request, agreed to the transaction
     *    Check transaction memory on txAgreement class. It should contain agreed tx
     * Expected Output:
     *    The function should agree with request
     */
    it('should agree with request', async () => {
      // mock tx
      const tx = CardanoTestBoxes.mockFineColdStorageTx();

      // mock guard turn
      mockGuardTurn(0);

      // mock verification
      mockVerifyColdStorageTx(tx, true);

      // generate test data
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processColdStorageTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify out request
      verifySendMessageWithReceiverCalledOnce(
        'tx-agreement',
        JSON.stringify({
          type: 'response',
          payload: {
            guardId: guardConfig.guardId,
            signature: tx.signMetaData(),
            txId: tx.txId,
            agreed: true,
          },
        }),
        receiver
      );
      expect(txAgreement.getTransactions().get(tx.txId)).to.deep.equal(tx);
    });

    /**
     * Target: testing processColdStorageTransactionRequest
     * Dependencies:
     *    EventVerifier
     * Scenario:
     *    Mock two cold storage txs for different chains (insert one into database)
     *    Mock GuardTurn
     *    Mock cold storage tx verification for test tx
     *    Mock agreement data (signature, sender and receiver)
     *    Run test
     *    Expect one out request, agreed to the transaction
     *    Check transaction memory on txAgreement class. It should contain agreed tx
     * Expected Output:
     *    The function should agree with request
     */
    it('should agree with request even if there is cold storage tx in progress for another chain', async () => {
      // mock tx
      const inProgressTx = ErgoTestBoxes.mockFineColdStorageTransaction(
        ErgoTestBoxes.mockHighErgAssetsAndBankBoxes()[1].boxes
      );
      await insertTxRecord(
        inProgressTx,
        inProgressTx.txType,
        inProgressTx.network,
        TransactionStatus.approved,
        0,
        inProgressTx.eventId
      );
      const tx = CardanoTestBoxes.mockFineColdStorageTx();

      // mock guard turn
      mockGuardTurn(0);

      // mock verification
      mockVerifyColdStorageTx(tx, true);

      // generate test data
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processColdStorageTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify out request
      verifySendMessageWithReceiverCalledOnce(
        'tx-agreement',
        JSON.stringify({
          type: 'response',
          payload: {
            guardId: guardConfig.guardId,
            signature: tx.signMetaData(),
            txId: tx.txId,
            agreed: true,
          },
        }),
        receiver
      );
      expect(txAgreement.getTransactions().get(tx.txId)).to.deep.equal(tx);
    });

    /**
     * Target: testing processColdStorageTransactionRequest
     * Dependencies:
     *    EventVerifier
     * Scenario:
     *    Mock cold storage tx
     *    Mock agreement data (signature, sender and receiver)
     *    Run test
     *    Expect one out request, agreed to the transaction
     *    Check transaction memory on txAgreement class. It should NOT contain agreed tx
     * Expected Output:
     *    The function should reject the request
     */
    it("should reject the request when signature doesn't verify", async () => {
      // mock tx
      const tx = ErgoTestBoxes.mockFineColdStorageTransaction(
        ErgoTestBoxes.mockHighErgAssetsAndBankBoxes()[1].boxes
      );

      // generate test data
      const wrongSenderId = 2;
      const guardSignature = TestUtils.signTxMetaData(
        tx.txBytes,
        wrongSenderId
      );
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processColdStorageTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify out request
      verifySendMessageDidntGetCalled('tx-agreement', anything(), anything());
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
    });

    /**
     * Target: testing processColdStorageTransactionRequest
     * Dependencies:
     *    EventVerifier
     * Scenario:
     *    Mock cold storage tx
     *    Mock GuardTurn
     *    Mock agreement data (signature, sender and receiver)
     *    Run test
     *    Expect one out request, agreed to the transaction
     *    Check transaction memory on txAgreement class. It should NOT contain agreed tx
     * Expected Output:
     *    The function should reject the request
     */
    it('should reject the request when its not creator guard turn', async () => {
      // mock tx
      const tx = ErgoTestBoxes.mockFineColdStorageTransaction(
        ErgoTestBoxes.mockHighErgAssetsAndBankBoxes()[1].boxes
      );

      // mock guard turn
      mockGuardTurn(1);

      // generate test data
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processColdStorageTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify out request
      verifySendMessageDidntGetCalled('tx-agreement', anything(), anything());
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
    });

    /**
     * Target: testing processColdStorageTransactionRequest
     * Dependencies:
     *    EventVerifier
     * Scenario:
     *    Mock two cold storage txs (insert one into database)
     *    Mock GuardTurn
     *    Mock agreement data (signature, sender and receiver)
     *    Run test
     *    Expect one out request, agreed to the transaction
     *    Check transaction memory on txAgreement class. It should NOT contain agreed tx
     * Expected Output:
     *    The function should reject the request
     */
    it('should reject the request when there is another cold storage tx in progress on this chain', async () => {
      // mock tx
      const inProgressTx = ErgoTestBoxes.mockFineColdStorageTransaction(
        ErgoTestBoxes.mockHighErgAssetsAndBankBoxes()[1].boxes
      );
      await insertTxRecord(
        inProgressTx,
        inProgressTx.txType,
        inProgressTx.network,
        TransactionStatus.approved,
        0,
        inProgressTx.eventId
      );
      const tx = ErgoTestBoxes.mockFineColdStorageTransaction(
        ErgoTestBoxes.mockHighErgAssetsAndBankBoxes()[1].boxes
      );

      // mock guard turn
      mockGuardTurn(0);

      // generate test data
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processColdStorageTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify out request
      verifySendMessageDidntGetCalled('tx-agreement', anything(), anything());
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
    });

    /**
     * Target: testing processColdStorageTransactionRequest
     * Dependencies:
     *    EventVerifier
     * Scenario:
     *    Mock cold storage tx
     *    Mock GuardTurn
     *    Mock cold storage tx verification for test tx
     *    Mock agreement data (signature, sender and receiver)
     *    Run test
     *    Expect one out request, agreed to the transaction
     *    Check transaction memory on txAgreement class. It should NOT contain agreed tx
     * Expected Output:
     *    The function should reject the request
     */
    it("should reject the request when tx doesn't verify event condition", async () => {
      // mock tx
      const tx = CardanoTestBoxes.mockFineColdStorageTx();

      // mock guard turn
      mockGuardTurn(0);

      // mock verification
      mockVerifyColdStorageTx(tx, false);

      // generate test data
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.processColdStorageTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      // verify out request
      verifySendMessageDidntGetCalled('tx-agreement', anything(), anything());
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
    });
  });

  describe('processAgreementResponse', () => {
    beforeEach('clear scanner database tables', async () => {
      await clearTables();
    });

    /**
     * Target: testing processAgreementResponse
     * Dependencies:
     *    scannerAction
     * Expected Output:
     *    The function should set tx as approved
     */
    it('should insert the transaction into database when the majority of guards agreed', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      const tx = ErgoTestBoxes.mockTokenTransferringErgDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );
      await insertEventRecord(mockedEvent, EventStatus.pendingReward);

      // initialize tx array
      const txAgreement = new TestTxAgreement();
      txAgreement.startAgreementProcess(tx);
      const agreements: AgreementPayload[] = [
        {
          guardId: guardConfig.guardId,
          signature: tx.signMetaData(),
        },
      ];

      // simulate 4 agreements
      for (let i = 0; i < 4; i++) {
        if (i == 1) continue;
        const senderId = i;
        const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
        await txAgreement.processAgreementResponse(
          tx.txId,
          true,
          senderId,
          guardSignature
        );
        agreements.push({
          guardId: senderId,
          signature: guardSignature,
        });
      }
      // simulate duplicate agreement
      let senderId = 2;
      let guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      await txAgreement.processAgreementResponse(
        tx.txId,
        true,
        senderId,
        guardSignature
      );

      // run test
      senderId = 6;
      guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      await txAgreement.processAgreementResponse(
        tx.txId,
        true,
        senderId,
        guardSignature
      );
      agreements.push({
        guardId: senderId,
        signature: guardSignature,
      });

      // verify
      verifySendMessageCalledOnce(
        'tx-agreement',
        JSON.stringify({
          type: 'approval',
          payload: {
            txJson: tx.toJson(),
            guardsSignatures: agreements,
          },
        })
      );
      const dbEvents = await allEventRecords();
      expect(
        dbEvents.map((event) => [event.id, event.status])[0]
      ).to.deep.equal([mockedEvent.getId(), EventStatus.inReward]);
      const dbTxs = await allTxRecords();
      expect(dbTxs.map((tx) => [tx.txId, tx.status])[0]).to.deep.equal([
        tx.txId,
        TransactionStatus.approved,
      ]);
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
      expect(Array.from(txAgreement.getTransactionApprovals()).length).to.equal(
        0
      );
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
    });
  });

  describe('processApprovalMessage', () => {
    beforeEach('clear scanner database tables', async () => {
      await clearTables();
      resetMockedEventProcessor();
    });

    /**
     * Target: testing processApprovalMessage
     * Dependencies:
     *    scannerAction
     *    EventProcessor
     *    Utils
     * Expected Output:
     *    The function should set tx as approved
     */
    it('should insert the transaction into database when the majority of guards signatures verify', async () => {
      // mock event and tx
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockADAPaymentEventTrigger();
      const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent,
        CardanoTestBoxes.testBankAddress
      );
      await insertEventRecord(mockedEvent, EventStatus.pendingPayment);

      // mock isConfirmedEnough
      mockIsEventConfirmedEnough(mockedEvent, true);
      mockVerifyEvent(mockedEvent, true);
      mockVerifyPaymentTransactionWithEvent(tx, mockedEvent, true);

      // mock guard turn
      mockGuardTurn(0);

      // generate test data
      const senderId = 0;
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // initialize tx array
      const txAgreement = new TestTxAgreement();
      await txAgreement.processTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      const agreements: AgreementPayload[] = [];
      for (let i = 2; i < 7; i++) {
        agreements.push({
          guardId: i,
          signature: TestUtils.signTxMetaData(tx.txBytes, i),
        });
      }

      // run test
      await txAgreement.processApprovalMessage(tx, agreements, 'testSender');

      // verify
      const dbEvents = await allEventRecords();
      expect(
        dbEvents.map((event) => [event.id, event.status])[0]
      ).to.deep.equal([mockedEvent.getId(), EventStatus.inPayment]);
      const dbTxs = await allTxRecords();
      expect(dbTxs.map((tx) => [tx.txId, tx.status])[0]).to.deep.equal([
        tx.txId,
        TransactionStatus.approved,
      ]);
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
      expect(Array.from(txAgreement.getTransactionApprovals()).length).to.equal(
        0
      );
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
    });

    /**
     * Target: testing processApprovalMessage
     * Dependencies:
     *    scannerAction
     *    EventProcessor
     *    Utils
     * Expected Output:
     *    The function should set tx as approved
     */
    it("shouldn't insert the transaction into database when the majority of other guards agreed", async () => {
      // mock event and tx
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockADAPaymentEventTrigger();
      const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent,
        CardanoTestBoxes.testBankAddress
      );
      await insertEventRecord(mockedEvent, EventStatus.pendingPayment);

      // mock isConfirmedEnough
      mockIsEventConfirmedEnough(mockedEvent, true);
      mockVerifyPaymentTransactionWithEvent(tx, mockedEvent, true);

      // mock guard turn
      mockGuardTurn(0);

      // initialize tx array
      const txAgreement = new TestTxAgreement();

      const agreements: AgreementPayload[] = [];
      for (let i = 2; i < 7; i++) {
        agreements.push({
          guardId: i,
          signature: TestUtils.signTxMetaData(tx.txBytes, i),
        });
      }

      // run test
      await txAgreement.processApprovalMessage(tx, agreements, 'testSender');

      // verify
      const dbEvents = await allEventRecords();
      expect(
        dbEvents.map((event) => [event.id, event.status])[0]
      ).to.deep.equal([mockedEvent.getId(), EventStatus.pendingPayment]);
      const dbTxs = await allTxRecords();
      expect(dbTxs.length).to.equal(0);
    });

    /**
     * Target: testing processApprovalMessage
     * Dependencies:
     *    scannerAction
     *    EventProcessor
     *    Utils
     * Expected Output:
     *    The function should set tx as approved
     */
    it("shouldn't insert the transaction into database when at least one guard signature doesn't verify", async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      const tx = ErgoTestBoxes.mockTokenBurningErgPaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );
      await insertEventRecord(mockedEvent, EventStatus.pendingPayment);

      // mock isConfirmedEnough
      mockIsEventConfirmedEnough(mockedEvent, true);
      mockVerifyEvent(mockedEvent, true);
      mockVerifyPaymentTransactionWithEvent(tx, mockedEvent, true);

      // mock guard turn
      mockGuardTurn(0);

      // generate test data
      const senderId = 0;
      const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId);
      const receiver = 'testReceiver';

      // initialize tx array
      const txAgreement = new TxAgreement();
      await txAgreement.processTransactionRequest(
        tx,
        senderId,
        guardSignature,
        receiver
      );

      const agreements: AgreementPayload[] = [];
      for (let i = 2; i < 7; i++) {
        if (i == 4) {
          const wrongSenderId = 0;
          agreements.push({
            guardId: i,
            signature: TestUtils.signTxMetaData(tx.txBytes, wrongSenderId),
          });
        } else {
          agreements.push({
            guardId: i,
            signature: TestUtils.signTxMetaData(tx.txBytes, i),
          });
        }
      }

      // run test
      await txAgreement.processApprovalMessage(tx, agreements, 'testSender');

      // verify
      const dbEvents = await allEventRecords();
      expect(
        dbEvents.map((event) => [event.id, event.status])[0]
      ).to.deep.equal([mockedEvent.getId(), EventStatus.pendingPayment]);
      const dbTxs = await allTxRecords();
      expect(dbTxs.length).to.equal(0);
    });
  });

  describe('resendTransactionRequests', () => {
    /**
     * Target: testing resendTransactionRequests
     * Dependencies:
     *    -
     * Expected Output:
     *    The function should resend tx request
     */
    it('should rebroadcast agreement request for all active transactions', () => {
      // mock token payment event
      const mockedEvent1: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      const tx1 = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent1,
        CardanoTestBoxes.testBankAddress
      );
      const mockedEvent2: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      const tx2 =
        CardanoTestBoxes.mockMultiAssetsTransferringPaymentTransaction(
          mockedEvent2,
          CardanoTestBoxes.testBankAddress
        );

      // initialize tx array
      const txAgreement = new TestTxAgreement();
      txAgreement.startAgreementProcess(tx1);
      txAgreement.startAgreementProcess(tx2);

      // run test
      txAgreement.resendTransactionRequests();

      // verify
      verifySendMessageCalledTwice(
        'tx-agreement',
        JSON.stringify({
          type: 'request',
          payload: {
            txJson: tx1.toJson(),
            guardId: 1,
            signature: tx1.signMetaData(),
          },
        })
      );
      verifySendMessageCalledTwice(
        'tx-agreement',
        JSON.stringify({
          type: 'request',
          payload: {
            txJson: tx2.toJson(),
            guardId: 1,
            signature: tx2.signMetaData(),
          },
        })
      );
    });
  });

  describe('clearTransactions', () => {
    beforeEach('clear scanner database tables', async () => {
      await clearTables();
    });

    /**
     * Target: testing clearTransactions
     * Dependencies:
     *    -
     * Expected Output:
     *    The function should delete all tx in memory
     */
    it('should remove agreed status, txId and txJson for all event with agreed status', async () => {
      const txAgreement = new TestTxAgreement();

      // mock token payment event
      const mockedEvent1: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      const tx1 = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent1,
        CardanoTestBoxes.testBankAddress
      );
      txAgreement.insertTransactions(tx1.txId, tx1);
      txAgreement.insertTransactionApprovals(tx1.eventId, [
        {
          guardId: 0,
          signature: 'guardSignature',
        },
        {
          guardId: 1,
          signature: 'guardSignature',
        },
      ]);

      const mockedEvent2: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      const tx2 =
        CardanoTestBoxes.mockMultiAssetsTransferringPaymentTransaction(
          mockedEvent2,
          CardanoTestBoxes.testBankAddress
        );
      txAgreement.insertTransactions(tx2.txId, tx2);
      txAgreement.insertTransactionApprovals(tx2.eventId, [
        {
          guardId: 0,
          signature: 'guardSignature',
        },
      ]);

      // run test
      await txAgreement.clearTransactions();

      // verify
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
      expect(Array.from(txAgreement.getTransactionApprovals()).length).to.equal(
        0
      );
    });
  });

  describe('clearAgreedTransactions', () => {
    beforeEach('clear scanner database tables', async () => {
      await clearTables();
    });

    /**
     * Target: testing clearAgreedTransactions
     * Dependencies:
     *    -
     * Expected Output:
     *    The function should delete all tx in memory
     */
    it('should remove agreed status, txId and txJson for all event with agreed status', async () => {
      const txAgreement = new TestTxAgreement();

      // mock token payment event
      const mockedEvent1: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      const tx1 = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent1,
        CardanoTestBoxes.testBankAddress
      );
      txAgreement.insertTransactions(tx1.txId, tx1);
      txAgreement.insertEventAgreedTransactions(tx1.eventId, tx1.txId);

      const mockedEvent2: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      const tx2 =
        CardanoTestBoxes.mockMultiAssetsTransferringPaymentTransaction(
          mockedEvent2,
          CardanoTestBoxes.testBankAddress
        );
      txAgreement.insertTransactions(tx2.txId, tx2);
      txAgreement.insertEventAgreedTransactions(tx2.eventId, tx2.txId);

      // run test
      await txAgreement.clearAgreedTransactions();

      // verify
      expect(Array.from(txAgreement.getTransactions()).length).to.equal(0);
      expect(
        Array.from(txAgreement.getEventAgreedTransactions()).length
      ).to.equal(0);
    });
  });

  describe('handleMessage', () => {
    const channel = 'tx-agreement';

    /**
     * Target: testing handleMessage
     * Dependencies:
     *    scannerAction
     * Expected Output:
     *    The function should call corresponding handler method
     */
    it('should call processTransactionRequest for request type messages', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent,
        CardanoTestBoxes.testBankAddress
      );

      // generate test data
      const signature = 'guardSignature';
      const sender = 'testSender';
      const candidatePayload = {
        txJson: tx.toJson(),
        guardId: 0,
        signature: signature,
      };
      const message = JSON.stringify({
        type: 'request',
        payload: candidatePayload,
      });

      // run test
      const txAgreement = new TxAgreement();
      const spiedTxAgreement = spy(txAgreement);
      when(
        spiedTxAgreement.processTransactionRequest(
          anything(),
          anything(),
          anything(),
          anything()
        )
      ).thenResolve();
      await txAgreement.handleMessage(message, channel, sender);

      // verify
      //  Note: deepEqual doesn't work for PaymentTransaction object either. So, anything() used.
      verify(
        spiedTxAgreement.processTransactionRequest(
          anything(),
          0,
          signature,
          sender
        )
      ).once();
      reset(spiedTxAgreement);
    });

    /**
     * Target: testing handleMessage
     * Dependencies:
     *    scannerAction
     * Expected Output:
     *    The function should call corresponding handler method
     */
    it('should call processColdStorageTransactionRequest for request type messages containing cold storage txs', async () => {
      // mock cold storage tx
      const tx = CardanoTestBoxes.mockFineColdStorageTx();

      // generate test data
      const signature = 'guardSignature';
      const sender = 'testSender';
      const candidatePayload = {
        txJson: tx.toJson(),
        guardId: 0,
        signature: signature,
      };
      const message = JSON.stringify({
        type: 'request',
        payload: candidatePayload,
      });

      // run test
      const txAgreement = new TxAgreement();
      const spiedTxAgreement = spy(txAgreement);
      when(
        spiedTxAgreement.processColdStorageTransactionRequest(
          anything(),
          anything(),
          anything(),
          anything()
        )
      ).thenResolve();
      await txAgreement.handleMessage(message, channel, sender);

      // verify
      //  Note: deepEqual doesn't work for PaymentTransaction object either. So, anything() used.
      verify(
        spiedTxAgreement.processColdStorageTransactionRequest(
          anything(),
          0,
          signature,
          sender
        )
      ).once();
      reset(spiedTxAgreement);
    });

    /**
     * Target: testing handleMessage
     * Dependencies:
     *    scannerAction
     * Expected Output:
     *    The function should call corresponding handler method
     */
    it('should call processAgreementResponse for response type messages', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent,
        CardanoTestBoxes.testBankAddress
      );

      // generate test data
      const signature = 'guardSignature';
      const sender = 'testSender';
      const agreementPayload: GuardsAgreement = {
        guardId: 0,
        signature: signature,
        txId: tx.txId,
        agreed: true,
      };
      const message = JSON.stringify({
        type: 'response',
        payload: agreementPayload,
      });

      // run test
      const txAgreement = new TxAgreement();
      const spiedTxAgreement = spy(txAgreement);
      when(
        spiedTxAgreement.processAgreementResponse(
          anything(),
          anything(),
          anything(),
          anything()
        )
      ).thenResolve();
      await txAgreement.handleMessage(message, channel, sender);

      // verify
      verify(
        spiedTxAgreement.processAgreementResponse(tx.txId, true, 0, signature)
      ).once();
      reset(spiedTxAgreement);
    });

    /**
     * Target: testing handleMessage
     * Dependencies:
     *    scannerAction
     * Expected Output:
     *    The function should call corresponding handler method
     */
    it('should call processAgreementResponse for response type messages', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent,
        CardanoTestBoxes.testBankAddress
      );

      // generate test data
      const signatures = [
        {
          guardId: 0,
          signature: 'sig0',
        },
        {
          guardId: 1,
          signature: 'sig1',
        },
      ];
      const sender = 'testSender';
      const txApproval: TransactionApproved = {
        txJson: tx.toJson(),
        guardsSignatures: signatures,
      };
      const message = JSON.stringify({
        type: 'approval',
        payload: txApproval,
      });

      // run test
      const txAgreement = new TxAgreement();
      const spiedTxAgreement = spy(txAgreement);
      when(
        spiedTxAgreement.processApprovalMessage(
          anything(),
          anything(),
          anything()
        )
      ).thenResolve();
      await txAgreement.handleMessage(message, channel, sender);

      // verify
      //  Note: deepEqual doesn't work for PaymentTransaction object either. So, anything() used.
      verify(
        spiedTxAgreement.processApprovalMessage(
          anything(),
          deepEqual(signatures),
          sender
        )
      ).once();
      reset(spiedTxAgreement);
    });
  });

  describe('isEventHasDifferentTransaction', () => {
    beforeEach('clear scanner database tables', async () => {
      await clearTables();
    });

    /**
     * Target: testing isEventHasDifferentTransaction
     * Dependencies:
     *    scannerAction
     * Expected Output:
     *    The function should return true
     */
    it('should return true when there is another tx for this event in memory with the same type', async () => {
      const txAgreement = new TestTxAgreement();

      // mock token payment event
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent,
        CardanoTestBoxes.testBankAddress
      );
      txAgreement.insertTransactions(tx.txId, tx);
      txAgreement.insertEventAgreedTransactions(tx.eventId, tx.txId);

      // run test
      const result = await txAgreement.isEventHasDifferentTransaction(
        tx.eventId,
        TestUtils.generateRandomId(),
        tx.txType
      );

      // verify
      expect(result).to.be.true;
    });

    /**
     * Target: testing isEventHasDifferentTransaction
     * Dependencies:
     *    scannerAction
     * Expected Output:
     *    The function should return true
     */
    it('should return true when there is another tx for this event in database with the same type', async () => {
      const txAgreement = new TestTxAgreement();

      // mock token payment event
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      await insertEventRecord(mockedEvent, EventStatus.pendingPayment);
      const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent,
        CardanoTestBoxes.testBankAddress
      );
      await insertTxRecord(
        tx,
        tx.txType,
        ChainsConstants.cardano,
        TransactionStatus.approved,
        0,
        tx.eventId
      );

      // run test
      const result = await txAgreement.isEventHasDifferentTransaction(
        tx.eventId,
        TestUtils.generateRandomId(),
        tx.txType
      );

      // verify
      expect(result).to.be.true;
    });

    /**
     * Target: testing isEventHasDifferentTransaction
     * Dependencies:
     *    scannerAction
     * Expected Output:
     *    The function should return false
     */
    it('should return false when there is another tx for this event in database but with different type', async () => {
      const txAgreement = new TestTxAgreement();

      // mock token payment event
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      await insertEventRecord(mockedEvent, EventStatus.pendingPayment);
      const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent,
        CardanoTestBoxes.testBankAddress
      );
      await insertTxRecord(
        tx,
        tx.txType,
        ChainsConstants.cardano,
        TransactionStatus.approved,
        0,
        tx.eventId
      );

      // run test
      const result = await txAgreement.isEventHasDifferentTransaction(
        tx.eventId,
        TestUtils.generateRandomId(),
        TransactionTypes.reward
      );

      // verify
      expect(result).to.be.false;
    });

    /**
     * Target: testing isEventHasDifferentTransaction
     * Dependencies:
     *    scannerAction
     * Expected Output:
     *    The function should return false
     */
    it('should return false when there is another tx for this event in database but with invalid status', async () => {
      const txAgreement = new TestTxAgreement();

      // mock token payment event
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      await insertEventRecord(mockedEvent, EventStatus.pendingPayment);
      const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent,
        CardanoTestBoxes.testBankAddress
      );
      await insertTxRecord(
        tx,
        tx.txType,
        ChainsConstants.cardano,
        TransactionStatus.invalid,
        0,
        tx.eventId
      );

      // run test
      const result = await txAgreement.isEventHasDifferentTransaction(
        tx.eventId,
        TestUtils.generateRandomId(),
        tx.txType
      );

      // verify
      expect(result).to.be.false;
    });
  });

  describe('getErgoPendingTransactionsInputs', () => {
    /**
     * Target: testing getErgoPendingTransactionsInputs
     * Dependencies:
     *    -
     * Scenario:
     *    Mock Cardano and Ergo payment transaction and insert into tx memory
     *    Run test
     * Expected Output:
     *    The function should return boxIds
     */
    it('should return Ergo txs input box ids', async () => {
      const txAgreement = new TestTxAgreement();

      // mock ergo txs
      const tx1BankBoxes =
        ErgoTestBoxes.mockHighErgAssetsAndBankBoxes()[1].boxes;
      const ergoTx1 =
        ErgoTestBoxes.mockFineColdStorageTransaction(tx1BankBoxes);
      txAgreement.insertTransactions(ergoTx1.txId, ergoTx1);
      const tx2BankBoxes = ErgoTestBoxes.mockBankBoxes().boxes;
      const ergoTx2 =
        ErgoTestBoxes.mockFineColdStorageTransaction(tx2BankBoxes);
      txAgreement.insertTransactions(ergoTx2.txId, ergoTx2);

      // mock cardano txs
      const cardanoTx = CardanoTestBoxes.mockFineColdStorageTx();
      txAgreement.insertTransactions(cardanoTx.txId, cardanoTx);

      // run test
      const res = txAgreement.getErgoPendingTransactionsInputs();

      // verify
      expect(res).to.deep.equal([
        ...tx1BankBoxes.map((box) => box.box_id().to_str()),
        ...tx2BankBoxes.map((box) => box.box_id().to_str()),
      ]);
    });
  });
});
