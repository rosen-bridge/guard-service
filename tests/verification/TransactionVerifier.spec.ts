import TransactionVerifier from '../../src/verification/TransactionVerifier';
import {
  mockEventTrigger,
  mockTokenPaymentFromErgoEvent,
} from '../event/testData';
import ChainHandlerMock, {
  chainHandlerInstance,
} from '../handlers/ChainHandler.mock';
import {
  AssetBalance,
  PaymentOrder,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { mockPaymentTransaction } from '../agreement/testData';
import EventSerializer from '../../src/event/EventSerializer';
import {
  mockCreateEventPaymentOrder,
  mockCreateEventRewardOrder,
} from '../event/mocked/EventOrder.mock';
import { mockGetEventFeeConfig } from '../event/mocked/MinimumFee.mock';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import { EventStatus } from '../../src/utils/constants';

describe('TransactionVerifier', () => {
  describe('verifyTxCommonConditions', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();
    });

    /**
     * @target TransactionVerifier.verifyTxCommonConditions should return true
     * when all common conditions are met
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all common conditions are met', async () => {
      // mock transaction
      const tx = mockPaymentTransaction();

      // mock ChainHandler
      ChainHandlerMock.mockChainName(tx.network);
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockToChainFunction('verifyTransactionFee', true);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockToChainFunction('verifyNoTokenBurned', true, true);
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockToChainFunction(
        'verifyTransactionExtraConditions',
        true
      );

      // run test
      const result = await TransactionVerifier.verifyTxCommonConditions(tx);

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target TransactionVerifier.verifyTxCommonConditions should return false
     * when fee is not verified
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when fee is not verified', async () => {
      // mock transaction
      const tx = mockPaymentTransaction();

      // mock ChainHandler
      ChainHandlerMock.mockChainName(tx.network);
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockToChainFunction('verifyTransactionFee', false);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockToChainFunction('verifyNoTokenBurned', true, true);
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockToChainFunction(
        'verifyTransactionExtraConditions',
        true
      );

      // run test
      const result = await TransactionVerifier.verifyTxCommonConditions(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyTxCommonConditions should return false
     * when some tokens are burned
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when some tokens are burned', async () => {
      // mock transaction
      const tx = mockPaymentTransaction();

      // mock ChainHandler
      ChainHandlerMock.mockChainName(tx.network);
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockToChainFunction('verifyTransactionFee', true);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockToChainFunction('verifyNoTokenBurned', false, true);
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockToChainFunction(
        'verifyTransactionExtraConditions',
        true
      );

      // run test
      const result = await TransactionVerifier.verifyTxCommonConditions(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyTxCommonConditions should return false
     * when chain extra conditions are not verified
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `verifyTransactionFee`
     *   - mock `verifyNoTokenBurned`
     *   - mock `verifyTransactionExtraConditions`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when chain extra conditions are not verified', async () => {
      // mock transaction
      const tx = mockPaymentTransaction();

      // mock ChainHandler
      ChainHandlerMock.mockChainName(tx.network);
      // mock `verifyTransactionFee`
      ChainHandlerMock.mockToChainFunction('verifyTransactionFee', true);
      // mock `verifyNoTokenBurned`
      ChainHandlerMock.mockToChainFunction('verifyNoTokenBurned', true, true);
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockToChainFunction(
        'verifyTransactionExtraConditions',
        false
      );

      // run test
      const result = await TransactionVerifier.verifyTxCommonConditions(tx);

      // verify returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyEventTransaction', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();
      mockGetEventFeeConfig({
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 100n,
      });
    });

    /**
     * @target TransactionVerifier.verifyEventTransaction should return true
     * when all conditions for payment tx are met
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock event and transaction
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `extractTransactionOrder` to return mocked order
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all conditions for payment tx are met', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger();
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockToChainFunction(
        'extractTransactionOrder',
        mockedOrder
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventPaymentOrder(mockedOrder);

      // run test
      const result = await TransactionVerifier.verifyEventTransaction(
        paymentTx,
        mockedEvent
      );

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target TransactionVerifier.verifyEventTransaction should return true
     * when all conditions for reward distribution tx are met
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock event and transaction
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `extractTransactionOrder` to return mocked order
     * - mock EventOrder.createEventRewardOrder to return mocked order
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all conditions for reward distribution tx are met', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger();
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockToChainFunction(
        'extractTransactionOrder',
        mockedOrder
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventRewardOrder(mockedOrder);

      // run test
      const result = await TransactionVerifier.verifyEventTransaction(
        paymentTx,
        mockedEvent
      );

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target TransactionVerifier.verifyEventTransaction should return false
     * when tx order is different from expected one
     * @dependencies
     * - ChainHandler
     * - MinimumFee
     * @scenario
     * - mock event and transaction
     * - mock a PaymentOrder
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     * - mock EventOrder.createEventPaymentOrder
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when tx order is different from expected one', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger();
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );

      // mock a PaymentOrder
      const txOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];
      const expectedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 20n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockToChainFunction('extractTransactionOrder', txOrder);

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventPaymentOrder(expectedOrder);

      // run test
      const result = await TransactionVerifier.verifyEventTransaction(
        paymentTx,
        mockedEvent
      );

      // verify returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyColdStorageTransaction', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return true
     * when all conditions for cold storage tx are met
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all conditions for cold storage tx are met', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockToChainFunction('extractTransactionOrder', order);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            value: 225000000000n,
          },
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockToChainFunction('getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when transaction order size is not valid
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transaction order size is not valid', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 500000000n,
            tokens: [
              {
                id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
                value: 50000000000n,
              },
            ],
          },
        },
        {
          address: coldAddress,
          assets: {
            nativeToken: 500000000n,
            tokens: [
              {
                id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
                value: 50000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockToChainFunction('extractTransactionOrder', order);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            value: 225000000000n,
          },
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockToChainFunction('getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when transaction is transferring to wrong address
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transaction is transferring to wrong address', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: `invalidAddress`,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockToChainFunction('extractTransactionOrder', order);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            value: 225000000000n,
          },
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockToChainFunction('getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when remaining native token in lock address will be less than low threshold
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when remaining native token in lock address will be less than low threshold', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockToChainFunction('extractTransactionOrder', order);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1010000000n,
        tokens: [
          {
            id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            value: 225000000000n,
          },
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockToChainFunction('getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when remaining native token in lock address will be more than high threshold
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when remaining native token in lock address will be more than high threshold', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockToChainFunction('extractTransactionOrder', order);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1400000000n,
        tokens: [
          {
            id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            value: 225000000000n,
          },
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockToChainFunction('getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when remaining token in lock address will be less than low threshold
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when remaining token in lock address will be less than low threshold', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
                value: 499000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockToChainFunction('extractTransactionOrder', order);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            value: 225000000000n,
          },
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockToChainFunction('getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when remaining token in lock address will be more than high threshold
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when remaining token in lock address will be more than high threshold', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockToChainFunction('extractTransactionOrder', order);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            value: 225000000000n,
          },
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 700000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockToChainFunction('getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when one of required tokens does not exist in address
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when one of required tokens does not exist in address', async () => {
      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockToChainFunction('extractTransactionOrder', order);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockToChainFunction('getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return false
     * when one of transferring tokens is forbidden
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock an event and insert mocked event into db as paymentWaiting
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when one of transferring tokens is forbidden', async () => {
      // mock an event and insert mocked event into db as paymentWaiting
      const event = mockTokenPaymentFromErgoEvent();
      await DatabaseActionMock.insertEventRecord(
        event,
        EventStatus.paymentWaiting
      );

      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
                value: 100000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockToChainFunction('extractTransactionOrder', order);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            value: 225000000000n,
          },
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockToChainFunction('getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target TransactionVerifier.verifyColdStorageTransaction should return true
     * when only forbidden tokens remain more than high threshold
     * @dependencies
     * - ChainHandler
     * @scenario
     * - mock an event and insert mocked event into db as paymentWaiting
     * - mock transaction
     * - mock ChainHandler
     *   - mock `extractTransactionOrder`
     *   - mock `getLockAddressAssets`
     *   - mock `getChainConfigs`
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when only forbidden tokens remain more than high threshold', async () => {
      // mock an event and insert mocked event into db as paymentWaiting
      const event = mockTokenPaymentFromErgoEvent();
      await DatabaseActionMock.insertEventRecord(
        event,
        EventStatus.paymentWaiting
      );

      const chain = CARDANO_CHAIN;
      // mock transaction
      const tx = mockPaymentTransaction(TransactionType.coldStorage, chain);
      // mock ChainHandler `getChain`
      ChainHandlerMock.mockChainName(chain);
      // mock `extractTransactionOrder`
      const coldAddress = `coldAddress`;
      const order: PaymentOrder = [
        {
          address: coldAddress,
          assets: {
            nativeToken: 1000000000n,
            tokens: [
              {
                id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
                value: 600000000000n,
              },
            ],
          },
        },
      ];
      ChainHandlerMock.mockToChainFunction('extractTransactionOrder', order);
      // mock `getLockAddressAssets`
      const lockedAssets: AssetBalance = {
        nativeToken: 1100000000n,
        tokens: [
          {
            id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            value: 725000000000n,
          },
          {
            id: 'asset1m62zdrt2fhlm9wpqrskxka6t0wvq5vag58cytl',
            value: 500000000000n,
          },
        ],
      };
      ChainHandlerMock.mockToChainFunction(
        'getLockAddressAssets',
        lockedAssets,
        true
      );
      // mock `getChainConfigs`
      ChainHandlerMock.mockToChainFunction('getChainConfigs', {
        addresses: { cold: coldAddress },
      });

      // run test
      const result = await TransactionVerifier.verifyColdStorageTransaction(tx);

      // verify returned value
      expect(result).toEqual(true);
    });
  });
});
