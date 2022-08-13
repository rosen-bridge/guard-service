import { blake2b } from 'blakejs';
import pkg from "secp256k1";

class Encryption {

    /**
     * signs message using ECDSA
     * @param message
     * @param privateKey
     */
    static sign = (message: string, privateKey: Buffer): Uint8Array => {
        const bytes = this.blake2bHash(message)
        const signed = pkg.ecdsaSign(bytes, Uint8Array.from(privateKey))
        return Buffer.from(signed.signature)
    }

    /**
     * verifies ECDSA signature of the message
     * @param message
     * @param signature
     * @param publicKey
     */
    static verify = (message: string, signature: Buffer, publicKey: Buffer): boolean => {
        const bytes = this.blake2bHash(message)
        return pkg.ecdsaVerify(Uint8Array.from(signature), Uint8Array.from(bytes), Uint8Array.from(publicKey))
    }

    /**
     * calculates Blake2B hash of the message
     * @param message
     */
    static blake2bHash = (message: string): Uint8Array => {
        return blake2b(message, undefined, 32)
    }

}

export default Encryption
