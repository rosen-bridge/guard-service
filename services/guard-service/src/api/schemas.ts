import { z } from 'zod';

import { HealthStatusLevel } from '@rosen-bridge/health-check';

import { SortRequest } from '../types/api';
import {
  DefaultApiLimit,
  DefaultAssetApiLimit,
  DefaultRevenueApiCount,
  RevenuePeriod,
  SUPPORTED_CHAINS,
} from '../utils/constants';

export const MessageResponseSchema = z.object({
  message: z.string(),
});

export const TokenDataSchema = z.object({
  tokenId: z.string(),
  amount: z.number(),
  name: z.optional(z.string()),
  decimals: z.number(),
  isNativeToken: z.boolean(),
});

export const AddressBalanceSchema = z.object({
  address: z.string(),
  chain: z.string(),
  balance: TokenDataSchema,
});

export const OutputItemsSchema = <T extends z.ZodRawShape>(
  itemType: z.ZodObject<T>,
) =>
  z.object({
    items: z.array(itemType),
    total: z.number(),
  });

export const LockBalanceSchema = z.object({
  hot: OutputItemsSchema(AddressBalanceSchema),
  cold: OutputItemsSchema(AddressBalanceSchema),
});

export const InfoResponseSchema = z.object({
  versions: z.object({
    app: z.string(),
    contract: z.string(),
  }),
  health: z.object({
    status: z.string(),
    trialErrors: z.array(z.string()),
  }),
  rsnTokenId: z.string(),
  emissionTokenId: z.string(),
});

export const HealthStatusTypeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.nativeEnum(HealthStatusLevel),
  lastCheck: z.optional(z.string()),
  lastTrialErrorMessage: z.optional(z.string()),
  lastTrialErrorTime: z.optional(z.string()),
  details: z.optional(z.string()),
});

export const RevenueHistoryQuerySchema = z.object({
  limit: z.number().default(DefaultApiLimit),
  offset: z.number().default(0),
  sort: z.optional(z.nativeEnum(SortRequest)),
  fromChain: z.optional(z.string()),
  toChain: z.optional(z.string()),
  maxHeight: z.optional(z.number()),
  minHeight: z.optional(z.number()),
  fromBlockTime: z.optional(z.number()),
  toBlockTime: z.optional(z.number()),
});

export const SingleRevenueSchema = z.object({
  revenueType: z.string(),
  data: TokenDataSchema,
});

export const RevenueHistoryResponseSchema = OutputItemsSchema(
  z.object({
    rewardTxId: z.string(),
    eventId: z.string(),
    lockHeight: z.number(),
    fromChain: z.string(),
    toChain: z.string(),
    fromAddress: z.string(),
    toAddress: z.string(),
    bridgeFee: z.string(),
    networkFee: z.string(),
    lockToken: TokenDataSchema,
    lockTxId: z.string(),
    height: z.number(),
    timestamp: z.number(),
    ergoSideTokenId: z.string(),
    revenues: z.array(SingleRevenueSchema),
  } as const),
);

export const SupportedChainsSchema = z.nativeEnum(
  SUPPORTED_CHAINS.reduce((map: Record<string, string>, chain: string) => {
    map[chain] = chain;
    return map;
  }, {}),
);

export const BalanceQuerySchema = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(DefaultAssetApiLimit),
  chain: z.optional(SupportedChainsSchema),
  tokenId: z.optional(
    z
      .string()
      .max(100)
      .regex(/^[0-9a-z.:]*$/),
  ),
});

export const AssetsResponseSchema = OutputItemsSchema(
  z.object({
    tokenId: z.string(),
    amount: z.number(),
    coldAmount: z.number(),
    name: z.optional(z.string()),
    decimals: z.number(),
    chain: SupportedChainsSchema,
    isNativeToken: z.boolean(),
  }),
);

export const EventsQuerySchema = z.object({
  limit: z.number().default(DefaultApiLimit),
  offset: z.number().default(0),
  sort: z.optional(z.nativeEnum(SortRequest)),
  fromChain: z.optional(z.string()),
  toChain: z.optional(z.string()),
  maxAmount: z.optional(z.string()),
  minAmount: z.optional(z.string()),
});

export const EventsHistoryResponseSchema = OutputItemsSchema(
  z.object({
    eventId: z.string(),
    fromChain: z.string(),
    toChain: z.string(),
    fromAddress: z.string(),
    toAddress: z.string(),
    bridgeFee: z.string(),
    networkFee: z.string(),
    sourceTxId: z.string(),
    paymentTxId: z.string(),
    rewardTxId: z.string(),
    status: z.string(),
    sourceChainToken: TokenDataSchema,
  } as const),
);

export const OngoingEventsResponseSchema = OutputItemsSchema(
  z.object({
    eventId: z.string(),
    fromChain: z.string(),
    toChain: z.string(),
    fromAddress: z.string(),
    toAddress: z.string(),
    bridgeFee: z.string(),
    networkFee: z.string(),
    sourceTxId: z.string(),
    txId: z.string(),
    status: z.string(),
    sourceChainToken: TokenDataSchema,
  } as const),
);

export const RevenueChartQuerySchema = z.object({
  count: z.number().default(DefaultRevenueApiCount),
  period: z.nativeEnum(RevenuePeriod),
});

export const RevenueChartResponseSchema = z.array(
  z.object({
    title: TokenDataSchema,
    data: z.array(
      z.object({
        label: z.string(),
        amount: z.string(),
      }),
    ),
  }),
);

export const SignQuerySchema = z.object({
  chain: z.string(),
  txJson: z.string(),
  requiredSign: z.number(),
  overwrite: z.optional(z.boolean()),
});

export const TssCallbackParams = z.object({
  algorithm: z.string(),
});

export const TssCallbackSchema = z.object({
  status: z.string(),
  error: z.optional(z.string()),
  message: z.string(),
  signature: z.optional(z.string()),
  signatureRecovery: z.optional(z.string()),
  trustKey: z.string(),
});

export const OrderQuerySchema = z.object({
  id: z.string(),
  chain: z.string(),
  orderJson: z.string(),
});

export const ReprocessQuerySchema = z.object({
  eventId: z.string(),
  peerIds: z.array(z.string()),
});
