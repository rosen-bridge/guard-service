---
'guard-service': minor
---

Guard now stores the rejected (invalid) events in a separate table, fixing a bug that events with multiple trigger boxes were not processed if the first trigger was rejected.
