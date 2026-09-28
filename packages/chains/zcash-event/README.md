# Zcash event verification

This package connects transparent Zcash extraction to the guard's inherited
`AbstractChain.verifyEvent` path. It contains abstract chain and network
classes; a concrete network source and payment/signing implementation are
separate integration work.

The source must provide complete blocks with a hash, parent hash, height,
transaction count, and transaction IDs, plus verbose transactions containing
`txid`, `hex`, `size`, `blockhash`, and `height`. The adapter checks response
identity, block membership, transaction height, and canonical serialization.
It delegates deposit parsing to `ZcashRpcRosenExtractor` from
`@rosen-bridge/rosen-extractor` 12.2.0 or later. Missing or contradictory
evidence throws so event processing can be retried.

The source is responsible for selecting the configured Zcash network and its
canonical block view. This package does not establish consensus, confirmations,
finality, payment validity, or signing readiness.

The retained block fixture and native inspector exercise the actual inherited
verification path. Set `ZCASH_INSPECTOR_BIN` and `ZCASH_INSPECTOR_SHA256` for
`npm test --workspace @rosen-chains/zcash-event`.
