import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import CardanoConfigs from "../helpers/CardanoConfigs";
import { Transaction } from "@emurgo/cardano-serialization-lib-nodejs";
import { components } from "@blockfrost/blockfrost-js/lib/types/OpenApi";
import { AddressUtxos, TxUtxos } from "../models/Interfaces";


class BlockFrostApi {

    static blockFrost = new BlockFrostAPI({
        projectId: CardanoConfigs.blockFrost.projectId,
        isTestnet: CardanoConfigs.blockFrost.isTestnet
    });

    /**
     * gets current slot of blockchain
     */
    static currentSlot = async (): Promise<number> => {
        const block = await this.blockFrost.blocksLatest()
        const slot = block.slot
        if (!slot) throw new Error("failed to fetch current slot")
        return slot
    }

    /**
     * gets current height of blockchain
     */
    static currentHeight = async (): Promise<number> => {
        const block = await this.blockFrost.blocksLatest()
        const height = block.height
        if (!height) throw new Error("failed to fetch current slot")
        return height
    }

    /**
     * submits the transaction to network
     * @param tx the transaction
     */
    static txSubmit = async (tx: Transaction): Promise<string> => {
        return this.blockFrost.txSubmit(tx.to_bytes())
    }

    /**
     * gets tx utxos
     * @param txId the transaction id
     */
    static getTxUtxos = async (txId: string): Promise<TxUtxos> => {
        return await this.blockFrost.txsUtxos(txId)
    }

    /**
     * gets address utxos
     * @param address the address
     */
    static getAddressUtxos = async (address: string): Promise<AddressUtxos> => {
        return await this.blockFrost.addressesUtxos(address)
    }

}

export default BlockFrostApi
