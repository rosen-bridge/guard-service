---
'guard-service': patch
---

Fix a bug in DatabaseHandler while inserting a new transaction where it should throw error if there as an advanced tx for the event/order of the new tx
