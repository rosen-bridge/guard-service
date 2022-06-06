import config from "config";


class TestConfigs {

    // cardano configs
    static cardano = {
        currentSlot: config.get<number>('cardano.currentSlot')
    }

    // ergo configs
    static ergo = {
        blockchainHeight: config.get<number>('ergo.blockchainHeight')
    }

}

export default TestConfigs
