---
'guard-service': minor
---

Remove `txSignTimeout` config

- The `TransactionProcessor` will use the Sign Status Pulling feature and no longer need sign timeout config
- The `MultiSigHandler` has its own sign timeout config (`ergoMultiSig.signTimeout`)
