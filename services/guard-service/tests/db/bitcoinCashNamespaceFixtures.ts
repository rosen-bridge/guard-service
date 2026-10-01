import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';
import { EventTrigger } from '@rosen-chains/abstract-chain';

import { DatabaseAction } from '../../src/db/databaseAction';
import EventSerializer from '../../src/event/eventSerializer';
import { ChainConfigKey, EventStatus } from '../../src/utils/constants';
import Utils from '../../src/utils/utils';

export const namespaceEvent = (
  fromChain = 'bitcoin-cash',
  changes: Partial<EventTrigger> = {},
): EventTrigger => ({
  height: 200,
  fromChain,
  toChain: 'ergo',
  fromAddress: 'source-address',
  toAddress: 'target-address',
  amount: '1000000',
  bridgeFee: '3',
  networkFee: '4',
  sourceChainTokenId: 'source-token',
  targetChainTokenId: 'target-token',
  sourceTxId: '22'.repeat(32),
  sourceChainHeight: 101,
  sourceBlockId: '33'.repeat(32),
  WIDsHash: '44'.repeat(32),
  WIDsCount: 1,
  ...changes,
});

export const insertNamespaceEvent = async (
  event: EventTrigger,
  txId: string,
  status = EventStatus.pendingPayment,
) => {
  const db = DatabaseAction.getInstance();
  const result = await db.EventRepository.insert({
    ...event,
    eventId: Utils.txIdToEventId(event.sourceTxId),
    txId,
    extractor: `${ChainConfigKey[event.fromChain]}EventTrigger`,
    identifier: txId,
    serialized: Buffer.from(txId).toString('base64'),
    block: 'test-block',
  });
  const raw = await db.EventRepository.findOneByOrFail({
    id: result.identifiers[0].id,
  });
  await db.insertConfirmedEvent(raw);
  await db.ConfirmedEventRepository.update(EventSerializer.getId(event), {
    status,
  });
  return raw;
};

let commitmentSerial = 0;
export const insertNamespaceCommitment = async (
  event: EventTriggerEntity,
  changes: Record<string, unknown> = {},
) => {
  const db = DatabaseAction.getInstance();
  commitmentSerial += 1;
  const result = await db.CommitmentRepository.insert({
    eventId: event.eventId,
    extractor: `${ChainConfigKey[event.fromChain]}Commitment`,
    WID: 'ab'.repeat(32),
    commitment: Utils.commitmentFromEvent(event, 'ab'.repeat(32)),
    identifier: `namespace-commitment-${commitmentSerial}`,
    txId: `namespace-commitment-tx-${commitmentSerial}`,
    block: 'test-block',
    serialized: Buffer.from('commitment').toString('base64'),
    height: event.height - 1,
    rwtCount: '2',
    spendTxId: event.txId,
    spendIndex: 0,
    spendBlock: 'spent-block',
    ...changes,
  });
  return db.CommitmentRepository.findOneByOrFail({
    id: result.identifiers[0].id,
  });
};
