import { PaymentOrder } from '@rosen-chains/abstract-chain';

interface PermitBoxValue {
  wid: string;
  boxValue: bigint;
}

interface RewardOrder {
  watchersOrder: PaymentOrder;
  guardsOrder: PaymentOrder;
}

export { PermitBoxValue, RewardOrder };
