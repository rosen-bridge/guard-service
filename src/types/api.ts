import { RevenueType } from '../utils/constants';

enum SortRequest {
  ASC = 'ASC',
  DESC = 'DESC',
}

interface TokenChartData {
  title: string;
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
  hot: Array<AddressBalance>;
  cold: Array<AddressBalance>;
}

interface GeneralInfo {
  health: string;
  rsnTokenId: string;
  balances: LockBalance;
}

interface SingleRevenue {
  revenueType: RevenueType;
  data: TokenData;
}

interface RevenueHistory {
  id: number;
  rewardTxId: string;
  eventId: string;
  lockHeight: number;
  fromChain: string;
  toChain: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  bridgeFee: string;
  networkFee: string;
  lockTokenId: string;
  lockTxId: string;
  height: number;
  timestamp: number;
  revenues: Array<SingleRevenue>;
}

export {
  SortRequest,
  TokenChartData,
  TokenData,
  ChainTokenData,
  AddressBalance,
  LockBalance,
  GeneralInfo,
  SingleRevenue,
  RevenueHistory,
};
