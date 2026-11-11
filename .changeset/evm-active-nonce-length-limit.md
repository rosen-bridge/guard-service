---
'@rosen-chains/evm': major
---

Add `activeNonceLengthLimit` config to bound the nonce of generated and verified transactions, throwing `MaxActiveNonceExceededError` when generation exceeds it
