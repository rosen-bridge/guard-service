---
'guard-service': patch
---

Complete a confirmed transaction and move its event/order in a single database transaction, so a failure between the writes cannot leave the event or order stuck; also re-drive completed transactions whose event/order was left behind by such a stop
