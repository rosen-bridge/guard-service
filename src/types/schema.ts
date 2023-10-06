import { TObject, TProperties, Type } from '@sinclair/typebox';
import { DefaultApiLimit } from '../utils/constants';
import { SortRequest } from './api';

export const messageResponseSchema = Type.Object({
  message: Type.String(),
});

export const tokenDataSchema = Type.Object({
  tokenId: Type.String(),
  amount: Type.Number(),
  name: Type.Optional(Type.String()),
  decimals: Type.Number(),
});

export const addressBalance = Type.Object({
  address: Type.String(),
  balance: tokenDataSchema,
});

export const lockBalanceSchema = Type.Object({
  hot: Type.Array(addressBalance),
  cold: Type.Array(addressBalance),
});

export const infoResponseSchema = Type.Object({
  health: Type.String(),
  balances: lockBalanceSchema,
});

export const outputItemsSchema = <T extends TProperties>(
  itemType: TObject<T>
) =>
  Type.Object({
    items: Type.Array(itemType),
    total: Type.Number(),
  });

export const RevenueHistoryQuery = Type.Object({
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

export const RevenueHistoryResponse = outputItemsSchema(
  Type.Object({
    rewardTxId: Type.String(),
    eventId: Type.String(),
    lockHeight: Type.Number(),
    fromChain: Type.String(),
    toChain: Type.String(),
    fromAddress: Type.String(),
    toAddress: Type.String(),
    amount: Type.String(),
    bridgeFee: Type.String(),
    networkFee: Type.String(),
    lockTokenId: Type.String(),
    lockTxId: Type.String(),
    height: Type.Number(),
    timestamp: Type.Number(),
    revenues: Type.Array(tokenDataSchema),
  } as const)
);
