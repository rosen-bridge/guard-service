import { EncryptionHandler } from './EncryptionHandler';
import { blake2b } from 'blakejs';
import pkg from 'secp256k1';

// TODO: replace this class with same one in tss package (#243)
class EcDSA extends EncryptionHandler {
  private readonly key: Uint8Array;

  constructor(key: string) {
    super();
    this.key = Uint8Array.from(Buffer.from(key, 'hex'));
  }

  getPk = async () => {
    return Buffer.from(pkg.publicKeyCreate(this.key, true)).toString('hex');
  };

  sign = async (message: string): Promise<string> => {
    const bytes = blake2b(message, undefined, 32);
    const signed = pkg.ecdsaSign(bytes, this.key);
    return Buffer.from(signed.signature).toString('hex');
  };

  verify = async (
    message: string,
    signature: string,
    signerPublicKey: string
  ): Promise<boolean> => {
    const msg = blake2b(message, undefined, 32);
    const sign = Buffer.from(signature, 'hex');
    const publicKey = Buffer.from(signerPublicKey, 'hex');
    return pkg.ecdsaVerify(sign, msg, publicKey);
  };
}

export { EcDSA };
