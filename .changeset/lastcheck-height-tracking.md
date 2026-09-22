---
'guard-service': patch
---

Set `lastCheck` to the current chain height when a transaction is inserted into the database, instead of leaving it at `0`, and update it whenever a sign-failed transaction is revalidated and resent for signing
`lastCheck` is no longer updated when a transaction is signed, since signing doesn't verify anything on-chain.
