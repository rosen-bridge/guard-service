---
'@rosen-chains/bitcoin-runes-rpc': patch
'@rosen-chains/doge-rpc': patch
'@rosen-chains/handshake-rpc': patch
---

Add `jsonrpc: '2.0'` to JSON-RPC requests so providers that require it no longer reject them
