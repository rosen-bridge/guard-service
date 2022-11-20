import { Address } from 'ergo-lib-wasm-nodejs';
import ErgoConfigs from './helpers/ErgoConfigs';
import ErgoUtils from './helpers/ErgoUtils';
import ErgoTransaction from './models/ErgoTransaction';
import { BoxesAssets } from './models/Interfaces';

class ErgoColdStorage {
  static lockAddress = Address.from_base58(
    ErgoConfigs.ergoContractConfig.lockAddress
  );
  static lockErgoTree = ErgoUtils.addressToErgoTreeString(this.lockAddress);
  static coldAddress = Address.from_base58(ErgoConfigs.coldAddress);
  static coldErgoTree = ErgoUtils.addressToErgoTreeString(this.coldAddress);

  /**
   * generates unsigned transaction to transfer assets to cold storage in ergo chain
   * @return the generated asset transfer transaction
   */
  static generateTransaction = async (
    transferringAssets: BoxesAssets
  ): Promise<ErgoTransaction> => {
    // TODO: implement this
    //  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/work_items/582
    throw Error(`Not implemented yet!`);
  };

  /**
   * verifies the transfer transaction
   *  1. checks number of output boxes
   *  2. checks cold box ergoTree
   *  3. checks change box ergoTree
   *  4. checks change box registers
   *  5. checks remaining amount of assets in lockAddress after tx
   *  6. checks transaction fee (last box erg value)
   * @param tx the transfer transaction
   * @return true if tx verified
   */
  static verifyTransactionWithEvent = async (
    tx: ErgoTransaction
  ): Promise<boolean> => {
    // TODO: implement this
    //  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/work_items/582
    throw Error(`Not implemented yet!`);
  };
}

export default ErgoColdStorage;
