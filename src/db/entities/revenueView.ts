import { ViewEntity, ViewColumn } from 'typeorm';
import { BigIntValueTransformer } from '../transformers';

@ViewEntity({
  name: 'revenue_view',
  expression: (connection) =>
    connection
      .createQueryBuilder()
      .select('tx."txId"', 'rewardTxId')
      .addSelect('ete."eventId"', 'eventId')
      .addSelect('ete."spendHeight"', 'lockHeight')
      .addSelect('ete."fromChain"', 'fromChain')
      .addSelect('ete."toChain"', 'toChain')
      .addSelect('ete."fromAddress"', 'fromAddress')
      .addSelect('ete."toAddress"', 'toAddress')
      .addSelect('ete."amount"', 'amount')
      .addSelect('ete."bridgeFee"', 'bridgeFee')
      .addSelect('ete."networkFee"', 'networkFee')
      .addSelect('ete."sourceChainTokenId"', 'lockTokenId')
      .addSelect('ete."sourceTxId"', 'lockTxId')
      .addSelect('be."height"', 'height')
      .addSelect('be."timestamp"', 'timestamp')
      .addSelect('re."tokenId"', 'revenueTokenId')
      .addSelect('re."amount"', 'revenueAmount')
      .from('revenue_entity', 're')
      .leftJoin('transaction_entity', 'tx', 'tx."txId" = re."txId"')
      .leftJoin('event_trigger_entity', 'ete', 'tx."eventId" = ete."eventId"')
      .leftJoin('block_entity', 'be', 'ete."spendBlock" = be."hash"')
      // TODO: fix duplicate trigger bug, https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/280
      .where('ete."spendBlock" IS NOT NULL'),
})
export class RevenueView {
  @ViewColumn()
  rewardTxId!: string;

  @ViewColumn()
  eventId!: string;

  @ViewColumn()
  lockHeight!: number;

  @ViewColumn()
  fromChain!: string;

  @ViewColumn()
  toChain!: string;

  @ViewColumn()
  fromAddress!: string;

  @ViewColumn()
  toAddress!: string;

  @ViewColumn()
  amount!: string;

  @ViewColumn()
  bridgeFee!: string;

  @ViewColumn()
  networkFee!: string;

  @ViewColumn()
  lockTokenId!: string;

  @ViewColumn()
  lockTxId!: string;

  @ViewColumn()
  height!: number;

  @ViewColumn()
  timestamp!: number;

  @ViewColumn()
  revenueTokenId!: string;

  @ViewColumn({ transformer: new BigIntValueTransformer() })
  revenueAmount!: bigint;
}
