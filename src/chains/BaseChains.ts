import { PaymentTransaction, EventTrigger } from '../models/Models';
import { Fee } from '@rosen-bridge/minimum-fee';

export default interface BaseChain<
  TransactionType,
  SerializedType extends PaymentTransaction
> {
  /**
   * generates payment transaction of the event from multi-sig address in target chain
   * @param event the event trigger model
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return the generated payment transaction
   */
  generateTransaction: (
    event: EventTrigger,
    feeConfig: Fee
  ) => Promise<SerializedType>;

  /**
   * converts the transaction model in the chain to bytearray
   * @param tx the transaction model in the chain library
   * @return bytearray representation of the transaction
   */
  serialize: (tx: TransactionType) => Uint8Array;

  /**
   * converts bytearray representation of the transaction to the transaction model in the chain
   * @param txBytes bytearray representation of the transaction
   * @return the transaction model in the chain library
   */
  deserialize: (txBytes: Uint8Array) => TransactionType;

  /**
   * starts signing process in corresponding service for a transaction
   * @param tx the transaction
   */
  requestToSignTransaction: (tx: PaymentTransaction) => Promise<void>;

  /**
   * sends a transaction to target chain
   * @param tx the transaction
   */
  submitTransaction: (tx: PaymentTransaction) => Promise<void>;
}
