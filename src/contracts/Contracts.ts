import ErgoUtils from "../chains/ergo/helpers/ErgoUtils";

class Contracts {

    static watcherPermitAddress = "9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD" // TODO: implement this
    static watcherPermitErgoTree = ErgoUtils.addressStringToErgoTreeString(this.watcherPermitAddress)
    static watcherPermitContract = ErgoUtils.addressStringToContract(this.watcherPermitAddress)

    static commitmentAddress = "9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD" // TODO: implement this
    static commitmentErgoTree = ErgoUtils.addressStringToErgoTreeString(this.commitmentAddress)
    static commitmentContract = ErgoUtils.addressStringToContract(this.commitmentAddress)

    static eventTriggerAddress = "9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD" // TODO: implement this
    static eventTriggerErgoTree = ErgoUtils.addressStringToErgoTreeString(this.eventTriggerAddress)
    static eventTriggerContract = ErgoUtils.addressStringToContract(this.eventTriggerAddress)

}

export default Contracts
