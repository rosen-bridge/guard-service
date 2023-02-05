import {
  BlockFrostAPI,
  BlockfrostServerError,
} from '@blockfrost/blockfrost-js';
import CardanoConfigs from '../helpers/CardanoConfigs';
import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';
import { AddressUtxos, TxUtxos } from '../models/Interfaces';

class BlockFrostApi {
  static blockFrost = new BlockFrostAPI({
    projectId: CardanoConfigs.blockFrost.projectId,
  });

  /**
   * gets current slot of blockchain
   */
  static currentSlot = async (): Promise<number> => {
    const block = await this.blockFrost.blocksLatest();
    const slot = block.slot;
    if (!slot) throw new Error('Failed to fetch current slot from BlockFrost');
    return slot!;
  };

  /**
   * gets current height of blockchain
   */
  static currentHeight = async (): Promise<number> => {
    const block = await this.blockFrost.blocksLatest();
    const height = block.height;
    if (!height)
      throw new Error('Failed to fetch current height from BlockFrost');
    return height!;
  };

  /**
   * submits the transaction to network
   * @param tx the transaction
   */
  static txSubmit = (tx: Transaction): Promise<string> => {
    return this.blockFrost.txSubmit(tx.to_bytes());
  };

  /**
   * gets tx utxos
   * @param txId the transaction id
   */
  static getTxUtxos = (txId: string): Promise<TxUtxos> => {
    return this.blockFrost.txsUtxos(txId);
  };

  /**
   * gets address utxos
   * @param address the address
   */
  static getAddressUtxos = (address: string): Promise<AddressUtxos> => {
    return this.blockFrost.addressesUtxos(address).catch((e) => {
      if (e instanceof BlockfrostServerError && e.status_code === 404)
        return [];
      else
        throw `An error occurred while getting address [${address}] utxos using BlockFrost: ${e}`;
    });
  };
}

export default BlockFrostApi;
