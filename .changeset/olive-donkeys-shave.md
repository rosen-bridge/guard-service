---
'@rosen-chains/handshake-rpc': patch
---

Fix hsd compatibility issues in the Handshake RPC network:

- raise failed RPC calls, which hsd reports with HTTP 200 and an `error` object in the body rather than with an error status
- read the confirmation count from the `confirmations` field, as hsd does not report a `blockheight` for a transaction, which made every transaction look unconfirmed
- stop converting the values of the `/coin/address` endpoint from HNS, as it already reports them in dollarydoos, which inflated address balances and box values by a factor of a million
- exclude mempool coins from address boxes and assets, as hsd merges them into the `/coin/address` endpoint
- never return a fee ratio below the relay minimum of one dollarydoo per virtual byte, as a node estimating under it produced transactions the network rejects as underpaying
