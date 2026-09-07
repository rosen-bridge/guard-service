---
'@rosen-chains/bitcoin-runes': patch
---

Fix BTC change calculation in transaction generation, which refunded the value reserved for the universal change box twice when no runes remained as change, resulting in a negative fee whenever the intended fee was below 294 Satoshi
