import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import config from "config";


class BlockFrostApi {

    static blockFrost = new BlockFrostAPI({
        projectId: config.get<string>('cardano.blockFrost.projectId'),
        isTestnet: config.get<boolean>('cardano.blockFrost.isTestnet')
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
