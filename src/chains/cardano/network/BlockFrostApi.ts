import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import CardanoConfigs from "../helpers/CardanoConfigs";


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

}

export default BlockFrostApi
