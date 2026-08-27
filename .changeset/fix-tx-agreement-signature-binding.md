---
'guard-service': major
---

Guards now sign (and verify) a hash of the serialized `PaymentTransaction` (`txDataHash`) instead of `txId`, and approve the transaction they independently verified and hold in memory instead of the one included in the received approval message, verifying its data hash matches beforehand
