import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'revenue_chart',
  expression: (connection) =>
    connection
      .createQueryBuilder()
      .select('re."tokenId"', 'tokenId')
      .addSelect('re."amount"', 'amount')
      .addSelect('be."timestamp"', 'timestamp')
      .addSelect(`be."timestamp"/604800000`, 'weak_number')
      .addSelect(
        `strftime('%m', datetime(be."timestamp"/1000, 'unixepoch'))`,
        'month'
      )
      .addSelect(
        `strftime('%Y', datetime(be."timestamp"/1000, 'unixepoch'))`,
        'year'
      )
      .from('revenue_entity', 're')
      .innerJoin('transaction_entity', 'tx', 'tx."txId" = re."txId"')
      .innerJoin('event_trigger_entity', 'ete', 'ete.eventId = tx.eventId')
      .innerJoin('block_entity', 'be', 'ete.block = be.hash'),
})
export class RevenueChartView {
  @ViewColumn()
  tokenId!: string;

  @ViewColumn()
  amount!: string;

  @ViewColumn()
  weak_number!: number;

  @ViewColumn()
  month!: number;

  @ViewColumn()
  year!: number;

  @ViewColumn()
  timestamp!: number;
}
