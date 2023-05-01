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
     * on native token payment when they are less than minimum config
     * @dependencies
     * - tokenMap
     * @scenario
     * - mock function arguments
     * - run test
     * - verify returned value
     * @expected
     * - address should be event toAddress
     * - value should be
     *   event.amount - fee.bridgeFee - fee.networkFee + chainMinTransfer
     * - should not contain any tokens
     * - should not have extra
     */
    it('should replace native fees on token payment when they are less than minimum config', async () => {
      // mock function arguments
      const chainMinTransfer = 100n;
      const fee: Fee = {
        bridgeFee: 2000000000n,
        networkFee: 3000000n,
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
          BigInt(fee.bridgeFee) -
          BigInt(fee.networkFee) +
          chainMinTransfer
      );
      expect(result.assets.tokens.length).toEqual(0);
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

    /**
     * @target EventOrder.eventSinglePayment should replace bridgeFee
     * on token payment when it is less than expected value
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
     *   with value event.amount - (event.amount * fee.feeRatio) / feeRatioDivisor - event.networkFee +
     * - should not have extra
     */
    it('should replace bridgeFee on token payment when it is less than expected value', async () => {
      // mock function arguments
      const chainMinTransfer = 100n;
      const fee: Fee = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 1000n,
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
          (BigInt(mockedEvent.amount) * fee.feeRatio) /
            MinimumFee.bridgeMinimumFee.feeRatioDivisor -
          BigInt(mockedEvent.networkFee)
      );
      expect(result.extra).toBeUndefined();
    });
  });
});
