import axios from "axios";
import { Utxo } from "../models/Interfaces";
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
    static getTxConfirmation = (txId: string): Promise<number | null> => {
        return this.koios.post('/tx_status', {"_tx_hashes": [txId]})
            .then(res => res.data[0].num_confirmations)
    }

}

export default KoiosApi
