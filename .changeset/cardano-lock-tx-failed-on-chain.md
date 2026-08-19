---
'@rosen-chains/cardano': patch
---

Fix `verifyLockTransactionExtraConditions` to correctly detect and reject lock transactions that failed on-chain instead of always returning true. `CardanoTx` gains an `isValid` field reflecting whether the transaction succeeded on-chain.
