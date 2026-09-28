import type { EcdsaSignMediator } from '@rosen-chains/abstract-chain';
import type { NativeInspectionProvider } from '@rosen-bridge/rosen-extractor';
import { fail, hex, type NativePaymentProvider } from './nativePayment.js';
import { ZcashTransaction, publicKeyMatches, type ZcashPaymentIntent } from './zcashTransaction.js';

/** Instance-bound signer context. Coalescing is in-memory only, not restart recovery. */
export class ZcashSignProcessor {
  readonly #pubkey: string;
  readonly #sign: EcdsaSignMediator['sign'];
  readonly #pending = new Map<string, Promise<ZcashTransaction>>();
  constructor(private readonly native: NativePaymentProvider, private readonly inspector: NativeInspectionProvider,
    mediator: EcdsaSignMediator, compressedPubkeyHex: string) {
    this.#pubkey = hex(compressedPubkeyHex, 66);
    if (typeof mediator?.sign !== 'function') fail('signer');
    this.#sign = mediator.sign.bind(mediator);
    Object.freeze(this);
  }

  sign(transaction: ZcashTransaction, expectedIntent: ZcashPaymentIntent): Promise<ZcashTransaction> {
    // Synchronous validation and deep snapshot precede the first signer await.
    const snapshot = transaction.validate(expectedIntent, this.native, this.inspector);
    publicKeyMatches(this.#pubkey, snapshot.getIntent().input.scriptPubKeyHex);
    if (snapshot.getSignedHex() !== undefined) return Promise.resolve(snapshot);
    const key = snapshot.toJson();
    const previous = this.#pending.get(key);
    if (previous) return previous;
    // Scheduling after insertion also handles a reentrant mediator callback.
    const pending = Promise.resolve().then(async () => {
      const response = await this.#sign(Uint8Array.from(Buffer.from(snapshot.getDigest().sighash_all, 'hex')));
      hex(response.signature, 128); hex(response.signatureRecovery, 2);
      return snapshot.finalize(response.signature, this.#pubkey, this.native, this.inspector);
    });
    this.#pending.set(key, pending);
    void pending.then(() => {this.#pending.delete(key);}, () => {this.#pending.delete(key);});
    return pending;
  }
}
