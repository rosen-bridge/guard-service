import { Fee } from '@rosen-bridge/minimum-fee';
import GuardsCardanoConfigs from '../../src/configs/GuardsCardanoConfigs';
import EventOrder from '../../src/event/EventOrder';
import {
  mockNativeTokenPaymentEvent,
  mockTokenPaymentEvent,
  mockTokenPaymentFromErgoEvent,
} from './testData';
import TestUtils from '../testUtils/TestUtils';
import MinimumFee from '../../src/event/MinimumFee';
import GuardsErgoConfigs from '../../src/configs/GuardsErgoConfigs';
import { rosenConfig } from '../../src/configs/RosenConfig';
import ChainHandlerMock from '../handlers/ChainHandler.mock';

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
    it('should generate native token payment successfully', () => {
      // mock function arguments
      const chainMinTransfer = 100n;
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      const mockedEvent = mockNativeTokenPaymentEvent().event;

      // run test
      const result = EventOrder.eventSinglePayment(
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
          chainMinTransfer +
          GuardsErgoConfigs.additionalErgOnPayment
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
     * - mock function arguments (target chain is not Ergo)
     * - run test
     * - verify returned value
     * @expected
     * - address should be event toAddress
     * - value should be chainMinTransfer
     * - should have exactly one token (event.targetChainTokenId)
     *   with value event.amount - event.bridgeFee - event.networkFee +
     * - should not have extra
     */
    it('should generate token payment successfully', () => {
      // mock function arguments
      const chainMinTransfer = 100n;
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      const mockedEvent = mockTokenPaymentFromErgoEvent().event;

      // run test
      const result = EventOrder.eventSinglePayment(
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
    it('should replace fees on token payment when they are less than minimum config', () => {
      // mock function arguments
      const chainMinTransfer = 100n;
      const fee: Fee = {
        bridgeFee: 20000000n,
        networkFee: 30000n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      const mockedEvent = mockTokenPaymentEvent().event;

      // run test
      const result = EventOrder.eventSinglePayment(
        mockedEvent,
        chainMinTransfer,
        fee
      );

      // verify returned value
      expect(result.address).toEqual(mockedEvent.toAddress);
      expect(result.assets.nativeToken).toEqual(
        chainMinTransfer + GuardsErgoConfigs.additionalErgOnPayment
      );
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
    it('should replace bridgeFee on native token payment when it is less than expected value', () => {
      // mock function arguments
      const chainMinTransfer = 100n;
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 1000n,
      };
      const mockedEvent = mockNativeTokenPaymentEvent().event;

      // run test
      const result = EventOrder.eventSinglePayment(
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
          chainMinTransfer +
          GuardsErgoConfigs.additionalErgOnPayment
      );
      expect(result.assets.tokens.length).toEqual(0);
      expect(result.extra).toBeUndefined();
    });
  });

  describe('eventRewardOrder', () => {
    const fromChainRwt = 'fromChainRwt';
    const rwtCount = 2n;

    beforeEach(() => {
      ChainHandlerMock.resetMock();
    });

    /**
     * @target EventOrder.eventRewardOrder should set cardano permit address
     * for each watcher when source chain of event is cardano
     * @dependencies
     * - tokenMap
     * - contracts
     * - ChainHandler
     * @scenario
     * - mock function arguments
     * - mock ChainHandler and `getChainConfigs` function
     * - run test
     * - verify returned value
     * @expected
     * - first 5 orders must have cardano permit address
     */
    it('should set cardano permit address for each watcher when source chain of event is cardano', () => {
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 1000000000n,
        feeRatio: 0n,
      };
      const mockedEvent = mockNativeTokenPaymentEvent();

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.event.fromChain, true);
      // mock `getChainConfigs`
      ChainHandlerMock.mockFromChainFunction(
        'getChainConfigs',
        GuardsCardanoConfigs.chainConfigs
      );

      const result = EventOrder.eventRewardOrder(
        mockedEvent.event,
        [],
        fee,
        '',
        fromChainRwt,
        rwtCount,
        100000000n,
        mockedEvent.WIDs
      );
      for (let index = 0; index < mockedEvent.WIDs.length; index++) {
        expect(
          result[index].address ===
            GuardsCardanoConfigs.cardanoContractConfig.permitAddress
        );
      }
    });

    /**
     * @target EventOrder.eventRewardOrder should generate
     * native token reward distribution successfully
     * @dependencies
     * - tokenMap
     * @scenario
     * - mock function arguments
     * - mock ChainHandler and `getChainConfigs` function
     * - run test
     * - verify returned value
     * @expected
     * - should generate 5 + 1 + 3 element on order
     *   - 5 + 1 watcher box
     *     - address should be watcher permit contract
     *     - value should be
     *       (event.bridgeFee * watchersSharePercent) / 100 / 6 + permit box value
     *     - should have exactly one token (RSN) with value
     *       ((event.bridgeFee * fee.rsnRatio / rsnRatioDivisor) * watchersRSNSharePercent) / 100 / 6
     *     - extra should equal to WID
     *   - bridge fee box
     *     - address should be bridgeFee config address
     *     - value should be remaining bridgeFee + minErg
     *     - should have no token
     *     - extra should equal to paymentTxId
     *   - rsn emission box
     *     - address should be rsn emission config address
     *     - value should be minErg
     *     - should have exactly one token (RSN) with value
     *       of remaining rsnFee
     *     - should have no extra
     *   - network fee box
     *     - address should be networkFee config address
     *     - value should be networkFee + minErg
     *     - should have no token
     *     - should have no extra
     */
    it('should generate native token reward distribution successfully', () => {
      // mock function arguments
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 1000000000n,
        feeRatio: 0n,
      };
      const paymentTxId = '';
      const mockedEvent = mockNativeTokenPaymentEvent();
      const unmergedWID = {
        wid: TestUtils.generateRandomId(),
        boxValue: 200000000n,
      };

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.event.fromChain, true);
      // mock `getChainConfigs`
      ChainHandlerMock.mockFromChainFunction(
        'getChainConfigs',
        GuardsCardanoConfigs.chainConfigs
      );

      // run test
      const result = EventOrder.eventRewardOrder(
        mockedEvent.event,
        [unmergedWID],
        fee,
        paymentTxId,
        fromChainRwt,
        rwtCount,
        100000000n,
        mockedEvent.WIDs
      );

      // verify returned value
      // verify 5 watcher box
      expect(result.length).toEqual(9);
      result.slice(0, 5).forEach((watcherOrder, index) => {
        expect(watcherOrder.address).toEqual(
          GuardsErgoConfigs.ergoContractConfig.permitAddress
        );
        // ((event.amount * fee.feeRatio) / feeRatioDivisor * watchersSharePercent) / 100 / 6 + permit boxValue
        expect(watcherOrder.assets.nativeToken).toEqual(83333333n + 100000000n);
        expect(watcherOrder.assets.tokens.length).toEqual(2);
        expect(watcherOrder.assets.tokens[0].id).toEqual(fromChainRwt);
        expect(watcherOrder.assets.tokens[0].value).toEqual(rwtCount);
        expect(watcherOrder.assets.tokens[1].id).toEqual(rosenConfig.RSN);
        expect(watcherOrder.assets.tokens[1].value).toEqual(33333n);
        expect(watcherOrder.extra).toEqual(mockedEvent.WIDs[index]);
      });
      // verify 1 watcher box
      const unmergedWatcherOrder = result[5];
      expect(unmergedWatcherOrder.address).toEqual(
        GuardsErgoConfigs.ergoContractConfig.permitAddress
      );
      expect(unmergedWatcherOrder.assets.nativeToken).toEqual(
        83333333n + 200000000n
      );
      expect(unmergedWatcherOrder.assets.tokens.length).toEqual(2);
      expect(unmergedWatcherOrder.assets.tokens[0].id).toEqual(fromChainRwt);
      expect(unmergedWatcherOrder.assets.tokens[0].value).toEqual(rwtCount);
      expect(unmergedWatcherOrder.assets.tokens[1].id).toEqual(rosenConfig.RSN);
      expect(unmergedWatcherOrder.assets.tokens[1].value).toEqual(33333n);
      expect(unmergedWatcherOrder.extra).toEqual(unmergedWID.wid);
      // verify bridge fee box
      const bridgeFeeOrder = result[6];
      expect(bridgeFeeOrder.address).toEqual(
        GuardsErgoConfigs.bridgeFeeRepoAddress
      );
      expect(bridgeFeeOrder.assets.nativeToken).toEqual(500100002n);
      expect(bridgeFeeOrder.assets.tokens.length).toEqual(0);
      expect(bridgeFeeOrder.extra).toEqual(paymentTxId);
      // verify rsn emission box
      const rsnEmissionOrder = result[7];
      expect(rsnEmissionOrder.address).toEqual(
        GuardsErgoConfigs.rsnEmissionAddress
      );
      expect(rsnEmissionOrder.assets.nativeToken).toEqual(100000n);
      expect(rsnEmissionOrder.assets.tokens.length).toEqual(1);
      expect(rsnEmissionOrder.assets.tokens[0].id).toEqual(rosenConfig.RSN);
      expect(rsnEmissionOrder.assets.tokens[0].value).toEqual(800002n);
      expect(rsnEmissionOrder.extra).toBeUndefined();
      // verify network fee box
      const networkFeeOrder = result[8];
      expect(networkFeeOrder.address).toEqual(
        GuardsErgoConfigs.networkFeeRepoAddress
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
     * - mock ChainHandler and `getChainConfigs` function
     * - run test
     * - verify returned value
     * @expected
     * - should generate 5 + 1 + 3 element on order
     *   - 5 + 1 watcher box
     *     - address should be watcher permit contract
     *     - value should be permit box value
     *     - should have exactly one token (RSN) with value
     *       ((event.bridgeFee * fee.rsnRatio / rsnRatioDivisor) * watchersRSNSharePercent) / 100 / 6
     *     - extra should equal to WID
     *   - bridge fee box
     *     - address should be bridgeFee config address
     *     - value should be minErg
     *     - should have exactly one token (targetToken) with value
     *       of remaining bridgeFee
     *     - extra should equal to paymentTxId
     *   - rsn emission box
     *     - address should be rsn emission config address
     *     - value should be minErg
     *     - should have exactly one token (RSN) with value
     *       of remaining rsnFee
     *     - should have no extra
     *   - network fee box
     *     - address should be networkFee config address
     *     - value should be minErg
     *     - should have no token
     *     - should have no extra
     */
    it('should generate token reward distribution successfully', () => {
      // mock function arguments
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 1000000000n,
        feeRatio: 0n,
      };
      const paymentTxId = '';
      const mockedEvent = mockTokenPaymentEvent();
      const unmergedWID = {
        wid: TestUtils.generateRandomId(),
        boxValue: 2000000000n,
      };

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.event.fromChain, true);
      // mock `getChainConfigs`
      ChainHandlerMock.mockFromChainFunction(
        'getChainConfigs',
        GuardsCardanoConfigs.chainConfigs
      );

      // run test
      const result = EventOrder.eventRewardOrder(
        mockedEvent.event,
        [unmergedWID],
        fee,
        paymentTxId,
        fromChainRwt,
        rwtCount,
        10000000n,
        mockedEvent.WIDs
      );

      // verify returned value
      // verify 5 watcher box
      expect(result.length).toEqual(9);
      result.slice(0, 5).forEach((watcherOrder, index) => {
        expect(watcherOrder.address).toEqual(
          GuardsErgoConfigs.ergoContractConfig.permitAddress
        );
        expect(watcherOrder.assets.nativeToken).toEqual(10000000n);
        expect(watcherOrder.assets.tokens.length).toEqual(3);
        expect(watcherOrder.assets.tokens[0].id).toEqual(fromChainRwt);
        expect(watcherOrder.assets.tokens[0].value).toEqual(rwtCount);
        expect(watcherOrder.assets.tokens[1].id).toEqual(
          mockedEvent.event.targetChainTokenId
        );
        expect(watcherOrder.assets.tokens[1].value).toEqual(833333n);
        expect(watcherOrder.assets.tokens[2].id).toEqual(rosenConfig.RSN);
        expect(watcherOrder.assets.tokens[2].value).toEqual(333n);
        expect(watcherOrder.extra).toEqual(mockedEvent.WIDs[index]);
      });
      // verify 1 watcher box
      const unmergedWatcherOrder = result[5];
      expect(unmergedWatcherOrder.address).toEqual(
        GuardsErgoConfigs.ergoContractConfig.permitAddress
      );
      expect(unmergedWatcherOrder.assets.nativeToken).toEqual(2000000000n);
      expect(unmergedWatcherOrder.assets.tokens.length).toEqual(3);
      expect(unmergedWatcherOrder.assets.tokens[0].id).toEqual(fromChainRwt);
      expect(unmergedWatcherOrder.assets.tokens[0].value).toEqual(rwtCount);
      expect(unmergedWatcherOrder.assets.tokens[1].id).toEqual(
        mockedEvent.event.targetChainTokenId
      );
      expect(unmergedWatcherOrder.assets.tokens[1].value).toEqual(833333n);
      expect(unmergedWatcherOrder.assets.tokens[2].id).toEqual(rosenConfig.RSN);
      expect(unmergedWatcherOrder.assets.tokens[2].value).toEqual(333n);
      expect(unmergedWatcherOrder.extra).toEqual(unmergedWID.wid);
      // verify bridge fee box
      const bridgeFeeOrder = result[6];
      expect(bridgeFeeOrder.address).toEqual(
        GuardsErgoConfigs.bridgeFeeRepoAddress
      );
      expect(bridgeFeeOrder.assets.nativeToken).toEqual(100000n);
      expect(bridgeFeeOrder.assets.tokens.length).toEqual(1);
      expect(bridgeFeeOrder.assets.tokens[0].id).toEqual(
        mockedEvent.event.targetChainTokenId
      );
      expect(bridgeFeeOrder.assets.tokens[0].value).toEqual(5000002n);
      expect(bridgeFeeOrder.extra).toEqual(paymentTxId);
      // verify rsn emission box
      const rsnEmissionOrder = result[7];
      expect(rsnEmissionOrder.address).toEqual(
        GuardsErgoConfigs.rsnEmissionAddress
      );
      expect(rsnEmissionOrder.assets.nativeToken).toEqual(100000n);
      expect(rsnEmissionOrder.assets.tokens.length).toEqual(1);
      expect(rsnEmissionOrder.assets.tokens[0].id).toEqual(rosenConfig.RSN);
      expect(rsnEmissionOrder.assets.tokens[0].value).toEqual(8002n);
      expect(rsnEmissionOrder.extra).toBeUndefined();
      // verify network fee box
      const networkFeeOrder = result[8];
      expect(networkFeeOrder.address).toEqual(
        GuardsErgoConfigs.networkFeeRepoAddress
      );
      expect(networkFeeOrder.assets.nativeToken).toEqual(100000n);
      expect(networkFeeOrder.assets.tokens.length).toEqual(1);
      expect(networkFeeOrder.assets.tokens[0].id).toEqual(
        mockedEvent.event.targetChainTokenId
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
     * - mock ChainHandler and `getChainConfigs` function
     * - run test
     * - verify returned value
     * @expected
     * - should generate 5 + 1 + 3 element on order
     *   - 5 + 1 watcher box
     *     - address should be watcher permit contract
     *     - value should be permit box value
     *     - should have exactly one token (RSN) with value
     *       ((fee.bridgeFee * fee.rsnRatio / rsnRatioDivisor) * watchersRSNSharePercent) / 100 / 6
     *     - extra should equal to WID
     *   - bridge fee box
     *     - address should be bridgeFee config address
     *     - value should be minErg
     *     - should have exactly one token (targetToken) with value
     *       of remaining bridgeFee
     *     - extra should equal to paymentTxId
     *   - rsn emission box
     *     - address should be rsn emission config address
     *     - value should be minErg
     *     - should have exactly one token (RSN) with value
     *       of remaining rsnFee
     *     - should have no extra
     *   - network fee box
     *     - address should be networkFee config address
     *     - value should be minErg
     *     - should have no token
     *     - should have no extra
     */
    it('should replace fees on token payment when they are less than minimum config', () => {
      // mock function arguments
      const fee: Fee = {
        bridgeFee: 20000000n,
        networkFee: 30000n,
        rsnRatio: 1000000000n,
        feeRatio: 0n,
      };
      const paymentTxId = '';
      const mockedEvent = mockTokenPaymentEvent();
      const unmergedWID = {
        wid: TestUtils.generateRandomId(),
        boxValue: 11000000n,
      };

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.event.fromChain, true);
      // mock `getChainConfigs`
      ChainHandlerMock.mockFromChainFunction(
        'getChainConfigs',
        GuardsCardanoConfigs.chainConfigs
      );

      // run test
      const result = EventOrder.eventRewardOrder(
        mockedEvent.event,
        [unmergedWID],
        fee,
        paymentTxId,
        fromChainRwt,
        rwtCount,
        10000000n,
        mockedEvent.WIDs
      );

      // verify returned value
      // verify 5 watcher box
      expect(result.length).toEqual(9);
      result.slice(0, 5).forEach((watcherOrder, index) => {
        expect(watcherOrder.address).toEqual(
          GuardsErgoConfigs.ergoContractConfig.permitAddress
        );
        expect(watcherOrder.assets.nativeToken).toEqual(10000000n);
        expect(watcherOrder.assets.tokens.length).toEqual(3);
        expect(watcherOrder.assets.tokens[0].id).toEqual(fromChainRwt);
        expect(watcherOrder.assets.tokens[0].value).toEqual(rwtCount);
        expect(watcherOrder.assets.tokens[1].id).toEqual(
          mockedEvent.event.targetChainTokenId
        );
        expect(watcherOrder.assets.tokens[1].value).toEqual(1666666n);
        expect(watcherOrder.assets.tokens[2].id).toEqual(rosenConfig.RSN);
        expect(watcherOrder.assets.tokens[2].value).toEqual(666n);
        expect(watcherOrder.extra).toEqual(mockedEvent.WIDs[index]);
      });
      // verify 1 watcher box
      const unmergedWatcherOrder = result[5];
      expect(unmergedWatcherOrder.address).toEqual(
        GuardsErgoConfigs.ergoContractConfig.permitAddress
      );
      expect(unmergedWatcherOrder.assets.nativeToken).toEqual(11000000n);
      expect(unmergedWatcherOrder.assets.tokens.length).toEqual(3);
      expect(unmergedWatcherOrder.assets.tokens[0].id).toEqual(fromChainRwt);
      expect(unmergedWatcherOrder.assets.tokens[0].value).toEqual(rwtCount);
      expect(unmergedWatcherOrder.assets.tokens[1].id).toEqual(
        mockedEvent.event.targetChainTokenId
      );
      expect(unmergedWatcherOrder.assets.tokens[1].value).toEqual(1666666n);
      expect(unmergedWatcherOrder.assets.tokens[2].id).toEqual(rosenConfig.RSN);
      expect(unmergedWatcherOrder.assets.tokens[2].value).toEqual(666n);
      expect(unmergedWatcherOrder.extra).toEqual(unmergedWID.wid);
      // verify bridge fee box
      const bridgeFeeOrder = result[6];
      expect(bridgeFeeOrder.address).toEqual(
        GuardsErgoConfigs.bridgeFeeRepoAddress
      );
      expect(bridgeFeeOrder.assets.nativeToken).toEqual(100000n);
      expect(bridgeFeeOrder.assets.tokens.length).toEqual(1);
      expect(bridgeFeeOrder.assets.tokens[0].id).toEqual(
        mockedEvent.event.targetChainTokenId
      );
      expect(bridgeFeeOrder.assets.tokens[0].value).toEqual(10000004n);
      expect(bridgeFeeOrder.extra).toEqual(paymentTxId);
      // verify rsn emission box
      const rsnEmissionOrder = result[7];
      expect(rsnEmissionOrder.address).toEqual(
        GuardsErgoConfigs.rsnEmissionAddress
      );
      expect(rsnEmissionOrder.assets.nativeToken).toEqual(100000n);
      expect(rsnEmissionOrder.assets.tokens.length).toEqual(1);
      expect(rsnEmissionOrder.assets.tokens[0].id).toEqual(rosenConfig.RSN);
      expect(rsnEmissionOrder.assets.tokens[0].value).toEqual(16004n);
      expect(rsnEmissionOrder.extra).toBeUndefined();
      // verify network fee box
      const networkFeeOrder = result[8];
      expect(networkFeeOrder.address).toEqual(
        GuardsErgoConfigs.networkFeeRepoAddress
      );
      expect(networkFeeOrder.assets.nativeToken).toEqual(100000n);
      expect(networkFeeOrder.assets.tokens.length).toEqual(1);
      expect(networkFeeOrder.assets.tokens[0].id).toEqual(
        mockedEvent.event.targetChainTokenId
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
     * - mock ChainHandler and `getChainConfigs` function
     * - run test
     * - verify returned value
     * @expected
     * - should generate 5 + 1 + 3 element on order
     *   - 5 + 1 watcher box
     *     - address should be watcher permit contract
     *     - value should be
     *       ((event.amount * fee.feeRatio) / feeRatioDivisor * watchersSharePercent) / 100 / 6 + permit boxValue
     *     - should have exactly one token (RSN) with value
     *       (((event.amount * fee.feeRatio) / feeRatioDivisor * fee.rsnRatio / rsnRatioDivisor) * watchersRSNSharePercent) / 100 / 6
     *     - extra should equal to WID
     *   - bridge fee box
     *     - address should be bridgeFee config address
     *     - value should be remaining bridgeFee + minErg
     *     - should have no token
     *     - extra should equal to paymentTxId
     *   - rsn emission box
     *     - address should be rsn emission config address
     *     - value should be minErg
     *     - should have exactly one token (RSN) with value
     *       of remaining rsnFee
     *     - should have no extra
     *   - network fee box
     *     - address should be networkFee config address
     *     - value should be networkFee + minErg
     *     - should have no token
     *     - should have no extra
     */
    it('should replace bridgeFee on native token payment when it is less than expected value', () => {
      // mock function arguments
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 1000000000n,
        feeRatio: 1000n,
      };
      const paymentTxId = '';
      const mockedEvent = mockNativeTokenPaymentEvent();
      const unmergedWID = {
        wid: TestUtils.generateRandomId(),
        boxValue: 20000000n,
      };

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.event.fromChain, true);
      // mock `getChainConfigs`
      ChainHandlerMock.mockFromChainFunction(
        'getChainConfigs',
        GuardsCardanoConfigs.chainConfigs
      );

      // run test
      const result = EventOrder.eventRewardOrder(
        mockedEvent.event,
        [unmergedWID],
        fee,
        paymentTxId,
        fromChainRwt,
        rwtCount,
        10000000n,
        mockedEvent.WIDs
      );

      // verify returned value
      // verify 5 watcher box
      expect(result.length).toEqual(9);
      result.slice(0, 5).forEach((watcherOrder, index) => {
        expect(watcherOrder.address).toEqual(
          GuardsErgoConfigs.ergoContractConfig.permitAddress
        );
        // ((event.amount * fee.feeRatio) / feeRatioDivisor * watchersSharePercent) / 100 / 6 + permit boxValue
        expect(watcherOrder.assets.nativeToken).toEqual(416666666n + 10000000n);
        expect(watcherOrder.assets.tokens.length).toEqual(2);
        expect(watcherOrder.assets.tokens[0].id).toEqual(fromChainRwt);
        expect(watcherOrder.assets.tokens[0].value).toEqual(rwtCount);
        expect(watcherOrder.assets.tokens[1].id).toEqual(rosenConfig.RSN);
        expect(watcherOrder.assets.tokens[1].value).toEqual(166666n);
        expect(watcherOrder.extra).toEqual(mockedEvent.WIDs[index]);
      });
      // verify 1 watcher box
      const unmergedWatcherOrder = result[5];
      expect(unmergedWatcherOrder.address).toEqual(
        GuardsErgoConfigs.ergoContractConfig.permitAddress
      );
      expect(unmergedWatcherOrder.assets.nativeToken).toEqual(
        416666666n + 20000000n
      );
      expect(unmergedWatcherOrder.assets.tokens.length).toEqual(2);
      expect(unmergedWatcherOrder.assets.tokens[0].id).toEqual(fromChainRwt);
      expect(unmergedWatcherOrder.assets.tokens[0].value).toEqual(rwtCount);
      expect(unmergedWatcherOrder.assets.tokens[1].id).toEqual(rosenConfig.RSN);
      expect(unmergedWatcherOrder.assets.tokens[1].value).toEqual(166666n);
      expect(unmergedWatcherOrder.extra).toEqual(unmergedWID.wid);
      // verify bridge fee box
      const bridgeFeeOrder = result[6];
      expect(bridgeFeeOrder.address).toEqual(
        GuardsErgoConfigs.bridgeFeeRepoAddress
      );
      expect(bridgeFeeOrder.assets.nativeToken).toEqual(2500100004n);
      expect(bridgeFeeOrder.assets.tokens.length).toEqual(0);
      expect(bridgeFeeOrder.extra).toEqual(paymentTxId);
      // verify rsn emission box
      const rsnEmissionOrder = result[7];
      expect(rsnEmissionOrder.address).toEqual(
        GuardsErgoConfigs.rsnEmissionAddress
      );
      expect(rsnEmissionOrder.assets.nativeToken).toEqual(100000n);
      expect(rsnEmissionOrder.assets.tokens.length).toEqual(1);
      expect(rsnEmissionOrder.assets.tokens[0].id).toEqual(rosenConfig.RSN);
      expect(rsnEmissionOrder.assets.tokens[0].value).toEqual(4000004n);
      expect(rsnEmissionOrder.extra).toBeUndefined();
      // verify network fee box
      const networkFeeOrder = result[8];
      expect(networkFeeOrder.address).toEqual(
        GuardsErgoConfigs.networkFeeRepoAddress
      );
      expect(networkFeeOrder.assets.nativeToken).toEqual(1600000n);
      expect(networkFeeOrder.assets.tokens.length).toEqual(0);
      expect(networkFeeOrder.extra).toBeUndefined();
    });

    /**
     * @target EventOrder.eventRewardOrder should not create
     * RSN emission box when no RSN emitted
     * @dependencies
     * - tokenMap
     * @scenario
     * - mock function arguments
     * - mock ChainHandler and `getChainConfigs` function
     * - run test
     * - verify returned value
     * @expected
     * - should generate 5 + 1 + 2 element on order
     *   - 5 + 1 watcher box
     *     - address should be watcher permit contract
     *     - value should be permit box value
     *     - should have exactly one token (RSN) with value
     *       ((event.bridgeFee * fee.rsnRatio / rsnRatioDivisor) * watchersRSNSharePercent) / 100 / 6
     *     - extra should equal to WID
     *   - bridge fee box
     *     - address should be bridgeFee config address
     *     - value should be minErg
     *     - should have exactly one token (targetToken) with value
     *       of remaining bridgeFee
     *     - extra should equal to paymentTxId
     *   - network fee box
     *     - address should be networkFee config address
     *     - value should be minErg
     *     - should have no token
     *     - should have no extra
     */
    it('should not create RSN emission box when no RSN emitted', () => {
      // mock function arguments
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 0n,
      };
      const paymentTxId = '';
      const mockedEvent = mockTokenPaymentEvent();
      const unmergedWID = {
        wid: TestUtils.generateRandomId(),
        boxValue: 2000000000n,
      };

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.event.fromChain, true);
      // mock `getChainConfigs`
      ChainHandlerMock.mockFromChainFunction(
        'getChainConfigs',
        GuardsCardanoConfigs.chainConfigs
      );

      // run test
      const result = EventOrder.eventRewardOrder(
        mockedEvent.event,
        [unmergedWID],
        fee,
        paymentTxId,
        fromChainRwt,
        rwtCount,
        10000000n,
        mockedEvent.WIDs
      );

      // verify returned value
      // verify 5 watcher box
      expect(result.length).toEqual(8);
      result.slice(0, 5).forEach((watcherOrder, index) => {
        expect(watcherOrder.address).toEqual(
          GuardsErgoConfigs.ergoContractConfig.permitAddress
        );
        expect(watcherOrder.assets.nativeToken).toEqual(10000000n);
        expect(watcherOrder.assets.tokens.length).toEqual(2);
        expect(watcherOrder.assets.tokens[0].id).toEqual(fromChainRwt);
        expect(watcherOrder.assets.tokens[0].value).toEqual(rwtCount);
        expect(watcherOrder.assets.tokens[1].id).toEqual(
          mockedEvent.event.targetChainTokenId
        );
        expect(watcherOrder.assets.tokens[1].value).toEqual(833333n);
        expect(watcherOrder.extra).toEqual(mockedEvent.WIDs[index]);
      });
      // verify 1 watcher box
      const unmergedWatcherOrder = result[5];
      expect(unmergedWatcherOrder.address).toEqual(
        GuardsErgoConfigs.ergoContractConfig.permitAddress
      );
      expect(unmergedWatcherOrder.assets.nativeToken).toEqual(2000000000n);
      expect(unmergedWatcherOrder.assets.tokens.length).toEqual(2);
      expect(unmergedWatcherOrder.assets.tokens[0].id).toEqual(fromChainRwt);
      expect(unmergedWatcherOrder.assets.tokens[0].value).toEqual(rwtCount);
      expect(unmergedWatcherOrder.assets.tokens[1].id).toEqual(
        mockedEvent.event.targetChainTokenId
      );
      expect(unmergedWatcherOrder.assets.tokens[1].value).toEqual(833333n);
      expect(unmergedWatcherOrder.extra).toEqual(unmergedWID.wid);
      // verify bridge fee box
      const bridgeFeeOrder = result[6];
      expect(bridgeFeeOrder.address).toEqual(
        GuardsErgoConfigs.bridgeFeeRepoAddress
      );
      expect(bridgeFeeOrder.assets.nativeToken).toEqual(100000n);
      expect(bridgeFeeOrder.assets.tokens.length).toEqual(1);
      expect(bridgeFeeOrder.assets.tokens[0].id).toEqual(
        mockedEvent.event.targetChainTokenId
      );
      expect(bridgeFeeOrder.assets.tokens[0].value).toEqual(5000002n);
      expect(bridgeFeeOrder.extra).toEqual(paymentTxId);
      // verify network fee box
      const networkFeeOrder = result[7];
      expect(networkFeeOrder.address).toEqual(
        GuardsErgoConfigs.networkFeeRepoAddress
      );
      expect(networkFeeOrder.assets.nativeToken).toEqual(100000n);
      expect(networkFeeOrder.assets.tokens.length).toEqual(1);
      expect(networkFeeOrder.assets.tokens[0].id).toEqual(
        mockedEvent.event.targetChainTokenId
      );
      expect(networkFeeOrder.assets.tokens[0].value).toEqual(15000n);
      expect(networkFeeOrder.extra).toBeUndefined();
    });
  });
});
