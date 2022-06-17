import { Contract } from "ergo-lib-wasm-nodejs";
import Utils from "../chains/ergo/helpers/Utils";

class Contracts {

    static watcherPermitAddress = "9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD" // TODO: implement this
    static watcherPermitErgoTree = Utils.addressStringToErgoTreeString(this.watcherPermitAddress)
    static watcherPermitContract = Utils.addressStringToContract(this.watcherPermitAddress)

    static triggerEventAddress = "9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD" // TODO: implement this
    static triggerEventErgoTree = Utils.addressStringToErgoTreeString(this.triggerEventAddress)
    static triggerEventContract = Utils.addressStringToContract(this.triggerEventAddress)

}

export default Contracts
