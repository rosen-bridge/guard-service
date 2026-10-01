import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { DataSource } from '@rosen-bridge/extended-typeorm';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  ConfirmationStatus,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import {
  BitcoinCashChain,
  BitcoinCashTransaction,
} from '@rosen-chains/bitcoin-cash';
import { BitcoinCashRpcNetwork } from '@rosen-chains/bitcoin-cash-rpc';

import { DatabaseAction } from '../../src/db/databaseAction';
import { TransactionStatus } from '../../src/utils/constants';
import { bchPublicKey, bchLock, bchCold } from '../configs/bitcoinCashFixtures';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';

const receiptPath = process.env.ROSEN_BCH_NATIVE_RECEIPT;
const databasePath = process.env.ROSEN_BCH_PERSIST_DATABASE;
const phase = process.env.ROSEN_BCH_PERSIST_PHASE;
const root = process.env.ROSEN_BCH_RUNTIME_ROOT;

describe.skipIf(!receiptPath || !databasePath || !root || !phase)(
  'native BCH persisted identity',
  () => {
    it('restores the approval and signed identity through the real migrated guard database', async () => {
      const receipt = JSON.parse(readFileSync(receiptPath!, 'utf8'));
      const baseOptions = DatabaseActionMock.testDataSource.options;
      if (baseOptions.type !== 'sqlite') throw Error('SQLite fixture required');
      const options = {
        ...baseOptions,
        type: 'sqlite' as const,
        database: databasePath!,
      };
      const source = new DataSource(options);
      await source.initialize();
      try {
        await source.runMigrations();
        const action = DatabaseAction.init(source);
        if (phase === 'write') {
          const unsigned = BitcoinCashTransaction.fromJson(
            receipt.unsignedJson,
          );
          await action.TransactionRepository.insert({
            txId: unsigned.txId,
            txJson: unsigned.toJson(),
            type: unsigned.txType,
            chain: unsigned.network,
            status: TransactionStatus.approved,
            lastCheck: 0,
            event: null,
            order: null,
            failedInSign: false,
            signFailedCount: 0,
            requiredSign: 1,
          });
          await action.updateWithSignedTx(unsigned.txId, receipt.signedJson);
        } else expect(phase).toBe('read');
        const row = await action.getTxById(receipt.approvalId);
        expect(row).not.toBeNull();
        expect(row!.status).toBe(TransactionStatus.signed);
        expect(row!.txId).toBe(receipt.approvalId);
        expect(row!.txJson).toBe(receipt.signedJson);
        const cookie = readFileSync(
          join(root!, 'runtime/regtest-node-v2910/regtest/.cookie'),
          'utf8',
        ).trim();
        const separator = cookie.indexOf(':');
        expect(separator).toBeGreaterThan(0);
        const network = new BitcoinCashRpcNetwork({
          url: 'http://127.0.0.1:29947',
          expectedChain: 'regtest',
          auth: {
            username: cookie.slice(0, separator),
            password: cookie.slice(separator + 1),
          },
        });
        const tokens = new TokenMap();
        await tokens.updateConfigByJson([
          {
            'bitcoin-cash': {
              tokenId: 'bch',
              name: 'BCH',
              decimals: 8,
              type: 'native',
              residency: 'native',
              extra: {},
            },
            ergo: {
              tokenId: 'bb'.repeat(32),
              name: 'rsBCH',
              decimals: 6,
              type: 'wrapped',
              residency: 'wrapped',
              extra: {},
            },
          },
        ]);
        const chain = new BitcoinCashChain(
          network,
          {
            aggregatedPublicKey: bchPublicKey,
            feeRate: 1,
            maxFee: 100_000n,
            minimumUtxoValue: 546n,
            maxUtxoPages: 2,
            fee: 0n,
            confirmations: {
              observation: 1,
              payment: 1,
              cold: 1,
              manual: 1,
              arbitrary: 1,
            },
            addresses: { lock: bchLock, cold: bchCold, permit: '', fraud: '' },
            rwtId: '',
          },
          tokens,
          {
            isInSign: async () => false,
            sign: async () => {
              throw Error('Persistence check must not sign');
            },
          },
        );
        const serializer = await vi.importActual<
          typeof import('../../src/transaction/transactionSerializer')
        >('../../src/transaction/transactionSerializer');
        const restored = serializer.fromJson(row!.txJson, (name) => {
          expect(name).toBe('bitcoin-cash');
          return chain;
        });
        expect(restored.txId).toBe(row!.txId);
        expect(await chain.getActualTxId(row!.txId, restored)).toBe(
          receipt.actualId,
        );
        expect(
          await chain.getTxConfirmationStatus(
            row!.txId,
            TransactionType.payment,
            restored,
          ),
        ).toBe(ConfirmationStatus.ConfirmedEnough);
        expect(await chain.isTxInMempool(row!.txId, restored)).toBe(false);
        const dbEvidence = {
          schema: 'rosen-bch-guard-persistence-v1',
          phase,
          approvalId: row!.txId,
          actualId: receipt.actualId,
          signedJsonHash: createHash('sha256')
            .update(row!.txJson)
            .digest('hex'),
          migrations: source.migrations.map((migration) => migration.name),
          checks: [
            'actual-guard-migrations',
            'actual-transaction-entity',
            'signed-json-update-preserves-approval-id',
            'production-serializer-dispatch',
            'network-confirmation-from-restored-envelope',
          ],
          peers: 0,
        };
        writeFileSync(
          join(
            root!,
            'artifacts/native-runtime',
            `guard-persistence-${phase}-${Date.now()}.json`,
          ),
          JSON.stringify(dbEvidence, null, 2) + '\n',
        );
      } finally {
        await source.destroy();
      }
    }, 30_000);
  },
);
