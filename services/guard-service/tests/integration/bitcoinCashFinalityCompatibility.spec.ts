import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import EventProcessor from '../../src/event/eventProcessor';
import { EventStatus } from '../../src/utils/constants';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { setupBitcoinCashFinality } from '../testUtils/mocked/bitcoinCashFinality.mock';

describe('EventProcessor', () => {
  let scenario:
    | Awaited<ReturnType<typeof setupBitcoinCashFinality>>
    | undefined;

  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
  });
  afterEach(() => {
    scenario?.restore();
    scenario = undefined;
  });

  describe('processScannedEvents', () => {
    /**
     * @target EventProcessor.processScannedEvents - accepts the common eligible BCH deposit
     * @dependencies Actual BCH RPC/chain/extractor, EventVerifier and migrated SQLite;
     * deterministic RPC transport and registry/Ergo-height/fee/box lookup seams.
     * @scenario Process the shared block at height 101 with eleven confirmations
     * and the configured Guard threshold of six; all unrelated validity checks pass.
     * @expected Persist one pending-payment event and no rejected or unconfirmed event.
     */
    it('accepts the common eligible BCH deposit', async () => {
      const bytes = readFileSync(
        new URL('./testData/bitcoinCashFinality.json', import.meta.url),
        'utf8',
      ).replace(/\r\n/g, '\n');
      expect(createHash('sha256').update(bytes).digest('hex')).toEqual(
        '32e98ac41706c86e5985ae20a462fb8c498dbdb0da66933635efdced74e2b552',
      );
      scenario = await setupBitcoinCashFinality();
      await EventProcessor.processScannedEvents();
      const database = DatabaseActionMock.testDatabase;
      expect(await database.ConfirmedEventRepository.count()).toEqual(1);
      expect(
        (await database.ConfirmedEventRepository.find())[0].status,
      ).toEqual(EventStatus.pendingPayment);
      expect(await database.RejectedEventRepository.count()).toEqual(0);
      expect(await database.getUnconfirmedEvents()).toHaveLength(0);
      expect(scenario.calls).toContain('getblockhash');
      expect(scenario.calls).toContain('getrawtransaction');
    });

    /**
     * @target EventProcessor.processScannedEvents - waits and recovers from a stricter depth threshold
     * @dependencies Actual BCH RPC/chain/extractor, EventVerifier and migrated SQLite;
     * deterministic RPC transport and registry/Ergo-height/fee/box lookup seams.
     * @scenario Keep the common eleven-confirmation deposit but require twelve;
     * process it, then advance only the RPC evidence to twelve and process again.
     * @expected Retain the same event pending without rejection, then confirm it.
     */
    it('waits and recovers from a stricter depth threshold', async () => {
      scenario = await setupBitcoinCashFinality(12);
      const database = DatabaseActionMock.testDatabase;
      await EventProcessor.processScannedEvents();
      expect(await database.ConfirmedEventRepository.count()).toEqual(0);
      expect(await database.RejectedEventRepository.count()).toEqual(0);
      expect(await database.getUnconfirmedEvents()).toHaveLength(1);
      scenario.state.confirmations = 12;
      await EventProcessor.processScannedEvents();
      expect(await database.ConfirmedEventRepository.count()).toEqual(1);
      expect(await database.RejectedEventRepository.count()).toEqual(0);
      expect(await database.getUnconfirmedEvents()).toHaveLength(0);
      expect(await database.EventRepository.count()).toEqual(1);
    });

    /**
     * @target EventProcessor.processScannedEvents retries branch disagreement
     * after %i compatible reads and recovers
     * @dependencies Actual BCH RPC/chain/extractor, EventVerifier and migrated SQLite;
     * deterministic RPC transport and registry/Ergo-height/fee/box lookup seams.
     * @scenario Return a different active hash at the source height, either during
     * confirmation or after its two ancestry reads, during event verification;
     * restore the compatible source hash and process the same row.
     * @expected Persist no rejection during disagreement and confirm after recovery.
     */
    it.each([0, 2])(
      'retries branch disagreement after %i compatible reads and recovers',
      async (compatibleReads) => {
        scenario = await setupBitcoinCashFinality();
        scenario.state.branchMatches = false;
        scenario.state.branchMismatchAfterReads = compatibleReads;
        const database = DatabaseActionMock.testDatabase;
        await EventProcessor.processScannedEvents();
        expect(await database.ConfirmedEventRepository.count()).toEqual(0);
        expect(await database.RejectedEventRepository.count()).toEqual(0);
        expect(await database.getUnconfirmedEvents()).toHaveLength(1);
        scenario.state.branchMatches = true;
        await EventProcessor.processScannedEvents();
        expect(await database.ConfirmedEventRepository.count()).toEqual(1);
        expect(await database.RejectedEventRepository.count()).toEqual(0);
        expect(await database.getUnconfirmedEvents()).toHaveLength(0);
        expect(await database.EventRepository.count()).toEqual(1);
      },
    );

    /**
     * @target EventProcessor.processScannedEvents - still rejects an unrelated event amount mismatch
     * @dependencies Actual BCH RPC/chain/extractor, EventVerifier and migrated SQLite;
     * deterministic RPC transport and registry/Ergo-height/fee/box lookup seams.
     * @scenario Change only the persisted event amount while retaining eligible
     * source evidence and the original serialized transaction bytes.
     * @expected Reject the inconsistent event, proving validity was not bypassed.
     */
    it('still rejects an unrelated event amount mismatch', async () => {
      scenario = await setupBitcoinCashFinality();
      const database = DatabaseActionMock.testDatabase;
      await database.EventRepository.update(
        { sourceTxId: scenario.event.sourceTxId },
        { amount: '123456790' },
      );
      await EventProcessor.processScannedEvents();
      expect(await database.ConfirmedEventRepository.count()).toEqual(0);
      expect(await database.RejectedEventRepository.count()).toEqual(1);
      expect(await database.getUnconfirmedEvents()).toHaveLength(0);
    });
  });
});
