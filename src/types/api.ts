import { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { HealthStatusLevel } from '@rosen-bridge/health-check';

type FastifySeverInstance = FastifyInstance<
  Server<any, any>,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

enum SortRequest {
  ASC = 'ASC',
  DESC = 'DESC',
}

type Token = {
  tokenId: string;
  name?: string;
  amount: string;
  decimals: number;
  chain: string;
};

const HealthStatusType = Type.Object({
  id: Type.String(),
  status: Type.Enum(HealthStatusLevel),
  description: Type.Optional(Type.String()),
  lastCheck: Type.Optional(Type.String()),
});

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
}

interface AddressBalance {
  address: string;
  balance: TokenData;
}

interface LockBalance {
  hot: Array<AddressBalance>;
  cold: Array<AddressBalance>;
}

interface GeneralInfo {
  health: string;
  balances: LockBalance;
}

interface RevenueHistory {
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
  revenues: Array<TokenData>;
}

export {
  FastifySeverInstance,
  SortRequest,
  HealthStatusType,
  TokenChartData,
  Token,
  TokenData,
  AddressBalance,
  LockBalance,
  GeneralInfo,
  RevenueHistory,
};
