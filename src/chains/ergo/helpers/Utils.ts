import { Address, BoxValue, Contract, I64 } from "ergo-lib-wasm-nodejs";

class Utils {

    /**
     * converts ergo address object to string representation of it's ergoTree
     */
    static addressToErgoTreeString = (address: Address): string => {
        return address.to_ergo_tree().to_base16_bytes()
    }

    /**
     * converts base58 string of address to string representation of it's ergoTree
     */
    static addressStringToErgoTreeString = (address: string): string => {
        return Address.from_base58(address).to_ergo_tree().to_base16_bytes()
    }

    /**
     * converts base58 string of address to Ergo Contract
     */
    static addressToContract = (address: Address): Contract => {
        return Contract.new(address.to_ergo_tree())
    }

    /**
     * converts base58 string of address to Ergo Contract
     */
    static addressStringToContract = (address: string): Contract => {
        return this.addressToContract(Address.from_base58(address))
    }

    /**
     * converts string representation of number to BoxValue
     */
    static boxValueFromString = (amount: string): BoxValue => {
        return BoxValue.from_i64(I64.from_str(amount))
    }

    /**
     * converts BoxValue to bigint
     */
    static bigintFromBoxValue = (amount: BoxValue): bigint => {
        return BigInt(amount.as_i64().to_str())
    }

    /**
     * converts I64 object of number to bigint
     */
    static bigintFromI64 = (amount: I64): bigint => {
        return BigInt(amount.to_str())
    }

    /**
     * converts bigint to I64 object
     */
    static i64FromBigint = (amount: bigint): I64 => {
        return I64.from_str(amount.toString())
    }

}

export default Utils
