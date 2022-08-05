import ErgoUtils from "../chains/ergo/helpers/ErgoUtils";

class Contracts {

    static watcherPermitAddress = "9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD" // TODO: implement this
    static watcherPermitErgoTree = ErgoUtils.addressStringToErgoTreeString(this.watcherPermitAddress)
    static watcherPermitContract = ErgoUtils.addressStringToContract(this.watcherPermitAddress)

    static triggerEventAddress = "9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD" // TODO: implement this
    static triggerEventErgoTree = ErgoUtils.addressStringToErgoTreeString(this.triggerEventAddress)
    static triggerEventContract = ErgoUtils.addressStringToContract(this.triggerEventAddress)

}

export default Contracts
