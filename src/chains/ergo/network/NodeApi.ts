import axios from "axios";
import { BlockHeaders, ErgoStateContext, PreHeader } from "ergo-lib-wasm-nodejs";
import { ErgoBlockHeader } from "../models/Interfaces";
import Configs from "../../../helpers/Configs";


class NodeApi {

    static nodeClient = axios.create({
        baseURL: Configs.ergo.node.url,
        timeout: Configs.ergo.node.timeout,
        headers: {"Content-Type": "application/json"}
    });

    /**
     * gets blockchain height
     */
    static getHeight = async (): Promise<number> => {
        return this.nodeClient.get("/info").then(info => info.data.fullHeight)
    }

    /**
     * gets 10 last blocks of blockchain
     */
    static getLastBlockHeader = (): Promise<ErgoBlockHeader[]> => {
        return this.nodeClient.get("/blocks/lastHeaders/10").then(
            res => res.data
        )
    }

    /**
     * returns state context object of blockchain using 10 last blocks
     */
    static getErgoStateContext = async (): Promise<ErgoStateContext> => {
        const blockHeaderJson = await this.getLastBlockHeader();
        const blockHeaders = BlockHeaders.from_json(blockHeaderJson);
        const preHeader = PreHeader.from_block_header(blockHeaders.get(0));
        return new ErgoStateContext(preHeader, blockHeaders);
    }

}

export default NodeApi
