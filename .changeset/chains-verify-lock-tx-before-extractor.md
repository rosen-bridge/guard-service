---
'@rosen-chains/binance': patch
'@rosen-chains/bitcoin': patch
'@rosen-chains/bitcoin-runes': patch
'@rosen-chains/doge': patch
'@rosen-chains/ergo': patch
'@rosen-chains/ethereum': patch
'@rosen-chains/evm': patch
'@rosen-chains/firo': patch
'@rosen-chains/handshake': patch
---

Following `@rosen-chains/abstract-chain` update, the `verifyLockTransactionExtraConditions` is now run before the lock transaction is passed to the Rosen extractor, so an invalid lock transaction (e.g. one that failed on-chain) is rejected before its data is extracted, instead of after.
