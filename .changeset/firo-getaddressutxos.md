---
'@rosen-chains/firo-rpc': patch
---

Replace `listunspent` RPC with `getaddressutxos` for reduced attack surface. Filter unconfirmed UTXOs by `height > 0`. Fix fee ratio calculation (kB = 1000 bytes, not 1024).
