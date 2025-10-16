import TestUtils from '../testUtils/testUtils';
import { TestEventTrigger, createEventTrigger } from './eventTestUtils';

export const rsnRatioDivisor = 1000000000000n;
export const feeRatioDivisor = 10000n;

export const mockEventTrigger = (): TestEventTrigger =>
  createEventTrigger(
    200,
    'fromChain',
    'toChain',
    'fromAddress',
    'toAddress',
    '50000000000',
    '1000000000',
    '1500000',
    'sourceToken',
    'targetToken',
    TestUtils.generateRandomId(),
    '',
    10000,
  );

export const mockToErgoEventTrigger = (): TestEventTrigger =>
  createEventTrigger(
    200,
    'fromChain',
    'ergo',
    'fromAddress',
    'toAddress',
    '50000000000',
    '1000000000',
    '1500000',
    'sourceToken',
    'targetToken',
    TestUtils.generateRandomId(),
    '',
    10000,
  );

export const mockFromErgoEventTrigger = (): TestEventTrigger =>
  createEventTrigger(
    200,
    'ergo',
    'toChain',
    'fromAddress',
    'toAddress',
    '50000000000',
    '1000000000',
    '1500000',
    'sourceToken',
    'targetToken',
    TestUtils.generateRandomId(),
    '',
    10000,
  );

export const mockEventWithAmount = (amount: string): TestEventTrigger =>
  createEventTrigger(
    200,
    'ergo',
    'toChain',
    'fromAddress',
    'toAddress',
    amount,
    '1000000000',
    '1500000',
    'sourceToken',
    'targetToken',
    TestUtils.generateRandomId(),
    '',
    10000,
  );

export const mockNativeTokenPaymentEvent = (): TestEventTrigger =>
  createEventTrigger(
    200,
    'cardano',
    'ergo',
    'fromAddress',
    'toAddress',
    '50000000000',
    '1000000000',
    '1500000',
    'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
    'erg',
    TestUtils.generateRandomId(),
    '',
    10000,
  );

export const mockTokenPaymentEvent = (): TestEventTrigger =>
  createEventTrigger(
    200,
    'cardano',
    'ergo',
    'fromAddress',
    'toAddress',
    '500000000',
    '10000000',
    '15000',
    'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59',
    'b37bfa41c2d9e61b4e478ddfc459a03d25b658a2305ffb428fbc47ad6abbeeaa',
    TestUtils.generateRandomId(),
    '',
    10000,
  );

export const mockTokenPaymentFromErgoEvent = (): TestEventTrigger =>
  createEventTrigger(
    200,
    'ergo',
    'cardano',
    'fromAddress',
    'toAddress',
    '500000000',
    '10000000',
    '15000',
    '0cd8c9f416e5b1ca9f986a7f10a84191dfb85941619e49e53c0dc30ebf83324b',
    'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
    TestUtils.generateRandomId(),
    '',
    10000,
  );
