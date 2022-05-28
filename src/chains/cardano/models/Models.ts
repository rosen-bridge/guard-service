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

export type { Utxo, Asset };
