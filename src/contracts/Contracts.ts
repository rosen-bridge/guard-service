import { Address, Contract } from "ergo-lib-wasm-nodejs";
import Utils from "../chains/ergo/helpers/Utils";
import Scripts from "./Scripts";

class Contracts {

    static watcherPermitContract: Contract = Utils.addressStringToContract("") // TODO: implement this

}

export default Contracts
