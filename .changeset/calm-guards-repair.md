---
'guard-service': patch
---

Reschedule periodic processor jobs after a failed run instead of letting one rejection stop the job (or crash the process via an unhandled rejection)
