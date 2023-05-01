import { Fee } from '@rosen-bridge/minimum-fee';
import EventOrder from '../../src/event/EventOrder';
import {
  mockEventTrigger,
  mockNativeTokenPaymentEvent,
  mockTokenPaymentEvent,
} from './testData';
import TestUtils from '../../tests/testUtils/TestUtils';
import { createEventTrigger } from './eventTestUtils';
import MinimumFee from '../../src/event/MinimumFee';
import ErgoConfigs from '../../src/helpers/ErgoConfigs';
import { rosenConfig } from '../../src/helpers/RosenConfig';

describe('EventOrder', () => {
  describe('eventSinglePayment', () => {
    /**
     * @target EventOrder.eventSinglePayment should generate
     * native token payment successfully
     * @dependencies
     * - tokenMap
     * @scenario
     * - mock function arguments
     * - run test
     * - verify returned value
     * @expected
     * - address should be event toAddress
     * - value should be
     *   event.amount - event.bridgeFee - event.networkFee + chainMinTransfer
     * - should not contain any tokens
     * - should not have extra
     */
    it('should generate native token payment successfully', async () => {
      // mock function arguments
      const chainMinTransfer = 100n;
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      const mockedEvent = mockNativeTokenPaymentEvent();

      // run test
      const result = await EventOrder.eventSinglePayment(
        mockedEvent,
        chainMinTransfer,
        fee
      );

      // verify returned value
      expect(result.address).toEqual(mockedEvent.toAddress);
      expect(result.assets.nativeToken).toEqual(
        BigInt(mockedEvent.amount) -
          BigInt(mockedEvent.bridgeFee) -
          BigInt(mockedEvent.networkFee) +
          chainMinTransfer
      );
      expect(result.assets.tokens.length).toEqual(0);
      expect(result.extra).toBeUndefined();
    });

    /**
     * @target EventOrder.eventSinglePayment should generate
     * token payment successfully
     * @dependencies
     * - tokenMap
     * @scenario
     * - mock function arguments
     * - run test
     * - verify returned value
     * @expected
     * - address should be event toAddress
     * - value should be chainMinTransfer
     * - should have exactly one token (event.targetChainTokenId)
     *   with value event.amount - event.bridgeFee - event.networkFee +
     * - should not have extra
     */
    it('should generate token payment successfully', async () => {
      // mock function arguments
      const chainMinTransfer = 100n;
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      const mockedEvent = mockTokenPaymentEvent();

      // run test
      const result = await EventOrder.eventSinglePayment(
        mockedEvent,
        chainMinTransfer,
        fee
      );

      // verify returned value
      expect(result.address).toEqual(mockedEvent.toAddress);
      expect(result.assets.nativeToken).toEqual(chainMinTransfer);
      expect(result.assets.tokens.length).toEqual(1);
      expect(result.assets.tokens[0].id).toEqual(
        mockedEvent.targetChainTokenId
      );
      expect(result.assets.tokens[0].value).toEqual(
        BigInt(mockedEvent.amount) -
          BigInt(mockedEvent.bridgeFee) -
          BigInt(mockedEvent.networkFee)
      );
      expect(result.extra).toBeUndefined();
    });

    /**
     * @target EventOrder.eventSinglePayment should replace fees
     * on token payment when they are less than minimum config
     * @dependencies
     * - tokenMap
     * @scenario
     * - mock function arguments
     * - run test
     * - verify returned value
     * @expected
     * - address should be event toAddress
     * - value should be chainMinTransfer
     * - should have exactly one token (event.targetChainTokenId)
     *   with value event.amount - fee.bridgeFee - fee.networkFee +
     * - should not have extra
     */
    it('should replace fees on token payment when they are less than minimum config', async () => {
      // mock function arguments
      const chainMinTransfer = 100n;
      const fee: Fee = {
        bridgeFee: 20000000n,
        networkFee: 30000n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      const mockedEvent = mockTokenPaymentEvent();

      // run test
      const result = await EventOrder.eventSinglePayment(
        mockedEvent,
        chainMinTransfer,
        fee
      );

      // verify returned value
      expect(result.address).toEqual(mockedEvent.toAddress);
      expect(result.assets.nativeToken).toEqual(chainMinTransfer);
      expect(result.assets.tokens.length).toEqual(1);
      expect(result.assets.tokens[0].id).toEqual(
        mockedEvent.targetChainTokenId
      );
      expect(result.assets.tokens[0].value).toEqual(
        BigInt(mockedEvent.amount) -
          BigInt(fee.bridgeFee) -
          BigInt(fee.networkFee)
      );
      expect(result.extra).toBeUndefined();
    });

    /**
     * @target EventOrder.eventSinglePayment should replace bridgeFee
     * on native token payment when it is less than expected value
     * @dependencies
     * - tokenMap
     * @scenario
     * - mock function arguments
     * - run test
     * - verify returned value
     * @expected
     * - address should be event toAddress
     * - value should be
     *   event.amount - (event.amount * fee.feeRatio) / feeRatioDivisor - event.networkFee + chainMinTransfer
     * - should not contain any tokens
     * - should not have extra
     */
    it('should replace bridgeFee on native token payment when it is less than expected value', async () => {
      // mock function arguments
      const chainMinTransfer = 100n;
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 1000n,
      };
      const mockedEvent = mockNativeTokenPaymentEvent();

      // run test
      const result = await EventOrder.eventSinglePayment(
        mockedEvent,
        chainMinTransfer,
        fee
      );

      // verify returned value
      expect(result.address).toEqual(mockedEvent.toAddress);
      expect(result.assets.nativeToken).toEqual(
        BigInt(mockedEvent.amount) -
          (BigInt(mockedEvent.amount) * fee.feeRatio) /
            MinimumFee.bridgeMinimumFee.feeRatioDivisor -
          BigInt(mockedEvent.networkFee) +
          chainMinTransfer
      );
      expect(result.assets.tokens.length).toEqual(0);
      expect(result.extra).toBeUndefined();
    });
  });

  describe('eventRewardOrder', () => {
    /**
     * @target EventOrder.eventRewardOrder should generate
     * native token reward distribution successfully
     * @dependencies
     * - tokenMap
     * @scenario
     * - mock function arguments
     * - run test
     * - verify returned value
     * @expected
     * - should generate 5 + 1 + 2 element on order
     *   - 5 + 1 watcher box
     *     - address should be watcher permit contract
     *     - value should be
     *       (event.bridgeFee * watchersSharePercent) / 100 / 6 + minErg
     *     - should have exactly one token (RSN) with value
     *       ((event.bridgeFee * fee.rsnRatio / rsnRatioDivisor) * watchersRSNSharePercent) / 100 / 6
     *     - extra should equal to WID
     *   - bridge fee box
     *     - address should be bridgeFee config address
     *     - value should be remaining bridgeFee + minErg
     *     - should have exactly one token (RSN) with value
     *       of remaining rsnFee
     *     - extra should equal to paymentTxId
     *   - network fee box
     *     - address should be networkFee config address
     *     - value should be networkFee + minErg
     *     - should have no token
     *     - should have no extra
     */
    it('should generate native token reward distribution successfully', async () => {
      // mock function arguments
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 1000000000n,
        feeRatio: 0n,
      };
      const paymentTxId = '';
      const mockedEvent = mockNativeTokenPaymentEvent();
      const unmergedWID = TestUtils.generateRandomId();

      // run test
      const result = await EventOrder.eventRewardOrder(
        mockedEvent,
        [unmergedWID],
        fee,
        paymentTxId
      );

      // verify returned value
      // verify 5 watcher box
      expect(result.length).toEqual(8);
      result.slice(0, 5).forEach((watcherOrder, index) => {
        expect(watcherOrder.address).toEqual(
          ErgoConfigs.ergoContractConfig.permitAddress
        );
        expect(watcherOrder.assets.nativeToken).toEqual(83433333n);
        expect(watcherOrder.assets.tokens.length).toEqual(1);
        expect(watcherOrder.assets.tokens[0].id).toEqual(rosenConfig.RSN);
        expect(watcherOrder.assets.tokens[0].value).toEqual(33333n);
        expect(watcherOrder.extra).toEqual(mockedEvent.WIDs[index]);
      });
      // verify 1 watcher box
      const unmergedWatcherOrder = result[5];
      expect(unmergedWatcherOrder.address).toEqual(
        ErgoConfigs.ergoContractConfig.permitAddress
      );
      expect(unmergedWatcherOrder.assets.nativeToken).toEqual(83433333n);
      expect(unmergedWatcherOrder.assets.tokens.length).toEqual(1);
      expect(unmergedWatcherOrder.assets.tokens[0].id).toEqual(rosenConfig.RSN);
      expect(unmergedWatcherOrder.assets.tokens[0].value).toEqual(33333n);
      expect(unmergedWatcherOrder.extra).toEqual(unmergedWID);
      // verify bridge fee box
      const bridgeFeeOrder = result[6];
      expect(bridgeFeeOrder.address).toEqual(ErgoConfigs.bridgeFeeRepoAddress);
      expect(bridgeFeeOrder.assets.nativeToken).toEqual(499500002n);
      expect(bridgeFeeOrder.assets.tokens.length).toEqual(1);
      expect(bridgeFeeOrder.assets.tokens[0].id).toEqual(rosenConfig.RSN);
      expect(bridgeFeeOrder.assets.tokens[0].value).toEqual(800002n);
      expect(bridgeFeeOrder.extra).toEqual(paymentTxId);
      // verify network fee box
      const networkFeeOrder = result[7];
      expect(networkFeeOrder.address).toEqual(
        ErgoConfigs.networkFeeRepoAddress
      );
      expect(networkFeeOrder.assets.nativeToken).toEqual(1600000n);
      expect(networkFeeOrder.assets.tokens.length).toEqual(0);
      expect(networkFeeOrder.extra).toBeUndefined();
    });

    /**
     * @target EventOrder.eventRewardOrder should generate
     * token reward distribution successfully
     * @dependencies
     * - tokenMap
     * @scenario
     * - mock function arguments
     * - run test
     * - verify returned value
     * @expected
     * - should generate 5 + 1 + 2 element on order
     *   - 5 + 1 watcher box
     *     - address should be watcher permit contract
     *     - value should be  minErg
     *     - should have exactly one token (RSN) with value
     *       ((event.bridgeFee * fee.rsnRatio / rsnRatioDivisor) * watchersRSNSharePercent) / 100 / 6
     *     - extra should equal to WID
     *   - bridge fee box
     *     - address should be bridgeFee config address
     *     - value should be minErg
     *     - should have exactly one token (RSN) with value
     *       of remaining rsnFee
     *     - extra should equal to paymentTxId
     *   - network fee box
     *     - address should be networkFee config address
     *     - value should be minErg
     *     - should have no token
     *     - should have no extra
     */
    it('should generate token reward distribution successfully', async () => {
      // mock function arguments
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 1000000000n,
        feeRatio: 0n,
      };
      const paymentTxId = '';
      const mockedEvent = mockTokenPaymentEvent();
      const unmergedWID = TestUtils.generateRandomId();

      // run test
      const result = await EventOrder.eventRewardOrder(
        mockedEvent,
        [unmergedWID],
        fee,
        paymentTxId
      );

      // verify returned value
      // verify 5 watcher box
      expect(result.length).toEqual(8);
      result.slice(0, 5).forEach((watcherOrder, index) => {
        expect(watcherOrder.address).toEqual(
          ErgoConfigs.ergoContractConfig.permitAddress
        );
        expect(watcherOrder.assets.nativeToken).toEqual(100000n);
        expect(watcherOrder.assets.tokens.length).toEqual(2);
        expect(watcherOrder.assets.tokens[0].id).toEqual(
          mockedEvent.targetChainTokenId
        );
        expect(watcherOrder.assets.tokens[0].value).toEqual(833333n);
        expect(watcherOrder.assets.tokens[1].id).toEqual(rosenConfig.RSN);
        expect(watcherOrder.assets.tokens[1].value).toEqual(333n);
        expect(watcherOrder.extra).toEqual(mockedEvent.WIDs[index]);
      });
      // verify 1 watcher box
      const unmergedWatcherOrder = result[5];
      expect(unmergedWatcherOrder.address).toEqual(
        ErgoConfigs.ergoContractConfig.permitAddress
      );
      expect(unmergedWatcherOrder.assets.nativeToken).toEqual(100000n);
      expect(unmergedWatcherOrder.assets.tokens.length).toEqual(2);
      expect(unmergedWatcherOrder.assets.tokens[0].id).toEqual(
        mockedEvent.targetChainTokenId
      );
      expect(unmergedWatcherOrder.assets.tokens[0].value).toEqual(833333n);
      expect(unmergedWatcherOrder.assets.tokens[1].id).toEqual(rosenConfig.RSN);
      expect(unmergedWatcherOrder.assets.tokens[1].value).toEqual(333n);
      expect(unmergedWatcherOrder.extra).toEqual(unmergedWID);
      // verify bridge fee box
      const bridgeFeeOrder = result[6];
      expect(bridgeFeeOrder.address).toEqual(ErgoConfigs.bridgeFeeRepoAddress);
      expect(bridgeFeeOrder.assets.nativeToken).toEqual(100000n);
      expect(bridgeFeeOrder.assets.tokens.length).toEqual(2);
      expect(bridgeFeeOrder.assets.tokens[0].id).toEqual(
        mockedEvent.targetChainTokenId
      );
      expect(bridgeFeeOrder.assets.tokens[0].value).toEqual(5000002n);
      expect(bridgeFeeOrder.assets.tokens[1].id).toEqual(rosenConfig.RSN);
      expect(bridgeFeeOrder.assets.tokens[1].value).toEqual(8002n);
      expect(bridgeFeeOrder.extra).toEqual(paymentTxId);
      // verify network fee box
      const networkFeeOrder = result[7];
      expect(networkFeeOrder.address).toEqual(
        ErgoConfigs.networkFeeRepoAddress
      );
      expect(networkFeeOrder.assets.nativeToken).toEqual(100000n);
      expect(networkFeeOrder.assets.tokens.length).toEqual(1);
      expect(networkFeeOrder.assets.tokens[0].id).toEqual(
        mockedEvent.targetChainTokenId
      );
      expect(networkFeeOrder.assets.tokens[0].value).toEqual(15000n);
      expect(networkFeeOrder.extra).toBeUndefined();
    });

    /**
     * @target EventOrder.eventRewardOrder should replace fees
     * on token payment when they are less than minimum config
     * @dependencies
     * - tokenMap
     * @scenario
     * - mock function arguments
     * - run test
     * - verify returned value
     * @expected
     * - should generate 5 + 1 + 2 element on order
     *   - 5 + 1 watcher box
     *     - address should be watcher permit contract
     *     - value should be minErg
     *     - should have exactly one token (RSN) with value
     *       ((fee.bridgeFee * fee.rsnRatio / rsnRatioDivisor) * watchersRSNSharePercent) / 100 / 6
     *     - extra should equal to WID
     *   - bridge fee box
     *     - address should be bridgeFee config address
     *     - value should be minErg
     *     - should have exactly one token (RSN) with value
     *       of remaining rsnFee
     *     - extra should equal to paymentTxId
     *   - network fee box
     *     - address should be networkFee config address
     *     - value should be minErg
     *     - should have no token
     *     - should have no extra
     */
    it('should replace fees on token payment when they are less than minimum config', async () => {
      // mock function arguments
      const fee: Fee = {
        bridgeFee: 20000000n,
        networkFee: 30000n,
        rsnRatio: 1000000000n,
        feeRatio: 0n,
      };
      const paymentTxId = '';
      const mockedEvent = mockTokenPaymentEvent();
      const unmergedWID = TestUtils.generateRandomId();

      // run test
      const result = await EventOrder.eventRewardOrder(
        mockedEvent,
        [unmergedWID],
        fee,
        paymentTxId
      );

      // verify returned value
      // verify 5 watcher box
      expect(result.length).toEqual(8);
      result.slice(0, 5).forEach((watcherOrder, index) => {
        expect(watcherOrder.address).toEqual(
          ErgoConfigs.ergoContractConfig.permitAddress
        );
        expect(watcherOrder.assets.nativeToken).toEqual(100000n);
        expect(watcherOrder.assets.tokens.length).toEqual(2);
        expect(watcherOrder.assets.tokens[0].id).toEqual(
          mockedEvent.targetChainTokenId
        );
        expect(watcherOrder.assets.tokens[0].value).toEqual(1666666n);
        expect(watcherOrder.assets.tokens[1].id).toEqual(rosenConfig.RSN);
        expect(watcherOrder.assets.tokens[1].value).toEqual(666n);
        expect(watcherOrder.extra).toEqual(mockedEvent.WIDs[index]);
      });
      // verify 1 watcher box
      const unmergedWatcherOrder = result[5];
      expect(unmergedWatcherOrder.address).toEqual(
        ErgoConfigs.ergoContractConfig.permitAddress
      );
      expect(unmergedWatcherOrder.assets.nativeToken).toEqual(100000n);
      expect(unmergedWatcherOrder.assets.tokens.length).toEqual(2);
      expect(unmergedWatcherOrder.assets.tokens[0].id).toEqual(
        mockedEvent.targetChainTokenId
      );
      expect(unmergedWatcherOrder.assets.tokens[0].value).toEqual(1666666n);
      expect(unmergedWatcherOrder.assets.tokens[1].id).toEqual(rosenConfig.RSN);
      expect(unmergedWatcherOrder.assets.tokens[1].value).toEqual(666n);
      expect(unmergedWatcherOrder.extra).toEqual(unmergedWID);
      // verify bridge fee box
      const bridgeFeeOrder = result[6];
      expect(bridgeFeeOrder.address).toEqual(ErgoConfigs.bridgeFeeRepoAddress);
      expect(bridgeFeeOrder.assets.nativeToken).toEqual(100000n);
      expect(bridgeFeeOrder.assets.tokens.length).toEqual(2);
      expect(bridgeFeeOrder.assets.tokens[0].id).toEqual(
        mockedEvent.targetChainTokenId
      );
      expect(bridgeFeeOrder.assets.tokens[0].value).toEqual(10000004n);
      expect(bridgeFeeOrder.assets.tokens[1].id).toEqual(rosenConfig.RSN);
      expect(bridgeFeeOrder.assets.tokens[1].value).toEqual(16004n);
      expect(bridgeFeeOrder.extra).toEqual(paymentTxId);
      // verify network fee box
      const networkFeeOrder = result[7];
      expect(networkFeeOrder.address).toEqual(
        ErgoConfigs.networkFeeRepoAddress
      );
      expect(networkFeeOrder.assets.nativeToken).toEqual(100000n);
      expect(networkFeeOrder.assets.tokens.length).toEqual(1);
      expect(networkFeeOrder.assets.tokens[0].id).toEqual(
        mockedEvent.targetChainTokenId
      );
      expect(networkFeeOrder.assets.tokens[0].value).toEqual(30000n);
      expect(networkFeeOrder.extra).toBeUndefined();
    });
    /**
     * @target EventOrder.eventRewardOrder should replace bridgeFee
     * on native token payment when it is less than expected value
     * @dependencies
     * - tokenMap
     * @scenario
     * - mock function arguments
     * - run test
     * - verify returned value
     * @expected
     * - should generate 5 + 1 + 2 element on order
     *   - 5 + 1 watcher box
     *     - address should be watcher permit contract
     *     - value should be
     *       ((event.amount * fee.feeRatio) / feeRatioDivisor * watchersSharePercent) / 100 / 6 + minErg
     *     - should have exactly one token (RSN) with value
     *       (((event.amount * fee.feeRatio) / feeRatioDivisor * fee.rsnRatio / rsnRatioDivisor) * watchersRSNSharePercent) / 100 / 6
     *     - extra should equal to WID
     *   - bridge fee box
     *     - address should be bridgeFee config address
     *     - value should be remaining bridgeFee + minErg
     *     - should have exactly one token (RSN) with value
     *       of remaining rsnFee
     *     - extra should equal to paymentTxId
     *   - network fee box
     *     - address should be networkFee config address
     *     - value should be networkFee + minErg
     *     - should have no token
     *     - should have no extra
     */
    it('should replace bridgeFee on native token payment when it is less than expected value', async () => {
      // mock function arguments
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 1000000000n,
        feeRatio: 1000n,
      };
      const paymentTxId = '';
      const mockedEvent = mockNativeTokenPaymentEvent();
      const unmergedWID = TestUtils.generateRandomId();

      // run test
      const result = await EventOrder.eventRewardOrder(
        mockedEvent,
        [unmergedWID],
        fee,
        paymentTxId
      );

      // verify returned value
      // verify 5 watcher box
      expect(result.length).toEqual(8);
      result.slice(0, 5).forEach((watcherOrder, index) => {
        expect(watcherOrder.address).toEqual(
          ErgoConfigs.ergoContractConfig.permitAddress
        );
        expect(watcherOrder.assets.nativeToken).toEqual(416766666n);
        expect(watcherOrder.assets.tokens.length).toEqual(1);
        expect(watcherOrder.assets.tokens[0].id).toEqual(rosenConfig.RSN);
        expect(watcherOrder.assets.tokens[0].value).toEqual(166666n);
        expect(watcherOrder.extra).toEqual(mockedEvent.WIDs[index]);
      });
      // verify 1 watcher box
      const unmergedWatcherOrder = result[5];
      expect(unmergedWatcherOrder.address).toEqual(
        ErgoConfigs.ergoContractConfig.permitAddress
      );
      expect(unmergedWatcherOrder.assets.nativeToken).toEqual(416766666n);
      expect(unmergedWatcherOrder.assets.tokens.length).toEqual(1);
      expect(unmergedWatcherOrder.assets.tokens[0].id).toEqual(rosenConfig.RSN);
      expect(unmergedWatcherOrder.assets.tokens[0].value).toEqual(166666n);
      expect(unmergedWatcherOrder.extra).toEqual(unmergedWID);
      // verify bridge fee box
      const bridgeFeeOrder = result[6];
      expect(bridgeFeeOrder.address).toEqual(ErgoConfigs.bridgeFeeRepoAddress);
      expect(bridgeFeeOrder.assets.nativeToken).toEqual(2499500004n);
      expect(bridgeFeeOrder.assets.tokens.length).toEqual(1);
      expect(bridgeFeeOrder.assets.tokens[0].id).toEqual(rosenConfig.RSN);
      expect(bridgeFeeOrder.assets.tokens[0].value).toEqual(4000004n);
      expect(bridgeFeeOrder.extra).toEqual(paymentTxId);
      // verify network fee box
      const networkFeeOrder = result[7];
      expect(networkFeeOrder.address).toEqual(
        ErgoConfigs.networkFeeRepoAddress
      );
      expect(networkFeeOrder.assets.nativeToken).toEqual(1600000n);
      expect(networkFeeOrder.assets.tokens.length).toEqual(0);
      expect(networkFeeOrder.extra).toBeUndefined();
    });
  });
});
