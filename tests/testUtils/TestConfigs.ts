import config from "config";
import { GuardSecretInfo } from "./TestInterfaces";


class TestConfigs {

    // cardano configs
    static cardano = {
        currentSlot: config.get<number>('cardano.currentSlot')
    }

    // ergo configs
    static ergo = {
        blockchainHeight: config.get<number>('ergo.blockchainHeight')
    }

    // guards configs
    static guardsSecret = config.get<GuardSecretInfo[]>('guard.guardsSecret')

}

export default TestConfigs
