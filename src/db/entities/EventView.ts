import { ViewColumn, ViewEntity } from 'typeorm';

@(ViewEntity!({
  name: 'event',
  expression: (connection) =>
    connection
      .createQueryBuilder()
      .select('ete."id"', 'id')
      .addSelect('ete."eventId"', 'eventId')
      .addSelect('ete."txId"', 'txId')
      .addSelect('ete."boxId"', 'boxId')
      .addSelect('ete."block"', 'block')
      .addSelect('ete."height"', 'height')
      .addSelect('ete."fromChain"', 'fromChain')
      .addSelect('ete."toChain"', 'toChain')
      .addSelect('ete."fromAddress"', 'fromAddress')
      .addSelect('ete."toAddress"', 'toAddress')
      .addSelect('ete."amount"', 'amount')
      .addSelect('ete."bridgeFee"', 'bridgeFee')
      .addSelect('ete."networkFee"', 'networkFee')
      .addSelect('ete."sourceChainTokenId"', 'sourceChainTokenId')
      .addSelect('ete."sourceChainHeight"', 'sourceChainHeight')
      .addSelect('ete."targetChainTokenId"', 'targetChainTokenId')
      .addSelect('ete."sourceTxId"', 'sourceTxId')
      .addSelect('ete."spendTxId"', 'spendTxId')
      .addSelect('ete."result"', 'result')
      .addSelect('ete."paymentTxId"', 'paymentTxId')
      .addSelect('cee."status"', 'status')
      .from('event_trigger_entity', 'ete')
      .leftJoin(
        'confirmed_event_entity',
        'cee',
        'ete."id" = cee."eventDataId"'
      ),
}))
export class EventView {
  @ViewColumn()
  id!: number;

  @ViewColumn()
  eventId!: string;

  @ViewColumn()
  txId!: string;

  @ViewColumn()
  boxId!: string;

  @ViewColumn()
  block!: string;

  @ViewColumn()
  height!: number;

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
  sourceChainTokenId!: string;

  @ViewColumn()
  sourceChainHeight!: number;

  @ViewColumn()
  targetChainTokenId!: string;

  @ViewColumn()
  sourceTxId!: string;

  @ViewColumn()
  spendTxId!: string | null;

  @ViewColumn()
  result!: string | null;

  @ViewColumn()
  paymentTxId!: string | null;

  @ViewColumn()
  status!: string;
}
