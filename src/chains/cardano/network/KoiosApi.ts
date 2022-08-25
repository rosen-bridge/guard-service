import axios from "axios";
import { KoiosTransaction, Utxo } from "../models/Interfaces";
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
            .catch(exp => {
                console.warn(`An error occurred while getting boxes of address [${address}] from Koios: ${exp.response.data}`)
            })
    }

    /**
     * gets tx confirmation
     * @param txId
     */
    static getTxConfirmation = (txId: string): Promise<number | null> => {
        return this.koios.post('/tx_status', {"_tx_hashes": [txId]})
            .then(res => res.data[0].num_confirmations)
            .catch(exp => {
                console.warn(`An error occurred while getting confirmation for tx [${txId}]: ${exp.response.data}`)
            })
    }

    /**
     * returns tx meta data
     * @param txHashes
     */
    static getTxInformation = (txHashes: Array<string>): Promise<Array<KoiosTransaction>> => {
        return this.koios.post<Array<KoiosTransaction>>("/tx_info", {"_tx_hashes": txHashes})
            .then(res => res.data)
            .catch(exp => {
                console.warn(`An error occurred while getting information of txs ${JSON.stringify(txHashes)}: ${exp.response.data}`)
                return []
            })
    }

}

export default KoiosApi
