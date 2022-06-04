import config from "config";


class Configs {

    // cardano configs
    static cardano = {
        koios: {
            url: config.get<string>('cardano.koios.url'),
            timeout: config.get<number>('cardano.koios.timeout')
        },
        blockFrost: {
            projectId: config.get<string>('cardano.blockFrost.projectId'),
            isTestnet: config.get<boolean>('cardano.blockFrost.isTestnet')
        },
        bankAddress: config.get<string>('cardano.bankAddress'),
        txMinimumLovelace: config.get<string>('cardano.txMinimumLovelace'),
        txFee: config.get<string>('cardano.txFee'),
        txTtl: config.get<number>('cardano.txTtl')
    }

    // ergo configs
    static ergo = {
        explorer: {
            url: config.get<string>('ergo.explorer.url'),
            timeout: config.get<number>('ergo.explorer.timeout')
        },
        node: {
            url: config.get<string>('ergo.node.url'),
            timeout: config.get<number>('ergo.node.timeout')
        },
        bankAddress: config.get<string>('ergo.bankAddress'),
        minimumErg: BigInt(config.get<string>('ergo.minimumErg')),
        txFee: BigInt(config.get<string>('ergo.txFee'))
    }

}

export default Configs
