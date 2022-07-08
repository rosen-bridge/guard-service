import { blake2b } from 'blakejs';
import pkg from "secp256k1";

class Codecs {

    /**
     * signs message using ECDSA
     * @param message
     * @param privateKey
     */
    static sign = (message: string, privateKey: Buffer): Uint8Array => {
        const bytes = blake2b(message, undefined, 32)
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
        const bytes = blake2b(message, undefined, 32)
        return pkg.ecdsaVerify(Uint8Array.from(signature), Uint8Array.from(bytes), Uint8Array.from(publicKey))
    }

    /**
     * converts number to 1 byte Uint8Array
     * @param num
     */
    static numberToByte = (num: number): Uint8Array => {
        const buffer = Buffer.alloc(1, 0)
        buffer.writeUint8(num)
        return buffer
    }

}

export default Codecs
