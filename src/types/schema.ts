import { Type } from '@sinclair/typebox';

export const messageResponseSchema = Type.Object({
  message: Type.String(),
});

export const infoResponseSchema = Type.Object({
  health: Type.String(),
  hotWalletAddress: Type.String(),
  hotWalletBalance: Type.String(),
  coldWalletAddress: Type.String(),
  coldWalletBalance: Type.String(),
  ergoTokens: Type.Array(
    Type.Object({
      id: Type.String(),
      value: Type.String(),
    })
  ),
  cardanoTokens: Type.Array(
    Type.Object({
      id: Type.String(),
      value: Type.String(),
    })
  ),
});
