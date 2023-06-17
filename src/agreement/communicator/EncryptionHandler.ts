export abstract class EncryptionHandler {
  sign: (message: string) => Promise<string>;

  verify: (
    message: string,
    signature: string,
    signerPublicKey: string
  ) => Promise<boolean>;

  getPk: () => Promise<string>;
}
