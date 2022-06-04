import axios from "axios";
import { Utxo } from "../models/Interfaces";
import Configs from "../../../helpers/Configs";


class KoiosApi {

    static koios = axios.create({
        baseURL: Configs.cardano.koios.url,
        timeout: Configs.cardano.koios.timeout,
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
