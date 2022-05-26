import axios from "axios";
import config from "config";
import { Utxo } from "../models/Models";


class KoiosApi {

    static koios = axios.create({
        baseURL: config.get?.('koios.url'),
        timeout: config.get?.('koios.timeout'),
        headers: {"Content-Type": "application/json"}
    });

    // TODO: add doc string
    static getAddressBoxes = (address: string): Promise<Utxo[]> => {
        return this.koios.post('/address_info', {"_address": address})
            .then(res => res.data[0].utxo_set)
    }

}

export default KoiosApi
