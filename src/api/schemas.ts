import { TObject, TProperties, Type } from '@sinclair/typebox';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import {
  DefaultApiLimit,
  DefaultAssetApiLimit,
  DefaultRevenueApiCount,
  RevenuePeriod,
  SUPPORTED_CHAINS,
} from '../utils/constants';
import { SortRequest } from '../types/api';
import { HealthStatusLevel } from '@rosen-bridge/health-check';

export type FastifySeverInstance = FastifyInstance<
  Server<any, any>,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
});

export const TokenDataSchema = Type.Object({
  tokenId: Type.String(),
  amount: Type.Number(),
  name: Type.Optional(Type.String()),
  decimals: Type.Number(),
  isNativeToken: Type.Boolean(),
});

export const AddressBalanceSchema = Type.Object({
  address: Type.String(),
  chain: Type.String(),
  balance: TokenDataSchema,
});

export const LockBalanceSchema = Type.Object({
  hot: Type.Array(AddressBalanceSchema),
  cold: Type.Array(AddressBalanceSchema),
});

export const OutputItemsSchema = <T extends TProperties>(
  itemType: TObject<T>
) =>
  Type.Object({
    items: Type.Array(itemType),
    total: Type.Number(),
  });

export const InfoResponseSchema = Type.Object({
  versions: Type.Object({
    app: Type.String(),
    contract: Type.String(),
    tokensMap: Type.String(),
  }),
  health: Type.Object({
    status: Type.String(),
    trialErrors: Type.Array(Type.String()),
  }),
  rsnTokenId: Type.String(),
  emissionTokenId: Type.String(),
  balances: LockBalanceSchema,
});

export const HealthStatusTypeSchema = Type.Object({
  id: Type.String(),
  title: Type.String(),
  description: Type.String(),
  status: Type.Enum(HealthStatusLevel),
  lastCheck: Type.Optional(Type.String()),
  lastTrialErrorMessage: Type.Optional(Type.String()),
  lastTrialErrorTime: Type.Optional(Type.String()),
  details: Type.Optional(Type.String()),
});

export const RevenueHistoryQuerySchema = Type.Object({
  limit: Type.Number({ default: DefaultApiLimit }),
  offset: Type.Number({ default: 0 }),
  sort: Type.Optional(Type.Enum(SortRequest)),
  fromChain: Type.Optional(Type.String()),
  toChain: Type.Optional(Type.String()),
  tokenId: Type.Optional(Type.String()),
  maxHeight: Type.Optional(Type.Number()),
  minHeight: Type.Optional(Type.Number()),
  fromBlockTime: Type.Optional(Type.Number()),
  toBlockTime: Type.Optional(Type.Number()),
});

export const SingleRevenueSchema = Type.Object({
  revenueType: Type.String(),
  data: TokenDataSchema,
});

export const RevenueHistoryResponseSchema = OutputItemsSchema(
  Type.Object({
    rewardTxId: Type.String(),
    eventId: Type.String(),
    lockHeight: Type.Number(),
    fromChain: Type.String(),
    toChain: Type.String(),
    fromAddress: Type.String(),
    toAddress: Type.String(),
    bridgeFee: Type.String(),
    networkFee: Type.String(),
    lockToken: TokenDataSchema,
    lockTxId: Type.String(),
    height: Type.Number(),
    timestamp: Type.Number(),
    ergoSideTokenId: Type.String(),
    revenues: Type.Array(SingleRevenueSchema),
  } as const)
);

export const SupportedChainsSchema = Type.Enum(
  SUPPORTED_CHAINS.reduce((map: Record<string, string>, chain: string) => {
    map[chain] = chain;
    return map;
  }, {})
);

export const AssetsQuerySchema = Type.Object({
  limit: Type.Number({ default: DefaultAssetApiLimit }),
  offset: Type.Number({ default: 0 }),
  chain: Type.Optional(SupportedChainsSchema),
  tokenId: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
});

export const AssetsResponseSchema = OutputItemsSchema(
  Type.Object({
    tokenId: Type.String(),
    amount: Type.Number(),
    coldAmount: Type.Number(),
    name: Type.Optional(Type.String()),
    decimals: Type.Number(),
    chain: SupportedChainsSchema,
    isNativeToken: Type.Boolean(),
  })
);

export const EventsQuerySchema = Type.Object({
  limit: Type.Number({ default: DefaultApiLimit }),
  offset: Type.Number({ default: 0 }),
  sort: Type.Optional(Type.Enum(SortRequest)),
  fromChain: Type.Optional(Type.String()),
  toChain: Type.Optional(Type.String()),
  maxAmount: Type.Optional(Type.String()),
  minAmount: Type.Optional(Type.String()),
});

export const EventsHistoryResponseSchema = OutputItemsSchema(
  Type.Object({
    eventId: Type.String(),
    fromChain: Type.String(),
    toChain: Type.String(),
    fromAddress: Type.String(),
    toAddress: Type.String(),
    bridgeFee: Type.String(),
    networkFee: Type.String(),
    sourceTxId: Type.String(),
    paymentTxId: Type.String(),
    rewardTxId: Type.String(),
    status: Type.String(),
    sourceChainToken: TokenDataSchema,
  } as const)
);

export const OngoingEventsResponseSchema = OutputItemsSchema(
  Type.Object({
    eventId: Type.String(),
    fromChain: Type.String(),
    toChain: Type.String(),
    fromAddress: Type.String(),
    toAddress: Type.String(),
    bridgeFee: Type.String(),
    networkFee: Type.String(),
    sourceTxId: Type.String(),
    txId: Type.String(),
    status: Type.String(),
    sourceChainToken: TokenDataSchema,
  } as const)
);

export const RevenueChartQuerySchema = Type.Object({
  count: Type.Number({ default: DefaultRevenueApiCount }),
  period: Type.Enum(RevenuePeriod),
});

export const RevenueChartResponseSchema = Type.Array(
  Type.Object({
    title: TokenDataSchema,
    data: Type.Array(
      Type.Object({
        label: Type.String(),
        amount: Type.String(),
      })
    ),
  })
);

export const SignQuerySchema = Type.Object({
  chain: Type.String(),
  txJson: Type.String(),
  requiredSign: Type.Number(),
  overwrite: Type.Optional(Type.Boolean()),
});

export const TssCallbackParams = Type.Object({
  algorithm: Type.String(),
});

export const TssCallbackSchema = Type.Object({
  status: Type.String(),
  error: Type.Optional(Type.String()),
  message: Type.String(),
  signature: Type.Optional(Type.String()),
  signatureRecovery: Type.Optional(Type.String()),
  trustKey: Type.String(),
});

export const OrderQuerySchema = Type.Object({
  id: Type.String(),
  chain: Type.String(),
  orderJson: Type.String(),
});

export const ReprocessQuerySchema = Type.Object({
  eventId: Type.String(),
  peerIds: Type.Array(Type.String()),
});
