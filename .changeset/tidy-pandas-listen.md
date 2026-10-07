---
'guard-service': patch
---

Fix the log health check window being 1000 times longer than configured: `healthCheck.logs.duration` is in seconds and `LogLevelHealthCheck` already converts it to milliseconds, so `Configs.logDuration` no longer multiplies it by 1000 again
