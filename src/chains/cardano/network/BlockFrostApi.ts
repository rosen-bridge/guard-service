import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import config from "config";


class BlockFrostApi {

    static blockFrost = new BlockFrostAPI({
        projectId: config.get?.('blockFrost.projectId'),
        isTestnet: config.get?.('blockFrost.isTestnet'),
    });

    static currentSlot = async (): Promise<number> => {
        const block = await this.blockFrost.blocksLatest()
        const slot = block.slot
        if (!slot) throw new Error("failed to fetch current slot")
        return slot
    }

}

export default BlockFrostApi
