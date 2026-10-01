import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import {
  AbstractChain,
  ConfirmationStatus,
  EventTrigger,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import TxAgreement from '../../src/agreement/txAgreement';
import { DatabaseAction } from '../../src/db/databaseAction';
import EventBoxes from '../../src/event/eventBoxes';
import EventOrder from '../../src/event/eventOrder';
import EventProcessor from '../../src/event/eventProcessor';
import EventSerializer from '../../src/event/eventSerializer';
import ChainHandler from '../../src/handlers/chainHandler';
import MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import { getTxDataHash } from '../../src/transaction/transactionSerializer';
import GuardTurn from '../../src/utils/guardTurn';
import RequestVerifier from '../../src/verification/requestVerifier';
import TransactionVerifier from '../../src/verification/transactionVerifier';
import { mockPaymentTransaction } from '../agreement/testData';
import TestTxAgreement from '../agreement/testTxAgreement';
import {
  insertNamespaceEvent,
  namespaceEvent,
} from '../db/bitcoinCashNamespaceFixtures';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { chainHandlerInstance } from '../handlers/chainHandler.mock';
import TestEventSynchronization from '../synchronization/testEventSynchronization';

class NamespaceProcessor extends EventProcessor {
  static payment = (event: EventTrigger, trigger: string) =>
    this.createEventPayment(event, trigger, {} as ChainMinimumFee);
  static reward = (event: EventTrigger, trigger: string) =>
    this.createEventRewardDistribution(
      event,
      trigger,
      {} as ChainMinimumFee,
      'actual-payment-id',
    );
}

describe('BCH guard identity consumers', () => {
  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
    vi.spyOn(ChainHandler, 'getInstance').mockReturnValue(
      chainHandlerInstance as unknown as ChainHandler,
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it('resolves the BCH request to BCH despite the colliding BTC request ID', async () => {
    await insertNamespaceEvent(
      namespaceEvent('bitcoin', { toChain: 'cardano' }),
      'btc-trigger',
    );
    const bch = await insertNamespaceEvent(
      namespaceEvent('bitcoin-cash', { toChain: 'cardano' }),
      'bch-trigger',
    );
    const verify = vi
      .spyOn(TransactionVerifier, 'verifyEventTransaction')
      .mockImplementation(
        async (_tx, event) => event.fromChain === 'bitcoin-cash',
      );
    const tx = mockPaymentTransaction(
      TransactionType.payment,
      'cardano',
      EventSerializer.getId(bch),
    );
    expect(await RequestVerifier.verifyEventTransactionRequest(tx)).toBe(true);
    expect(verify).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ fromChain: 'bitcoin-cash' }),
      bch.txId,
    );
    tx.eventId = bch.eventId;
    expect(await RequestVerifier.verifyEventTransactionRequest(tx)).toBe(false);
  });

  it('keeps BCH agreement separate from a BTC agreement and rejects a competing BCH envelope', async () => {
    const bitcoin = await insertNamespaceEvent(
      namespaceEvent('bitcoin', { toChain: 'cardano' }),
      'btc-trigger',
    );
    const bch = await insertNamespaceEvent(
      namespaceEvent('bitcoin-cash', { toChain: 'cardano' }),
      'bch-trigger',
    );
    vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(1);
    vi.spyOn(TransactionVerifier, 'verifyTxCommonConditions').mockResolvedValue(
      true,
    );
    vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
      true,
    );
    const agreement = new TestTxAgreement();
    agreement.insertEventAgreedTransactions(
      EventSerializer.getId(bitcoin),
      'btc-existing-agreement',
    );
    const tx = mockPaymentTransaction(
      TransactionType.payment,
      'cardano',
      EventSerializer.getId(bch),
    );
    expect(await agreement.callVerifyTransactionRequest(tx, 1)).toBe(true);
    expect(
      agreement.getEventAgreedTransactions().get(EventSerializer.getId(bch)),
    ).toBe(getTxDataHash(tx));
    expect(
      agreement
        .getEventAgreedTransactions()
        .get(EventSerializer.getId(bitcoin)),
    ).toBe('btc-existing-agreement');
    expect(
      await agreement.callVerifyTransactionRequest(
        mockPaymentTransaction(
          TransactionType.payment,
          'cardano',
          EventSerializer.getId(bch),
        ),
        1,
      ),
    ).toBe(false);
  });

  it('uses BCH guard identity for sync activation and selected event verification', async () => {
    const bitcoin = await insertNamespaceEvent(
      namespaceEvent('bitcoin', { toChain: 'cardano' }),
      'btc-trigger',
    );
    const bch = await insertNamespaceEvent(
      namespaceEvent('bitcoin-cash', { toChain: 'cardano' }),
      'bch-trigger',
    );
    const sync = new TestEventSynchronization();
    sync.insertEventIntoActiveSync(EventSerializer.getId(bitcoin), {
      timestamp: 1,
      responses: [],
    });
    const tx = mockPaymentTransaction(
      TransactionType.payment,
      'cardano',
      EventSerializer.getId(bch),
    );
    expect(await sync.callVerifySynchronizationResponse(tx, 'actual-id')).toBe(
      false,
    );
    sync.insertEventIntoActiveSync(EventSerializer.getId(bch), {
      timestamp: 1,
      responses: [],
    });
    vi.spyOn(chainHandlerInstance, 'getChain').mockReturnValue({
      verifyPaymentTransaction: async () => true,
      extractTransactionOrder: () => [],
      getTxConfirmationStatus: async () => ConfirmationStatus.ConfirmedEnough,
      verifyTransactionExtraConditions: () => true,
    } as unknown as AbstractChain<unknown>);
    vi.spyOn(MinimumFeeHandler, 'getEventFeeConfig').mockReturnValue(
      {} as ChainMinimumFee,
    );
    const order = vi
      .spyOn(EventOrder, 'createEventPaymentOrder')
      .mockResolvedValue([]);
    expect(await sync.callVerifySynchronizationResponse(tx, 'actual-id')).toBe(
      true,
    );
    expect(order).toHaveBeenCalledWith(
      expect.objectContaining({ fromChain: 'bitcoin-cash' }),
      bch.txId,
      {},
      [],
    );
  });

  it.each([TransactionType.payment, TransactionType.reward])(
    'propagates the BCH guard ID through the actual %s creation boundary',
    async (type) => {
      const event = namespaceEvent('bitcoin-cash', { toChain: 'cardano' });
      const generate = vi.fn(
        async (eventId: string, txType: TransactionType) =>
          new PaymentTransaction(
            type === TransactionType.reward ? 'ergo' : 'cardano',
            'generated-tx',
            eventId,
            Buffer.from('bytes'),
            txType,
          ),
      );
      const chain = {
        generateTransaction: generate,
        getBoxRWT: () => 2n,
        getGuardsConfigBox: async () => 'guards-config',
      };
      vi.spyOn(chainHandlerInstance, 'getChain').mockReturnValue(
        chain as unknown as AbstractChain<unknown>,
      );
      vi.spyOn(chainHandlerInstance, 'getErgoChain').mockReturnValue(
        chain as unknown as ReturnType<ChainHandler['getErgoChain']>,
      );
      vi.spyOn(TxAgreement, 'getInstance').mockResolvedValue({
        getChainPendingTransactions: () => [],
      } as unknown as TxAgreement);
      vi.spyOn(EventOrder, 'createEventPaymentOrder').mockResolvedValue([]);
      vi.spyOn(EventOrder, 'createEventRewardOrder').mockResolvedValue([]);
      vi.spyOn(EventBoxes, 'getEventBox').mockResolvedValue(
        'unchanged-event-box',
      );
      vi.spyOn(EventBoxes, 'getEventWIDs').mockResolvedValue(['ab'.repeat(32)]);
      vi.spyOn(EventBoxes, 'getEventValidCommitments').mockResolvedValue([]);
      const tx =
        type === TransactionType.payment
          ? await NamespaceProcessor.payment(event, 'bch-trigger')
          : await NamespaceProcessor.reward(event, 'bch-trigger');
      expect(tx.eventId).toBe(EventSerializer.getId(event));
      expect(generate.mock.calls[0][0]).toBe(EventSerializer.getId(event));
      expect(generate.mock.calls[0][1]).toBe(type);
      expect(
        await DatabaseAction.getInstance().getEventById(event.sourceTxId),
      ).toBeNull();
    },
  );
});
