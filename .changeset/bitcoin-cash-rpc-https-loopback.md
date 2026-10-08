---
'@rosen-chains/bitcoin-cash-rpc': patch
'guard-service': patch
---

Require HTTPS for BCH RPC endpoints outside literal IPv4 or IPv6 loopback addresses. Reject ambiguous endpoint URLs and invalid separate credential pairs, and validate the endpoint policy when Guard configuration loads.
