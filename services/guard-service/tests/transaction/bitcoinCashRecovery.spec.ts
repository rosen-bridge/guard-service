import {
  binToHex,
  encodeTransactionBCH,
  hashTransaction,
  hexToBin,
  secp256k1,
} from '@bitauth/libauth';

import { TokenMap } from '@rosen-bridge/tokens';
import {
  ConfirmationStatus,
  SigningStatus,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { BitcoinCashChain } from '@rosen-chains/bitcoin-cash';

import { DatabaseAction } from '../../src/db/databaseAction';
import EventSerializer from '../../src/event/eventSerializer';
import ChainHandler from '../../src/handlers/chainHandler';
import TransactionProcessor from '../../src/transaction/transactionProcessor';
import * as TransactionSerializer from '../../src/transaction/transactionSerializer';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import { bchPublicKey, bchLock, bchCold } from '../configs/bitcoinCashFixtures';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { mockCreateEventPaymentOrder } from '../event/mocked/eventOrder.mock';
import { mockGetEventFeeConfig } from '../event/mocked/minimumFee.mock';
import * as EventTestData from '../event/testData';
import { chainHandlerInstance } from '../handlers/chainHandler.mock';
import TestEventSynchronization from '../synchronization/testEventSynchronization';

const setup = async () => {
  await DatabaseActionMock.clearTables();
  const event = EventTestData.mockEventTrigger().event;
  event.toChain = 'bitcoin-cash';
  const eventId = EventSerializer.getId(event);
  await DatabaseActionMock.insertEventRecord(event, EventStatus.pendingPayment);
  const script = '76a914751e76e8199196d454941c45d1b3a323f1433bd688ac';
  const parent = encodeTransactionBCH({
    version: 2,
    locktime: 0,
    inputs: [
      {
        outpointTransactionHash: new Uint8Array(32).fill(1),
        outpointIndex: 0,
        sequenceNumber: 0xffffffff,
        unlockingBytecode: new Uint8Array(),
      },
    ],
    outputs: [{ lockingBytecode: hexToBin(script), valueSatoshis: 50_000n }],
  });
  const box = {
    txId: hashTransaction(parent),
    index: 0,
    value: 50_000n,
    scriptPubKey: script,
    parentTransactionHex: binToHex(parent),
    coinbase: false,
    confirmations: 1,
  };
  const network = {
    getAddressBoxes: vi.fn(
      async (_address: string, offset: number, limit: number) =>
        [box].slice(offset, offset + limit),
    ),
    getUtxo: vi.fn(async () => box),
    getPrevout: vi.fn(async () => box),
    getHeight: vi.fn(async () => 10),
    isBoxUnspentAndValid: vi.fn(async () => true),
    findSignedTransaction: vi.fn<() => Promise<Uint8Array | undefined>>(
      async () => undefined,
    ),
    getTxConfirmation: vi.fn(async () => 1),
    isTxInMempool: vi.fn(async () => false),
  };
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
    network as never,
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
      sign: async (digest) => ({
        signature: binToHex(
          secp256k1.signMessageHashCompact(
            hexToBin('00'.repeat(31) + '01'),
            digest,
          ) as Uint8Array,
        ),
        signatureRecovery: '0',
      }),
    },
  );
  const generated = await chain.generateTransaction(
    eventId,
    TransactionType.payment,
    [{ address: bchCold, assets: { nativeToken: 100n, tokens: [] } }],
    [],
    [],
  );
  const unsigned = chain.PaymentTransactionFromJson(generated.toJson());
  const signed = chain.PaymentTransactionFromJson(
    (await chain.signTransaction(unsigned)).toJson(),
  );
  network.findSignedTransaction.mockResolvedValue(signed.txBytes);
  vi.spyOn(ChainHandler, 'getInstance').mockReturnValue(
    chainHandlerInstance as unknown as ChainHandler,
  );
  vi.spyOn(chainHandlerInstance, 'getChain').mockImplementation(
    () => chain as never,
  );
  const actualSerializer = await vi.importActual<typeof TransactionSerializer>(
    '../../src/transaction/transactionSerializer',
  );
  vi.spyOn(TransactionSerializer, 'fromJson').mockImplementation(
    actualSerializer.fromJson,
  );
  return {
    chain,
    network,
    unsigned,
    signed,
    eventId,
    action: DatabaseAction.getInstance(),
  };
};

