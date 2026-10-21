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
credentials. HTTPS is required except for literal IPv4 addresses in `127.0.0.0/8`
or IPv6 `::1`. HTTP DNS names, including `localhost`, are rejected; use a literal
loopback address for local BCHN or HTTPS for a remote endpoint. Shortened, octal,
hexadecimal and integer IPv4 spellings and IPv4-mapped IPv6 addresses do not
qualify for the HTTP exception. Equivalent expanded IPv6 loopback notation is
accepted. TLS certificate verification uses the platform defaults.

Supply both `auth.username` and `auth.password` or omit `auth`. Each credential
must be nonempty, at most 1024 characters, and contain no control characters or
surrounding whitespace; usernames cannot contain a colon. URL credentials,
fragments, ambiguous authority syntax and all redirects are rejected. Credentials
and node error text do not enter adapter error messages. Submission accepts a
verified signed envelope, rechecks every retained parent against current unspent state,
and requires the node to return the exact signed transaction ID.

## Read-only capability observations

Use `probeBitcoinCashRpcCapabilities` to exercise the Guard provider against an
operator-selected endpoint. It calls the actual provider through the exported
HTTP transport and a fixed read-only RPC allowlist. It never imports an address,
rescans a wallet, generates keys, signs, mines or broadcasts a transaction.

Supply the wallet-specific URL, expected chain and credentials through your
normal private configuration. Select a known transaction and its current-chain
block, an authenticated native outpoint, the imported treasury address, and a
transaction hash for a bounded mempool read. Recovery additionally needs the
exact canonical unsigned body of an operator-selected transaction already
retained in wallet history; indexed absence needs a separately selected hash
expected to be absent. Keep those inputs with the operator.

```typescript
import {
  BitcoinCashRpcProbeOptions,
  probeBitcoinCashRpcCapabilities,
} from '@rosen-chains/bitcoin-cash-rpc';

// Values come from the operator's selected endpoint and sample inventory.
const options: BitcoinCashRpcProbeOptions = {
  config: {
    url: rpcUrl,
    expectedChain: 'regtest',
    auth: { username: rpcUsername, password: rpcPassword },
    timeoutMs: 5_000,
    maxResponseBytes: 8_000_000,
    maxUtxos: 25,
    maxMempoolTransactions: 1_000,
    maxBlockTransactions: 10_000,
    walletHistoryPageSize: 50,
    maxWalletHistoryPages: 2,
  },
  samples: {
    treasuryAddress,
    blockHash,
    transactionId,
    outpoint: `${parentTransactionId}.${outputIndex}`,
    mempoolTransactionId,
    unsignedRecoveryBody, // Uint8Array; omit if no selected recovery sample.
    absentTransactionId, // Omit if no selected absence sample.
  },
  totalTimeoutMs: 30_000,
  maxRequests: 200,
};
const report = await probeBitcoinCashRpcCapabilities(options);
console.table(report.capabilities);
```

The endpoint, chain, work limits and supplied samples are validated before
network calls. Probes run serially. The shared deadline defaults to 30 seconds
(maximum 120 seconds), and
the request ceiling defaults to 200 (maximum 500). Each request's timeout is the
smaller of its configured timeout and the remaining deadline. Budget exhaustion
stops subsequent dispatches; a pending HTTP request is aborted and awaited.
Provider cardinality and response limits also apply. Raising the wallet scan
limits cannot override the shared request or time budget.

The report contains only fixed capability/status/reason codes and a request
count. It excludes endpoint URLs, credentials, server error messages, sample
identifiers and transaction bytes. Each capability has `passed`, `failed` or
`unexercised` status; there is no aggregate readiness verdict.

| Capability                                              | Evidence required for `passed`                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `identity`                                              | BCHN client identity, configured chain and valid height/tip.                           |
| `block_info`, `block_transactions`, `known_transaction` | Provider-validated header, block membership and known transaction bytes, respectively. |
| `treasury_address`                                      | Imported/owned address recognition and a valid bounded wallet read.                    |
| `treasury_outputs`                                      | At least one authenticated, confirmed, mature native wallet output.                    |
| `prevout`, `current_output`                             | Authenticated parent output; additionally a usable current output for the latter.      |
| `mempool_read`                                          | A valid bounded mempool identifier response; the selected hash may be absent.          |
| `wallet_recovery`                                       | Matching signed bytes returned for the supplied canonical unsigned body.               |
| `indexed_absence`                                       | `getTxConfirmation` returns `-1` after validating a synced current index.              |

Missing samples, empty wallet results, spent/immature outputs and a recovery
scan without matching bytes leave the relevant capability `unexercised`.
Identity failure skips all dependent groups. A failed block or prevout group
skips its dependent reads, while independent groups may continue within budget.
`unexpected_presence` means the selected absence hash exists; it does not
establish the indexed-absence path.

Treasury recognition cannot establish historical rescan coverage. A recovery
observation covers the supplied body and the provider's witness-shape checks;
the chain must still verify recovered signatures against retained parents.
Repeat the procedure separately for each deployment and retain its private
endpoint/sample inventory with the report. Agreement between URLs does not
establish independent infrastructure. These Guard reads do not qualify the
Scanner's verbosity-2 block-body path, production custody, release installation,
or operational bridge activation.
