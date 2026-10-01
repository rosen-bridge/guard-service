---
'guard-service': patch
---

Use a separate guard event identity for Bitcoin Cash sources while preserving existing chains and contract request hashes. Scope commitment queries to the selected source and reject incompatible BCH database state before network and signing jobs start.

All guards enabling Bitcoin Cash must use the same event identity version. Existing prototype databases require authenticated remediation when their BCH rows fail the startup check.
