---
'@rosen-chains/ergo-explorer-network': patch
'@rosen-chains/ergo-node-network': patch
---

Add missing debug/warn logs to fallback-return code paths (e.g. tx/box not found, submitted transaction success) and include the full stringified API error response instead of just its `reason` field when throwing errors, in `ErgoExplorerNetwork` and `ErgoNodeNetwork`
