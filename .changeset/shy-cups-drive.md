---
'@rosen-chains/ethereum': major
'@rosen-chains/binance': major
'@rosen-chains/evm': major
---

Removed `supportedTokens` from constructor arguments. Now, it is initialized by given TokenMap in constructor and can be updated using `updateSupportedTokens` function
