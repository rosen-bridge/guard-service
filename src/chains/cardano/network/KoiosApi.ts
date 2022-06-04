import axios from "axios";
import config from "config";
import { Utxo } from "../models/Interfaces";


class KoiosApi {

    static koios = axios.create({
        baseURL: config.get<string>('cardano.koios.url'),
        timeout: config.get<number>('cardano.koios.timeout'),
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

}

export default KoiosApi
