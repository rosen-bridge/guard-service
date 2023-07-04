import { ViewEntity, ViewColumn } from 'typeorm';

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
      .from('transaction_entity', 'tx')
      .leftJoin('event_trigger_entity', 'ete', 'tx."eventId" = ete."eventId"')
      .leftJoin('block_entity', 'be', 'ete."spendBlock" = be."hash"')
      .leftJoin('revenue_entity', 're', 'tx."txId" = re."txId"'),
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
  status!: string;

  @ViewColumn()
  revenueTokenId!: string;

  @ViewColumn()
  revenueAmount!: string;
}
