import TestUtils from '../testUtils/TestUtils';
import { EventTrigger } from '@rosen-chains/abstract-chain';
import { createEventTrigger } from './eventTestUtils';

export const mockEventTrigger = (): EventTrigger =>
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
    Array(5)
      .fill(0)
      .map(() => TestUtils.generateRandomId())
  );

export const mockToErgoEventTrigger = (): EventTrigger =>
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
    Array(5)
      .fill(0)
      .map(() => TestUtils.generateRandomId())
  );

export const mockNativeTokenPaymentEvent = (): EventTrigger =>
  createEventTrigger(
    200,
    'cardano',
    'ergo',
    'fromAddress',
    'toAddress',
    '50000000000',
    '1000000000',
    '1500000',
    'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
    'erg',
    TestUtils.generateRandomId(),
    '',
    10000,
    Array(5)
      .fill(0)
      .map(() => TestUtils.generateRandomId())
  );

export const mockTokenPaymentEvent = (): EventTrigger =>
  createEventTrigger(
    200,
    'cardano',
    'ergo',
    'fromAddress',
    'toAddress',
    '500000000',
    '10000000',
    '15000',
    'asset17q7r59zlc3dgw0venc80pdv566q6yguw03f0d9',
    'b37bfa41c2d9e61b4e478ddfc459a03d25b658a2305ffb428fbc47ad6abbeeaa',
    TestUtils.generateRandomId(),
    '',
    10000,
    Array(5)
      .fill(0)
      .map(() => TestUtils.generateRandomId())
  );
