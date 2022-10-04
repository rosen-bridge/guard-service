import { PaymentTransaction } from '../../../models/Models';
import ChainsConstants from '../../ChainsConstants';

class CardanoTransaction extends PaymentTransaction {
  constructor(
    txId: string,
    eventId: string,
    txBytes: Uint8Array,
    txType: string
  ) {
    super(ChainsConstants.cardano, txId, eventId, txBytes, txType);
  }
}

export default CardanoTransaction;
