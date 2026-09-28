import { DataSource } from '@rosen-bridge/extended-typeorm';

import { ZcashBroadcastStore } from '../db/zcashBroadcastStore';
import {
  ZcashConfirmationAuthority,
  type ZcashConfirmationSource,
} from './zcashConfirmationAuthority';
import {
  ZcashSpentEventRecoveryAuthority,
  type ZcashSpentRewardChain,
  type ZcashSpentRewardOrderSource,
} from './zcashSpentEventRecoveryAuthority';

const fail = (reason: string): never => {
  throw Error(`Zcash observed signing recovery failed: ${reason}`);
};

/**
 * Adopts an operator-supplied signed transaction only after the configured
 * chain source proves the exact bytes are durably confirmed. This path never
 * signs, submits, broadcasts, or advances reward submission.
 */
export class ZcashObservedSigningRecovery {
  private readonly store: ZcashBroadcastStore;
  private readonly confirmations: ZcashConfirmationAuthority;
  private readonly spentEvents: ZcashSpentEventRecoveryAuthority;

  constructor(
    dataSource: DataSource,
    confirmationSource: ZcashConfirmationSource,
    ergoChain: ZcashSpentRewardChain,
    expectedRewardOrder: ZcashSpentRewardOrderSource,
  ) {
    if (!(dataSource instanceof DataSource) || !dataSource.isInitialized)
      fail('data source');
    this.store = new ZcashBroadcastStore(dataSource);
    this.confirmations = new ZcashConfirmationAuthority(confirmationSource);
    this.spentEvents = new ZcashSpentEventRecoveryAuthority(
      dataSource,
      ergoChain,
      expectedRewardOrder,
    );
  }

  async recover(
    txId: string,
    candidateSignedTxJson: string,
    candidateRewardTxJson: string,
  ) {
    if (
      typeof candidateSignedTxJson !== 'string' ||
      typeof candidateRewardTxJson !== 'string'
    )
      fail('candidate');
    const snapshot = await this.store.loadObservedSigningRecovery(txId);
    const spentEvent = await this.spentEvents.capture(
      snapshot.eventId,
      snapshot.txId,
      candidateRewardTxJson,
    );
    const proof = await this.confirmations.capture(
      {
        txId: snapshot.txId,
        eventId: snapshot.eventId,
        attemptId: snapshot.attemptId,
        signedTxJson: candidateSignedTxJson,
        binding: snapshot.binding,
      },
      spentEvent.eventContextJson,
    );
    if (proof === null)
      return fail('exact transaction is not sufficiently confirmed');
    return this.store.settleObservedSpentRecovery(
      snapshot,
      candidateSignedTxJson,
      proof,
      spentEvent,
    );
  }
}
