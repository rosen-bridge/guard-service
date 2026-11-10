import {
  binToHex,
  encodeTransactionBCH,
  hashTransaction,
  hexToBin,
} from '@bitauth/libauth';

import { TransactionType } from '@rosen-chains/abstract-chain';
import { BitcoinCashTransaction } from '@rosen-chains/bitcoin-cash';

import { assertBitcoinCashDatabaseCompatible } from '../../src/db/bitcoinCashState';
import DatabaseActionMock from './mocked/databaseAction.mock';

/** Build an authenticated native transaction fixture with the requested event identity. */
export const transaction = (eventId = '') => {
  const script = '76a914751e76e8199196d454941c45d1b3a323f1433bd688ac';
  const input = {
    outpointTransactionHash: new Uint8Array(32).fill(1),
    outpointIndex: 0,
    sequenceNumber: 0xffffffff,
    unlockingBytecode: new Uint8Array(),
  };
  const parent = encodeTransactionBCH({
    version: 2,
    locktime: 0,
    inputs: [input],
    outputs: [{ lockingBytecode: hexToBin(script), valueSatoshis: 50_000n }],
  });
  const prevout = {
    txId: hashTransaction(parent),
    index: 0,
    value: 50_000n,
    scriptPubKey: script,
    parentTransactionHex: binToHex(parent),
  };
  const bytes = encodeTransactionBCH({
    version: 2,
    locktime: 0,
    inputs: [{ ...input, outpointTransactionHash: hexToBin(prevout.txId) }],
    outputs: [{ lockingBytecode: hexToBin(script), valueSatoshis: 49_000n }],
  });
  return new BitcoinCashTransaction(
    eventId,
    bytes,
    TransactionType.payment,
    [prevout],
    '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  );
};
/** Run the compatibility check against the migrated fixture database. */
export const check = () =>
  assertBitcoinCashDatabaseCompatible(DatabaseActionMock.testDataSource, true);
