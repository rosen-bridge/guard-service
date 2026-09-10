---
'@rosen-chains/cardano-koios-network': patch
---

Stop throwing `FailedError` on failed on-chain transactions in `getTransaction` and return the transaction with `isValid: false` instead
Fix `getUtxo` and `isBoxUnspentAndValid` to account for the effective on-chain outcome of a failed transaction
