import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'revenue_chart',
  expression: (connection) =>
    connection
      .createQueryBuilder()
      .select('re."tokenId"', 'tokenId')
      .addSelect('re."amount"', 'amount')
      .addSelect('be."timestamp"', 'timestamp')
      .addSelect(`be."timestamp"/604800`, 'week_number')
      .addSelect(`be."month"`, 'month')
      .addSelect(`be."year"`, 'year')
      .from('revenue_entity', 're')
      .innerJoin('transaction_entity', 'tx', 'tx."txId" = re."txId"')
      .innerJoin('event_trigger_entity', 'ete', 'ete.eventId = tx.eventId')
      .innerJoin('block_entity', 'be', 'ete.spendBlock = be.hash'),
})
export class RevenueChartView {
  @ViewColumn()
  tokenId!: string;

  @ViewColumn()
  amount!: string;

  @ViewColumn()
  week_number!: number;

  @ViewColumn()
  month!: number;

  @ViewColumn()
  year!: number;

  @ViewColumn()
  timestamp!: number;
}
