import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';

import { RevenueType } from '../utils/constants';

enum SortRequest {
  ASC = 'ASC',
  DESC = 'DESC',
}

interface TokenChartData {
  title: TokenData;
  data: {
    label: string;
    amount: string;
  }[];
}

interface TokenData {
  tokenId: string;
  amount: number;
  name?: string;
  decimals: number;
  isNativeToken: boolean;
}

interface ChainTokenData extends TokenData {
  coldAmount: number;
  chain: string;
}

interface AddressBalance {
  address: string;
  chain: string;
  balance: TokenData;
}

interface LockBalance {
  hot: Page<AddressBalance>;
  cold: Page<AddressBalance>;
}

interface SingleRevenue {
  revenueType: RevenueType;
  data: TokenData;
}

interface RevenueHistory {
  rewardTxId: string;
  eventId: string;
  lockHeight: number;
  fromChain: string;
  toChain: string;
  fromAddress: string;
  toAddress: string;
  bridgeFee: string;
  networkFee: string;
  lockToken: TokenData;
  lockTxId: string;
  height: number;
  timestamp: number;
  ergoSideTokenId: string;
  revenues: Array<SingleRevenue>;
}

interface Event
  extends Pick<
    EventTriggerEntity,
    | 'eventId'
    | 'fromChain'
    | 'toChain'
    | 'fromAddress'
    | 'toAddress'
    | 'bridgeFee'
    | 'networkFee'
    | 'sourceTxId'
  > {
  sourceChainToken: TokenData;
  paymentTxId: string;
  rewardTxId: string;
  status: string;
}

interface OngoingEvents
  extends Pick<
    EventTriggerEntity,
    | 'eventId'
    | 'txId'
    | 'fromChain'
    | 'toChain'
    | 'fromAddress'
    | 'toAddress'
    | 'bridgeFee'
    | 'networkFee'
    | 'sourceTxId'
  > {
  sourceChainToken: TokenData;
  status: string;
}

interface Page<T> {
  items: Array<T>;
  total: number;
}

export {
  SortRequest,
  TokenChartData,
  TokenData,
  ChainTokenData,
  AddressBalance,
  LockBalance,
  SingleRevenue,
  RevenueHistory,
  Event,
  OngoingEvents,
  Page,
};
