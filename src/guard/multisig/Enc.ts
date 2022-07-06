import pkg  from 'secp256k1';
import { blake2b } from 'blakejs';


const sign = (message: string, privateKey: Buffer) => {
    const bytes = blake2b(message, undefined, 32)
    const signed = pkg.ecdsaSign(bytes, Uint8Array.from(privateKey))
    return Buffer.from(signed.signature)
}

const verify = (message: string, signature: Buffer, publicKey: Buffer) => {
    const bytes = blake2b(message, undefined, 32)
    return pkg.ecdsaVerify(Uint8Array.from(signature), Uint8Array.from(bytes), Uint8Array.from(publicKey))
}

export {
    sign,
    verify,
}