describe('BCH recovery persists the signed envelope', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([TransactionStatus.signFailed, TransactionStatus.sent])(
    'materializes a recovered %s row before completion and remote synchronization',
    async (status) => {
      const { chain, unsigned, signed, eventId, action } = await setup();
      await DatabaseActionMock.insertTxRecord(unsigned, status);
      let row = (await action.getTxById(unsigned.txId))!;
      if (status === TransactionStatus.signFailed) {
        await TransactionProcessor.processSignFailedTx(row);
        row = (await action.getTxById(unsigned.txId))!;
        expect(row.status).toBe(TransactionStatus.sent);
        expect(row.txJson).toBe(signed.toJson());
      }
      await TransactionProcessor.processSentTx(row);
      row = (await action.getTxById(unsigned.txId))!;
      expect(row.status).toBe(TransactionStatus.completed);
      expect(row.txId).toBe(unsigned.txId);
      expect(row.txJson).toBe(signed.toJson());
      const restored = chain.PaymentTransactionFromJson(row.txJson);
      expect(
        chain.verifyTransactionExtraConditions(restored, SigningStatus.Signed),
      ).toBe(true);
      mockGetEventFeeConfig({
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 100n,
        rsnRatioDivisor: 1000000000000n,
        feeRatioDivisor: 10000n,
      });
      mockCreateEventPaymentOrder(chain.extractTransactionOrder(unsigned));
      const sync = new TestEventSynchronization();
      sync.insertEventIntoActiveSync(eventId, {
        timestamp: Date.now() / 1000,
        responses: [],
      });
      expect(
        await sync.callVerifySynchronizationResponse(
          restored,
          signed.getActualTxId()!,
        ),
      ).toBe(true);
    },
  );

  it('persists an unconfirmed recovered signature before advancing sign-failed state', async () => {
    const { network, unsigned, signed, action } = await setup();
    network.getTxConfirmation.mockResolvedValue(-1);
    network.isTxInMempool.mockResolvedValue(true);
    await DatabaseActionMock.insertTxRecord(
      unsigned,
      TransactionStatus.signFailed,
    );
    await TransactionProcessor.processSignFailedTx(
      (await action.getTxById(unsigned.txId))!,
    );
    const row = (await action.getTxById(unsigned.txId))!;
    expect(row.status).toBe(TransactionStatus.sent);
    expect(row.txJson).toBe(signed.toJson());
  });

  it('keeps an already signed sent envelope without a wallet-history scan or rewrite', async () => {
    const { network, signed, action } = await setup();
    await DatabaseActionMock.insertTxRecord(signed, TransactionStatus.sent);
    const update = vi.spyOn(action, 'updateWithSignedTx');
    await TransactionProcessor.processSentTx(
      (await action.getTxById(signed.txId))!,
    );
    expect(update).not.toHaveBeenCalled();
    expect(network.findSignedTransaction).not.toHaveBeenCalled();
    expect((await action.getTxById(signed.txId))!.txJson).toBe(signed.toJson());
  });

  it.each([0, -1])(
    'preserves sent state while persisting unconfirmed bytes (confirmations %s)',
    async (confirmation) => {
      const { network, unsigned, signed, action } = await setup();
      network.getTxConfirmation.mockResolvedValue(confirmation);
      network.isTxInMempool.mockResolvedValue(true);
      await DatabaseActionMock.insertTxRecord(unsigned, TransactionStatus.sent);
      await TransactionProcessor.processSentTx(
        (await action.getTxById(unsigned.txId))!,
      );
      const row = (await action.getTxById(unsigned.txId))!;
      expect(row.status).toBe(TransactionStatus.sent);
      expect(row.txJson).toBe(signed.toJson());
    },
  );

  it('resumes after interruption between signed-byte persistence and sent-state advancement', async () => {
    const { network, unsigned, signed, action } = await setup();
    await DatabaseActionMock.insertTxRecord(
      unsigned,
      TransactionStatus.signFailed,
    );
    const status = vi
      .spyOn(action, 'setTxStatus')
      .mockRejectedValueOnce(Error('Synthetic interruption'));
    await expect(
      TransactionProcessor.processSignFailedTx(
        (await action.getTxById(unsigned.txId))!,
      ),
    ).rejects.toThrow('Synthetic interruption');
    const retained = (await action.getTxById(unsigned.txId))!;
    expect(retained.status).toBe(TransactionStatus.signFailed);
    expect(retained.txJson).toBe(signed.toJson());
    network.findSignedTransaction.mockClear();
    status.mockRestore();
    await TransactionProcessor.processSignFailedTx(retained);
    expect((await action.getTxById(unsigned.txId))!.status).toBe(
      TransactionStatus.sent,
    );
    expect(network.findSignedTransaction).not.toHaveBeenCalled();
  });

  it.each([
    'missing',
    'bad-signature',
    'wrong-event',
    'wrong-type',
    'wrong-chain',
    'wrong-approval',
    'database',
  ])(
    'does not advance the row when recovered materialization fails: %s',
    async (fault) => {
      const { chain, unsigned, signed, action } = await setup();
      await DatabaseActionMock.insertTxRecord(
        unsigned,
        TransactionStatus.signFailed,
      );
      const candidate = chain.PaymentTransactionFromJson(signed.toJson());
      if (fault === 'wrong-event') candidate.eventId = 'different-event';
      if (fault === 'wrong-type') candidate.txType = TransactionType.manual;
      if (fault === 'wrong-chain') candidate.network = 'bitcoin';
      if (fault === 'wrong-approval') candidate.txId = '11'.repeat(32);
      vi.spyOn(chain, 'getRecoveredTransaction').mockResolvedValue(
        fault === 'missing'
          ? undefined
          : fault === 'bad-signature'
            ? unsigned
            : candidate,
      );
      // Keep observed inclusion fixed so this isolates persistence materialization.
      vi.spyOn(chain, 'getTxConfirmationStatus').mockResolvedValue(
        ConfirmationStatus.ConfirmedEnough,
      );
      if (fault === 'database')
        vi.spyOn(action, 'updateWithSignedTx').mockRejectedValue(
          Error('Synthetic database failure'),
        );
      await expect(
        TransactionProcessor.processSignFailedTx(
          (await action.getTxById(unsigned.txId))!,
        ),
      ).rejects.toThrow();
      const row = (await action.getTxById(unsigned.txId))!;
      expect(row.status).toBe(TransactionStatus.signFailed);
      expect(row.txJson).toBe(unsigned.toJson());
    },
  );
});
