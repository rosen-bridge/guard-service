import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'revenue_view',
  expression: (connection) =>
    connection
      .createQueryBuilder()
      .select('ete."id"', 'id')
      .addSelect('ete."spendTxId"', 'rewardTxId')
      .addSelect('ete."eventId"', 'eventId')
      .addSelect('ete."height"', 'lockHeight')
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
      .from('event_trigger_entity', 'ete')
      .innerJoin('block_entity', 'be', 'ete."spendBlock" = be."hash"'),
})
export class RevenueView {
  @ViewColumn()
  id!: number;

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
}
