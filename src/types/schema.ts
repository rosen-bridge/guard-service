import { Type } from '@sinclair/typebox';

export const messageResponseSchema = Type.Object({
  message: Type.String(),
});
