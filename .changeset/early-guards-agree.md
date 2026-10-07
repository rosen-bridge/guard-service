---
'guard-service': patch
---

Count event synchronization responses per transaction and verify that a response's actualTxId belongs to its transaction, so guards cannot reach quorum with different transactions or with a transaction that was never confirmed
