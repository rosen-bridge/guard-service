import {
  binToHex as bchRecovery_binToHex,
  encodeTransactionBCH as bchRecovery_encodeTransactionBCH,
  hashTransaction as bchRecovery_hashTransaction,
  hexToBin as bchRecovery_hexToBin,
  secp256k1 as bchRecovery_secp256k1,
} from '@bitauth/libauth';

import { TokenMap as bchRecovery_TokenMap } from '@rosen-bridge/tokens';
import {
  ConfirmationStatus,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import {
  ConfirmationStatus as bchRecovery_ConfirmationStatus,
  SigningStatus as bchRecovery_SigningStatus,
  TransactionType as bchRecovery_TransactionType,
} from '@rosen-chains/abstract-chain';
import { BitcoinCashChain as bchRecovery_BitcoinCashChain } from '@rosen-chains/bitcoin-cash';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';

import { DatabaseAction as bchRecovery_DatabaseAction } from '../../src/db/databaseAction';
import bchOwnedEventOrder from '../../src/event/eventOrder';
import EventSerializer from '../../src/event/eventSerializer';
import bchRecovery_EventSerializer from '../../src/event/eventSerializer';
import bchRecovery_ChainHandler from '../../src/handlers/chainHandler';
import bchOwnedMinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import TransactionProcessor from '../../src/transaction/transactionProcessor';
import bchRecovery_TransactionProcessor from '../../src/transaction/transactionProcessor';
import * as bchRecovery_TransactionSerializer from '../../src/transaction/transactionSerializer';
import {
  EventStatus,
  OrderStatus,
  TransactionStatus,
} from '../../src/utils/constants';
import {
  EventStatus as bchRecovery_EventStatus,
  TransactionStatus as bchRecovery_TransactionStatus,
} from '../../src/utils/constants';
import {
  mockErgoPaymentTransaction,
  mockPaymentTransaction,
} from '../agreement/testData';
import {
  bchPublicKey as bchRecovery_bchPublicKey,
  bchLock as bchRecovery_bchLock,
  bchCold as bchRecovery_bchCold,
} from '../configs/bitcoinCashFixtures';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import bchRecovery_DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { mockCreateEventPaymentOrder as bchRecovery_mockCreateEventPaymentOrder } from '../event/mocked/eventOrder.mock';
import { mockGetEventFeeConfig as bchRecovery_mockGetEventFeeConfig } from '../event/mocked/minimumFee.mock';
import * as EventTestData from '../event/testData';
import * as bchRecovery_EventTestData from '../event/testData';
import ChainHandlerMock, {
  chainHandlerInstance,
} from '../handlers/chainHandler.mock';
import { chainHandlerInstance as bchRecovery_chainHandlerInstance } from '../handlers/chainHandler.mock';
import NotificationHandlerMock from '../handlers/notificationHandler.mock';
import bchRecovery_TestEventSynchronization from '../synchronization/testEventSynchronization';
import { preserveBitcoinCashMocks } from '../testUtils/mocked/bitcoinCashMockScope.mock';
import TestConfigs from '../testUtils/testConfigs';
import TransactionProcessorMock from './transactionProcessor.mock';

describe('TransactionProcessor', () => {
  const currentTimeStampSeconds = Math.round(
    TestConfigs.currentTimeStamp / 1000,
  );

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TestConfigs.currentTimeStamp));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe('processApprovedTx', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
      TransactionProcessorMock.restoreMocks();
    });

    /**
     * @target TransactionProcessor.processApprovedTx should send
     * approved transactions to sign and update database
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db as 'approved'
     * - mock ChainHandler `getChain`
     *   - mock `signTransaction` (lock it's resolution to avoid inconsistency)
     * - run test (call `processTransactions`)
     * - check if function got called
     * - check tx in database
     * - release `signTransaction` promise
     * @expected
     * - `signTransaction` should got called
     * - tx status should be updated to 'in-sign'
     */
    it('should send approved transactions to sign and update database', async () => {
      // mock transaction and insert into db as 'approved'
      const tx = mockPaymentTransaction();
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `signTransaction`
      let resolvePromise: (value: unknown) => void;
      const signTransactionLock = new Promise(
        (resolve) => (resolvePromise = resolve),
      );
      const mockedSignTransaction = ChainHandlerMock.mockAndGetChainFunction(
        chain,
        'signTransaction',
      );
      mockedSignTransaction.mockImplementation(async () => {
        await signTransactionLock;
        return false;
      });

      // run test
      await TransactionProcessor.processTransactions();

      // `signTransaction` should got called
      expect(mockedSignTransaction).toHaveBeenCalledOnce();

      // tx status should be updated to 'in-sign'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [tx.txId, TransactionStatus.inSign, currentTimeStampSeconds.toString()],
      ]);

      // release signTransaction promise
      resolvePromise!(null);
    });

    /**
     * @target TransactionProcessor.processApprovedTx should handle
     * successful sign
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db as 'approved'
     * - mock ChainHandler `getChain`
     *   - mock `signTransaction`
     *   - mock `getHeight`
     * - mock TransactionProcessor.handleSuccessfulSign
     * - run test (call `processTransactions`)
     * - check if function got called
     * - check tx in database
     * @expected
     * - `signTransaction` should got called
     * - `handleSuccessfulSign` should got called
     */
    it('should handle successful sign', async () => {
      // mock transaction and insert into db as 'approved'
      const tx = mockPaymentTransaction();
      const signedTx = tx;
      signedTx.txBytes = Buffer.from('signed');
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `signTransaction`
      ChainHandlerMock.mockChainFunction(
        chain,
        'signTransaction',
        signedTx,
        true,
      );
      // mock `getHeight`
      const mockedCurrentHeight = 102;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );

      // mock TransactionProcessor.handleSuccessfulSign
      const mockedHandleSuccessfulSign = TransactionProcessorMock.mockFunction(
        'handleSuccessfulSign',
      );

      // run test
      await TransactionProcessor.processTransactions();

      // `signTransaction` should got called
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'signTransaction'),
      ).toHaveBeenCalledOnce();

      // `handleSuccessfulSign` should got called
      expect(mockedHandleSuccessfulSign).toHaveBeenCalledWith(signedTx);
    });

    /**
     * @target TransactionProcessor.processApprovedTx should handle
     * failed sign
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db as 'approved'
     * - mock ChainHandler `getChain`
     *   - mock `signTransaction`
     *   - mock `getHeight`
     * - mock TransactionProcessor.handleFailedSign
     * - run test (call `processTransactions`)
     * - check if function got called
     * - check tx in database
     * @expected
     * - `signTransaction` should got called
     * - `handleFailedSign` should got called
     */
    it('should handle failed sign', async () => {
      // mock transaction and insert into db as 'approved'
      const tx = mockPaymentTransaction();
      const signedTx = tx;
      signedTx.txBytes = Buffer.from('signed');
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `signTransaction`
      ChainHandlerMock.mockChainFunctionToThrow(
        chain,
        'signTransaction',
        new Error(`failure in sign test Error`),
        true,
      );
      // mock `getHeight`
      const mockedCurrentHeight = 102;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );

      // mock TransactionProcessor.handleFailedSign
      const mockedHandleFailedSign =
        TransactionProcessorMock.mockFunction('handleFailedSign');

      // run test
      await TransactionProcessor.processTransactions();

      // `signTransaction` should got called
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'signTransaction'),
      ).toHaveBeenCalledOnce();

      // `handleFailedSign` should got called
      expect(mockedHandleFailedSign).toHaveBeenCalledOnce();
    });
  });

  describe('handleSuccessfulSign', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
      TransactionProcessorMock.restoreMocks();
    });

    /**
     * @target TransactionProcessor.handleSuccessfulSign should update
     * transaction in database to signed tx
     * @dependencies
     * - database
     * @scenario
     * - mock transaction and insert into db as 'in-sign' with a known lastCheck
     * - run test
     * - check if function got called
     * - check tx in database
     * @expected
     * - tx status should be updated to 'signed'
     * - tx lastCheck should remain unchanged
     */
    it('should update transaction in database to signed tx', async () => {
      // mock transaction and insert into db as 'in-sign' with a known lastCheck
      const tx = mockPaymentTransaction();
      const signedTx = tx;
      signedTx.txBytes = Buffer.from('signed');
      const initialLastCheck = 102;
      await DatabaseActionMock.insertTxRecord(
        tx,
        TransactionStatus.inSign,
        initialLastCheck,
      );

      // run test
      await TransactionProcessor.handleSuccessfulSign(signedTx);

      // tx status should be updated to 'signed', lastCheck should remain unchanged
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.txJson,
        tx.status,
        tx.lastStatusUpdate,
        tx.lastCheck,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          signedTx.toJson(),
          TransactionStatus.signed,
          currentTimeStampSeconds.toString(),
          initialLastCheck,
        ],
      ]);
    });
  });

  describe('handleFailedSign', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      TransactionProcessorMock.restoreMocks();
    });

    /**
     * @target TransactionProcessor.handleFailedSign should update
     * transaction status to sign-failed
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db as 'in-sign'
     * - run test
     * - check if function got called
     * - check tx in database
     * @expected
     * - tx status should be updated to 'sign-failed'
     * - tx signFailedCount should be incremented
     * - tx failedInSign should be updated to true
     */
    it('should update transaction status to sign-failed', async () => {
      // mock transaction and insert into db as 'in-sign'
      const tx = mockPaymentTransaction();
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.inSign);

      // run test
      await TransactionProcessor.handleFailedSign(
        tx.txId,
        'sign failure error message',
      );

      // tx status should be updated to 'sign-failed'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
        tx.failedInSign,
        tx.signFailedCount,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.signFailed,
          currentTimeStampSeconds.toString(),
          true,
          1,
        ],
      ]);
    });
  });

  describe('processInSignTx', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target TransactionProcessor.processInSignTx should update status
     * to sign-failed when signer does not have the tx
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db as 'in-sign'
     * - mock ChainHandler `getChain`
     *   - mock `isTransactionInSign` to return false
     * - run test (call `processTransactions`)
     * - check tx in database
     * @expected
     * - tx status should be updated to 'sign-failed'
     * - tx signFailedCount should be incremented
     * - tx failedInSign should be updated to true
     */
    it('should update status to sign-failed when signer does not have the tx', async () => {
      // mock transaction and insert into db as 'approved'
      const tx = mockPaymentTransaction();
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.inSign);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `isTransactionInSign`
      ChainHandlerMock.mockChainFunction(
        chain,
        'isTransactionInSign',
        false,
        true,
      );

      // run test
      await TransactionProcessor.processTransactions();

      // tx status should be updated to 'sign-failed'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
        tx.failedInSign,
        tx.signFailedCount,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.signFailed,
          currentTimeStampSeconds.toString(),
          true,
          1,
        ],
      ]);
    });

    /**
     * @target TransactionProcessor.processInSignTx should do nothing
     * when enough times is not passed from sign request
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db as 'in-sign'
     * - mock ChainHandler `getChain`
     *   - mock `isTransactionInSign` to return true
     * - get database txs
     * - run test (call `processTransactions`)
     * - check tx in database
     * @expected
     * - database txs should remain unchanged
     */
    it('should do nothing when enough times is not passed from sign request', async () => {
      // mock transaction and insert into db as 'in-sign'
      const tx = mockPaymentTransaction();
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.inSign);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `isTransactionInSign`
      ChainHandlerMock.mockChainFunction(
        chain,
        'isTransactionInSign',
        true,
        true,
      );

      // get database txs
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);

      // run test
      await TransactionProcessor.processTransactions();

      // database txs should remain unchanged
      const newDbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(newDbTxs).toEqual(dbTxs);
    });
  });

  describe('processSignFailedTx', () => {
    const defaultInvalidationDetails = (isValid: boolean) => ({
      isValid: isValid,
      details: isValid
        ? undefined
        : {
            reason: 'test reason',
            unexpected: false,
          },
    });

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
      TransactionProcessorMock.restoreMocks();
    });

    /**
     * @target TransactionProcessor.processSignFailedTx should update status
     * to sent when tx is found in blockchain
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db as 'sign-failed'
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     * - run test (call `processTransactions`)
     * - check tx in database
     * @expected
     * - tx status should be updated to 'sent'
     */
    it('should update status to sent when tx is found in blockchain', async () => {
      // mock transaction and insert into db as 'sign-failed'
      const tx = mockPaymentTransaction();
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.signFailed);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxConfirmationStatus',
        ConfirmationStatus.NotConfirmedEnough,
        true,
      );

      // run test
      await TransactionProcessor.processTransactions();

      // tx status should be updated to 'sent'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.sent,
          Math.round(TestConfigs.currentTimeStamp / 1000).toString(),
        ],
      ]);
    });

    /**
     * @target TransactionProcessor.processSignFailedTx should update status
     * to sent when tx is found in mempool
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db as 'sign-failed'
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     *   - mock `isTxInMempool`
     * - run test (call `processTransactions`)
     * - check tx in database
     * @expected
     * - tx status should be updated to 'sent'
     */
    it('should update status to sent when tx is found in mempool', async () => {
      // mock transaction and insert into db as 'sign-failed'
      const tx = mockPaymentTransaction();
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.signFailed);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxConfirmationStatus',
        ConfirmationStatus.NotFound,
        true,
      );
      // mock `isTxInMempool`
      ChainHandlerMock.mockChainFunction(chain, 'isTxInMempool', true, true);

      // run test
      await TransactionProcessor.processTransactions();

      // tx status should be updated to 'sent'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.sent,
          Math.round(TestConfigs.currentTimeStamp / 1000).toString(),
        ],
      ]);
    });

    /**
     * @target TransactionProcessor.processSignFailedTx should resend
     * tx to sign process if tx is still valid
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db as 'sign-failed'
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     *   - mock `isTxInMempool`
     *   - mock `isTxValid`
     *   - mock `getHeight`
     *   - mock `signTransaction` (lock it's resolution to avoid inconsistency)
     * - run test (call `processTransactions`)
     * - check if function got called
     * - check tx in database
     * - release `signTransaction` promise
     * @expected
     * - `signTransaction` should got called
     * - tx status should be updated to 'in-sign'
     * - tx lastCheck should be updated to current height
     */
    it('should resend tx to sign process if tx is still valid', async () => {
      // mock transaction and insert into db as 'sign-failed'
      const tx = mockPaymentTransaction();
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.signFailed);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxConfirmationStatus',
        ConfirmationStatus.NotFound,
        true,
      );
      // mock `isTxInMempool`
      ChainHandlerMock.mockChainFunction(chain, 'isTxInMempool', false, true);
      // mock `isTxValid`
      ChainHandlerMock.mockChainFunction(
        chain,
        'isTxValid',
        defaultInvalidationDetails(true),
        true,
      );
      // mock `getHeight`
      const mockedCurrentHeight = 105;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );
      // mock `signTransaction`
      let resolvePromise: (value: unknown) => void;
      const signTransactionLock = new Promise(
        (resolve) => (resolvePromise = resolve),
      );
      const mockedSignTransaction = ChainHandlerMock.mockAndGetChainFunction(
        chain,
        'signTransaction',
      );
      mockedSignTransaction.mockImplementation(async () => {
        await signTransactionLock;
        return false;
      });

      // run test
      await TransactionProcessor.processTransactions();

      // `signTransaction` should got called
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'signTransaction'),
      ).toHaveBeenCalledOnce();

      // tx status should be updated to 'in-sign', lastCheck should be updated
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
        tx.lastCheck,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.inSign,
          currentTimeStampSeconds.toString(),
          mockedCurrentHeight,
        ],
      ]);

      // release signTransaction promise
      resolvePromise!(null);
    });

    /**
     * @target TransactionProcessor.processSignFailedTx should update
     * status to invalid when tx is not valid anymore
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db as 'sign-failed'
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     *   - mock `isTxInMempool`
     *   - mock `isTxValid`
     * - mock TransactionProcessor.setTransactionAsInvalid
     * - run test (call `processTransactions`)
     * - check if function got called
     * @expected
     * - `setTransactionAsInvalid` should got called
     */
    it('should update status to invalid when tx is not valid anymore', async () => {
      // mock transaction and insert into db as 'sign-failed'
      const tx = mockPaymentTransaction();
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.signFailed);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxConfirmationStatus',
        ConfirmationStatus.NotFound,
        true,
      );
      // mock `isTxInMempool`
      ChainHandlerMock.mockChainFunction(chain, 'isTxInMempool', false, true);
      // mock `isTxValid`
      ChainHandlerMock.mockChainFunction(
        chain,
        'isTxValid',
        defaultInvalidationDetails(false),
        true,
      );

      // mock TransactionProcessor.setTransactionAsInvalid
      TransactionProcessorMock.mockFunction('setTransactionAsInvalid');

      // run test
      await TransactionProcessor.processTransactions();

      // `setTransactionAsInvalid` should got called
      expect(
        TransactionProcessorMock.getMockedSpy('setTransactionAsInvalid'),
      ).toHaveBeenCalledOnce();
    });

    describe('BCH RCS bitcoinCashRecovery', () => {
      let restoreBchMocks: () => void;
      beforeEach(() => {
        restoreBchMocks = preserveBitcoinCashMocks([
          [bchRecovery_ChainHandler, ['getInstance']],
          [bchRecovery_chainHandlerInstance, ['getChain']],
          [bchRecovery_TransactionSerializer, ['fromJson']],
          [
            bchRecovery_DatabaseAction.getInstance(),
            ['updateWithSignedTx', 'setTxStatus'],
          ],
          [bchOwnedMinimumFeeHandler, ['getEventFeeConfig']],
          [bchOwnedEventOrder, ['createEventPaymentOrder']],
        ]);
      });
      afterEach(() => restoreBchMocks());

      /**
       * @target TransactionProcessor.processSignFailedTx - persists an
       * unconfirmed recovered signature before advancing sign-failed state
       * @dependencies
       * - Real BCH chain and test database; mocked network history and mempool
       * @scenario
       * - Recover valid signed bytes while confirmation is absent but mempool
       * is true
       * @expected
       * - The row becomes sent with the signed envelope retained
       */
      it('persists an unconfirmed recovered signature before advancing sign-failed state', async () => {
        const { network, unsigned, signed, action } = await bchRecovery_setup();
        network.getTxConfirmation.mockResolvedValue(-1);
        network.isTxInMempool.mockResolvedValue(true);
        await bchRecovery_DatabaseActionMock.insertTxRecord(
          unsigned,
          bchRecovery_TransactionStatus.signFailed,
        );
        await bchRecovery_TransactionProcessor.processSignFailedTx(
          (await action.getTxById(unsigned.txId))!,
        );
        const row = (await action.getTxById(unsigned.txId))!;
        expect(row.status).toEqual(bchRecovery_TransactionStatus.sent);
        expect(row.txJson).toEqual(signed.toJson());
      });
      /**
       * @target TransactionProcessor.processSignFailedTx - resumes after
       * interruption between signed-byte persistence and sent-state
       * advancement
       * @dependencies
       * - Real BCH chain and test database; one failing status-write spy
       * @scenario
       * - Persist recovered signed bytes and fail the following status update
       * - Retry from the retained row after restoring the status writer
       * @expected
       * - The first attempt retains bytes in sign-failed state
       * - Retry advances to sent without rescanning wallet history
       */
      it('resumes after interruption between signed-byte persistence and sent-state advancement', async () => {
        const { network, unsigned, signed, action } = await bchRecovery_setup();
        await bchRecovery_DatabaseActionMock.insertTxRecord(
          unsigned,
          bchRecovery_TransactionStatus.signFailed,
        );
        const status = vi
          .spyOn(action, 'setTxStatus')
          .mockRejectedValueOnce(Error('Synthetic interruption'));
        await expect(
          bchRecovery_TransactionProcessor.processSignFailedTx(
            (await action.getTxById(unsigned.txId))!,
          ),
        ).rejects.toThrow('Synthetic interruption');
        const retained = (await action.getTxById(unsigned.txId))!;
        expect(retained.status).toEqual(
          bchRecovery_TransactionStatus.signFailed,
        );
        expect(retained.txJson).toEqual(signed.toJson());
        network.findSignedTransaction.mockClear();
        status.mockRestore();
        await bchRecovery_TransactionProcessor.processSignFailedTx(retained);
        expect((await action.getTxById(unsigned.txId))!.status).toEqual(
          bchRecovery_TransactionStatus.sent,
        );
        expect(network.findSignedTransaction).not.toHaveBeenCalled();
      });
      /**
       * @target TransactionProcessor.processSignFailedTx - does not advance
       * the row when recovered materialization fails: %s
       * @dependencies
       * - Real BCH chain and test database; mocked recovery and confirmation
       * - A failing signed-envelope database update for the database vector
       * @scenario
       * - Fix confirmed inclusion and isolate missing bytes, invalid
       * signature,
       * - wrong context or identity, and a database persistence failure
       * @expected
       * - Every attempt throws and retains the unsigned sign-failed row
       */
      it.each([
        'missing',
        'bad-signature',
        'wrong-event',
        'wrong-type',
        'wrong-chain',
        'wrong-approval',
        'database',
      ])(
        'does not advance the row when recovered materialization fails: %s',
        async (fault) => {
          const { chain, unsigned, signed, action } = await bchRecovery_setup();
          await bchRecovery_DatabaseActionMock.insertTxRecord(
            unsigned,
            bchRecovery_TransactionStatus.signFailed,
          );
          const candidate = chain.PaymentTransactionFromJson(signed.toJson());
          if (fault === 'wrong-event') candidate.eventId = 'different-event';
          if (fault === 'wrong-type')
            candidate.txType = bchRecovery_TransactionType.manual;
          if (fault === 'wrong-chain') candidate.network = 'bitcoin';
          if (fault === 'wrong-approval') candidate.txId = '11'.repeat(32);
          vi.spyOn(chain, 'getRecoveredTransaction').mockResolvedValue(
            fault === 'missing'
              ? undefined
              : fault === 'bad-signature'
                ? unsigned
                : candidate,
          );
          // Keep observed inclusion fixed so this isolates persistence materialization.
          vi.spyOn(chain, 'getTxConfirmationStatus').mockResolvedValue(
            bchRecovery_ConfirmationStatus.ConfirmedEnough,
          );
          if (fault === 'database')
            vi.spyOn(action, 'updateWithSignedTx').mockRejectedValue(
              Error('Synthetic database failure'),
            );
          await expect(
            bchRecovery_TransactionProcessor.processSignFailedTx(
              (await action.getTxById(unsigned.txId))!,
            ),
          ).rejects.toThrow();
          const row = (await action.getTxById(unsigned.txId))!;
          expect(row.status).toEqual(bchRecovery_TransactionStatus.signFailed);
          expect(row.txJson).toEqual(unsigned.toJson());
        },
      );
    });

    describe('BCH RCS bitcoinCashRecovery downstream materialization', () => {
      let restoreBchMocks: () => void;

      beforeEach(() => {
        restoreBchMocks = preserveBitcoinCashMocks([
          [bchRecovery_ChainHandler, ['getInstance']],
          [bchRecovery_chainHandlerInstance, ['getChain']],
          [bchRecovery_TransactionSerializer, ['fromJson']],
          [
            bchRecovery_DatabaseAction.getInstance(),
            ['updateWithSignedTx', 'setTxStatus'],
          ],
          [bchOwnedMinimumFeeHandler, ['getEventFeeConfig']],
          [bchOwnedEventOrder, ['createEventPaymentOrder']],
        ]);
      });

      afterEach(() => restoreBchMocks());

      /**
       * @target TransactionProcessor.processSignFailedTx - materializes a
       * recovered %s row before completion and remote synchronization
       * @dependencies
       * - Real BCH chain, serializer and test database; mocked network and
       * signer
       * - Mocked fee/order seams and synchronization test class
       * @scenario
       * - Recover a sign-failed or sent unsigned row into its signed envelope
       * - Process confirmation and verify a remote synchronization response
       * @expected
       * - The row completes with its approval ID and complete signed envelope
       * - Signed-condition and synchronization checks succeed
       */
      it.each([bchRecovery_TransactionStatus.signFailed])(
        'materializes a recovered %s row before completion and remote synchronization',
        async (status) => {
          const { chain, unsigned, signed, eventId, action } =
            await bchRecovery_setup();
          await bchRecovery_DatabaseActionMock.insertTxRecord(unsigned, status);
          let row = (await action.getTxById(unsigned.txId))!;
          if (status === bchRecovery_TransactionStatus.signFailed) {
            await bchRecovery_TransactionProcessor.processSignFailedTx(row);
            row = (await action.getTxById(unsigned.txId))!;
            expect(row.status).toEqual(bchRecovery_TransactionStatus.sent);
            expect(row.txJson).toEqual(signed.toJson());
          }
          await bchRecovery_TransactionProcessor.processSentTx(row);
          row = (await action.getTxById(unsigned.txId))!;
          expect(row.status).toEqual(bchRecovery_TransactionStatus.completed);
          expect(row.txId).toEqual(unsigned.txId);
          expect(row.txJson).toEqual(signed.toJson());
          const restored = chain.PaymentTransactionFromJson(row.txJson);
          expect(
            chain.verifyTransactionExtraConditions(
              restored,
              bchRecovery_SigningStatus.Signed,
            ),
          ).toEqual(true);
          bchRecovery_mockGetEventFeeConfig({
            bridgeFee: 0n,
            networkFee: 0n,
            rsnRatio: 0n,
            feeRatio: 100n,
            rsnRatioDivisor: 1000000000000n,
            feeRatioDivisor: 10000n,
          });
          bchRecovery_mockCreateEventPaymentOrder(
            chain.extractTransactionOrder(unsigned),
          );
          const sync = new bchRecovery_TestEventSynchronization();
          sync.insertEventIntoActiveSync(eventId, {
            timestamp: Date.now() / 1000,
            responses: [],
          });
          expect(
            await sync.callVerifySynchronizationResponse(
              restored,
              signed.getActualTxId()!,
            ),
          ).toEqual(true);
        },
      );
    });
  });

  describe('processSignedTx', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
    });

    /**
     * @target TransactionProcessor.processSignedTx should submit
     * signed transactions to the network
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db as 'signed'
     * - mock ChainHandler `getChain`
     *   - mock `submitTransaction`
     * - run test (call `processTransactions`)
     * - check if function got called
     * - check tx in database
     * @expected
     * - `submitTransaction` should got called
     * - tx status should be updated to 'sent'
     */
    it('should submit signed transactions to the network', async () => {
      // mock transaction and insert into db as 'signed'
      const tx = mockPaymentTransaction();
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.signed);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `submitTransaction`
      ChainHandlerMock.mockChainFunction(
        chain,
        'submitTransaction',
        null,
        true,
      );

      // run test
      await TransactionProcessor.processTransactions();

      // `submitTransaction` should got called
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'submitTransaction'),
      ).toHaveBeenCalledOnce();

      // tx status should be updated to 'sent'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [tx.txId, TransactionStatus.sent, currentTimeStampSeconds.toString()],
      ]);
    });
  });

  describe('processSentTx', () => {
    const defaultInvalidationDetails = (isValid: boolean) => ({
      isValid: isValid,
      details: isValid
        ? undefined
        : {
            reason: 'test reason',
            unexpected: false,
          },
    });

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
      TransactionProcessorMock.restoreMocks();
    });

    /**
     * @target TransactionProcessor.processSentTx should update tx status
     * to completed and event status to pending-reward when payment tx is confirmed enough
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     * - run test (call `processTransactions`)
     * - check tx in database
     * @expected
     * - tx status should be updated to 'completed'
     * - event status should be updated to 'pending-reward'
     */
    it('should update tx status to completed and event status to pending-reward when payment tx is confirmed enough', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxConfirmationStatus',
        ConfirmationStatus.ConfirmedEnough,
        true,
      );

      // run test
      await TransactionProcessor.processTransactions();

      // tx status should be updated to 'completed'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.completed,
          currentTimeStampSeconds.toString(),
        ],
      ]);

      // event status should be updated to 'pending-reward'
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status, event.firstTry],
      );
      expect(dbEvents).toEqual([
        [
          eventId,
          EventStatus.pendingReward,
          currentTimeStampSeconds.toString(),
        ],
      ]);
    });

    /**
     * @target TransactionProcessor.processSentTx should update tx status
     * and event status to completed when Ergo payment tx is confirmed enough
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     * - run test (call `processTransactions`)
     * - check tx in database
     * @expected
     * - tx status should be updated to 'completed'
     * - event status should be updated to 'completed'
     */
    it('should update tx status and event status to completed when Ergo payment tx is confirmed enough', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockToErgoEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockErgoPaymentTransaction(TransactionType.payment, eventId);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getTxConfirmationStatus',
        ConfirmationStatus.ConfirmedEnough,
        true,
      );

      // run test
      await TransactionProcessor.processTransactions();

      // tx status should be updated to 'completed'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.completed,
          currentTimeStampSeconds.toString(),
        ],
      ]);

      // event status should be updated to 'completed'
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents).toEqual([[eventId, EventStatus.completed]]);
    });

    /**
     * @target TransactionProcessor.processSentTx should update tx status
     * and event status to completed when reward distribution tx is confirmed enough
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     * - run test (call `processTransactions`)
     * - check tx in database
     * @expected
     * - tx status should be updated to 'completed'
     * - event status should be updated to 'completed'
     */
    it('should update tx status and event status to completed when reward distribution tx is confirmed enough', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockErgoPaymentTransaction(TransactionType.reward, eventId);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inReward,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getTxConfirmationStatus',
        ConfirmationStatus.ConfirmedEnough,
        true,
      );

      // run test
      await TransactionProcessor.processTransactions();

      // tx status should be updated to 'completed'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.completed,
          currentTimeStampSeconds.toString(),
        ],
      ]);

      // event status should be updated to 'completed'
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status],
      );
      expect(dbEvents).toEqual([[eventId, EventStatus.completed]]);
    });

    /**
     * @target TransactionProcessor.processSentTx should update tx status
     * and order status to completed when it's tx is confirmed enough
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock order and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     * - run test (call `processTransactions`)
     * - check tx in database
     * @expected
     * - tx status should be updated to 'completed'
     * - order status should be updated to 'completed'
     */
    it("should update tx status and order status to completed when it's tx is confirmed enough", async () => {
      // mock order and transaction and insert into db
      const orderId = 'order-id';
      const chain = CARDANO_CHAIN;
      const tx = mockErgoPaymentTransaction(TransactionType.arbitrary, orderId);
      await DatabaseActionMock.insertOrderRecord(
        orderId,
        chain,
        `orderJson`,
        OrderStatus.pending,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent);

      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getTxConfirmationStatus',
        ConfirmationStatus.ConfirmedEnough,
        true,
      );

      // run test
      await TransactionProcessor.processTransactions();

      // tx status should be updated to 'completed'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.completed,
          currentTimeStampSeconds.toString(),
        ],
      ]);

      // order status should be updated to 'completed'
      const dbOrders = (await DatabaseActionMock.allOrderRecords()).map(
        (order) => [order.id, order.status],
      );
      expect(dbOrders).toEqual([[orderId, OrderStatus.completed]]);
    });

    /**
     * @target TransactionProcessor.processSentTx should update tx status
     * to completed when cold storage tx is confirmed enough
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     * - run test (call `processTransactions`)
     * - check tx in database
     * @expected
     * - tx status should be updated to 'completed'
     */
    it('should update tx status to completed when cold storage tx is confirmed enough', async () => {
      // mock transaction and insert into db
      const tx = mockPaymentTransaction(
        TransactionType.coldStorage,
        'chain',
        '',
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxConfirmationStatus',
        ConfirmationStatus.ConfirmedEnough,
        true,
      );

      // run test
      await TransactionProcessor.processTransactions();

      // tx status should be updated to 'completed'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.completed,
          currentTimeStampSeconds.toString(),
        ],
      ]);
    });

    /**
     * @target TransactionProcessor.processSentTx should update last check
     * when transaction is not confirmed enough
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     *   - mock `getHeight`
     * - run test (call `processTransactions`)
     * - check tx in database
     * @expected
     * - tx last check should be updated
     */
    it('should update last check when transaction is not confirmed enough', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxConfirmationStatus',
        ConfirmationStatus.NotConfirmedEnough,
        true,
      );
      // mock `getHeight`
      const mockedCurrentHeight = 102;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );

      // run test
      await TransactionProcessor.processTransactions();

      // tx last check should be updated
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastCheck,
      ]);
      expect(dbTxs).toEqual([
        [tx.txId, TransactionStatus.sent, mockedCurrentHeight],
      ]);
    });

    /**
     * @target TransactionProcessor.processSentTx should update last check
     * when transaction is in mempool
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     *   - mock `getHeight`
     *   - mock `isTxInMempool`
     * - run test (call `processTransactions`)
     * - check tx in database
     * @expected
     * - tx last check should be updated
     */
    it('should update last check when transaction is in mempool', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxConfirmationStatus',
        ConfirmationStatus.NotFound,
        true,
      );
      // mock `getHeight`
      const mockedCurrentHeight = 102;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );
      // mock `isTxInMempool`
      ChainHandlerMock.mockChainFunction(chain, 'isTxInMempool', true, true);

      // run test
      await TransactionProcessor.processTransactions();

      // tx last check should be updated
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastCheck,
      ]);
      expect(dbTxs).toEqual([
        [tx.txId, TransactionStatus.sent, mockedCurrentHeight],
      ]);
    });

    /**
     * @target TransactionProcessor.processSentTx should resubmit
     * the transaction when not found but still valid
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     *   - mock `isTxInMempool`
     *   - mock `isTxValid`
     *   - mock `submitTransaction`
     * - run test (call `processTransactions`)
     * - check if function got called
     * - check tx in database
     * @expected
     * - `signTransaction` should got called
     */
    it('should resubmit the transaction when not found but still valid', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxConfirmationStatus',
        ConfirmationStatus.NotFound,
        true,
      );
      // mock `isTxInMempool`
      ChainHandlerMock.mockChainFunction(chain, 'isTxInMempool', false, true);
      // mock `isTxValid`
      ChainHandlerMock.mockChainFunction(
        chain,
        'isTxValid',
        defaultInvalidationDetails(true),
        true,
      );
      // mock `submitTransaction`
      ChainHandlerMock.mockChainFunction(
        chain,
        'submitTransaction',
        null,
        true,
      );

      // run test
      await TransactionProcessor.processTransactions();

      // `submitTransaction` should got called
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'submitTransaction'),
      ).toHaveBeenCalledOnce();
    });

    /**
     * @target TransactionProcessor.processSentTx should update
     * status to invalid when tx is not valid anymore
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getTxConfirmationStatus`
     *   - mock `isTxInMempool`
     *   - mock `isTxValid`
     * - mock TransactionProcessor.setTransactionAsInvalid
     * - run test (call `processTransactions`)
     * @expected
     * - `setTransactionAsInvalid` should got called
     */
    it('should update status to invalid when tx is not valid anymore', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxConfirmationStatus',
        ConfirmationStatus.NotFound,
        true,
      );
      // mock `isTxInMempool`
      ChainHandlerMock.mockChainFunction(chain, 'isTxInMempool', false, true);
      // mock `isTxValid`
      ChainHandlerMock.mockChainFunction(
        chain,
        'isTxValid',
        defaultInvalidationDetails(false),
        true,
      );

      // mock TransactionProcessor.setTransactionAsInvalid
      TransactionProcessorMock.mockFunction('setTransactionAsInvalid');

      // run test
      await TransactionProcessor.processTransactions();

      // `setTransactionAsInvalid` should got called
      expect(
        TransactionProcessorMock.getMockedSpy('setTransactionAsInvalid'),
      ).toHaveBeenCalledOnce();
    });

    describe('BCH RCS bitcoinCashRecovery', () => {
      let restoreBchMocks: () => void;
      beforeEach(() => {
        restoreBchMocks = preserveBitcoinCashMocks([
          [bchRecovery_ChainHandler, ['getInstance']],
          [bchRecovery_chainHandlerInstance, ['getChain']],
          [bchRecovery_TransactionSerializer, ['fromJson']],
          [
            bchRecovery_DatabaseAction.getInstance(),
            ['updateWithSignedTx', 'setTxStatus'],
          ],
          [bchOwnedMinimumFeeHandler, ['getEventFeeConfig']],
          [bchOwnedEventOrder, ['createEventPaymentOrder']],
        ]);
      });
      afterEach(() => restoreBchMocks());

      /**
       * @target TransactionProcessor.processSentTx - materializes a recovered
       * %s row before completion and remote synchronization
       * @dependencies
       * - Real BCH chain, serializer and test database; mocked network and
       * signer
       * - Mocked fee/order seams and synchronization test class
       * @scenario
       * - Recover a sign-failed or sent unsigned row into its signed envelope
       * - Process confirmation and verify a remote synchronization response
       * @expected
       * - The row completes with its approval ID and complete signed envelope
       * - Signed-condition and synchronization checks succeed
       */
      it.each([bchRecovery_TransactionStatus.sent])(
        'materializes a recovered %s row before completion and remote synchronization',
        async (status) => {
          const { chain, unsigned, signed, eventId, action } =
            await bchRecovery_setup();
          await bchRecovery_DatabaseActionMock.insertTxRecord(unsigned, status);
          let row = (await action.getTxById(unsigned.txId))!;
          if (status === bchRecovery_TransactionStatus.signFailed) {
            await bchRecovery_TransactionProcessor.processSignFailedTx(row);
            row = (await action.getTxById(unsigned.txId))!;
            expect(row.status).toEqual(bchRecovery_TransactionStatus.sent);
            expect(row.txJson).toEqual(signed.toJson());
          }
          await bchRecovery_TransactionProcessor.processSentTx(row);
          row = (await action.getTxById(unsigned.txId))!;
          expect(row.status).toEqual(bchRecovery_TransactionStatus.completed);
          expect(row.txId).toEqual(unsigned.txId);
          expect(row.txJson).toEqual(signed.toJson());
          const restored = chain.PaymentTransactionFromJson(row.txJson);
          expect(
            chain.verifyTransactionExtraConditions(
              restored,
              bchRecovery_SigningStatus.Signed,
            ),
          ).toEqual(true);
          bchRecovery_mockGetEventFeeConfig({
            bridgeFee: 0n,
            networkFee: 0n,
            rsnRatio: 0n,
            feeRatio: 100n,
            rsnRatioDivisor: 1000000000000n,
            feeRatioDivisor: 10000n,
          });
          bchRecovery_mockCreateEventPaymentOrder(
            chain.extractTransactionOrder(unsigned),
          );
          const sync = new bchRecovery_TestEventSynchronization();
          sync.insertEventIntoActiveSync(eventId, {
            timestamp: Date.now() / 1000,
            responses: [],
          });
          expect(
            await sync.callVerifySynchronizationResponse(
              restored,
              signed.getActualTxId()!,
            ),
          ).toEqual(true);
        },
      );
      /**
       * @target TransactionProcessor.processSentTx - keeps an already signed
       * sent envelope without a wallet-history scan or rewrite
       * @dependencies
       * - Real BCH chain and test database; mocked network and database-update
       * spy
       * @scenario
       * - Process a sent row that already stores complete signed bytes
       * @expected
       * - No history scan or signed-envelope rewrite occurs
       */
      it('keeps an already signed sent envelope without a wallet-history scan or rewrite', async () => {
        const { network, signed, action } = await bchRecovery_setup();
        await bchRecovery_DatabaseActionMock.insertTxRecord(
          signed,
          bchRecovery_TransactionStatus.sent,
        );
        const update = vi.spyOn(action, 'updateWithSignedTx');
        await bchRecovery_TransactionProcessor.processSentTx(
          (await action.getTxById(signed.txId))!,
        );
        expect(update).not.toHaveBeenCalled();
        expect(network.findSignedTransaction).not.toHaveBeenCalled();
        expect((await action.getTxById(signed.txId))!.txJson).toEqual(
          signed.toJson(),
        );
      });
      /**
       * @target TransactionProcessor.processSentTx - preserves sent state
       * while persisting unconfirmed bytes (confirmations %s)
       * @dependencies
       * - Real BCH chain and test database; mocked network history and mempool
       * @scenario
       * - Recover valid signed bytes with zero or absent confirmation
       * @expected
       * - The row remains sent and persists the recovered signed envelope
       */
      it.each([0, -1])(
        'preserves sent state while persisting unconfirmed bytes (confirmations %s)',
        async (confirmation) => {
          const { network, unsigned, signed, action } =
            await bchRecovery_setup();
          network.getTxConfirmation.mockResolvedValue(confirmation);
          network.isTxInMempool.mockResolvedValue(true);
          await bchRecovery_DatabaseActionMock.insertTxRecord(
            unsigned,
            bchRecovery_TransactionStatus.sent,
          );
          await bchRecovery_TransactionProcessor.processSentTx(
            (await action.getTxById(unsigned.txId))!,
          );
          const row = (await action.getTxById(unsigned.txId))!;
          expect(row.status).toEqual(bchRecovery_TransactionStatus.sent);
          expect(row.txJson).toEqual(signed.toJson());
        },
      );
    });
  });

  describe('setTransactionAsInvalid', () => {
    const invalidationDetails = (unexpected: boolean) => ({
      reason: 'test reason',
      unexpected: unexpected,
    });

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
      TransactionProcessorMock.restoreMocks();
      NotificationHandlerMock.resetMock();
      NotificationHandlerMock.mock();
    });

    /**
     * @target TransactionProcessor.setTransactionAsInvalid should update
     * tx status to invalid and event status to pending-payment when payment tx is invalid
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getHeight`
     *   - mock `getTxRequiredConfirmation`
     * - run test
     * - check tx in database
     * @expected
     * - tx status should be updated to 'invalid'
     * - event status should be updated to 'pending-payment'
     * - event firstTry should remain unchanged
     * - event unexpectedFails should remain unchanged
     */
    it('should update tx status to invalid and event status to pending-payment when payment tx is invalid', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      const firstTry = '1000';
      const unexpectedFails = 1;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
        'box-serialized',
        300,
        firstTry,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        unexpectedFails,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getHeight`
      const mockedCurrentHeight = 111;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );
      // mock `getTxRequiredConfirmation`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxRequiredConfirmation',
        10,
      );

      // run test
      const txEntity = (await DatabaseActionMock.allTxRecords())[0];
      const mockedChain = chainHandlerInstance.getChain(chain);
      await TransactionProcessor.setTransactionAsInvalid(
        txEntity,
        mockedChain,
        invalidationDetails(false),
      );

      // tx status should be updated to 'invalid'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.invalid,
          currentTimeStampSeconds.toString(),
        ],
      ]);

      // event status should be updated to 'pending-payment'
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [
          event.id,
          event.status,
          event.firstTry,
          event.unexpectedFails,
        ],
      );
      expect(dbEvents).toEqual([
        [eventId, EventStatus.pendingPayment, firstTry, unexpectedFails],
      ]);
    });

    /**
     * @target TransactionProcessor.setTransactionAsInvalid should update
     * tx status to invalid and event status to pending-reward when reward distribution tx is invalid
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getHeight`
     *   - mock `getTxRequiredConfirmation`
     * - run test
     * - check tx in database
     * @expected
     * - tx status should be updated to 'invalid'
     * - event status should be updated to 'pending-reward'
     * - event firstTry should remain unchanged
     * - event unexpectedFails should remain unchanged
     */
    it('should update tx status to invalid and event status to pending-reward when reward distribution tx is invalid', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.reward,
        mockedEvent.toChain,
        eventId,
      );
      const firstTry = '1000';
      const unexpectedFails = 1;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inReward,
        'box-serialized',
        300,
        firstTry,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        unexpectedFails,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getHeight`
      const mockedCurrentHeight = 111;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );
      // mock `getTxRequiredConfirmation`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxRequiredConfirmation',
        10,
      );

      // run test
      const txEntity = (await DatabaseActionMock.allTxRecords())[0];
      const mockedChain = chainHandlerInstance.getChain(tx.network);
      await TransactionProcessor.setTransactionAsInvalid(
        txEntity,
        mockedChain,
        invalidationDetails(false),
      );

      // tx status should be updated to 'invalid'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.invalid,
          currentTimeStampSeconds.toString(),
        ],
      ]);

      // event status should be updated to 'pending-reward'
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [
          event.id,
          event.status,
          event.firstTry,
          event.unexpectedFails,
        ],
      );
      expect(dbEvents).toEqual([
        [eventId, EventStatus.pendingReward, firstTry, unexpectedFails],
      ]);
    });

    /**
     * @target TransactionProcessor.setTransactionAsInvalid should update
     * tx status to invalid and order status to pending when it's tx is invalid
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock order and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getHeight`
     *   - mock `getTxRequiredConfirmation`
     * - run test
     * - check tx in database
     * @expected
     * - tx status should be updated to 'invalid'
     * - order status should be updated to 'pending'
     * - order firstTry should remain unchanged
     * - order unexpectedFails should remain unchanged
     */
    it("should update tx status to invalid and order status to pending when it's tx is invalid", async () => {
      // mock order and transaction and insert into db
      const orderId = 'order-id';
      const chain = CARDANO_CHAIN;
      const tx = mockPaymentTransaction(
        TransactionType.arbitrary,
        chain,
        orderId,
      );
      const firstTry = '1000';
      const unexpectedFails = 1;
      await DatabaseActionMock.insertOrderRecord(
        orderId,
        chain,
        `orderJson`,
        OrderStatus.pending,
        firstTry,
        unexpectedFails,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `getHeight`
      const mockedCurrentHeight = 111;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );
      // mock `getTxRequiredConfirmation`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxRequiredConfirmation',
        10,
      );

      // run test
      const txEntity = (await DatabaseActionMock.allTxRecords())[0];
      const mockedChain = chainHandlerInstance.getChain(chain);
      await TransactionProcessor.setTransactionAsInvalid(
        txEntity,
        mockedChain,
        invalidationDetails(false),
      );

      // tx status should be updated to 'invalid'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.invalid,
          currentTimeStampSeconds.toString(),
        ],
      ]);

      // order status should be updated to 'pending'
      const dbOrders = (await DatabaseActionMock.allOrderRecords()).map(
        (order) => [
          order.id,
          order.status,
          order.firstTry,
          order.unexpectedFails,
        ],
      );
      expect(dbOrders).toEqual([
        [orderId, OrderStatus.pending, firstTry, unexpectedFails],
      ]);
    });

    /**
     * @target TransactionProcessor.setTransactionAsInvalid should update
     * tx status to invalid when cold storage tx is invalid
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getHeight`
     *   - mock `getTxRequiredConfirmation`
     * - run test
     * - check tx in database
     * @expected
     * - tx status should be updated to 'invalid'
     */
    it('should update tx status to invalid when cold storage tx is invalid', async () => {
      // mock transaction and insert into db
      const tx = mockPaymentTransaction(
        TransactionType.coldStorage,
        'chain',
        '',
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getHeight`
      const mockedCurrentHeight = 111;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );
      // mock `getTxRequiredConfirmation`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxRequiredConfirmation',
        10,
      );

      // run test
      const txEntity = (await DatabaseActionMock.allTxRecords())[0];
      const mockedChain = chainHandlerInstance.getChain(tx.network);
      await TransactionProcessor.setTransactionAsInvalid(
        txEntity,
        mockedChain,
        invalidationDetails(false),
      );

      // tx status should be updated to 'invalid'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.invalid,
          currentTimeStampSeconds.toString(),
        ],
      ]);
    });

    /**
     * @target TransactionProcessor.setTransactionAsInvalid should update
     * tx status to invalid when manual tx is invalid
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getHeight`
     *   - mock `getTxRequiredConfirmation`
     * - run test
     * - check tx in database
     * @expected
     * - tx status should be updated to 'invalid'
     */
    it('should update tx status to invalid when manual tx is invalid', async () => {
      // mock transaction and insert into db
      const tx = mockPaymentTransaction(TransactionType.manual, 'chain', '');
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getHeight`
      const mockedCurrentHeight = 111;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );
      // mock `getTxRequiredConfirmation`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxRequiredConfirmation',
        10,
      );

      // run test
      const txEntity = (await DatabaseActionMock.allTxRecords())[0];
      const mockedChain = chainHandlerInstance.getChain(tx.network);
      await TransactionProcessor.setTransactionAsInvalid(
        txEntity,
        mockedChain,
        invalidationDetails(false),
      );

      // tx status should be updated to 'invalid'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.invalid,
          currentTimeStampSeconds.toString(),
        ],
      ]);
    });

    /**
     * @target TransactionProcessor.setTransactionAsInvalid should do nothing
     * when there is not enough confirmation for invalid state
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getHeight`
     *   - mock `getTxRequiredConfirmation`
     * - get database txs and events
     * - run test
     * - check tx in database
     * @expected
     * - txs should remain unchanged
     * - events should remain unchanged
     */
    it('should do nothing when there is not enough confirmation for invalid state', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.reward,
        mockedEvent.toChain,
        eventId,
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inReward,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getHeight`
      const mockedCurrentHeight = 111;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );
      // mock `getTxRequiredConfirmation`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxRequiredConfirmation',
        15,
      );

      // get database txs and events
      const dbTxs = await DatabaseActionMock.allTxRecords();
      const dbEvents = await DatabaseActionMock.allEventRecords();

      // run test
      const txEntity = (await DatabaseActionMock.allTxRecords())[0];
      const mockedChain = chainHandlerInstance.getChain(tx.network);
      await TransactionProcessor.setTransactionAsInvalid(
        txEntity,
        mockedChain,
        invalidationDetails(false),
      );

      // txs should remain unchanged
      expect(await DatabaseActionMock.allTxRecords()).toEqual(dbTxs);

      // events should remain unchanged
      expect(await DatabaseActionMock.allEventRecords()).toEqual(dbEvents);
    });

    /**
     * @target TransactionProcessor.setTransactionAsInvalid should update
     * tx status to invalid, event status to pending-payment and increment
     * unexpectedFails when payment tx has become invalid unexpectedly
     * @dependencies
     * - database
     * - ChainHandler
     * - NotificationHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getHeight`
     *   - mock `getTxRequiredConfirmation`
     * - mock NotificationHandler `notify`
     * - run test
     * - check tx in database
     * @expected
     * - tx status should be updated to 'invalid'
     * - event status should be updated to 'pending-payment'
     * - event firstTry should remain unchanged
     * - event unexpectedFails should be incremented
     */
    it('should update tx status to invalid, event status to pending-payment and increment unexpectedFails when payment tx has become invalid unexpectedly', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      const firstTry = '1000';
      const unexpectedFails = 1;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
        'box-serialized',
        300,
        firstTry,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        unexpectedFails,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getHeight`
      const mockedCurrentHeight = 111;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );
      // mock `getTxRequiredConfirmation`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxRequiredConfirmation',
        10,
      );

      // mock NotificationHandler `notify`
      NotificationHandlerMock.mockNotify();

      // run test
      const txEntity = (await DatabaseActionMock.allTxRecords())[0];
      const mockedChain = chainHandlerInstance.getChain(chain);
      await TransactionProcessor.setTransactionAsInvalid(
        txEntity,
        mockedChain,
        invalidationDetails(true),
      );

      // tx status should be updated to 'invalid'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.invalid,
          currentTimeStampSeconds.toString(),
        ],
      ]);

      // event status should be updated to 'pending-payment'
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [
          event.id,
          event.status,
          event.firstTry,
          event.unexpectedFails,
        ],
      );
      expect(dbEvents).toEqual([
        [eventId, EventStatus.pendingPayment, firstTry, unexpectedFails + 1],
      ]);
    });

    /**
     * @target TransactionProcessor.setTransactionAsInvalid should update
     * tx status to invalid, event status to pending-reward and increment
     * unexpectedFails when reward distribution tx has become invalid unexpectedly
     * @dependencies
     * - database
     * - ChainHandler
     * - NotificationHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getHeight`
     *   - mock `getTxRequiredConfirmation`
     * - mock NotificationHandler `notify`
     * - run test
     * - check tx in database
     * @expected
     * - tx status should be updated to 'invalid'
     * - event status should be updated to 'pending-reward'
     * - event firstTry should remain unchanged
     * - event unexpectedFails should be incremented
     */
    it('should update tx status to invalid, event status to pending-reward and increment unexpectedFails when reward distribution tx has become invalid unexpectedly', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.reward,
        mockedEvent.toChain,
        eventId,
      );
      const firstTry = '1000';
      const unexpectedFails = 1;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inReward,
        'box-serialized',
        300,
        firstTry,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        unexpectedFails,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getHeight`
      const mockedCurrentHeight = 111;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );
      // mock `getTxRequiredConfirmation`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxRequiredConfirmation',
        10,
      );

      // mock NotificationHandler `notify`
      NotificationHandlerMock.mockNotify();

      // run test
      const txEntity = (await DatabaseActionMock.allTxRecords())[0];
      const mockedChain = chainHandlerInstance.getChain(tx.network);
      await TransactionProcessor.setTransactionAsInvalid(
        txEntity,
        mockedChain,
        invalidationDetails(true),
      );

      // tx status should be updated to 'invalid'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.invalid,
          currentTimeStampSeconds.toString(),
        ],
      ]);

      // event status should be updated to 'pending-reward'
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [
          event.id,
          event.status,
          event.firstTry,
          event.unexpectedFails,
        ],
      );
      expect(dbEvents).toEqual([
        [eventId, EventStatus.pendingReward, firstTry, unexpectedFails + 1],
      ]);
    });

    /**
     * @target TransactionProcessor.setTransactionAsInvalid should update
     * tx status to invalid and order status to pending and increment unexpectedFails
     * when it's tx has become invalid unexpectedly
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock order and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getHeight`
     *   - mock `getTxRequiredConfirmation`
     * - mock NotificationHandler `notify`
     * - run test
     * - check tx in database
     * @expected
     * - tx status should be updated to 'invalid'
     * - order status should be updated to 'pending'
     * - order firstTry should remain unchanged
     * - order unexpectedFails should be incremented
     */
    it("should update tx status to invalid and order status to pending and increment unexpectedFails when it's tx has become invalid unexpectedly", async () => {
      // mock order and transaction and insert into db
      const orderId = 'order-id';
      const chain = CARDANO_CHAIN;
      const tx = mockPaymentTransaction(
        TransactionType.arbitrary,
        chain,
        orderId,
      );
      const firstTry = '1000';
      const unexpectedFails = 1;
      await DatabaseActionMock.insertOrderRecord(
        orderId,
        chain,
        `orderJson`,
        OrderStatus.pending,
        firstTry,
        unexpectedFails,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `getHeight`
      const mockedCurrentHeight = 111;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );
      // mock `getTxRequiredConfirmation`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxRequiredConfirmation',
        10,
      );

      // mock NotificationHandler `notify`
      NotificationHandlerMock.mockNotify();

      // run test
      const txEntity = (await DatabaseActionMock.allTxRecords())[0];
      const mockedChain = chainHandlerInstance.getChain(chain);
      await TransactionProcessor.setTransactionAsInvalid(
        txEntity,
        mockedChain,
        invalidationDetails(true),
      );

      // tx status should be updated to 'invalid'
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.invalid,
          currentTimeStampSeconds.toString(),
        ],
      ]);

      // order status should be updated to 'pending-payment'
      const dbOrders = (await DatabaseActionMock.allOrderRecords()).map(
        (order) => [
          order.id,
          order.status,
          order.firstTry,
          order.unexpectedFails,
        ],
      );
      expect(dbOrders).toEqual([
        [orderId, OrderStatus.pending, firstTry, unexpectedFails + 1],
      ]);
    });

    /**
     * @target TransactionProcessor.setTransactionAsInvalid should send
     * notification when tx has become invalid unexpectedly
     * @dependencies
     * - database
     * - ChainHandler
     * - NotificationHandler
     * @scenario
     * - mock event and transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getHeight`
     *   - mock `getTxRequiredConfirmation`
     * - mock NotificationHandler `notify`
     * - run test
     * - check if function got called
     * @expected
     * - Notification `notify` should got called
     */
    it('should send notification when tx has become invalid unexpectedly', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId,
      );
      const firstTry = '1000';
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
        'box-serialized',
        300,
        firstTry,
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent, 100);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getHeight`
      const mockedCurrentHeight = 111;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getHeight',
        mockedCurrentHeight,
        true,
      );
      // mock `getTxRequiredConfirmation`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getTxRequiredConfirmation',
        10,
      );

      // mock NotificationHandler `notify`
      NotificationHandlerMock.mockNotify();

      // run test
      const txEntity = (await DatabaseActionMock.allTxRecords())[0];
      const mockedChain = chainHandlerInstance.getChain(chain);
      await TransactionProcessor.setTransactionAsInvalid(
        txEntity,
        mockedChain,
        invalidationDetails(true),
      );

      // Notification `notify` should got called
      expect(
        NotificationHandlerMock.getNotificationHandlerMockedFunction('notify'),
      ).toHaveBeenCalledOnce();
    });
  });
});

/** Provide the bchRecovery_setup test seam for the current scenario without external requests. */
const bchRecovery_setup = async () => {
  await bchRecovery_DatabaseActionMock.clearTables();
  const event = bchRecovery_EventTestData.mockEventTrigger().event;
  event.toChain = 'bitcoin-cash';
  const eventId = bchRecovery_EventSerializer.getId(event);
  await bchRecovery_DatabaseActionMock.insertEventRecord(
    event,
    bchRecovery_EventStatus.pendingPayment,
  );
  const script = '76a914751e76e8199196d454941c45d1b3a323f1433bd688ac';
  const parent = bchRecovery_encodeTransactionBCH({
    version: 2,
    locktime: 0,
    inputs: [
      {
        outpointTransactionHash: new Uint8Array(32).fill(1),
        outpointIndex: 0,
        sequenceNumber: 0xffffffff,
        unlockingBytecode: new Uint8Array(),
      },
    ],
    outputs: [
      { lockingBytecode: bchRecovery_hexToBin(script), valueSatoshis: 50000n },
    ],
  });
  const box = {
    txId: bchRecovery_hashTransaction(parent),
    index: 0,
    value: 50000n,
    scriptPubKey: script,
    parentTransactionHex: bchRecovery_binToHex(parent),
    coinbase: false,
    confirmations: 1,
  };
  const network = {
    /** Provide the getAddressBoxes test seam for the current scenario without external requests. */
    getAddressBoxes: vi.fn(
      async (_address: string, offset: number, limit: number) =>
        [box].slice(offset, offset + limit),
    ),
    /** Provide the getUtxo test seam for the current scenario without external requests. */
    getUtxo: vi.fn(async () => box),
    /** Provide the getPrevout test seam for the current scenario without external requests. */
    getPrevout: vi.fn(async () => box),
    /** Provide the getHeight test seam for the current scenario without external requests. */
    getHeight: vi.fn(async () => 10),
    /** Provide the isBoxUnspentAndValid test seam for the current scenario without external requests. */
    isBoxUnspentAndValid: vi.fn(async () => true),
    /** Provide the findSignedTransaction test seam for the current scenario without external requests. */
    findSignedTransaction: vi.fn<() => Promise<Uint8Array | undefined>>(
      async () => undefined,
    ),
    /** Provide the getTxConfirmation test seam for the current scenario without external requests. */
    getTxConfirmation: vi.fn(async () => 1),
    /** Provide the isTxInMempool test seam for the current scenario without external requests. */
    isTxInMempool: vi.fn(async () => false),
  };
  const tokens = new bchRecovery_TokenMap();
  await tokens.updateConfigByJson([
    {
      'bitcoin-cash': {
        tokenId: 'bch',
        name: 'BCH',
        decimals: 8,
        type: 'native',
        residency: 'native',
        extra: {},
      },
      ergo: {
        tokenId: 'bb'.repeat(32),
        name: 'rsBCH',
        decimals: 6,
        type: 'wrapped',
        residency: 'wrapped',
        extra: {},
      },
    },
  ]);
  const chain = new bchRecovery_BitcoinCashChain(
    network as never,
    {
      aggregatedPublicKey: bchRecovery_bchPublicKey,
      feeRate: 1,
      maxFee: 100000n,
      minimumUtxoValue: 546n,
      maxUtxoPages: 2,
      fee: 0n,
      confirmations: {
        observation: 1,
        payment: 1,
        cold: 1,
        manual: 1,
        arbitrary: 1,
      },
      addresses: {
        lock: bchRecovery_bchLock,
        cold: bchRecovery_bchCold,
        permit: '',
        fraud: '',
      },
      rwtId: '',
    },
    tokens,
    {
      /** Provide the isInSign test seam for the current scenario without external requests. */
      isInSign: async () => false,
      /** Provide the sign test seam for the current scenario without external requests. */
      sign: async (digest) => ({
        signature: bchRecovery_binToHex(
          bchRecovery_secp256k1.signMessageHashCompact(
            bchRecovery_hexToBin('00'.repeat(31) + '01'),
            digest,
          ) as Uint8Array,
        ),
        signatureRecovery: '0',
      }),
    },
  );
  const generated = await chain.generateTransaction(
    eventId,
    bchRecovery_TransactionType.payment,
    [
      {
        address: bchRecovery_bchCold,
        assets: { nativeToken: 100n, tokens: [] },
      },
    ],
    [],
    [],
  );
  const unsigned = chain.PaymentTransactionFromJson(generated.toJson());
  const signed = chain.PaymentTransactionFromJson(
    (await chain.signTransaction(unsigned)).toJson(),
  );
  network.findSignedTransaction.mockResolvedValue(signed.txBytes);
  vi.spyOn(bchRecovery_ChainHandler, 'getInstance').mockReturnValue(
    bchRecovery_chainHandlerInstance as unknown as bchRecovery_ChainHandler,
  );
  vi.spyOn(bchRecovery_chainHandlerInstance, 'getChain').mockImplementation(
    () => chain as never,
  );
  const actualSerializer = await vi.importActual<
    typeof bchRecovery_TransactionSerializer
  >('../../src/transaction/transactionSerializer');
  vi.spyOn(bchRecovery_TransactionSerializer, 'fromJson').mockImplementation(
    actualSerializer.fromJson,
  );
  return {
    chain,
    network,
    unsigned,
    signed,
    eventId,
    action: bchRecovery_DatabaseAction.getInstance(),
  };
};
