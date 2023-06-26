import { Type } from '@sinclair/typebox';

export const messageResponseSchema = Type.Object({
  message: Type.String(),
});

export const infoResponseSchema = Type.Object({
  health: Type.String(),
  hot: Type.Object({
    address: Type.String(),
    balance: Type.String(),
  }),
  cold: Type.Object({
    address: Type.String(),
    balance: Type.String(),
  }),
  tokens: Type.Object({
    ergo: Type.Array(
      Type.Object({
        id: Type.String(),
        value: Type.String(),
      })
    ),
    cardano: Type.Array(
      Type.Object({
        id: Type.String(),
        value: Type.String(),
      })
    ),
  }),
});
