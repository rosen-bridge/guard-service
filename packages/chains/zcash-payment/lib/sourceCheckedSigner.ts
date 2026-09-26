import type {NativeInspectionProvider} from '@rosen-bridge/rosen-extractor';
import type {EcdsaSignMediator} from '@rosen-chains/abstract-chain';
import {hex, type NativePaymentProvider} from './nativePayment.js';
import {ZcashPaymentEvidence, type ZcashPaymentEvidenceReceipt} from './paymentEvidence.js';
import {ZcashSignProcessor} from './zcashSignProcessor.js';
import {ZcashTransaction, type ZcashPaymentIntent} from './zcashTransaction.js';

export interface ZcashSigningDispatch {
  readonly evidenceReceipt: ZcashPaymentEvidenceReceipt;
  readonly sighashAll: string;
}

/** Fresh source observation before a new mediator call; no reservation or broadcast authority. */
export class SourceCheckedZcashSigner {
  readonly #pending = new Map<string, Promise<ZcashTransaction>>();
  readonly #sign: EcdsaSignMediator['sign'];
  readonly #isInSign: EcdsaSignMediator['isInSign'];
  readonly #pubkey: string;
  constructor(private readonly evidence: ZcashPaymentEvidence, private readonly native: NativePaymentProvider,
    private readonly inspector: NativeInspectionProvider, mediator: EcdsaSignMediator, compressedPubkeyHex: string) {
    if (!(evidence instanceof ZcashPaymentEvidence) || typeof mediator?.sign !== 'function' ||
      typeof mediator?.isInSign !== 'function') throw new TypeError('Invalid source-checked signer');
    this.#pubkey = hex(compressedPubkeyHex, 66);
    this.#sign = mediator.sign.bind(mediator); this.#isInSign = mediator.isInSign.bind(mediator);
    Object.freeze(this);
  }
  /**
   * The optional gate belongs to this call and runs only before a new dispatch.
   * Callers must separately authorize access to retained signed outcomes.
   */
  sign(transaction: ZcashTransaction, expectedIntent: ZcashPaymentIntent,
    beforeMediator?: (observation: ZcashSigningDispatch) => Promise<void>): Promise<ZcashTransaction> {
    if (beforeMediator !== undefined && typeof beforeMediator !== 'function') {
      throw new TypeError('Invalid Zcash dispatch gate');
    }
    const snapshot = transaction.validate(expectedIntent, this.native, this.inspector);
    // An existing signed outcome is preserved, never discarded to trigger automatic replacement.
    if (snapshot.getSignedHex() !== undefined) return Promise.resolve(snapshot);
    const key = snapshot.toJson();
    // Authorization is per call: never inherit a different caller's pending gate.
    const existing = beforeMediator === undefined ? this.#pending.get(key) : undefined;
    if (existing) return existing;
    const pending = Promise.resolve().then(() => {
      const gate: EcdsaSignMediator = {
        isInSign: this.#isInSign,
        sign: async digest => {
          const evidenceReceipt = await this.evidence.check(snapshot);
          if (beforeMediator !== undefined) {
            await beforeMediator(Object.freeze({evidenceReceipt, sighashAll: Buffer.from(digest).toString('hex')}));
          }
          return this.#sign(Uint8Array.from(digest));
        },
      };
      const processor = new ZcashSignProcessor(this.native, this.inspector, gate, this.#pubkey);
      return processor.sign(snapshot, snapshot.getIntent());
    });
    if (beforeMediator === undefined) {
      this.#pending.set(key, pending);
      void pending.then(() => {this.#pending.delete(key);}, () => {this.#pending.delete(key);});
    }
    return pending;
  }
}
