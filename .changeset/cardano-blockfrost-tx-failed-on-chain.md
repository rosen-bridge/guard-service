---
'@rosen-chains/cardano-blockfrost-network': patch
---

Stop throwing `FailedError` on failed on-chain transactions in `getTransaction` and return the transaction with `isValid: false` instead
Fix `getUtxo` and `isBoxUnspentAndValid` to look up the requested output by its actual `output_index` instead of its position in the `txsUtxos` response array
