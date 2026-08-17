---
'guard-service': patch
---

- fix parameterize SQL queries in databaseAction.ts
- Improve `getConfirmedUnsavedRevenueEvents` and `getEventCommitments` methods to use parameterized queries instead of string interpolation/concatenation.
