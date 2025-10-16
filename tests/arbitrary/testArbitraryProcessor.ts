import { PaymentOrder, PaymentTransaction } from '@rosen-chains/abstract-chain';
import ArbitraryProcessor from '../../src/arbitrary/arbitraryProcessor';

export default class TestArbitraryProcessor extends ArbitraryProcessor {
  constructor() {
    super();
  }

  declare createOrderPayment: (
    orderId: string,
    order: PaymentOrder,
    chain: string,
  ) => Promise<PaymentTransaction>;
}
