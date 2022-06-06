import { Contract } from "ergo-lib-wasm-nodejs";
import Utils from "../chains/ergo/helpers/Utils";

class Contracts {

    static watcherPermitContract: Contract = Utils.addressStringToContract("9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD") // TODO: implement this

}

export default Contracts
