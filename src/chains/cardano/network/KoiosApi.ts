import axios from "axios";
import { Tx, TxMetaData, Utxo } from "../models/Interfaces";
import CardanoConfigs from "../helpers/CardanoConfigs";


class KoiosApi {

    static koios = axios.create({
        baseURL: CardanoConfigs.koios.url,
        timeout: CardanoConfigs.koios.timeout,
        headers: {"Content-Type": "application/json"}
    });

    /**
     * gets utxo boxes owned by the address
     * @param address
     */
    static getAddressBoxes = (address: string): Promise<Utxo[]> => {
        return this.koios.post('/address_info', {"_address": address})
            .then(res => res.data[0].utxo_set)
    }

    /**
     * gets tx confirmation
     * @param txId
     */
    static getTxConfirmation = (txId: string): Promise<number> => {
        return this.koios.post('/tx_status', {"_tx_hashes": [txId]})
            .then(res => res.data[0].num_confirmations)
    }

    /**
     * returns transaction input and output utxos
     * @param txHashes
     */
    static getTxUtxos = (txHashes: Array<string>): Promise<Array<Tx>> => {
        return this.koios.post<Array<{ inputs: Array<Utxo>, outputs: Array<Utxo> }>>(
            '/tx_utxos', {"_tx_hashes": txHashes}
        ).then(res => {
            return res.data.map((tx: { inputs: Array<Utxo>, outputs: Array<Utxo> }) => {
                return {
                    utxosOutput: tx.outputs,
                    utxosInput: tx.inputs,
                }
            });
        });
    }

    /**
     * returns tx meta data
     * @param txHashes
     */
    static getTxMetaData = (txHashes: Array<string>): Promise<Array<TxMetaData>> => {
        return this.koios.post<Array<TxMetaData>>("/tx_metadata", {"_tx_hashes": txHashes}).then(
            res => res.data
        )
    }

}

export default KoiosApi
