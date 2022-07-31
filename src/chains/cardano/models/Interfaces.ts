import { BigNum, MultiAsset } from "@emurgo/cardano-serialization-lib-nodejs";
import { components } from "@blockfrost/blockfrost-js/lib/types/OpenApi";

interface Asset {
    policy_id: string,
    asset_name: string,
    quantity: string
}

interface Utxo {
    tx_hash: string,
    tx_index: number,
    value: string,
    asset_list: Asset[]
}

interface UtxoBoxesAssets {
    lovelace: BigNum,
    assets: MultiAsset
}

type TxUtxos = components['schemas']['tx_content_utxo']

type AddressUtxos = components['schemas']['address_utxo_content']

export type {
    Utxo,
    Asset,
    UtxoBoxesAssets,
    TxUtxos,
    AddressUtxos
};
