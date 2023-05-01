import TestUtils from '../../tests/testUtils/TestUtils';
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
