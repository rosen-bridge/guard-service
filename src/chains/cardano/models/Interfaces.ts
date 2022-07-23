import { BigNum, MultiAsset } from "@emurgo/cardano-serialization-lib-nodejs";

interface Asset {
    policy_id: string,
    asset_name: string,
    quantity: string
}

interface Utxo {
    payment_addr: {
        bech32: string
    },
    tx_hash: string,
    tx_index: number,
    value: string,
    asset_list: Array<Asset>
}

interface Tx {
    utxosOutput: Array<Utxo>
    utxosInput: Array<Utxo>
}

interface UtxoBoxesAssets {
    lovelace: BigNum,
    assets: MultiAsset
}


interface MetaData {
    0: RosenData,
}

interface RosenData {
    to: string,
    bridgeFee: string,
    networkFee: string,
    targetChainTokenId: string,
    toAddress: string,
    fromAddress: string,
}

interface TxMetaData {
    tx_hash: string,
    metadata: object,
}

export type { Utxo, Tx, Asset, UtxoBoxesAssets, RosenData, TxMetaData, MetaData };
