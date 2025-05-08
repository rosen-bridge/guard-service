---
'@rosen-chains/doge-blockcypher': patch
'@rosen-chains/doge-rpc': patch
---

Fix some minor issues:

- Remove `TIMEOUT` and `getSavedTransactionById` from `DogeRpcNetwork` constructor
- Fix splitting character to `.`
- Add error handling to `getAddressBoxes` of `DogeBlockcypherNetwork`
