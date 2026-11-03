---
'guard-service': patch
---

Pass the Ethereum and Binance RPC timeouts to the EVM asset health check in milliseconds and read them from config instead of a hardcoded value: the configs are in seconds, but ethers expects milliseconds, so the configured timeout would have applied as a few milliseconds once the asset check honors it
