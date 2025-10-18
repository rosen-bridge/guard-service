import { TransactionType } from '@rosen-chains/abstract-chain';
import TestConfigs from '../testUtils/testConfigs';
import TestTxAgreement from './testTxAgreement';
import { mockPaymentTransaction } from './testData';
import GuardTurn from '../../src/utils/guardTurn';
import RequestVerifier from '../../src/verification/requestVerifier';
import TestUtils from '../testUtils/testUtils';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import {
  AgreementMessageTypes,
  ApprovedCandidate,
} from '../../src/agreement/interfaces';
import * as EventTestData from '../event/testData';
import EventSerializer from '../../src/event/eventSerializer';
import {
  EventStatus,
  OrderStatus,
  TransactionStatus,
} from '../../src/utils/constants';
import { cloneDeep } from 'lodash-es';
import TransactionVerifier from '../../src/verification/transactionVerifier';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';

describe('TxAgreement', () => {
  describe('addTransactionToQueue', () => {
    /**
     * @target TxAgreement.addTransactionToQueue should add transaction to memory queue
     * @dependencies
     * @scenario
     * - mock transaction
     * - run test
     * - check txs in memory
     * @expected
     * - memory queue should contains mocked transaction
     */
    it('should add transaction to memory queue', async () => {
      // mock transaction
      const paymentTx = mockPaymentTransaction();

      // run test
      const txAgreement = new TestTxAgreement();
      txAgreement.addTransactionToQueue(paymentTx);

      // check txs in memory
      const queueTxs = txAgreement.getTransactionQueue();
      expect(queueTxs.map((tx) => tx.txId)).toEqual([paymentTx.txId]);
    });
  });

  describe('enqueueSignFailedTxs', () => {
    /**
     * @target TxAgreement.enqueueSignFailedTxs should add correct transactions to memory queue
     * @dependencies
     * @scenario
     * - mock multiple transactions
     * - insert all mocked transactions with different statuses into db
     * - run test
     * - check txs in memory
     * @expected
     * - memory queue should contains unsigned failedSign transactions
     */
    it('should add correct transactions to memory queue', async () => {
      // mock multiple transactions
      const approvedTx = mockPaymentTransaction();
      const inSignTx1 = mockPaymentTransaction();
      const inSignTx2 = mockPaymentTransaction();
      const failedSignTx = mockPaymentTransaction();
      const sentTx = mockPaymentTransaction();
      const signedTx = mockPaymentTransaction();
      const invalidTx = mockPaymentTransaction();
      const completedTx = mockPaymentTransaction();

      // insert all mocked transactions with different statuses into db
      await DatabaseActionMock.insertTxRecord(
        approvedTx,
        TransactionStatus.approved,
      );
      await DatabaseActionMock.insertTxRecord(
        inSignTx1,
        TransactionStatus.inSign,
      );
      await DatabaseActionMock.insertTxRecord(
        inSignTx2,
        TransactionStatus.inSign,
        0,
        '0',
        true,
        1,
      );
      await DatabaseActionMock.insertTxRecord(
        failedSignTx,
        TransactionStatus.signFailed,
        0,
        '0',
        true,
        1,
      );
      await DatabaseActionMock.insertTxRecord(
        signedTx,
        TransactionStatus.signed,
      );
      await DatabaseActionMock.insertTxRecord(sentTx, TransactionStatus.sent);
      await DatabaseActionMock.insertTxRecord(
        invalidTx,
        TransactionStatus.invalid,
      );
      await DatabaseActionMock.insertTxRecord(
        completedTx,
        TransactionStatus.completed,
      );

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.enqueueSignFailedTxs();

      // check txs in memory
      const queueTxs = txAgreement.getTransactionQueue();
      expect(queueTxs.map((tx) => tx.txId)).toEqual([
        inSignTx2.txId,
        failedSignTx.txId,
      ]);
    });
  });

  describe('processAgreementQueue', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(TestConfigs.currentTimeStamp));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    /**
     * @target TxAgreement.processAgreementQueue should broadcast queue transactions
     * @dependencies
     * - Date
     * @scenario
     * - mock transaction
     * - insert mocked transaction into memory queue
     * - mock txAgreement.sendMessage
     * - run test
     * - check if function got called
     * - check transactions in memory
     * @expected
     * - `sendMessage` should got called with correct arguments
     * - mocked tx should be in memory
     * - mocked tx approvals should be initiated
     * - memory queue should be empty
     */
    it('should broadcast queue transactions', async () => {
      // mock transaction
      const paymentTx = mockPaymentTransaction();

      // insert mocked transaction into memory queue
      const txAgreement = new TestTxAgreement();
      txAgreement.addTransactionToQueue(paymentTx);

      // mock txAgreement.sendMessage
      const mockedSendMessage = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = vi.spyOn(txAgreement as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      await txAgreement.processAgreementQueue();

      // `sendMessage` should got called with correct arguments
      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);
      const expectedPayload = {
        txJson: paymentTx.toJson(),
      };
      expect(mockedSendMessage).toHaveBeenCalledWith(
        AgreementMessageTypes.request,
        expectedPayload,
        [],
        timestamp,
      );

      // mocked tx should be in memory
      const candidateTx = txAgreement.getTransactions().get(paymentTx.txId);
      expect(candidateTx?.tx.txId).toEqual(paymentTx.txId);
      expect(candidateTx?.timestamp).toEqual(timestamp);

      // mocked tx approvals should be initiated
      expect(
        txAgreement.getTransactionApprovals().get(paymentTx.txId)?.length,
      ).toEqual(5);

      // memory queue should be empty
      expect(txAgreement.getTransactionQueue().length).toEqual(0);
    });
  });

  describe('verifyTransactionRequest', () => {
    /**
     * @target TxAgreement.verifyTransactionRequest should return true and add
     * payment tx to events agreed tx map when conditions met
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - mock TransactionVerifier.verifyTxCommonConditions to return true
     * - mock RequestVerifier.verifyEventTransactionRequest to return true
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return true
     * - memory event map should contain mocked tx
     */
    it('should return true and add payment tx to events agreed tx map when conditions met', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.payment);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // mock RequestVerifier.verifyEventTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyEventTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      const txAgreement = new TestTxAgreement();
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return true
      expect(result).toEqual(true);

      // memory event map should contain mocked tx
      expect(
        txAgreement.getEventAgreedTransactions().get(paymentTx.eventId),
      ).toEqual(paymentTx.txId);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return true and add
     * cold storage tx to chain agreed cold storage tx map when conditions met
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - mock RequestVerifier.verifyColdStorageTransactionRequest to return true
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return true
     * - memory chain cold storage map should contain mocked tx
     */
    it('should return true and add cold storage tx to chain agreed cold storage tx map when conditions met', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.coldStorage);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // mock RequestVerifier.verifyColdStorageTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyColdStorageTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      const txAgreement = new TestTxAgreement();
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return true
      expect(result).toEqual(true);

      // memory chain cold storage map should contain mocked tx
      expect(
        txAgreement.getAgreedColdStorageTransactions().get(paymentTx.network),
      ).toEqual(paymentTx.txId);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return true and add
     * payment tx to orders agreed tx map when conditions met
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - mock TransactionVerifier.verifyTxCommonConditions to return true
     * - mock RequestVerifier.verifyArbitraryTransactionRequest to return true
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return true
     * - memory order map should contain mocked tx
     */
    it('should return true and add payment tx to orders agreed tx map when conditions met', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.arbitrary);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // mock RequestVerifier.verifyArbitraryTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyArbitraryTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      const txAgreement = new TestTxAgreement();
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return true
      expect(result).toEqual(true);

      // memory order map should contain mocked tx
      expect(
        txAgreement.getOrderAgreedTransactions().get(paymentTx.eventId),
      ).toEqual(paymentTx.txId);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return false
     * when it's not creator turn to create transaction
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn
     * - mock RequestVerifier.verifyEventTransactionRequest to return true
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return false
     * - memory event map should be empty
     */
    it("should return false when it's not creator turn to create transaction", async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.payment);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(2);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // mock RequestVerifier.verifyEventTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyEventTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      const txAgreement = new TestTxAgreement();
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return false
      expect(result).toEqual(false);

      // memory event map should be empty
      expect(txAgreement.getEventAgreedTransactions().size).toEqual(0);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return false
     * when tx common conditions doesn't verify
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn
     * - mock RequestVerifier.verifyEventTransactionRequest to return false
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return false
     * - memory event map should be empty
     */
    it("should return false when tx common conditions doesn't verify", async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.payment);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(false);

      // mock RequestVerifier.verifyEventTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyEventTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      const txAgreement = new TestTxAgreement();
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return false
      expect(result).toEqual(false);

      // memory event map should be empty
      expect(txAgreement.getEventAgreedTransactions().size).toEqual(0);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return false
     * when already agreed to another tx for the event
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - insert a random txId into eventAgreedTransactions map
     * - mock RequestVerifier.verifyEventTransactionRequest to return true
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return false
     * - memory event map should contain another tx
     */
    it('should return false when already agreed to another tx for the event', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.payment);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // insert a random txId into eventAgreedTransactions map
      const txAgreement = new TestTxAgreement();
      const previousTxId = TestUtils.generateRandomId();
      txAgreement.insertEventAgreedTransactions(
        paymentTx.eventId,
        previousTxId,
      );

      // mock RequestVerifier.verifyEventTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyEventTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return false
      expect(result).toEqual(false);

      // memory event map should contain another tx
      expect(txAgreement.getEventAgreedTransactions().size).toEqual(1);
      expect(
        txAgreement.getEventAgreedTransactions().get(paymentTx.eventId),
      ).toEqual(previousTxId);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return true
     * when already agreed to the tx
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - insert a random txId into eventAgreedTransactions map
     * - mock RequestVerifier.verifyEventTransactionRequest to return true
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return true
     * - memory event map should contain mocked tx
     */
    it('should return true when already agreed to the tx', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.payment);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // insert a random txId into eventAgreedTransactions map
      const txAgreement = new TestTxAgreement();
      txAgreement.insertEventAgreedTransactions(
        paymentTx.eventId,
        paymentTx.txId,
      );

      // mock RequestVerifier.verifyEventTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyEventTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return true
      expect(result).toEqual(true);

      // memory event map should contain mocked tx
      expect(txAgreement.getEventAgreedTransactions().size).toEqual(1);
      expect(
        txAgreement.getEventAgreedTransactions().get(paymentTx.eventId),
      ).toEqual(paymentTx.txId);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return false
     * when request is not verified
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - mock RequestVerifier.verifyEventTransactionRequest to return false
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return false
     * - memory event map should be empty
     */
    it('should return false when request is not verified', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.payment);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // mock RequestVerifier.verifyEventTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyEventTransactionRequest',
      ).mockResolvedValue(false);

      // run test
      const txAgreement = new TestTxAgreement();
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return false
      expect(result).toEqual(false);

      // memory cold storage chain map should be empty
      expect(txAgreement.getEventAgreedTransactions().size).toEqual(0);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return false
     * when already agreed to another tx for the chain
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - insert a random txId into agreedColdStorageTransactions map
     * - mock RequestVerifier.verifyColdStorageTransactionRequest to return true
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return false
     * - memory cold storage chain map should contain another tx
     */
    it('should return false when already agreed to another cold storage tx for the chain', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.coldStorage);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // insert a random txId into eventAgreedTransactions map
      const txAgreement = new TestTxAgreement();
      const previousTxId = TestUtils.generateRandomId();
      txAgreement.insertAgreedColdStorageTransactions(
        paymentTx.network,
        previousTxId,
      );

      // mock RequestVerifier.verifyColdStorageTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyColdStorageTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return false
      expect(result).toEqual(false);

      // memory cold storage chain map should contain another tx
      expect(txAgreement.getAgreedColdStorageTransactions().size).toEqual(1);
      expect(
        txAgreement.getAgreedColdStorageTransactions().get(paymentTx.network),
      ).toEqual(previousTxId);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return true
     * when already agreed to the cold storage tx
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - insert a random txId into agreedColdStorageTransactions map
     * - mock RequestVerifier.verifyColdStorageTransactionRequest to return true
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return true
     * - memory cold storage chain map should be empty
     */
    it('should return true when already agreed to the cold storage tx', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.coldStorage);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // insert a random txId into eventAgreedTransactions map
      const txAgreement = new TestTxAgreement();
      txAgreement.insertAgreedColdStorageTransactions(
        paymentTx.network,
        paymentTx.txId,
      );

      // mock RequestVerifier.verifyColdStorageTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyColdStorageTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return true
      expect(result).toEqual(true);

      // memory cold storage chain map should contain mocked tx
      expect(
        txAgreement.getAgreedColdStorageTransactions().get(paymentTx.network),
      ).toEqual(paymentTx.txId);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return false
     * when cold storage request is not verified
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - mock RequestVerifier.verifyColdStorageTransactionRequest to return false
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return false
     * - memory cold storage chain map should be empty
     */
    it('should return false when cold storage request is not verified', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.coldStorage);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // mock RequestVerifier.verifyColdStorageTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyColdStorageTransactionRequest',
      ).mockResolvedValue(false);

      // run test
      const txAgreement = new TestTxAgreement();
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return false
      expect(result).toEqual(false);

      // memory cold storage chain map should be empty
      expect(txAgreement.getAgreedColdStorageTransactions().size).toEqual(0);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return false
     * when already agreed to another tx for the order
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - insert a random txId into orderAgreedTransactions map
     * - mock RequestVerifier.verifyArbitraryTransactionRequest to return true
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return false
     * - memory order map should contain another tx
     */
    it('should return false when already agreed to another tx for the order', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.arbitrary);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // insert a random txId into orderAgreedTransactions map
      const txAgreement = new TestTxAgreement();
      const previousTxId = TestUtils.generateRandomId();
      txAgreement.insertOrderAgreedTransactions(
        paymentTx.eventId,
        previousTxId,
      );

      // mock RequestVerifier.verifyArbitraryTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyArbitraryTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return false
      expect(result).toEqual(false);

      // memory order map should contain another tx
      expect(txAgreement.getOrderAgreedTransactions().size).toEqual(1);
      expect(
        txAgreement.getOrderAgreedTransactions().get(paymentTx.eventId),
      ).toEqual(previousTxId);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return true
     * when already agreed to the arbitrary tx
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - insert a random txId into orderAgreedTransactions map
     * - mock RequestVerifier.verifyArbitraryTransactionRequest to return true
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return true
     * - memory order map should contain mocked tx
     */
    it('should return true when already agreed to the arbitrary tx', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.arbitrary);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // insert a random txId into orderAgreedTransactions map
      const txAgreement = new TestTxAgreement();
      txAgreement.insertOrderAgreedTransactions(
        paymentTx.eventId,
        paymentTx.txId,
      );

      // mock RequestVerifier.verifyArbitraryTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyArbitraryTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return true
      expect(result).toEqual(true);

      // memory order map should contain mocked tx
      expect(txAgreement.getOrderAgreedTransactions().size).toEqual(1);
      expect(
        txAgreement.getOrderAgreedTransactions().get(paymentTx.eventId),
      ).toEqual(paymentTx.txId);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return false
     * when arbitrary request is not verified
     * @dependencies
     * - GuardTurn
     * - RequestVerifier
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - mock RequestVerifier.verifyArbitraryTransactionRequest to return false
     * - run test
     * - check returned value
     * - check transactions in memory
     * @expected
     * - should return false
     * - memory order map should be empty
     */
    it('should return false when arbitrary request is not verified', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction(TransactionType.arbitrary);
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // mock RequestVerifier.verifyArbitraryTransactionRequest
      vi.spyOn(
        RequestVerifier,
        'verifyArbitraryTransactionRequest',
      ).mockResolvedValue(false);

      // run test
      const txAgreement = new TestTxAgreement();
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return false
      expect(result).toEqual(false);

      // memory cold storage chain map should be empty
      expect(txAgreement.getOrderAgreedTransactions().size).toEqual(0);
    });

    /**
     * @target TxAgreement.verifyTransactionRequest should return false
     * when type is not supported
     * @dependencies
     * - GuardTurn
     * @scenario
     * - mock testdata
     * - mock GuardTurn to return creatorId
     * - run test
     * - check returned value
     * @expected
     * - should return false
     */
    it('should return false when type is not supported', async () => {
      // mock testdata
      const paymentTx = mockPaymentTransaction('invalid-tx-type');
      const creatorId = 0;

      // mock GuardTurn
      vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(creatorId);

      // mock TransactionVerifier.verifyTxCommonConditions
      vi.spyOn(
        TransactionVerifier,
        'verifyTxCommonConditions',
      ).mockResolvedValue(true);

      // run test
      const txAgreement = new TestTxAgreement();
      const result = await txAgreement.callVerifyTransactionRequest(
        paymentTx,
        creatorId,
      );

      // should return false
      expect(result).toEqual(false);
    });
  });

  describe('processTransactionRequest', () => {
    /**
     * @target TxAgreement.processTransactionRequest should response to sender
     * when transaction is verified
     * @dependencies
     * @scenario
     * - mock testdata
     * - mock txAgreement.sendMessage
     * - mock txAgreement.verifyTransactionRequest to return true
     * - run test (call `processMessage`)
     * - check if function got called
     * - check transactions in memory
     * @expected
     * - `sendMessage` should got called with correct arguments
     * - mocked tx should be in memory
     */
    it('should response to sender when transaction is verified', async () => {
      // mock testdata
      const type = AgreementMessageTypes.request;
      const paymentTx = mockPaymentTransaction();
      const payload = { txJson: paymentTx.toJson() };
      const senderIndex = 0;
      const peerId = 'peerId';
      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // mock txAgreement.sendMessage
      const txAgreement = new TestTxAgreement();
      const mockedSendMessage = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = vi.spyOn(txAgreement as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // mock txAgreement.verifyTransactionRequest
      vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        txAgreement as any,
        'verifyTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // `sendMessage` should got called with correct arguments
      const agreementPayload = { txId: paymentTx.txId };
      expect(mockedSendMessage).toHaveBeenCalledWith(
        AgreementMessageTypes.response,
        agreementPayload,
        [peerId],
        timestamp,
      );

      // mocked tx should be in memory
      const candidateTx = txAgreement.getTransactions().get(paymentTx.txId);
      expect(candidateTx?.tx.txId).toEqual(paymentTx.txId);
      expect(candidateTx?.timestamp).toEqual(timestamp);
    });

    /**
     * @target TxAgreement.processTransactionRequest should do nothing when
     * transaction is NOT verified
     * @dependencies
     * @scenario
     * - mock testdata
     * - mock txAgreement.sendMessage
     * - mock txAgreement.verifyTransactionRequest to return false
     * - run test (call `processMessage`)
     * - check if function got called
     * - check transactions in memory
     * @expected
     * - `sendMessage` should NOT got called
     * - no tx should be in memory
     */
    it('should do nothing when transaction is NOT verified', async () => {
      // mock testdata
      const type = AgreementMessageTypes.request;
      const paymentTx = mockPaymentTransaction();
      const payload = { txJson: paymentTx.toJson() };
      const senderIndex = 0;
      const peerId = 'peerId';
      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // mock txAgreement.sendMessage
      const txAgreement = new TestTxAgreement();
      const mockedSendMessage = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = vi.spyOn(txAgreement as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // mock txAgreement.verifyTransactionRequest
      vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        txAgreement as any,
        'verifyTransactionRequest',
      ).mockResolvedValue(false);

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // `sendMessage` should NOT got called
      expect(mockedSendMessage).not.toHaveBeenCalled();

      // no tx should be in memory
      expect(txAgreement.getTransactions().size).toEqual(0);
    });
  });

  describe('processAgreementResponse', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target TxAgreement.processAgreementResponse should do nothing
     * when transaction is not found
     * @dependencies
     * @scenario
     * - mock testdata
     * - mock txAgreement.sendMessage
     * - get txApprovals
     * - run test (call `processMessage`)
     * - check if function got called
     * - check if txApprovals changed
     * @expected
     * - `sendMessage` should NOT got called
     * - txApprovals should remain unchanged
     */
    it('should do nothing when transaction is not found', async () => {
      // mock testdata
      const type = AgreementMessageTypes.response;
      const paymentTx = mockPaymentTransaction();
      const payload = { txId: paymentTx.txId };
      const senderIndex = 0;
      const peerId = 'peerId';
      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // mock txAgreement.sendMessage
      const txAgreement = new TestTxAgreement();
      const mockedSendMessage = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = vi.spyOn(txAgreement as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // get txApprovals
      const txApprovals = txAgreement.getTransactionApprovals();

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // `sendMessage` should NOT got called
      expect(mockedSendMessage).not.toHaveBeenCalled();

      // txApprovals should remain unchanged
      expect(txAgreement.getTransactionApprovals()).toEqual(txApprovals);
    });

    /**
     * @target TxAgreement.processAgreementResponse should do nothing
     * when response timestamp is wrong
     * @dependencies
     * @scenario
     * - mock testdata
     * - mock txAgreement.sendMessage
     * - insert mocked tx into memory (with different timestamp)
     * - get txApprovals
     * - run test (call `processMessage`)
     * - check if function got called
     * - check if txApprovals changed
     * @expected
     * - `sendMessage` should NOT got called
     * - txApprovals should remain unchanged
     */
    it('should do nothing when timestamp is wrong', async () => {
      // mock testdata
      const type = AgreementMessageTypes.response;
      const paymentTx = mockPaymentTransaction();
      const payload = { txId: paymentTx.txId };
      const senderIndex = 0;
      const peerId = 'peerId';
      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // mock txAgreement.sendMessage
      const txAgreement = new TestTxAgreement();
      const mockedSendMessage = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = vi.spyOn(txAgreement as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // insert mocked tx into memory (with different timestamp
      const mockedTimestamp =
        Math.round(TestConfigs.currentTimeStamp / 1000) + 10;
      txAgreement.insertTransactions(paymentTx.txId, {
        tx: paymentTx,
        timestamp: mockedTimestamp,
      });
      const approvals = Array(TestConfigs.guardPublicKeys.length).fill('');
      approvals[TestConfigs.guardIndex] = 'signature-1';
      txAgreement.insertTransactionApprovals(paymentTx.txId, approvals);

      // get txApprovals
      const txApprovals = txAgreement.getTransactionApprovals();

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // `sendMessage` should NOT got called
      expect(mockedSendMessage).not.toHaveBeenCalled();

      // txApprovals should remain unchanged
      expect(txAgreement.getTransactionApprovals()).toEqual(txApprovals);
    });

    /**
     * @target TxAgreement.processAgreementResponse should only update
     * signature when required signs does not meet
     * @dependencies
     * @scenario
     * - mock testdata
     * - mock txAgreement.sendMessage
     * - insert mocked tx into memory
     * - run test (call `processMessage`)
     * - check if function got called
     * - check if txApprovals changed
     * @expected
     * - `sendMessage` should NOT got called
     * - should store signature in txApprovals
     */
    it('should only update signature when required signs does not meet', async () => {
      // mock testdata
      const type = AgreementMessageTypes.response;
      const paymentTx = mockPaymentTransaction();
      const payload = { txId: paymentTx.txId };
      const senderIndex = 0;
      const peerId = 'peerId';
      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // mock txAgreement.sendMessage
      const txAgreement = new TestTxAgreement();
      const mockedSendMessage = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = vi.spyOn(txAgreement as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // insert mocked tx into memory
      txAgreement.insertTransactions(paymentTx.txId, {
        tx: paymentTx,
        timestamp: timestamp,
      });
      const approvals = Array(TestConfigs.guardPublicKeys.length).fill('');
      approvals[TestConfigs.guardIndex] = 'signature-1';
      txAgreement.insertTransactionApprovals(paymentTx.txId, approvals);

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // `sendMessage` should NOT got called
      expect(mockedSendMessage).not.toHaveBeenCalled();

      // should store signature in txApprovals
      const txApprovals = txAgreement
        .getTransactionApprovals()
        .get(paymentTx.txId);
      expect(txApprovals).toBeDefined();
      expect(txApprovals![TestConfigs.guardIndex]).toEqual('signature-1');
      expect(txApprovals![senderIndex]).toEqual('signature');
    });

    /**
     * @target TxAgreement.processAgreementResponse should broadcast approval
     * message for payment tx when sufficient number of guards agreed
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - insert mocked event into db
     * - mock txAgreement.sendMessage
     * - insert mocked tx into memory
     * - run test (call `processMessage`)
     * - check if function got called
     * - check if txApprovals changed
     * - check database
     * @expected
     * - `sendMessage` should got called with correct arguments
     * - tx should be inserted to approvedTransactions
     * - memory txs should be empty
     * - event status should be updated in db
     * - tx should be inserted into db
     */
    it('should broadcast approval message for payment tx when sufficient number of guards agreed', async () => {
      // mock testdata
      const type = AgreementMessageTypes.response;
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      const payload = { txId: paymentTx.txId };
      const senderIndex = 0;
      const peerId = 'peerId';
      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock txAgreement.sendMessage
      const txAgreement = new TestTxAgreement();
      const mockedSendMessage = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = vi.spyOn(txAgreement as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // insert mocked tx into memory
      txAgreement.insertTransactions(paymentTx.txId, {
        tx: paymentTx,
        timestamp: timestamp,
      });
      const approvals = Array(TestConfigs.guardPublicKeys.length).fill('');
      approvals[TestConfigs.guardIndex] = 'signature-1';
      approvals[2] = 'signature-2';
      txAgreement.insertTransactionApprovals(paymentTx.txId, approvals);

      // get txApprovals
      const preTestTxApprovals = txAgreement.getTransactionApprovals();

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // `sendMessage` should got called with correct arguments
      const expectedSignatures = cloneDeep(approvals);
      expectedSignatures[senderIndex] = 'signature';
      const approvalPayload = {
        txJson: paymentTx.toJson(),
        signatures: expectedSignatures,
      };
      expect(mockedSendMessage).toHaveBeenCalledWith(
        AgreementMessageTypes.approval,
        approvalPayload,
        [],
        timestamp,
      );

      // tx should be inserted to approvedTransactions
      const approvedTransactions = txAgreement.getApprovedTransactions();
      const expectedPayload: ApprovedCandidate = {
        tx: paymentTx,
        signatures: expectedSignatures,
        timestamp: timestamp,
      };
      expect(approvedTransactions.length).toEqual(1);
      expect(approvedTransactions[0]).toEqual(expectedPayload);

      // memory txs should be empty
      expect(txAgreement.getTransactions().size).toEqual(0);
      expect(preTestTxApprovals.size).toBeGreaterThanOrEqual(0);
      expect(txAgreement.getTransactionApprovals().size).toEqual(0);
      expect(txAgreement.getEventAgreedTransactions().size).toEqual(0);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).toContainEqual([eventId, EventStatus.inPayment]);

      // tx should be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.event.id,
      ]);
      expect(dbTxs.length).toEqual(1);
      expect(dbTxs).toContainEqual([paymentTx.txId, eventId]);
    });

    /**
     * @target TxAgreement.processAgreementResponse should broadcast approval
     * message for cold storage tx when sufficient number of guards agreed
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - mock txAgreement.sendMessage
     * - insert mocked tx into memory
     * - run test (call `processMessage`)
     * - check if function got called
     * - check if txApprovals changed
     * - check database
     * @expected
     * - `sendMessage` should got called with correct arguments
     * - tx should be inserted to approvedTransactions
     * - memory txs should be empty
     * - tx should be inserted into db
     */
    it('should broadcast approval message for cold storage tx when sufficient number of guards agreed', async () => {
      // mock testdata
      const type = AgreementMessageTypes.response;
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.coldStorage,
        chain,
        '',
      );
      const payload = { txId: paymentTx.txId };
      const senderIndex = 0;
      const peerId = 'peerId';
      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // mock txAgreement.sendMessage
      const txAgreement = new TestTxAgreement();
      const mockedSendMessage = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = vi.spyOn(txAgreement as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // insert mocked tx into memory
      txAgreement.insertTransactions(paymentTx.txId, {
        tx: paymentTx,
        timestamp: timestamp,
      });
      const approvals = Array(TestConfigs.guardPublicKeys.length).fill('');
      approvals[TestConfigs.guardIndex] = 'signature-1';
      approvals[2] = 'signature-2';
      txAgreement.insertTransactionApprovals(paymentTx.txId, approvals);

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // `sendMessage` should got called with correct arguments
      const expectedSignatures = cloneDeep(approvals);
      expectedSignatures[senderIndex] = 'signature';
      const approvalPayload = {
        txJson: paymentTx.toJson(),
        signatures: expectedSignatures,
      };
      expect(mockedSendMessage).toHaveBeenCalledWith(
        AgreementMessageTypes.approval,
        approvalPayload,
        [],
        timestamp,
      );

      // tx should be inserted to approvedTransactions
      const approvedTransactions = txAgreement.getApprovedTransactions();
      const expectedPayload: ApprovedCandidate = {
        tx: paymentTx,
        signatures: expectedSignatures,
        timestamp: timestamp,
      };
      expect(approvedTransactions.length).toEqual(1);
      expect(approvedTransactions[0]).toEqual(expectedPayload);

      // memory txs should be empty
      expect(txAgreement.getTransactions().size).toEqual(0);
      expect(txAgreement.getTransactionApprovals().size).toEqual(0);
      expect(txAgreement.getAgreedColdStorageTransactions().size).toEqual(0);

      // tx should be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.event,
        tx.chain,
      ]);
      expect(dbTxs.length).toEqual(1);
      expect(dbTxs).toContainEqual([paymentTx.txId, null, chain]);
    });
  });

  describe('processApprovalMessage', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target TxAgreement.processApprovalMessage should do nothing
     * when a signature doesn't verify
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - insert mocked event into db
     * - mock signer verify function to return false only for last signature
     * - mock txAgreement.setTxAsApproved
     * - run test (call `processMessage`)
     * - check if function got called
     * @expected
     * - `setTxAsApproved` should NOT got called
     */
    it("should do nothing when a signature doesn't verify", async () => {
      // mock testdata
      const type = AgreementMessageTypes.approval;
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      const signatures = ['signature-0', 'signature-1', '', '', 'signature-4'];
      const payload = {
        txJson: paymentTx.toJson(),
        signatures: signatures,
      };
      const senderIndex = 0;
      const peerId = 'peerId';

      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock signer verify function to return false only for last signature
      const txAgreement = new TestTxAgreement();
      vi.spyOn(txAgreement.getSigner(), 'verify').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (message, signature, publicKey) => {
          if (signature === 'signature-4') return false;
          return true;
        },
      );

      // mock txAgreement.setTxAsApproved
      const mockedSetTxAsApproved = vi.fn();
      const setTxAsApprovedSpy = vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        txAgreement as any,
        'setTxAsApproved',
      );
      setTxAsApprovedSpy.mockImplementation(mockedSetTxAsApproved);

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // `setTxAsApproved` should NOT got called
      expect(mockedSetTxAsApproved).not.toHaveBeenCalled();
    });

    /**
     * @target TxAgreement.processApprovalMessage should do nothing
     * when number of signsatures doesn't meet required value
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - insert mocked event into db
     * - mock signer verify function to return true
     * - mock txAgreement.setTxAsApproved
     * - run test (call `processMessage`)
     * - check if function got called
     * @expected
     * - `setTxAsApproved` should NOT got called
     */
    it("should do nothing when number of signsatures doesn't meet required value", async () => {
      // mock testdata
      const type = AgreementMessageTypes.approval;
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      const signatures = ['signature-0', 'signature-1', '', '', ''];
      const payload = {
        txJson: paymentTx.toJson(),
        signatures: signatures,
      };
      const senderIndex = 0;
      const peerId = 'peerId';

      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock signer verify function to return true
      const txAgreement = new TestTxAgreement();
      vi.spyOn(txAgreement.getSigner(), 'verify').mockResolvedValue(true);

      // mock txAgreement.setTxAsApproved
      const mockedSetTxAsApproved = vi.fn();
      const setTxAsApprovedSpy = vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        txAgreement as any,
        'setTxAsApproved',
      );
      setTxAsApprovedSpy.mockImplementation(mockedSetTxAsApproved);

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // `setTxAsApproved` should NOT got called
      expect(mockedSetTxAsApproved).not.toHaveBeenCalled();
    });

    /**
     * @target TxAgreement.processApprovalMessage should set tx as approved
     * when required number of signs met for a payment tx
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - insert mocked event into db
     * - mock signer verify function to return true
     * - insert mocked tx into memory
     * - run test (call `processMessage`)
     * - check if txApprovals changed
     * - check database
     * @expected
     * - memory txs should be empty
     * - event status should be updated in db
     * - tx should be inserted into db
     */
    it('should set tx as approved when required number of signs met for a payment tx', async () => {
      // mock testdata
      const type = AgreementMessageTypes.approval;
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      const signatures = ['signature-0', 'signature-1', '', '', 'signature-4'];
      const payload = {
        txJson: paymentTx.toJson(),
        signatures: signatures,
      };
      const senderIndex = 0;
      const peerId = 'peerId';

      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock signer verify function to return true
      const txAgreement = new TestTxAgreement();
      vi.spyOn(txAgreement.getSigner(), 'verify').mockResolvedValue(true);

      // insert mocked tx into memory
      txAgreement.insertTransactions(paymentTx.txId, {
        tx: paymentTx,
        timestamp: timestamp,
      });
      txAgreement.insertEventAgreedTransactions(
        paymentTx.eventId,
        paymentTx.txId,
      );

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // memory txs should be empty
      expect(txAgreement.getTransactions().size).toEqual(0);
      expect(txAgreement.getTransactionApprovals().size).toEqual(0);
      expect(txAgreement.getEventAgreedTransactions().size).toEqual(0);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).toContainEqual([eventId, EventStatus.inPayment]);

      // tx should be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.event.id,
      ]);
      expect(dbTxs.length).toEqual(1);
      expect(dbTxs).toContainEqual([paymentTx.txId, eventId]);
    });

    /**
     * @target TxAgreement.processApprovalMessage should set tx as approved
     * when required number of signs met for a cold storage tx
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - mock signer verify function to return true
     * - insert mocked tx into memory
     * - run test (call `processMessage`)
     * - check if txApprovals changed
     * - check database
     * @expected
     * - memory txs should be empty
     * - tx should be inserted into db
     */
    it('should set tx as approved when required number of signs met for a cold storage tx', async () => {
      // mock testdata
      const type = AgreementMessageTypes.approval;
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.coldStorage,
        chain,
        '',
      );
      const signatures = ['signature-0', 'signature-1', '', '', 'signature-4'];
      const payload = {
        txJson: paymentTx.toJson(),
        signatures: signatures,
      };
      const senderIndex = 0;
      const peerId = 'peerId';

      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // mock signer verify function to return true
      const txAgreement = new TestTxAgreement();
      vi.spyOn(txAgreement.getSigner(), 'verify').mockResolvedValue(true);

      // insert mocked tx into memory
      txAgreement.insertTransactions(paymentTx.txId, {
        tx: paymentTx,
        timestamp: timestamp,
      });
      txAgreement.insertAgreedColdStorageTransactions(
        paymentTx.network,
        paymentTx.txId,
      );

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // memory txs should be empty
      expect(txAgreement.getTransactions().size).toEqual(0);
      expect(txAgreement.getTransactionApprovals().size).toEqual(0);
      expect(txAgreement.getAgreedColdStorageTransactions().size).toEqual(0);

      // tx should be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.event,
        tx.chain,
      ]);
      expect(dbTxs.length).toEqual(1);
      expect(dbTxs).toContainEqual([paymentTx.txId, null, paymentTx.network]);
    });

    /**
     * @target TxAgreement.processApprovalMessage should set tx as approved
     * when required number of signs met
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - insert mocked event into db
     * - mock signer verify function to return true
     * - mock txAgreement.verifyTransactionRequest to return true
     * - run test (call `processMessage`)
     * - check if txApprovals changed
     * - check database
     * @expected
     * - memory txs should be empty
     * - event status should be updated in db
     * - tx should be inserted into db
     */
    it('should set tx as approved when transaction not found but verified', async () => {
      // mock testdata
      const type = AgreementMessageTypes.approval;
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      const signatures = ['signature-0', 'signature-1', '', '', 'signature-4'];
      const payload = {
        txJson: paymentTx.toJson(),
        signatures: signatures,
      };
      const senderIndex = 0;
      const peerId = 'peerId';

      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock signer verify function to return true
      const txAgreement = new TestTxAgreement();
      vi.spyOn(txAgreement.getSigner(), 'verify').mockResolvedValue(true);

      // mock txAgreement.verifyTransactionRequest
      vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        txAgreement as any,
        'verifyTransactionRequest',
      ).mockResolvedValue(true);

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // memory txs should be empty
      expect(txAgreement.getTransactions().size).toEqual(0);
      expect(txAgreement.getTransactionApprovals().size).toEqual(0);
      expect(txAgreement.getEventAgreedTransactions().size).toEqual(0);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).toContainEqual([eventId, EventStatus.inPayment]);

      // tx should be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.event.id,
      ]);
      expect(dbTxs.length).toEqual(1);
      expect(dbTxs).toContainEqual([paymentTx.txId, eventId]);
    });

    /**
     * @target TxAgreement.processApprovalMessage should do nothing
     * when transaction not found and doesn't verified
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - insert mocked event into db
     * - mock signer verify function to return true
     * - mock txAgreement.verifyTransactionRequest to return false
     * - mock txAgreement.setTxAsApproved
     * - run test (call `processMessage`)
     * - check if txApprovals changed
     * - check database
     * @expected
     * - `setTxAsApproved` should NOT got called
     */
    it("should do nothing when transaction not found and doesn't verified", async () => {
      // mock testdata
      const type = AgreementMessageTypes.approval;
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      const signatures = ['signature-0', 'signature-1', '', '', 'signature-4'];
      const payload = {
        txJson: paymentTx.toJson(),
        signatures: signatures,
      };
      const senderIndex = 0;
      const peerId = 'peerId';

      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock signer verify function to return true
      const txAgreement = new TestTxAgreement();
      vi.spyOn(txAgreement.getSigner(), 'verify').mockResolvedValue(true);

      // mock txAgreement.verifyTransactionRequest
      vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        txAgreement as any,
        'verifyTransactionRequest',
      ).mockResolvedValue(false);

      // mock txAgreement.setTxAsApproved
      const mockedSetTxAsApproved = vi.fn();
      const setTxAsApprovedSpy = vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        txAgreement as any,
        'setTxAsApproved',
      );
      setTxAsApprovedSpy.mockImplementation(mockedSetTxAsApproved);

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // `setTxAsApproved` should NOT got called
      expect(mockedSetTxAsApproved).not.toHaveBeenCalled();
    });

    /**
     * @target TxAgreement.processApprovalMessage should do nothing
     * when another tx is in memory for the event
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - insert mocked event into db
     * - mock signer verify function to return true
     * - insert mocked tx into memory
     * - mock txAgreement.setTxAsApproved
     * - run test (call `processMessage`)
     * - check if txApprovals changed
     * - check database
     * @expected
     * - `setTxAsApproved` should NOT got called
     */
    it('should do nothing when another tx is in memory for the event', async () => {
      // mock testdata
      const type = AgreementMessageTypes.approval;
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      const signatures = ['signature-0', 'signature-1', '', '', 'signature-4'];
      const payload = {
        txJson: paymentTx.toJson(),
        signatures: signatures,
      };
      const senderIndex = 0;
      const peerId = 'peerId';

      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000);

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock signer verify function to return true
      const txAgreement = new TestTxAgreement();
      vi.spyOn(txAgreement.getSigner(), 'verify').mockResolvedValue(true);

      // insert mocked tx into memory
      const otherPaymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      txAgreement.insertTransactions(otherPaymentTx.txId, {
        tx: otherPaymentTx,
        timestamp: timestamp,
      });
      txAgreement.insertEventAgreedTransactions(
        otherPaymentTx.eventId,
        otherPaymentTx.eventId,
      );

      // mock txAgreement.setTxAsApproved
      const mockedSetTxAsApproved = vi.fn();
      const setTxAsApprovedSpy = vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        txAgreement as any,
        'setTxAsApproved',
      );
      setTxAsApprovedSpy.mockImplementation(mockedSetTxAsApproved);

      // run test
      await txAgreement.processMessage(
        type,
        payload,
        'signature',
        senderIndex,
        peerId,
        timestamp,
      );

      // `setTxAsApproved` should NOT got called
      expect(mockedSetTxAsApproved).not.toHaveBeenCalled();
    });
  });

  describe('setTxAsApproved', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target TxAgreement.setTxAsApproved should NOT update
     * event status when tx is already in database
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - insert mocked event and tx into db
     * - run test
     * - check event status in db
     * @expected
     * - event status should remain unchanged
     */
    it('should NOT update event status when tx is already in database', async () => {
      // mock testdata
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );

      // insert mocked event and tx into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingReward,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx,
        TransactionStatus.completed,
      );

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.callSetTxAsApproved(paymentTx);

      // event status should remain unchanged
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).toContainEqual([eventId, EventStatus.pendingReward]);
    });
  });

  describe('updateEventOrOrderOfApprovedTx', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target TxAgreement.updateEventOrOrderOfApprovedTx should update
     * event status from pending-payment to in-payment
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - insert mocked event into db
     * - run test
     * - check event status in db
     * @expected
     * - event status should be updated in db
     */
    it('should update event status from pending-payment to in-payment', async () => {
      // mock testdata
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.callUpdateEventOrOrderOfApprovedTx(paymentTx);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).toContainEqual([eventId, EventStatus.inPayment]);
    });

    /**
     * @target TxAgreement.updateEventOrOrderOfApprovedTx should update
     * event status from pending-reward to in-reward
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - insert mocked event into db
     * - run test
     * - check event status in db
     * @expected
     * - event status should be updated in db
     */
    it('should update event status from pending-reward to in-reward', async () => {
      // mock testdata
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const paymentTx = mockPaymentTransaction(
        TransactionType.reward,
        mockedEvent.fromChain,
        eventId,
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingReward,
      );

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.callUpdateEventOrOrderOfApprovedTx(paymentTx);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).toContainEqual([eventId, EventStatus.inReward]);
    });

    /**
     * @target TxAgreement.updateEventOrOrderOfApprovedTx should update
     * order status from pending to in-process
     * @dependencies
     * - database
     * @scenario
     * - mock testdata
     * - insert mocked order into db
     * - run test
     * - check order status in db
     * @expected
     * - order status should be updated in db
     */
    it('should update order status from pending to in-process', async () => {
      // mock testdata
      const orderId = 'order-id';
      const orderChain = CARDANO_CHAIN;
      const paymentTx = mockPaymentTransaction(
        TransactionType.arbitrary,
        orderChain,
        orderId,
      );

      // insert mocked order into db
      await DatabaseActionMock.insertOrderRecord(
        orderId,
        orderChain,
        `orderJson`,
        OrderStatus.pending,
      );

      // run test
      const txAgreement = new TestTxAgreement();
      await txAgreement.callUpdateEventOrOrderOfApprovedTx(paymentTx);

      // order status should be updated in db
      const dbOrders = (await DatabaseActionMock.allOrderRecords()).map(
        (order) => [order.id, order.status],
      );
      expect(dbOrders.length).toEqual(1);
      expect(dbOrders).toContainEqual([orderId, OrderStatus.inProcess]);
    });
  });

  describe('resendTransactionRequests', () => {
    /**
     * @target TxAgreement.resendTransactionRequests should resend
     * transaction request for all transactions in memory
     * @dependencies
     * @scenario
     * - mock testdata
     * - insert mocked tx into memory
     * - mock txAgreement.sendMessage
     * - run test
     * - check if function got called
     * @expected
     * - `sendMessage` should got called with correct arguments
     */
    it('should resend transaction request for all transactions in memory', async () => {
      // mock testdata
      const paymentTx1 = mockPaymentTransaction();
      const timestamp1 = Math.round(TestConfigs.currentTimeStamp / 1000) - 50;
      const paymentTx2 = mockPaymentTransaction();
      const timestamp2 = Math.round(TestConfigs.currentTimeStamp / 1000) - 10;

      // insert mocked tx into memory
      const txAgreement = new TestTxAgreement();
      txAgreement.insertTransactions(paymentTx1.txId, {
        tx: paymentTx1,
        timestamp: timestamp1,
      });
      const approvals1 = Array(TestConfigs.guardPublicKeys.length).fill('');
      approvals1[TestConfigs.guardIndex] = 'signature-1-1';
      txAgreement.insertTransactionApprovals(paymentTx1.txId, approvals1);

      txAgreement.insertTransactions(paymentTx2.txId, {
        tx: paymentTx2,
        timestamp: timestamp2,
      });
      const approvals2 = Array(TestConfigs.guardPublicKeys.length).fill('');
      approvals2[TestConfigs.guardIndex] = 'signature-2-1';
      txAgreement.insertTransactionApprovals(paymentTx2.txId, approvals2);

      // mock txAgreement.sendMessage
      const mockedSendMessage = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = vi.spyOn(txAgreement as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      await txAgreement.resendTransactionRequests();

      // `sendMessage` should got called with correct arguments
      const expectedPayload1 = {
        txJson: paymentTx1.toJson(),
      };
      const expectedPayload2 = {
        txJson: paymentTx2.toJson(),
      };
      expect(mockedSendMessage).toHaveBeenCalledWith(
        AgreementMessageTypes.request,
        expectedPayload1,
        [],
        timestamp1,
      );
      expect(mockedSendMessage).toHaveBeenCalledWith(
        AgreementMessageTypes.request,
        expectedPayload2,
        [],
        timestamp2,
      );
    });
  });

  describe('resendApprovalMessages', () => {
    /**
     * @target TxAgreement.resendApprovalMessages should resend
     * approval message for all approved transactions in memory
     * @dependencies
     * @scenario
     * - mock testdata
     * - insert mocked tx into memory
     * - mock txAgreement.sendMessage
     * - run test
     * - check if function got called
     * @expected
     * - `sendMessage` should got called with correct arguments
     */
    it('should resend approval message for all approved transactions in memory', async () => {
      // mock testdata
      const paymentTx1 = mockPaymentTransaction();
      const timestamp1 = Math.round(TestConfigs.currentTimeStamp / 1000) - 50;
      const signatures1 = [
        '',
        'signature-1-1',
        'signature-1-2',
        'signature-1-3',
        '',
      ];
      const paymentTx2 = mockPaymentTransaction();
      const timestamp2 = Math.round(TestConfigs.currentTimeStamp / 1000) - 10;
      const signatures2 = [
        'signature-2-0',
        'signature-2-1',
        '',
        'signature-2-3',
        'signature-2-4',
      ];

      // insert mocked tx into memory
      const txAgreement = new TestTxAgreement();
      txAgreement.insertApprovedTransactions({
        tx: paymentTx1,
        signatures: signatures1,
        timestamp: timestamp1,
      });
      txAgreement.insertApprovedTransactions({
        tx: paymentTx2,
        signatures: signatures2,
        timestamp: timestamp2,
      });

      // mock txAgreement.sendMessage
      const mockedSendMessage = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = vi.spyOn(txAgreement as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      await txAgreement.resendApprovalMessages();

      // `sendMessage` should got called with correct arguments
      const approvalPayload1 = {
        txJson: paymentTx1.toJson(),
        signatures: signatures1,
      };
      const approvalPayload2 = {
        txJson: paymentTx2.toJson(),
        signatures: signatures2,
      };
      expect(mockedSendMessage).toHaveBeenCalledWith(
        AgreementMessageTypes.approval,
        approvalPayload1,
        [],
        timestamp1,
      );
      expect(mockedSendMessage).toHaveBeenCalledWith(
        AgreementMessageTypes.approval,
        approvalPayload2,
        [],
        timestamp2,
      );
    });
  });

  describe('clearTransactions', () => {
    /**
     * @target TxAgreement.clearTransactions should remove all transactions from memory
     * @dependencies
     * @scenario
     * - mock testdata
     * - insert mocked txs into memory
     * - run test
     * - check txs in memory
     * @expected
     * - no tx should be in memory
     */
    it('should remove all transactions from memory', async () => {
      // mock testdata
      const queuePaymentTx = mockPaymentTransaction();
      const paymentTx1 = mockPaymentTransaction();
      const timestamp1 = Math.round(TestConfigs.currentTimeStamp / 1000) - 50;
      const paymentTx2 = mockPaymentTransaction();
      const timestamp2 = Math.round(TestConfigs.currentTimeStamp / 1000) - 10;
      const approvedPaymentTx = mockPaymentTransaction();
      const timestamp3 = Math.round(TestConfigs.currentTimeStamp / 1000) - 80;
      const signatures3 = [
        'signature-3-0',
        'signature-3-1',
        '',
        'signature-3-3',
        'signature-3-4',
      ];

      // insert mocked txs into memory
      const txAgreement = new TestTxAgreement();
      txAgreement.addTransactionToQueue(queuePaymentTx);
      txAgreement.insertTransactions(paymentTx1.txId, {
        tx: paymentTx1,
        timestamp: timestamp1,
      });
      const approvals1 = Array(TestConfigs.guardPublicKeys.length).fill('');
      approvals1[TestConfigs.guardIndex] = 'signature-1-1';
      txAgreement.insertTransactionApprovals(paymentTx1.txId, approvals1);

      txAgreement.insertTransactions(paymentTx2.txId, {
        tx: paymentTx2,
        timestamp: timestamp2,
      });
      const approvals2 = Array(TestConfigs.guardPublicKeys.length).fill('');
      approvals2[TestConfigs.guardIndex] = 'signature-2-1';
      txAgreement.insertTransactionApprovals(paymentTx2.txId, approvals2);

      txAgreement.insertApprovedTransactions({
        tx: approvedPaymentTx,
        signatures: signatures3,
        timestamp: timestamp3,
      });

      // run test
      txAgreement.clearTransactions();

      // no tx should be in memory
      expect(txAgreement.getTransactionQueue().length).toEqual(0);
      expect(txAgreement.getTransactions().size).toEqual(0);
      expect(txAgreement.getTransactionApprovals().size).toEqual(0);
      expect(txAgreement.getApprovedTransactions().length).toEqual(0);
    });
  });

  describe('clearAgreedTransactions', () => {
    /**
     * @target TxAgreement.clearAgreedTransactions should remove all agreed transactions from memory
     * @dependencies
     * @scenario
     * - mock testdata
     * - insert mocked txs into memory
     * - run test
     * - check txs in memory
     * @expected
     * - no tx should be in memory
     */
    it('should remove all agreed transactions from memory', async () => {
      // mock testdata
      const paymentTx1 = mockPaymentTransaction();
      const timestamp1 = Math.round(TestConfigs.currentTimeStamp / 1000) - 50;
      const paymentTx2 = mockPaymentTransaction(TransactionType.coldStorage);
      const timestamp2 = Math.round(TestConfigs.currentTimeStamp / 1000) - 10;
      const paymentTx3 = mockPaymentTransaction(TransactionType.arbitrary);
      const timestamp3 = Math.round(TestConfigs.currentTimeStamp / 1000) - 10;

      // insert mocked txs into memory
      const txAgreement = new TestTxAgreement();
      txAgreement.insertTransactions(paymentTx1.txId, {
        tx: paymentTx1,
        timestamp: timestamp1,
      });
      txAgreement.insertEventAgreedTransactions(
        paymentTx1.eventId,
        paymentTx1.txId,
      );

      txAgreement.insertTransactions(paymentTx2.txId, {
        tx: paymentTx2,
        timestamp: timestamp2,
      });
      txAgreement.insertAgreedColdStorageTransactions(
        paymentTx2.network,
        paymentTx2.txId,
      );

      txAgreement.insertTransactions(paymentTx3.txId, {
        tx: paymentTx3,
        timestamp: timestamp3,
      });
      txAgreement.insertOrderAgreedTransactions(
        paymentTx3.network,
        paymentTx3.txId,
      );

      // run test
      txAgreement.clearAgreedTransactions();

      // no tx should be in memory
      expect(txAgreement.getTransactions().size).toEqual(0);
      expect(txAgreement.getEventAgreedTransactions().size).toEqual(0);
      expect(txAgreement.getAgreedColdStorageTransactions().size).toEqual(0);
      expect(txAgreement.getOrderAgreedTransactions().size).toEqual(0);
    });
  });

  describe('getChainPendingTransactions', () => {
    /**
     * @target TxAgreement.getChainPendingTransactions should return
     * chain transactions from memory
     * @dependencies
     * @scenario
     * - mock testdata
     * - insert mocked txs into memory (with different chains)
     * - run test
     * - check returned value
     * @expected
     * - should return only 1 transaction (with correct chain)
     */
    it('should return chain transactions from memory', async () => {
      // mock testdata
      const timestamp = Math.round(TestConfigs.currentTimeStamp / 1000) - 50;
      const chain1 = 'chain-1';
      const paymentTx1 = mockPaymentTransaction(
        TransactionType.payment,
        chain1,
      );
      const chain2 = 'chain-2';
      const paymentTx2 = mockPaymentTransaction(
        TransactionType.payment,
        chain2,
      );

      // insert mocked txs into memory
      const txAgreement = new TestTxAgreement();
      txAgreement.insertTransactions(paymentTx1.txId, {
        tx: paymentTx1,
        timestamp: timestamp,
      });
      const approvals1 = Array(TestConfigs.guardPublicKeys.length).fill('');
      approvals1[TestConfigs.guardIndex] = 'signature-1-1';
      txAgreement.insertTransactionApprovals(paymentTx1.txId, approvals1);

      txAgreement.insertTransactions(paymentTx2.txId, {
        tx: paymentTx2,
        timestamp: timestamp,
      });
      const approvals2 = Array(TestConfigs.guardPublicKeys.length).fill('');
      approvals2[TestConfigs.guardIndex] = 'signature-2-1';
      txAgreement.insertTransactionApprovals(paymentTx2.txId, approvals2);

      // run test
      const result = txAgreement.getChainPendingTransactions(chain2);

      // verify
      expect(result).toEqual([paymentTx2]);
    });

    /**
     * @target TxAgreement.getChainPendingTransactions should return
     * chain transactions from memory queue
     * @dependencies
     * @scenario
     * - mock testdata
     * - insert mocked txs into memory queue (with different chains)
     * - run test
     * - check returned value
     * @expected
     * - should return only 1 transaction (with correct chain)
     */
    it('should return chain transactions from memory queue', async () => {
      // mock testdata
      const chain1 = 'chain-1';
      const paymentTx1 = mockPaymentTransaction(
        TransactionType.payment,
        chain1,
      );
      const chain2 = 'chain-2';
      const paymentTx2 = mockPaymentTransaction(
        TransactionType.payment,
        chain2,
      );

      // insert mocked txs into memory
      const txAgreement = new TestTxAgreement();
      txAgreement.addTransactionToQueue(paymentTx1);
      txAgreement.addTransactionToQueue(paymentTx2);

      // run test
      const result = txAgreement.getChainPendingTransactions(chain2);

      // verify
      expect(result).toEqual([paymentTx2]);
    });
  });
});
