---
'@rosen-chains/cardano-blockfrost-network': patch
---

Stop throwing `FailedError` on failed on-chain transactions in `getTransaction`; return the transaction with `isValid: false` instead so callers can handle it. Also fix `getUtxo` and `isBoxUnspentAndValid` to look up the requested output by its actual `output_index` instead of its position in the `txsUtxos` response array: for a transaction failed on-chain, BlockFrost returns only the collateral return output (if any), whose `output_index` equals the number of the transaction's regular outputs rather than 0.
