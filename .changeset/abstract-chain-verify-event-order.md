---
'@rosen-chains/abstract-chain': patch
---

Reorder `verifyEvent` to run `verifyLockTransactionExtraConditions` before extracting rosen data from the lock transaction, so a chain can reject an invalid lock transaction (e.g. one that failed on-chain) without an unhandled error being thrown, instead of resolving the event as invalid.
