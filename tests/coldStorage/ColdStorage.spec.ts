import { AssetBalance, TransactionTypes } from '@rosen-chains/abstract-chain';
import { TransactionStatus } from '../../src/utils/constants';
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
     * @scenario
     * - mock a transaction and insert into db
     * - mock ChainHandler `getChain`
     *   - mock `getLockAddressAssets`
     * - run test
     * - check if function got called
     * @expected
     * - `getLockAddressAssets` should NOT got called
     */
    it(`should do nothing when there is already an active cold storage tx for the chain`, async () => {
      // mock transaction and insert into db as 'approved'
      const tx = mockPaymentTransaction(TransactionTypes.coldStorage);
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);

      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(tx.network);
      // mock `getLockAddressAssets`
      ChainHandlerMock.mockToChainFunction('getLockAddressAssets', null, true);

      // run test
      await ColdStorage.chainColdStorageProcess(tx.network);

      // `getLockAddressAssets` should NOT got called
      expect(
        ChainHandlerMock.getChainMockedFunction('getLockAddressAssets')
      ).not.toHaveBeenCalled();
    });

    /**
     * @target ColdStorage.chainColdStorageProcess should do nothing
     * when there is already an active cold storage tx for the chain
     * @dependencies
     * - database
     * - ChainHandler
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `getLockAddressAssets`
     * - mock ColdStorage.generateColdStorageTransaction
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
            id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            value: 225000000000n,
          },
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 4000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );

      // mock ColdStorage.generateColdStorageTransaction
      ColdStorageMock.mockFunction('generateColdStorageTransaction');

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
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `getLockAddressAssets`
     *   - mock `getMinimumNativeToken`
     * - mock ColdStorage.generateColdStorageTransaction
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
            id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            value: 225000000000n,
          },
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 4000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getMinimumNativeToken`
      ChainHandlerMock.mockToChainFunction('getMinimumNativeToken', 100n);

      // mock ColdStorage.generateColdStorageTransaction
      ColdStorageMock.mockFunction('generateColdStorageTransaction');

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
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `getLockAddressAssets`
     *   - mock `getMinimumNativeToken`
     * - mock ColdStorage.generateColdStorageTransaction
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
            id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            value: 225000000000n,
          },
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 544000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getMinimumNativeToken`
      const minimumNativeToken = 10000000n;
      ChainHandlerMock.mockToChainFunction(
        'getMinimumNativeToken',
        minimumNativeToken
      );

      // mock ColdStorage.generateColdStorageTransaction
      ColdStorageMock.mockFunction('generateColdStorageTransaction');

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
              id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
              value: 541000000000n,
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
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `generateTransaction`
     * - mock ChainHandler `getChainColdAddress`
     * - mock TxAgreement `getChainPendingTransactions` and `addTransactionToQueue`
     * - mock two transactions and insert into db as signed and unsigned
     * - run test
     * - check if function got called
     * @expected
     * - `generateTransaction` should got called with correct arguments
     * - `addTransactionToQueue` should got called
     */
    it(`should generate cold storage transaction for non-Ergo chain successfully`, async () => {
      const chain = CARDANO_CHAIN;
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `generateTransaction`
      ChainHandlerMock.mockToChainFunction('generateTransaction', null, true);

      // mock ChainHandler `getChainColdAddress`
      const coldAddress = `coldAddress`;
      vi.spyOn(chainHandlerInstance, 'getChainColdAddress').mockReturnValue(
        coldAddress
      );

      // mock TxAgreement `getChainPendingTransactions` and `addTransactionToQueue`
      TxAgreementMock.mockGetChainPendingTransactions([]);
      TxAgreementMock.mockAddTransactionToQueue();

      // mock two transactions and insert into db as signed and unsigned
      const approvedTx = mockPaymentTransaction(
        TransactionTypes.payment,
        chain
      );
      await DatabaseActionMock.insertTxRecord(
        approvedTx,
        TransactionStatus.approved
      );
      const signedTx = mockPaymentTransaction(TransactionTypes.payment, chain);
      await DatabaseActionMock.insertTxRecord(
        signedTx,
        TransactionStatus.signed
      );

      // run test
      const transferringAssets = { nativeToken: 0n, tokens: [] };
      await ColdStorage.generateColdStorageTransaction(
        transferringAssets,
        chainHandlerInstance.getChain(chain),
        chain
      );

      // `generateTransaction` should got called with correct arguments
      const expectedOrder = [
        {
          address: coldAddress,
          assets: transferringAssets,
        },
      ];
      expect(
        ChainHandlerMock.getChainMockedFunction('generateTransaction')
      ).toHaveBeenCalledWith(
        '',
        TransactionTypes.coldStorage,
        expectedOrder,
        [approvedTx],
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
     * @scenario
     * - mock ChainHandler `getChain`
     *   - mock `generateTransaction`
     *   - mock `getGuardsConfigBox`
     * - mock ChainHandler `getChainColdAddress`
     * - mock TxAgreement `getChainPendingTransactions` and `addTransactionToQueue`
     * - mock a transaction and insert into db as signed
     * - run test
     * - check if function got called
     * @expected
     * - `generateTransaction` should got called with correct arguments
     * - `addTransactionToQueue` should got called
     */
    it(`should generate cold storage transaction for Ergo chain successfully`, async () => {
      const chain = ERGO_CHAIN;
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `generateTransaction`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'generateTransaction',
        null,
        true
      );
      // mock `getGuardsConfigBox`
      const guardConfigBox = 'serialized-box';
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        guardConfigBox,
        true
      );

      // mock ChainHandler `getChainColdAddress`
      const coldAddress = `coldAddress`;
      vi.spyOn(chainHandlerInstance, 'getChainColdAddress').mockReturnValue(
        coldAddress
      );

      // mock TxAgreement `getChainPendingTransactions` and `addTransactionToQueue`
      TxAgreementMock.mockGetChainPendingTransactions([]);
      TxAgreementMock.mockAddTransactionToQueue();

      // mock a transaction and insert into db as signed
      const signedTx = mockErgoPaymentTransaction(TransactionTypes.payment);
      await DatabaseActionMock.insertTxRecord(
        signedTx,
        TransactionStatus.signed
      );

      // run test
      const transferringAssets = { nativeToken: 0n, tokens: [] };
      await ColdStorage.generateColdStorageTransaction(
        transferringAssets,
        chainHandlerInstance.getChain(chain),
        chain
      );

      // `generateTransaction` should got called with correct arguments
      const expectedOrder = [
        {
          address: coldAddress,
          assets: transferringAssets,
        },
      ];
      expect(
        ChainHandlerMock.getErgoMockedFunction('generateTransaction')
      ).toHaveBeenCalledWith(
        '',
        TransactionTypes.coldStorage,
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
  });
});
