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
     * converts Ergo Contract to string representation of it's ergoTree
     */
    static contractStringToErgoTreeString = (contract: Contract): string => {
        return contract.ergo_tree().to_base16_bytes()
    }

    /**
     * converts string representation of number to BoxValue
     */
    static boxValueFromString = (amount: string): BoxValue => {
        return BoxValue.from_i64(I64.from_str(amount))
    }

    /**
     * converts bigint to BoxValue
     */
    static boxValueFromBigint = (amount: bigint): BoxValue => {
        return this.boxValueFromString(amount.toString())
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

    /**
     * converts hex string to bytearray
     */
    static hexStringToUint8Array = (str: string): Uint8Array => {
        return Buffer.from(str, "hex")
    }

    /**
     * converts bytearray to hex string
     */
    static Uint8ArrayToHexString = (bytes: Uint8Array): string => {
        return Buffer.from(bytes).toString("hex")
    }

    /**
     * checks if two arrays have same values
     * @param source first array
     * @param target second array
     */
    static doArraysHaveSameStrings = (source: string[], target: string[]): boolean => {
        if (source.length !== target.length) return false

        return !source.some(value => !target.includes(value))
    }

}

export default Utils
