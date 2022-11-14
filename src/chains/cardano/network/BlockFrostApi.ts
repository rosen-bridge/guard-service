import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import CardanoConfigs from '../helpers/CardanoConfigs';
import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';
import { AddressUtxos, TxUtxos } from '../models/Interfaces';
import { logger } from '../../../log/Logger';

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
  static txSubmit = async (tx: Transaction): Promise<string> => {
    try {
      return await this.blockFrost.txSubmit(tx.to_bytes());
    } catch (e) {
      logger.error(
        `An error occurred while submitting tx using BlockFrost: ${e}`
      );
      throw e;
    }
  };

  /**
   * gets tx utxos
   * @param txId the transaction id
   */
  static getTxUtxos = async (txId: string): Promise<TxUtxos> => {
    try {
      return await this.blockFrost.txsUtxos(txId);
    } catch (e) {
      logger.error(
        `An error occurred while getting transaction [${txId}] utxos using BlockFrost: ${e}`
      );
      throw e;
    }
  };

  /**
   * gets address utxos
   * @param address the address
   */
  static getAddressUtxos = async (address: string): Promise<AddressUtxos> => {
    try {
      return await this.blockFrost.addressesUtxos(address);
    } catch (e) {
      logger.error(
        `An error occurred while getting address [${address}] utxos using BlockFrost: ${e}`
      );
      throw e;
    }
  };
}

export default BlockFrostApi;
