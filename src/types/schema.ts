import { TObject, TProperties, Type } from '@sinclair/typebox';

export const messageResponseSchema = Type.Object({
  message: Type.String(),
});

export const tokenDataSchema = Type.Object({
  tokenId: Type.String(),
  amount: Type.String(),
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
