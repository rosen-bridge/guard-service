import { Address } from '@emurgo/cardano-serialization-lib-nodejs';
import CardanoConfigs from './helpers/CardanoConfigs';
import CardanoTransaction from './models/CardanoTransaction';

class CardanoColdStorage {
  static lockAddress = Address.from_bech32(CardanoConfigs.bankAddress);
  static coldAddress = Address.from_bech32(CardanoConfigs.coldAddress);

  /**
   * generates unsigned transaction to transfer assets to cold storage in cardano chain
   * @return the generated asset transfer transaction
   */
  static generateTransaction = async (): Promise<CardanoTransaction> => {
    // TODO: implement this
    //  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/work_items/583
    throw Error(`Not implemented yet!`);
  };

  /**
   * verifies the transfer transaction
   *  1. checks number of output boxes
   *  2. checks cold box ergoTree
   *  3. checks change box ergoTree
   *  4. checks transaction metadata
   *  5. checks remaining amount of assets in lockAddress after tx
   *  6. checks transaction fee
   * @param tx the transfer transaction
   * @return true if tx verified
   */
  static verifyTransactionWithEvent = async (
    tx: CardanoTransaction
  ): Promise<boolean> => {
    // TODO: implement this
    //  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/work_items/583
    throw Error(`Not implemented yet!`);
  };
}

export default CardanoColdStorage;
