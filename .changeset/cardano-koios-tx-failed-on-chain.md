---
'@rosen-chains/cardano-koios-network': patch
---

Stop throwing `FailedError` on failed on-chain transactions in `getTransaction`; return the transaction with `isValid: false` instead so callers can handle it. Also fix `getUtxo` and `isBoxUnspentAndValid` to account for the effective on-chain outcome of a failed transaction: only its collateral is applied, so the requested output only exists if it is the transaction's collateral return output (computed from the parsed CBOR).
