import { AssetBalance, TransactionType } from '@rosen-chains/abstract-chain';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import {
  mockErgoPaymentTransaction,
  mockPaymentTransaction,
} from '../agreement/testData';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import ChainHandlerMock, {
  chainHandlerInstance,
} from '../handlers/ChainHandler.mock';
import ColdStorage from '../../src/coldStorage/ColdStorage';
import ColdStorageMock from './ColdStorage.mock';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import TxAgreementMock from '../agreement/mocked/TxAgreement.mock';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import { mockGuardTurn } from '../utils/mocked/GuardTurn.mock';
import TestConfigs from '../testUtils/TestConfigs';
import TestUtils from '../testUtils/TestUtils';
import { mockTokenPaymentFromErgoEvent } from '../event/testData';
import { BITCOIN_CHAIN } from '@rosen-chains/bitcoin';

describe('ColdStorage', () => {
  describe('chainColdStorageProcess', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
      ColdStorageMock.restoreMocks();
    });

    /**
     * @target ColdStorage.chainColdStorageProcess should do nothing
     * when there is already an active cold storage tx for the chain
     * @dependencies
     * - database
     * - ChainHandler
     * - GuardTurn
     * @scenario
     * - mock a transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getLockAddressAssets`
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `getLockAddressAssets` should NOT got called
     */
    it(`should do nothing when there is already an active cold storage tx for the chain`, async () => {
      // mock transaction and insert into db as 'approved'
      const tx = mockPaymentTransaction(TransactionType.coldStorage);
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getLockAddressAssets`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        null,
        true
      );

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await ColdStorage.chainColdStorageProcess(tx.network);

      // `getLockAddressAssets` should NOT got called
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'getLockAddressAssets')
      ).not.toHaveBeenCalled();
    });

    /**
     * @target ColdStorage.chainColdStorageProcess should do nothing
     * when no thresholds is set for the chain
     * @dependencies
     * - ChainHandler
     * - GuardTurn
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `getLockAddressAssets`
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `getLockAddressAssets` should NOT got called
     */
    it(`should do nothing when no thresholds is set for the chain`, async () => {
      // mock ChainHandler `getChain`
      const chain = BITCOIN_CHAIN;
      ChainHandlerMock.mockChainName(chain);
      // mock `getLockAddressAssets`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        null,
        true
      );

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await ColdStorage.chainColdStorageProcess(chain);

      // `getLockAddressAssets` should NOT got called
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'getLockAddressAssets')
      ).not.toHaveBeenCalled();
    });

    /**
     * @target ColdStorage.chainColdStorageProcess should do nothing
     * when there is already an active cold storage tx for the chain
     * @dependencies
     * - database
     * - ChainHandler
     * - GuardTurn
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `getLockAddressAssets`
     * - mock ColdStorage.generateColdStorageTransaction
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `generateColdStorageTransaction` should NOT got called
     */
    it(`should not generate transaction when no asset is more than it's high threshold`, async () => {
      const chain = CARDANO_CHAIN;
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 200000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 4000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );

      // mock ColdStorage.generateColdStorageTransaction
      ColdStorageMock.mockFunction('generateColdStorageTransaction');

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await ColdStorage.chainColdStorageProcess(chain);

      // `generateColdStorageTransaction` should NOT got called
      expect(
        ColdStorageMock.getMockedSpy('generateColdStorageTransaction')
      ).not.toHaveBeenCalled();
    });

    /**
     * @target ColdStorage.chainColdStorageProcess should generate transaction
     * when native token is more than it's high threshold
     * @dependencies
     * - database
     * - ChainHandler
     * - GuardTurn
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `getLockAddressAssets`
     *   - mock `getMinimumNativeToken`
     * - mock ColdStorage.generateColdStorageTransaction
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `generateColdStorageTransaction` should got called with correct arguments
     */
    it(`should generate transaction when native token is more than it's high threshold`, async () => {
      const chain = CARDANO_CHAIN;
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 400000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 4000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getMinimumNativeToken`
      ChainHandlerMock.mockChainFunction(chain, 'getMinimumNativeToken', 100n);

      // mock ColdStorage.generateColdStorageTransaction
      ColdStorageMock.mockFunction('generateColdStorageTransaction');

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await ColdStorage.chainColdStorageProcess(chain);

      // `generateColdStorageTransaction` should got called with correct arguments
      expect(
        ColdStorageMock.getMockedSpy('generateColdStorageTransaction')
      ).toHaveBeenCalledWith(
        { nativeToken: 300000000n, tokens: [] },
        chainHandlerInstance.getChain(chain),
        chain
      );
    });

    /**
     * @target ColdStorage.chainColdStorageProcess should generate transaction
     * when at least one token is more than it's high threshold
     * @dependencies
     * - database
     * - ChainHandler
     * - GuardTurn
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `getLockAddressAssets`
     *   - mock `getMinimumNativeToken`
     * - mock ColdStorage.generateColdStorageTransaction
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `generateColdStorageTransaction` should got called with correct arguments
     */
    it(`should generate transaction when at least one token is more than it's high threshold`, async () => {
      const chain = CARDANO_CHAIN;
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 200000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 544000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getMinimumNativeToken`
      const minimumNativeToken = 10000000n;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getMinimumNativeToken',
        minimumNativeToken
      );

      // mock ColdStorage.generateColdStorageTransaction
      ColdStorageMock.mockFunction('generateColdStorageTransaction');

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await ColdStorage.chainColdStorageProcess(chain);

      // `generateColdStorageTransaction` should got called with correct arguments
      expect(
        ColdStorageMock.getMockedSpy('generateColdStorageTransaction')
      ).toHaveBeenCalledWith(
        {
          nativeToken: minimumNativeToken,
          tokens: [
            {
              id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
              value: 541000000000n,
            },
          ],
        },
        chainHandlerInstance.getChain(chain),
        chain
      );
    });

    /**
     * @target ColdStorage.chainColdStorageProcess should do nothing
     * when turn is over
     * @dependencies
     * - database
     * - ChainHandler
     * - GuardTurn
     * @scenario
     * - mock a transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getLockAddressAssets`
     * - mock GuardTurn to return guard index + 1
     * - run test
     * - check if function got called
     * @expected
     * - `getLockAddressAssets` should NOT got called
     */
    it(`should do nothing when turn is over`, async () => {
      // mock transaction and insert into db as 'approved'
      const tx = mockPaymentTransaction(TransactionType.coldStorage);
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);

      // mock ChainHandler `getChain`
      const chain = tx.network;
      ChainHandlerMock.mockChainName(chain);
      // mock `getLockAddressAssets`
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        null,
        true
      );

      // mock GuardTurn to return guard index + 1
      mockGuardTurn(TestConfigs.guardIndex + 1);

      // run test
      await ColdStorage.chainColdStorageProcess(tx.network);

      // `getLockAddressAssets` should NOT got called
      expect(
        ChainHandlerMock.getChainMockedFunction(chain, 'getLockAddressAssets')
      ).not.toHaveBeenCalled();
    });

    /**
     * @target ColdStorage.chainColdStorageProcess should not generate transaction
     * when token is required in some waiting events
     * @dependencies
     * - database
     * - ChainHandler
     * - GuardTurn
     * @scenario
     * - mock an event and insert mocked event into db as paymentWaiting
     * - mock ChainHandler `getChain`
     *   - mock `getLockAddressAssets`
     *   - mock `getMinimumNativeToken` (event targetChainTokenId amount
     *     should be more than it's high threshold)
     * - mock ColdStorage.generateColdStorageTransaction
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `generateColdStorageTransaction` should NOT got called
     */
    it(`should not generate transaction when token is required in some waiting events`, async () => {
      // mock an event and insert mocked event into db as paymentWaiting
      const event = mockTokenPaymentFromErgoEvent().event;
      await DatabaseActionMock.insertEventRecord(
        event,
        EventStatus.paymentWaiting
      );

      const chain = CARDANO_CHAIN;
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 200000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 225000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 544000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getMinimumNativeToken`
      const minimumNativeToken = 10000000n;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getMinimumNativeToken',
        minimumNativeToken
      );

      // mock ColdStorage.generateColdStorageTransaction
      ColdStorageMock.mockFunction('generateColdStorageTransaction');

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await ColdStorage.chainColdStorageProcess(chain);

      // `generateColdStorageTransaction` should NOT got called
      expect(
        ColdStorageMock.getMockedSpy('generateColdStorageTransaction')
      ).not.toHaveBeenCalled();
    });

    /**
     * @target ColdStorage.chainColdStorageProcess should ignore waiting events
     * required tokens when processing tokens
     * @dependencies
     * - database
     * - ChainHandler
     * - GuardTurn
     * @scenario
     * - mock an event and insert mocked event into db as paymentWaiting
     * - mock ChainHandler `getChain`
     *   - mock `getLockAddressAssets`
     *   - mock `getMinimumNativeToken` (event targetChainTokenId amount
     *     should be more than it's high threshold)
     * - mock ColdStorage.generateColdStorageTransaction
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `generateColdStorageTransaction` should got called with correct arguments
     */
    it(`should ignore waiting events required tokens when processing tokens`, async () => {
      // mock an event and insert mocked event into db as paymentWaiting
      const event = mockTokenPaymentFromErgoEvent().event;
      await DatabaseActionMock.insertEventRecord(
        event,
        EventStatus.paymentWaiting
      );

      const chain = CARDANO_CHAIN;
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 200000000n,
        tokens: [
          {
            id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            value: 726000000000n,
          },
          {
            id: 'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
            value: 544000000000n,
          },
        ],
      };
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getMinimumNativeToken`
      const minimumNativeToken = 10000000n;
      ChainHandlerMock.mockChainFunction(
        chain,
        'getMinimumNativeToken',
        minimumNativeToken
      );

      // mock ColdStorage.generateColdStorageTransaction
      ColdStorageMock.mockFunction('generateColdStorageTransaction');

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await ColdStorage.chainColdStorageProcess(chain);

      // `generateColdStorageTransaction` should got called with correct arguments
      expect(
        ColdStorageMock.getMockedSpy('generateColdStorageTransaction')
      ).toHaveBeenCalledWith(
        {
          nativeToken: minimumNativeToken,
          tokens: [
            {
              id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
              value: 601000000000n,
            },
          ],
        },
        chainHandlerInstance.getChain(chain),
        chain
      );
    });
  });

  describe(`generateColdStorageTransaction`, () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
      ColdStorageMock.restoreMocks();
      TxAgreementMock.resetMock();
      TxAgreementMock.mock();
    });

    /**
     * @target ColdStorage.generateColdStorageTransaction should generate
     * cold storage transaction for non-Ergo chain successfully
     * @dependencies
     * - database
     * - ChainHandler
     * - TxAgreement
     * - GuardTurn
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `generateMultipleTransactions`
     *   - mock `getChainConfigs`
     * - mock TxAgreement `getChainPendingTransactions` and `addTransactionToQueue`
     * - mock a transaction and insert into db as signed
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `generateMultipleTransactions` should got called with correct arguments
     * - `addTransactionToQueue` should got called
     */
    it(`should generate cold storage transaction for non-Ergo chain successfully`, async () => {
      const chain = CARDANO_CHAIN;
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `generateMultipleTransactions`
      ChainHandlerMock.mockChainFunction(
        chain,
        'generateMultipleTransactions',
        [{ txId: TestUtils.generateRandomId() }],
        true
      );
      // mock `getChainConfigs`
      const coldAddress = `coldAddress`;
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // mock TxAgreement `getChainPendingTransactions` and `addTransactionToQueue`
      TxAgreementMock.mockGetChainPendingTransactions([]);
      TxAgreementMock.mockAddTransactionToQueue();

      // mock a transaction and insert into db as signed
      const signedTx = mockPaymentTransaction(TransactionType.payment, chain);
      await DatabaseActionMock.insertTxRecord(
        signedTx,
        TransactionStatus.signed
      );

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      const transferringAssets = { nativeToken: 0n, tokens: [] };
      await ColdStorage.generateColdStorageTransaction(
        transferringAssets,
        chainHandlerInstance.getChain(chain),
        chain
      );

      // `generateMultipleTransactions` should got called with correct arguments
      const expectedOrder = [
        {
          address: coldAddress,
          assets: transferringAssets,
        },
      ];
      expect(
        ChainHandlerMock.getChainMockedFunction(
          chain,
          'generateMultipleTransactions'
        )
      ).toHaveBeenCalledWith(
        '',
        TransactionType.coldStorage,
        expectedOrder,
        [],
        [Buffer.from(signedTx.txBytes).toString('hex')],
        ...[]
      );

      // `addTransactionToQueue` should got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue')
      ).toHaveBeenCalledOnce();
    });

    /**
     * @target ColdStorage.generateColdStorageTransaction should generate
     * cold storage transaction for Ergo chain successfully
     * @dependencies
     * - database
     * - ChainHandler
     * - TxAgreement
     * - GuardTurn
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `generateMultipleTransactions`
     *   - mock `getGuardsConfigBox`
     *   - mock `getChainConfigs`
     * - mock TxAgreement `getChainPendingTransactions` and `addTransactionToQueue`
     * - mock a transaction and insert into db as signed
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `generateMultipleTransactions` should got called with correct arguments
     * - `addTransactionToQueue` should got called
     */
    it(`should generate cold storage transaction for Ergo chain successfully`, async () => {
      const chain = ERGO_CHAIN;
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `generateMultipleTransactions`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'generateMultipleTransactions',
        [{ txId: TestUtils.generateRandomId() }],
        true
      );
      // mock `getGuardsConfigBox`
      const guardConfigBox = 'serialized-box';
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        guardConfigBox,
        true
      );
      // mock `getChainConfigs`
      const coldAddress = `coldAddress`;
      ChainHandlerMock.mockErgoFunctionReturnValue('getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // mock TxAgreement `getChainPendingTransactions` and `addTransactionToQueue`
      TxAgreementMock.mockGetChainPendingTransactions([]);
      TxAgreementMock.mockAddTransactionToQueue();

      // mock a transaction and insert into db as signed
      const signedTx = mockErgoPaymentTransaction(TransactionType.payment);
      await DatabaseActionMock.insertTxRecord(
        signedTx,
        TransactionStatus.signed
      );

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      const transferringAssets = { nativeToken: 0n, tokens: [] };
      await ColdStorage.generateColdStorageTransaction(
        transferringAssets,
        chainHandlerInstance.getChain(chain),
        chain
      );

      // `generateMultipleTransactions` should got called with correct arguments
      const expectedOrder = [
        {
          address: coldAddress,
          assets: transferringAssets,
        },
      ];
      expect(
        ChainHandlerMock.getErgoMockedFunction('generateMultipleTransactions')
      ).toHaveBeenCalledWith(
        '',
        TransactionType.coldStorage,
        expectedOrder,
        [],
        [Buffer.from(signedTx.txBytes).toString('hex')],
        ...[[], [guardConfigBox]]
      );

      // `addTransactionToQueue` should got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue')
      ).toHaveBeenCalledOnce();
    });

    /**
     * @target ColdStorage.generateColdStorageTransaction should generate
     * cold storage transaction but does not send it to agreement process when turn is over
     * @dependencies
     * - database
     * - ChainHandler
     * - TxAgreement
     * - GuardTurn
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `generateMultipleTransactions`
     *   - mock `getChainConfigs`
     * - mock TxAgreement `getChainPendingTransactions` and `addTransactionToQueue`
     * - mock a transaction and insert into db as signed
     * - mock GuardTurn to return guard index + 1
     * - run test
     * - check if function got called
     * @expected
     * - `generateMultipleTransactions` should got called with correct arguments
     * - `addTransactionToQueue` should not got called
     */
    it(`should generate cold storage transaction but does not send it to agreement process when turn is over`, async () => {
      const chain = CARDANO_CHAIN;
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `generateMultipleTransactions`
      ChainHandlerMock.mockChainFunction(
        chain,
        'generateMultipleTransactions',
        [{ txId: TestUtils.generateRandomId() }],
        true
      );
      // mock `getChainConfigs`
      const coldAddress = `coldAddress`;
      ChainHandlerMock.mockChainFunction(chain, 'getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // mock TxAgreement `getChainPendingTransactions` and `addTransactionToQueue`
      TxAgreementMock.mockGetChainPendingTransactions([]);
      TxAgreementMock.mockAddTransactionToQueue();

      // mock a transaction and insert into db as signed
      const signedTx = mockPaymentTransaction(TransactionType.payment, chain);
      await DatabaseActionMock.insertTxRecord(
        signedTx,
        TransactionStatus.signed
      );

      // mock GuardTurn to return guard index + 1
      mockGuardTurn(TestConfigs.guardIndex + 1);

      // run test
      const transferringAssets = { nativeToken: 0n, tokens: [] };
      await ColdStorage.generateColdStorageTransaction(
        transferringAssets,
        chainHandlerInstance.getChain(chain),
        chain
      );

      // `generateMultipleTransactions` should got called with correct arguments
      const expectedOrder = [
        {
          address: coldAddress,
          assets: transferringAssets,
        },
      ];
      expect(
        ChainHandlerMock.getChainMockedFunction(
          chain,
          'generateMultipleTransactions'
        )
      ).toHaveBeenCalledWith(
        '',
        TransactionType.coldStorage,
        expectedOrder,
        [],
        [Buffer.from(signedTx.txBytes).toString('hex')],
        ...[]
      );

      // `addTransactionToQueue` should not got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue')
      ).not.toHaveBeenCalled();
    });
  });
});
