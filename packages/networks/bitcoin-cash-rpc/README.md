# Bitcoin Cash Node RPC network

`BitcoinCashRpcNetwork` provides native BCH reads and transaction submission for
`@rosen-chains/bitcoin-cash`. It trusts the operator's BCHN endpoint. Every public
read checks the configured `main`, `test`, or `regtest` chain and BCHN client
identity before using the RPC result.

Import the treasury address first. `getAddressBoxes` requires the corresponding
address to be owned or watch-only in the selected node wallet, and recovery needs
that wallet to have observed the transaction or completed an operator rescan.
The adapter does not index arbitrary addresses. Configure a wallet-specific RPC
URL when the node serves multiple wallets; signing keys stay outside BCHN.
Enable `-txindex=1` for source transactions outside that wallet. Global
transaction absence requires a synced index at the current chain height and tip;
if the node cannot expose that index state, the adapter reports unavailable
instead of returning `-1`.

The application accepts the dedicated codec's native mainnet P2PKH20/P2SH20
CashAddr format. On a test or regtest endpoint it translates the same locking
script and payload to `bchtest:` or `bchreg:` for wallet RPC calls.

Each listed UTXO is checked against canonical parent bytes and a current
`gettxout` response with mempool spending included. Spent, unconfirmed, and
immature coinbase outputs are excluded. CashTokens parents are rejected even if
RPC token metadata is absent. `getPrevout` returns authenticated historical
parent context; `getUtxo` also requires current unspent and mature state.

Block reads check the requested hash, its exact height, current main-chain
membership, and block-qualified transaction bytes. Source transactions are
limited to 1 MB and 4096 inputs/outputs; the chain's signing and payment limits
remain 100 kB and 100 inputs/outputs. Raw bytes own transaction identity and
amounts, and RPC projections must agree with them.

Recovery scans `listtransactions` with watch-only entries included. It compares
authenticated wallet bytes from `gettransaction` with the complete approved body,
clearing only unlocking scripts, and returns signed
bytes for the chain to verify against its retained parents. It never uses a
process-local transaction mapping. A full page at the scan limit throws;
`undefined` means the bounded wallet-history scan reached its end without a
matching signed transaction. A changing tip or wallet transaction count also
throws. There is no dependency on `gettxspendingprevout`.
Unrelated retained or orphaned wallet entries require no block lookup. A matching
abandoned or conflicted transaction throws instead of reporting recovery absence;
an authenticated matching unconfirmed transaction can supply signed bytes.

Default work limits are 10 seconds per RPC, 8 MB per streamed response, 1000
wallet UTXOs, 1000 mempool transactions, 10000 transactions per block, and 20
wallet-history pages of 100 rows. Limits are configurable within fixed ceilings.
An exceeded limit throws instead of truncating a result. Wallet UTXOs are sorted
by transaction ID and output index before pagination.

Use `BitcoinCashRpcConfig` to set `url`, `expectedChain`, and optional basic-auth
credentials. URL credentials and redirects are rejected; credentials and node
error text do not enter adapter error messages. Submission accepts a verified
signed envelope, rechecks every retained parent against current unspent state,
and requires the node to return the exact signed transaction ID.
