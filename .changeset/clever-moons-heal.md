---
'guard-service': patch
---

- fix parameterize SQL queries in databaseAction.ts
- Refactored `getConfirmedUnsavedRevenueEvents` and `getEventCommitments` methods to use parameterized queries instead of string interpolation/concatenation, improving security against SQL injection attacks and query readability.
