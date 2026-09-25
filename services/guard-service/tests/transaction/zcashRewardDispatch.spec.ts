import { TransactionType } from '@rosen-chains/abstract-chain';
import { ERGO_CHAIN } from '@rosen-chains/ergo';

import { DatabaseAction } from '../../src/db/databaseAction';
import EventSerializer from '../../src/event/eventSerializer';
import TransactionProcessor from '../../src/transaction/transactionProcessor';
import { ZcashRewardEligibility } from '../../src/transaction/zcashRewardEligibility';
import {
  EventStatus,
  OrderStatus,
  TransactionStatus,
} from '../../src/utils/constants';
import { mockErgoPaymentTransaction } from '../agreement/testData';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import * as EventTestData from '../event/testData';
import ChainHandlerMock, {
  chainHandlerInstance,
} from '../handlers/chainHandler.mock';

const eligibility = {
  isRequired: vi.fn(),
  capture: vi.fn(),
  assertCurrent: vi.fn(),
  assertPolicyCurrent: vi.fn(),
};

const fixture = async () => {
  const event = EventTestData.mockEventTrigger().event;
  event.toChain = 'zcash';
  const eventId = EventSerializer.getId(event);
  await DatabaseActionMock.insertEventRecord(event, EventStatus.pendingReward);
  const reward = mockErgoPaymentTransaction(TransactionType.reward, eventId);
  await DatabaseActionMock.insertTxRecord(reward, TransactionStatus.signed);
  ChainHandlerMock.mockChainFunction(
    ERGO_CHAIN,
    'submitTransaction',
    undefined,
    true,
  );
  eligibility.isRequired.mockResolvedValue(true);
  eligibility.capture.mockResolvedValue({
    paymentTxId: 'payment',
    assertCurrent: eligibility.assertCurrent,
    assertPolicyCurrent: eligibility.assertPolicyCurrent,
  });
  return {
    reward,
    submit: ChainHandlerMock.getChainMockedFunction(
      ERGO_CHAIN,
      'submitTransaction',
    ),
  };
};

describe('Zcash-linked reward dispatch custody', () => {
  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
    ChainHandlerMock.resetMock();
    for (const mock of Object.values(eligibility)) mock.mockReset();
    eligibility.assertCurrent.mockResolvedValue(undefined);
    vi.spyOn(ZcashRewardEligibility, 'isRequired').mockImplementation(
      eligibility.isRequired,
    );
    vi.spyOn(ZcashRewardEligibility.prototype, 'capture').mockImplementation(
      eligibility.capture,
    );
    vi.spyOn(
      chainHandlerInstance,
      'getZcashBroadcastCapability',
    ).mockReturnValue({
      validate: vi.fn(),
      observe: vi.fn(),
      submit: vi.fn(),
      policy: () => ({
        network: 'testnet',
        genesisHash: 'aa'.repeat(32),
        sourceId: 'dispatch-test',
        requiredConfirmations: 2,
        maximumAgeMs: 60_000,
      }),
    });
  });

  afterEach(() => {
    vi.mocked(ZcashRewardEligibility.isRequired).mockRestore();
    vi.mocked(ZcashRewardEligibility.prototype.capture).mockRestore();
    vi.mocked(chainHandlerInstance.getZcashBroadcastCapability).mockRestore();
  });

  it.each([
    ['txJson', { txJson: 'changed' }],
    ['chain', { chain: 'cardano' }],
    ['type', { type: TransactionType.payment }],
    ['threshold', { requiredSign: 99 }],
    ['approval', { approvalEvidence: 'changed' }],
    ['attempt', { signingAttemptId: 'changed' }],
    ['event', { event: null }],
  ] as const)(
    'rejects %s drift while eligibility is captured',
    async (_, update) => {
      const f = await fixture();
      eligibility.capture.mockImplementationOnce(async () => {
        await DatabaseAction.getInstance().TransactionRepository.update(
          { txId: f.reward.txId },
          update,
        );
        return {
          paymentTxId: 'payment',
          assertCurrent: eligibility.assertCurrent,
          assertPolicyCurrent: eligibility.assertPolicyCurrent,
        };
      });
      await expect(
        TransactionProcessor.processSignedTx(
          (await DatabaseAction.getInstance().getTxById(f.reward.txId))!,
        ),
      ).rejects.toThrow(/custody changed/);
      expect(f.submit).not.toHaveBeenCalled();
    },
  );

  it('rejects a newly attached valid order relation', async () => {
    const f = await fixture();
    eligibility.capture.mockImplementationOnce(async () => {
      const orderId = '77'.repeat(32);
      await DatabaseActionMock.insertOrderRecord(
        orderId,
        ERGO_CHAIN,
        '{}',
        OrderStatus.pending,
      );
      const order =
        await DatabaseAction.getInstance().ArbitraryRepository.findOneByOrFail({
          id: orderId,
        });
      await DatabaseAction.getInstance().TransactionRepository.update(
        { txId: f.reward.txId },
        { order },
      );
      return {
        paymentTxId: 'payment',
        assertCurrent: eligibility.assertCurrent,
        assertPolicyCurrent: eligibility.assertPolicyCurrent,
      };
    });
    await expect(
      TransactionProcessor.processSignedTx(
        (await DatabaseAction.getInstance().getTxById(f.reward.txId))!,
      ),
    ).rejects.toThrow(/custody changed/);
    expect(f.submit).not.toHaveBeenCalled();
  });

  it('rejects when the retained transaction id changes during capture', async () => {
    const f = await fixture();
    eligibility.capture.mockImplementationOnce(async () => {
      await DatabaseAction.getInstance().TransactionRepository.update(
        { txId: f.reward.txId },
        { txId: '99'.repeat(32) },
      );
      return {
        paymentTxId: 'payment',
        assertCurrent: eligibility.assertCurrent,
        assertPolicyCurrent: eligibility.assertPolicyCurrent,
      };
    });
    await expect(
      TransactionProcessor.processSignedTx(
        (await DatabaseAction.getInstance().getTxById(f.reward.txId))!,
      ),
    ).rejects.toThrow(/not retained/);
    expect(f.submit).not.toHaveBeenCalled();
  });

  it('rejects a phase change during final authority revalidation', async () => {
    const f = await fixture();
    eligibility.assertCurrent.mockImplementationOnce(async () => {
      await DatabaseAction.getInstance().TransactionRepository.update(
        { txId: f.reward.txId },
        { status: TransactionStatus.invalid },
      );
    });
    await expect(
      TransactionProcessor.processSignedTx(
        (await DatabaseAction.getInstance().getTxById(f.reward.txId))!,
      ),
    ).rejects.toThrow(/phase changed/);
    expect(f.submit).not.toHaveBeenCalled();
  });
});
