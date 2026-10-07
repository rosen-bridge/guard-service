---
'guard-service': patch
---

Fix the `logDuration` argument of the `LogLevelHealthCheck` where it was passed as milliseconds while expecting seconds
