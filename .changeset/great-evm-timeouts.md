---
'guard-service': patch
---

Pass the Ethereum and Binance RPC timeouts to the EVM scanner in milliseconds: the configs are in seconds, but ethers expects milliseconds, so the configured timeout would have applied as a few milliseconds once the scanner honors it
