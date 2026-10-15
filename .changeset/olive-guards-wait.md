---
'guard-service': patch
---

Await public status updates in DatabaseAction status setters so sequential status changes are queued to the public status service in the order they were set
