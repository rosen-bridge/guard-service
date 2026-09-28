# Zcash transparent payment

This package constructs, validates, and signs a single-input transparent Zcash v5 payment through Rosen's `PaymentTransaction` and `EcdsaSignMediator` interfaces. It supports P2PKH reserve inputs and P2PKH outputs, including a positive change output. Shielded and Unified recipients are outside this package's current payment profile.

The caller must provide an independently approved intent containing the event, network, reserve address, input outpoint and amount, payment order, branch, expiry, and exact fee. `ZcashTransaction` checks constructed bytes and the ZIP-244 digest against a SHA-256-pinned native payment process and the native inspector from `@rosen-bridge/rosen-extractor`. Imported proposals are compared with that separate intent before signing. The resulting authorization is checked against the reserve script and full signed serialization.

`SourceCheckedZcashSigner` rechecks the selected transparent input, chain identity, confirmation policy, branch schedule, and candidate expiry immediately before a new signing dispatch. A successful source read is an observation, not a UTXO reservation or proof that the source cannot reorg. The guard service owns durable reservation, approval, submission, and reconciliation.

Build with `npm run build --workspace @rosen-chains/zcash-payment` from the guard monorepo. Native integration tests require `ZCASH_PAYMENT_BIN`, `ZCASH_PAYMENT_SHA256`, `ZCASH_INSPECTOR_BIN`, and `ZCASH_INSPECTOR_SHA256` for locally built native executables. The RPC transport test runs without those executables.
