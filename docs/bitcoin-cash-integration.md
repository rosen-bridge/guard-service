# Bitcoin Cash integration

Status: draft contribution; RCS review, UI interaction and published dependency closure remain pending. Updated: 2026-10-05.

This is the coordinating document for native BCH support across Rosen Utils,
Scanner, Guard, Watcher, Health Check and UI. The contribution
includes ordinary native BCH deposits and payouts. CashTokens, arbitrary scripts
and token-aware CashAddr are outside this scope. Wrapped representations and
Ergo-side deployment outputs require Rosen's contract and token work.

The authoritative contribution baseline is
[`rosen-bridge/rcs@7b9784dae9d8d5b66b80de7a6043d1ba36a3a4bf`](https://github.com/rosen-bridge/rcs/tree/7b9784dae9d8d5b66b80de7a6043d1ba36a3a4bf),
verified on 2026-10-04:

- [RCS-001: TypeScript testing](https://github.com/rosen-bridge/rcs/blob/7b9784dae9d8d5b66b80de7a6043d1ba36a3a4bf/rcs-001.md).
- [RCS-002: contribution conventions](https://github.com/rosen-bridge/rcs/blob/7b9784dae9d8d5b66b80de7a6043d1ba36a3a4bf/rcs-002.md).
- [RCS-003: Bridge Expansion Kit](https://github.com/rosen-bridge/rcs/blob/7b9784dae9d8d5b66b80de7a6043d1ba36a3a4bf/rcs-003/README.md).

The Bitcoin Fork chapter has no implementation instructions at this revision.
The general new-chain requirements therefore govern this contribution.

Coordinated draft submissions: [Utils #11](https://github.com/rosen-bridge/utils/pull/11),
[Scanner #16](https://github.com/rosen-bridge/scanner/pull/16),
[Guard #29](https://github.com/rosen-bridge/guard-service/pull/29),
[Watcher #17](https://github.com/rosen-bridge/watcher/pull/17),
[Health Check #5](https://github.com/rosen-bridge/health-check/pull/5) and
[UI #33](https://github.com/rosen-bridge/ui/pull/33).

[Sign Protocols #9](https://github.com/rosen-bridge/sign-protocols/pull/9)
is a separate, protocol-generic TSS admission fix. It follows its own review
and binary release process and is not part of the BCH integration series.
The TSS consumer and deployment requirements below remain relevant to BCH.

Rosen has requested revisions to the integration documents and will provide
detailed feedback. The six integration PRs remain drafts. The follow-up to the
[second operator review](https://github.com/rosen-bridge/watcher/pull/17#issuecomment-5969281002)
addresses Guard compatibility, witness deployment, diagnostics and dependency
isolation. These proposed changes and their test results do not establish
maintainer acceptance of the integration design.

## Architecture and transaction example

Deposits follow wallet signing → network-owned lock construction and submission
→ BCH RPC scanner → observation extractor → Guard universal extractor and event
processing. Payouts use the BCH chain/provider, Rosen's signing mediator and
persisted recovery of the actual signed envelope. The app supplies configuration
and connects the network and wallet packages.

The maintained example is in Utils:
[canonicalLockTestData.ts](https://github.com/a-shannon/utils/blob/0f9e147e4a87a2ae9a24ea5dd6f2e169c6edada7/packages/rosen-extractor/tests/getRosenData/bitcoin-cash/canonicalLockTestData.ts).
It contains the exact parent, unsigned and signed bytes retained from the local
BCHN regtest fixture. Its signed transaction ID is
`0ad574daa5b9311754447d2f93ee46e3a0b273cfe5607706cc5373a30f3504eb`.

| Field | Retained example |
| --- | --- |
| Treasury output | 100,000 satoshis |
| Miner fee | 576 satoshis |
| Wrapped amount after TokenMap conversion | 1,000 units at six decimals |
| Metadata bridge / destination network fees | 100 / 100 Rosen-normalized units |
| Asset / environment | Native BCH; synthetic represented token and regtest lineage |

Both RPC and universal JSON extractors return the same event. The maintained
11-case replay verifies the signed body against its authenticated parent and
rejects isolated amount, metadata, prevout-value and RPC projection mutations.
It is offline byte/signature/extractor evidence; current node admission, wallet
relay, threshold custody and a confirmed operational deposit remain separate.

Run from Utils after its declared dependencies are available:

```sh
npm run test --workspace @rosen-bridge/rosen-extractor -- --run tests/getRosenData/bitcoin-cash/bitcoinCashRpcRosenExtractor.canonical.spec.ts tests/getRosenData/bitcoin-cash/bitcoinCashRosenExtractor.canonical.spec.ts tests/getRosenData/bitcoin-cash/canonicalLockTestUtils.spec.ts
```

## Decisions requiring Rosen input

The UI correction follows the existing Doge/MyDoge and Firo network/wallet
extension points at UI commit
[`289d6d7bd1f09f8a6b1e3c5d88286e3d8e5f454d`](https://github.com/rosen-bridge/ui/tree/289d6d7bd1f09f8a6b1e3c5d88286e3d8e5f454d).
Network reads, fee/transaction algorithms and bounded submission now belong to
`networks/bitcoin-cash`; Cashonize session, pairing and signing belong to
`wallets/cashonize`. The app connects these packages and uses its existing
`wrap`/`unwrapFromObject` server-action convention.

| Rosen UI expectation | Current correction and remaining condition |
| --- | --- |
| Chain-only scope | Generic form/wallet fixes, data-source API extension, icon-type refactor and Webpack changes are excluded. The scanner API prerequisite below is separate work. |
| Remove equivalent rewrites | Unrelated assertion rewrites and shared configuration/generator edits are reverted. |
| Network/wallet ownership | Algorithms and lifecycle moved to their packages; app actions, configuration and route delegate. Shared hooks only import the operational registries. |
| Team-owned new UI | Custom pairing dialog removed; Cashonize excluded from the active wallet registry. An accepted connection interaction is required before activation. |
| Reuse existing interfaces | Existing base classes, components and action wrapper reused. The SDK and bounded submission differences below still require direction. |
| Published dependencies first | External BCH scanner/extractor/codec releases and normal clean installation remain pending. Private UI workspaces use the repository build process. |
| Package/test conventions | Corrected tests identify their actual target/scenario, follow helper/data conventions and mirror server paths. Package checks remain local preparation; prerequisite-dependent failures are disclosed below. |
| No integration documentation in UI | The added UI `docs/` folder is removed; this document is the integration entry point. |

Three decisions affect the next UI version:

- **Connection interaction.** Cashonize needs an approved pairing presentation.
  Firo's payment-URI QR flow does not provide this contract. At Cashonize
  [`75e50ae3ee786622868d84cdfdfbb51644e4f288`](https://github.com/cashonize/cashonize-wallet/tree/75e50ae3ee786622868d84cdfdfbb51644e4f288),
  `src/utils/payments/bip21.ts` parses address/amount parameters, while
  `src/components/bchWallet.vue` sends an address/value output without Rosen's
  OP_RETURN. This is a source comparison, not a wallet execution test. The
  WalletConnect Sign Client 2.25.0 adapter remains prepared and inactive; the
  existing EVM adapter does not expose its BCH signing methods.
- **Submission contract.** The existing action wrapper handles safe values and
  errors. The proposed dedicated submission port additionally bounds the
  streamed signed body, propagates request cancellation and carries one trusted
  deadline through the final write. It is network-owned; its fit with Rosen's
  expected interface remains to agree. Fee, balance and preparation queries
  already use the existing action wrapper.
- **Scanner prerequisite.** Service uses abstract scanner 2.0.3; the BCH producer
  uses 4.x. Their private `scannerName` fields prevent passing BCH to the shared
  nominal scheduler type. A separate type-only prerequisite limits that argument
  to its actual `update()`/`name()` contract. Seven local contract checks compile
  the real v2/v4 APIs, reject four isolated wrong interfaces and verify unchanged
  executable scheduler output. It is excluded from the BCH diff. The current
  Service retains this one type error until the prerequisite is integrated.

The network package passes 458 tests; prior wallet validation passes 86 tests in six
suites. App configuration/registration/actions pass 22 cases, constants pass
two and the actual Next submission route passes five. The actual environment
module passes three cases and the prepared wallet factory two. Biome 2.5.4
passes for the 124 supported UI candidate files. Service storage passes
11 cases, including a populated PostgreSQL upgrade and reconnect. These are
local preparation results, with overlapping earlier scopes counted separately.
They do not establish released installation or enabled wallet operation.
The preceding default Next/Turbopack attempt reported 293 errors in the private
linked dependency graph. Its raw log was not recovered or independently
replayed in this audit. Earlier Webpack/browser receipts belong to the prior
candidate and do not validate this correction. RCS document review, producer
releases and the accepted UI contract remain open before review readiness.

## Design and boundaries

### Custody and transaction identity

The treasury is an ordinary P2PKH CashAddr derived from an aggregate secp256k1
public key. Guard delegates signing to Rosen's ECDSA mediator. BCH signatures
use SIGHASH_ALL with ForkID (0x41), with authenticated input values and scripts.
The treasury address must match the configured aggregate key. An operational
threshold group and key-generation ceremony still require qualification; local
signature fixtures alone do not prove multisigner custody.

Unsigned approvals and signed BCH transaction IDs are distinct. Payment
envelopes retain their approval identity through signing, persistence and
recovery. The actual signed ID is derived from authenticated signed bytes.
Source deposits already carry an on-chain ID and use a separate confirmation
path. Recovery matches a persisted body against bounded wallet history rather
than guessing the signed ID from an unsigned transaction.

### Deposits and amount handling

A deposit pays the treasury and includes one canonical OP_RETURN payload:
destination-chain index, bridge fee, destination network fee and encoded
destination address. The BCH RPC extractor authenticates raw transaction bytes,
transaction ID and RPC output amounts before interpreting this payload. It
rejects ambiguous payloads, malformed lengths, noncanonical pushes and
CashTokens. The universal extractor accepts JSON for the same transaction type
and applies Rosen amount conversion once.

Native BCH amounts and miner fees use integer satoshis. OP_RETURN bridge and
destination network fees use Rosen-normalized units. Amount conversion crosses
the Rosen TokenMap boundary explicitly; payout conversions require exactness.
Trusted submission must normalize the raw amount and apply the current server
fee quote, including its variable bridge-fee ratio, before validating metadata.
Treasury change remains raw BCH. The UI metadata builder uses the shared
destination registry and address codec. BCH's own destination index remains
unassigned and disabled until Rosen provides the coordinated protocol value.

### Selection, fees and concurrency

Payouts use confirmed, authenticated, unreserved treasury UTXOs. Coinbase inputs
need 100 confirmations. Selection has explicit page, input and output bounds;
duplicate UTXOs and exhausted bounds fail rather than implying sufficient funds.
Unconfirmed transaction chaining is excluded from this first implementation.
Pending envelopes reserve their input outpoints, and persisted recovery protects
against duplicate submission following restart.

Fees use a configured positive integer rate per serialized legacy byte and an
absolute maximum. The signed envelope must preserve the approved body and fee
policy. Operators must set and monitor these limits; automatic fee-market
adaptation is not yet supplied.

### Endpoints and operations

One BCHN provider implementation may serve several independent endpoint
deployments. Watcher connector configuration supports its existing connector
manager pattern. Guard's wallet-backed RPC requires the treasury address to be
imported and the required transaction lookup/history facilities to be available.
These RPC credentials belong to server configuration.

Remote BCHN connections require HTTPS. HTTP is allowed only on literal IPv4
loopback addresses in `127.0.0.0/8` or IPv6 `::1`. Use a separate credential pair;
URL userinfo and redirects are rejected. A private network or the name
`localhost` does not bypass this rule.

Watcher BCH initialization fetches fee histories for TokenMap entries that
include `bitcoin-cash` before scanner/job readiness. A failed or empty applicable
fee set rejects initialization. Entry-point failure/exit behavior requires the
separate startup/build prerequisites and must be qualified on the released
candidate. Fees for entries without BCH are outside this gate.

### Observation eligibility and recovery

The proposed BCH policy requires the recorded source block to belong to the
active finalized ancestry reported by both the scanner RPC and a separately
configured witness. Watcher checks this before commitment and trigger signing,
and repeats it before queue broadcast, including retries after restart. Configure
`bitcoinCash.finalityRpc.url` and `timeout`; optional credentials use
`BITCOIN_CASH_FINALITY_RPC_USERNAME` and `BITCOIN_CASH_FINALITY_RPC_PASSWORD`.
The witness uses the scanner's explicit chain selection. Its origin must differ
from the scanner RPC, and operators must qualify independent administration.

Each check requires synchronized BCHN metadata, the exact persisted block hash
at its height, finalized coverage, coherent confirmation counts and a stable
tip and finalized hash across the reads. A parked branch blocks that event when
its common ancestor is below the event height. A common ancestor at or above
the event height already includes the event. Missing finalization, malformed
responses, an unavailable endpoint or a check exceeding 30 seconds holds work.

Guard uses its configured observation-confirmation threshold and independently
authenticates the transaction, block and event contents. It does not add a
second BCHN-finalization or parked-fork policy. Insufficient confirmations leave
the event unconfirmed; an inactive or inconsistent RPC branch causes a retry.
Neither condition alone persists a rejected event. Once compatible evidence is
available, the pending event can be confirmed. Event-content mismatches still
reject. This is a recovery contract, not a promise that two nodes at different
heights accept an event at the same instant.

The shared `bitcoinCashFinality.json` fixture and Guard's
`bitcoinCashFinalityCompatibility.spec.ts` exercise these persisted transitions
through the BCH RPC network, chain, event processor and migrated SQLite. The
Watcher counterpart checks the identical event block against both endpoint
views. Operators must align chain selection, address/token configuration and
confirmation policy across services before rollout; independently stricter
Guard depth settings can delay settlement even after Watcher eligibility.

The witness only adds a veto: Watcher proceeds when both primary and witness
pass. A witness cannot override a failing primary. A compromised witness alone
can stop progress but cannot weaken an honest primary's gate. This property is
relative to the primary's trusted RPC evidence; independent administration and
the selected finalization policy still require operator qualification.

With BCHN 29.2.0 defaults, a fresh deposit needs a header known for 7,200 seconds
and ten descendant blocks (eleven confirmations including its own block).
`FindBlockToFinalize` also checks node uptime, and finalization is evaluated on
a newly connected block rather than a wall-clock timer. Treat two hours as an
approximate lower bound, not a settlement promise: slow blocks, witness lag or
a node restart can extend it. UI estimates, queue monitoring and operator
timeouts must allow for this wait plus subsequent Ergo and destination-chain
processing. See the pinned [defaults](https://github.com/bitcoin-cash-node/bitcoin-cash-node/blob/07576013c91ff4a3a74acd85f189c69121cdad1b/src/validation.h#L159-L175)
and [finalization algorithm](https://github.com/bitcoin-cash-node/bitcoin-cash-node/blob/07576013c91ff4a3a74acd85f189c69121cdad1b/src/validation.cpp#L2463-L2509).

For a BCH Watcher, `/health/parameter/bitcoin-cash-finality` exposes the latest
event attempt through the existing health API. Its JSON `details` names the
event block/height, check timestamp and separate `source` and `witness` states.
This bounded snapshot is not a summary of all queued events; an older concurrent
attempt cannot overwrite a newer one. Every signing/broadcast gate still reads
fresh evidence. Refreshing health does not perform a new finality RPC check.

| Diagnostic | Meaning and operator action |
| --- | --- |
| `eligible` | This endpoint passed for the named event in the recorded attempt. Never reuse it as authorization. |
| `waiting-finalization` | No finalized checkpoint yet, or a coherent checkpoint below the event. Keep retrying; account for the default latency above. This routine wait logs at debug level and does not make health unstable by itself. |
| `rpc-failure` | Endpoint request, identity, authentication or response-envelope failure. Check the named source/witness deployment and private RPC diagnostics. |
| `branch-disagreement` | The named event or finalized hash differs from that endpoint's active ancestry. Keep work held and compare node histories. |
| `parked-fork` | A parked branch forks before the event. Investigate branch selection; do not bypass the gate by height alone. |
| `node-unsynchronized`, `snapshot-changed` | Let the node synchronize or retry a coherent snapshot. Persistent failures need endpoint investigation. |
| `invalid-evidence` | Malformed or inconsistent finality metadata. Check daemon compatibility and RPC integrity. |
| `invalid-observation`, `invalid-configuration`, `stale-evidence` | Correct the persisted identity/configuration or diagnose the 30-second collection budget. Work remains held. |

`no-event-checked` means this process has not attempted an event; `checking`
means its latest attempt is still running. Check timestamps when investigating
old results. The parameter supplements scanner synchronization and service
health; it is not a deployment or consensus-finality certificate.
An eligible result is never cached. The separate queue-height prerequisite
writes only its owned column so a stale queue object cannot undo newer validity
or removal flags. BCH retry coverage fails without that prerequisite.

This policy remains subject to Rosen review. BCHN finalization is a local node
decision; separate RPC reads are not an atomic snapshot and matching endpoints
do not prove consensus irreversibility. The implementation does not establish
the deployed fraud-cleanup contract policy. The operator review's account of
that policy must be checked against Rosen's accepted contracts before activation.

Watcher exposes the scanner's bounded budgets under `bitcoinCash.rpc.limits`;
Rosen Service accepts the same keys under its BCH `rpc.limits` configuration
and forwards the resolved policy to the scanner. Service configuration retains
its 120-second request-timeout ceiling; Watcher permits up to 300 seconds.
Defaults are 1,000,000 raw bytes per transaction, 4,096 inputs or outputs,
10,000 transactions per block, 32,000,000 aggregate raw bytes per block and
64,000,000 response bytes. The scanner README lists configurable ceilings.
`BCH_RPC_RESOURCE_LIMIT` identifies a budget stop: retain the checkpoint,
qualify a larger budget and process memory on the same block, then restart.
Do not skip the block. An isolated BCHN 29.2.0 block with 4,097 outputs was
accepted by the node, rejected at the default input/output budget and read
successfully with a budget of 8,192, preserving its hash and transaction bytes.

Scanner work budgets and deposit admission are separate. The shared extractor
and Guard source-deposit path currently cap each transaction at 1,000,000 bytes
and 4,096 inputs or outputs; Guard payout construction has smaller bounds.
Increasing scanner budgets permits reading larger unrelated chain transactions
but does not expand accepted deposit envelopes. Any expansion of that envelope
must update the extractor and Guard together and preserve identical acceptance
rules. The deployment review must accept the supported deposit profile.
Matched raw/RPC fixtures exercise both consumers at 4,096 and 4,097 inputs and
outputs, and at 1,000,000 and 1,000,001 bytes. Each exact bound accepts and each
isolated excess rejects. These are serialization/admission tests with coherent
transaction IDs and payloads; they do not prove script or consensus validity.

### BCHN version and historical reads

Local RPC qualification used BCHN 29.2.0 at source
[`07576013c91ff4a3a74acd85f189c69121cdad1b`](https://github.com/bitcoin-cash-node/bitcoin-cash-node/tree/07576013c91ff4a3a74acd85f189c69121cdad1b),
with no wallet, no `txindex` and no peers. Verbosity-2 blocks included raw
transaction hex. Block-qualified `getrawtransaction` worked without `txindex`,
including the scanner's fallback path. A P2S output reported as
`{asm: "1", hex: "51", type: "script"}` without an address was ingested.
This covers reading that output; configured treasury and payout address types
remain ordinary P2PKH20/P2SH20 CashAddr.

Twelve native checks exercise both scanner source and built output against that
node: a covered event succeeds; missing finalization, the wrong block hash and
an event above the checkpoint reject. Parking a branch initially leaves an
unsynchronized view, which rejects. Extending the surviving branch to a
synchronized tip permits an event below the parked branch's common ancestor.
These tests use explicit regtest finalization and disabled automatic unparking;
they do not qualify production depth/time policy or independent operators.

A real pruning test made a historical block unavailable through both block and
raw-transaction reads. A pruned primary scanner is usable only where every block body
required by the selected start, reorganization recovery and rescan range remains
available. `initial.height` is the last processed height; `-1` starts at genesis.
Choose it from verified history and deployment policy. The configurable request
timeout is 1–300 seconds; its default is 10 seconds. Qualify full-block latency
and memory under the intended deployment limits. Do not copy the obsolete
`excessiveblocksize` option into a 29.2.0 node profile.

A finality-only witness has a different history requirement. Its gate uses
`getnetworkinfo`, `getblockchaininfo`, `getfinalizedblockhash`, `getblockheader`,
`getblockhash` and `getchaintips`; it does not fetch block bodies. The maintained
native fixture `scripts/bchn-witness-qualification.mjs` in the BCH scanner
package builds fresh synthetic regtest history, prunes both the event body and
finalized-checkpoint body, rejects any body RPC through an allowlist proxy, and
still passes the built scanner's finality check. It also refuses a wrong event
hash. A separate fresh node with default finalization settings isolates the
age and depth thresholds using simulated time. This qualifies BCHN 29.2.0's
header/index path; it does not qualify production endpoint independence,
automatic-pruning thresholds or scanner rescan availability.

RPC `test` and `regtest` profiles support isolated qualification. Bridge metadata
uses the mainnet CashAddr codec and its exact locking scripts; these RPC profiles
do not introduce testnet CashAddr into the shared wire format.

The provider exports `probeBitcoinCashRpcCapabilities` for bounded read-only
qualification with operator-selected samples. Its fixed method allowlist refuses
wallet imports, rescans, signing and broadcast before dispatch. A shared deadline
and request ceiling limit the whole run. Eleven separate observations report
`passed`, `failed` or `unexercised`; empty wallets and missing recovery samples
cannot become successful capability evidence. The package README supplies the
sample inventory and invocation. The Scanner package README supplies a separate
read-only block-body qualification example with explicit per-request and size
bounds, sample identity checks and sanitized output. Its whole-run supervision,
fallback reads, historical coverage and infrastructure independence require
separate operator observations.

The UI additionally needs bounded address-indexed reads for arbitrary connected
wallet addresses. Treasury-only BCHN listunspent cannot supply that interface.
A bounded server-side TLS Electrum provider authenticates raw parents and returns
a stable confirmed native UTXO snapshot. Public reads on 2026-10-01 qualified
cashnode.bch.ninja:50002 and electron.jochen-hoenicke.de:51002 for certified TLS,
protocol1.6, the BCH Axion checkpoint and a consistent observed tip. The UI
observations are limited to that date and those methods. These
Electrum methods do not supply Watcher/Guard BCHN RPC or wallet-history APIs;
independent operator deployment and RPC qualification remain open.

### Wallet and chain information

The prepared, inactive wallet adapter uses Cashonize through WalletConnect. Its source exposes
address discovery and transaction signing, while balances and UTXOs require
the separate read provider. Signing uses the first approved HD account, ordinary
P2PKH addresses and Schnorr SIGHASH_ALL/ForkID0x41. The adapter independently
validates the signed body and every input signature; the server separately
checks policy and relists authenticated UTXOs before one submission attempt.
Network quote and min/max producers snapshot mutable token metadata before
asynchronous reads. Their ownership move preserves those predicates, together
with signature validation, cancellation and submission deadlines. Focused app
joins pass, but Cashonize is not registered. The previous Webpack production
build and disabled-state Chromium observations are historical evidence for the
earlier candidate. The preceding default-build observation and connection prerequisites
are recorded above; enabled wallet and relay interoperability remain pending.

The implementation uses prefixed ordinary mainnet CashAddr for configured
treasury and destinations. Native BCH has eight decimal places. Confirmation
counts are explicit positive configuration values for observation, payment,
cold, manual and arbitrary transactions. No production finality recommendation,
node sizing recommendation or operational activation follows from the fixture
defaults. Operators must supply the reviewed deployment profile.

## Implementation locations

Paths below are relative to the named Rosen repository.

| Repository | Surface and implementation path |
| --- | --- |
| Utils | CashAddr codec: `packages/address-codec-chains/bitcoin-cash/lib/bitcoinCash.ts`; dispatch and destination registry: `packages/address-codec/lib/`; RPC/universal extractors: `packages/rosen-extractor/lib/getRosenData/bitcoin-cash/`. |
| Scanner | RPC scanner: `packages/scanners/bitcoin-cash-scanner/lib/`; observation extractor: `packages/observation-extractors/bitcoin-cash-observation-extractor/lib/`, including entity/migration exports. |
| Guard Service | Chain/selection/envelope: `packages/chains/bitcoin-cash/lib/`; BCHN transport/provider: `packages/networks/bitcoin-cash-rpc/lib/`; configuration: `services/guard-service/src/configs/guardsBitcoinCashConfigs.ts`; persistence namespace: `services/guard-service/src/db/bitcoinCashState.ts`. |
| Health Check / Guard Service | Shared balance health: Health Check `packages/asset-check/lib/bitcoinCash/rpc.ts`; Guard adapter: `services/guard-service/src/guard/bitcoinCashHealthCheck.ts`. |
| Watcher | Configuration: `src/config/config.ts`, `src/config/rosenConfig.ts` and `docker/custom-environment-variables.yaml`; scanner factory: `src/utils/scanner.ts`; jobs/init: `src/jobs/initScanner.ts`, `src/init.ts`; fee readiness: `src/utils/MinimumFeeHandler.ts`. Generic runtime/build declarations remain a separate prerequisite. |
| UI | Chain data: `packages/constants/src/index.ts` and `packages/icons/src/networks/bitcoin-cash.svg`; network/metadata/signature validation and server provider: `networks/bitcoin-cash/src/`; wallet: `wallets/cashonize/src/`. |
| UI App | Thin configuration/actions: `apps/rosen/src/networks/bitcoin-cash/`; HTTP route: `apps/rosen/src/app/api/bitcoin-cash/submit/route.ts`; prepared wallet factory: `apps/rosen/src/wallets/cashonize.ts`. |
| UI Service | Scanner integration: `apps/rosen-service/src/scanner/chains/bitcoin-cash.ts`; calculator: `packages/asset-calculator/lib/calculator/chains/bitcoin-cash-calculator.ts`; gated entity/history registration: `apps/rosen-service/src/bitcoin-cash/data-source.ts`. |
| Sign Protocols | ECDSA mediator: `packages/tss/lib/tss/ecdsaSigner.ts`; request admission and message digest: `services/tss-api/api/controller.go` and `services/tss-api/app/rosenTss.go`. |

## Requirements and evidence matrix

Strength distinguishes explicit requirements (**E**), contribution conventions
(**C**), recommendations (**R**) and design choices (**D**). “Local validated”
describes the stated test scope; it does not mean upstream acceptance. Every
pending item names the responsible contributor, maintainer or operator.

| ID / source                                                        | Strength and applicability                                       | Implementation / evidence                                                                                                                                              | Status and pending owner                                                                                                                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOC / RCS-003 Requirements                                         | E; all new-chain work                                            | This coordinating document covers custody, metadata, endpoints, token scope, wallet, chaining, identity and fees.                                                      | Present; update evidence as remaining joins close. Contributor.                                                                                                                        |
| CUSTODY / RCS-003 Requirements | E; native treasury | Guard BCH chain and Sign Protocols ECDSA/ForkID adapter; authenticated prevouts and aggregate-key/address match. | Retained synthetic three-party TSS fixtures and current source-reuse review pass within the scope below. An accepted threshold group and actual key ceremony remain pending. Rosen/operators. |
| LOCK / RCS-003 Requirements | E; deposits | Canonical UI unsigned/signed transactions and RPC/universal extractors. Current-source BCHN regtest accepts two signed candidates, rejects seven mutations and decodes the same bytes into two matching extractor events. | Dated node observation and independent offline byte/signature/extractor replay pass. No candidate broadcast; wallet relay and operational deposit flow pending. Contributor/operators. |
| ENDPOINTS / RCS-003 Requirements | E; Watcher, Guard and UI | BCHN RPC connector; certified TLS Electrum address-indexed provider and dated public endpoint notes. | Two public Electrum services pass protocol/checkpoint/tip reads; no spendable fixture outputs. Watcher/Guard independent BCHN RPC and wallet-history qualification pending. Operators/contributor. |
| TOKENS / RCS-003 Requirements                                      | Conditional; native BCH scope                                    | Token-aware addresses and CashTokens rejected. No foreign asset representation on BCH is proposed.                                                                     | BCH token support N/A for this native-only contribution; Ergo representation pending Rosen.                                                                                            |
| DAPP / RCS-003 Requirements, Wallet package | Conditional convenience at base; explicit wallet surface for UI | Prepared Cashonize signing/session adapter and native read provider; BaseWallet adapter. | Wallet package 86 cases pass locally. Active app registration, accepted connection interaction and real relay remain pending. Prior app/browser receipts describe the superseded candidate. Contributor/Rosen/operators. |
| CHAINING / RCS-003 Requirements                                    | D; excluded initially                                            | Confirmed input selection and reservation sets; no spending unconfirmed change.                                                                                        | Implemented policy; document throughput tradeoff. Contributor.                                                                                                                         |
| IDENTITY / RCS-003 Requirements | E; concurrent/restarted payouts | Approval envelopes, signed-ID derivation and persisted recovery. Current chain/provider reconstruct exact previously observed unsigned/signed bytes and recover their envelope through bounded RPC history. | Four current-source join cases and 59 transaction-processor cases pass, including 12 isolated compatibility regressions independently replayed. Two maintained cases join the actual processor, RPC provider and SQLite persistence, including an isolated recovered-body mismatch; their environment-gated receipts are separate from the processor unit run. Three private recovery/order cases retain independent selected-source and saved-database review. Operational custody and configured roundtrip remain pending. Contributor/operators. |
| FEE / RCS-003 Requirements | Applicable design concern | Integer miner byte rate/cap, exact signed body, normalized metadata and trusted current server quote/ratio. | Builder/validator, 40 Network, trusted quote23 and min/max29 cases independently pass, including token refresh and absolute quote deadlines. Actual App/config compilation passes; operator monitoring pending. Contributor/operators. |
| SCAFFOLD / RCS-002, RCS-003 Modules                                | C; new backend packages                                          | Kodegen 0.12.0 official templates rendered for five backend packages; candidate metadata, portable test scripts and TypeScript settings compared to generated outputs. | Locally checked. Generation used the unmodified template engine with scripted prompts; ancillary shell actions were recorded and package installation handled separately. Contributor. |
| PACKAGES / RCS-003 Integration Notes | C; new packages | Exact manifest/changeset inventory covers codec, chain, provider, scanner, observation, UI network and wallet. | Seven version0.0.0 manifests retain one minor initialization changeset each. Seven npm11 package dry-runs include every main/types/export target. Five backend manifests exclude only TypeScript build caches; retained runtime/declaration bytes are unchanged. UI packages retain the repository's private-workspace convention. Released dependency installation remains pending. Contributor/Rosen. |
| CHANGESETS / RCS-003 Integration Notes | C; each PR | New packages retain version 0.0.0 and minor initialization changesets; Guard service uses major. BCH Watcher uses minor after separating its Node/runtime change. | Independent browser, TypeORM, Scanner retention, Watcher runtime/build/queue, Guard bootstrap and AbstractChain API changes are outside the BCH diffs. Their own changesets and validation are prepared separately; publication and maintainer integration remain pending. Contributor/Rosen. |
| TESTS / RCS-001 | E/C; TypeScript tests | Tests mirror the source surfaces. @target identifies the function/class and matches the literal test summary, including table placeholders; @scenario states its steps. Generated helpers use TestUtils and literal data use TestData. | Current UI inventory covers 47 specs/334 declarations; three final explorer descriptions are corrected with unchanged executable output. Utils/Scanner affected closure passes 334 cases and five package type checks. Watcher has 99 matching literal targets; affected startup/fee suites pass. Guard processor59, chain201 and RPC156 closures pass. The 12 processor compatibility cases are in the existing source-mirroring spec and independently pass; helper placement, literal targets and scoped lifecycle were reviewed. The canonical transaction fixture independently passes 11 offline cases. These inventories do not close external review or prerequisite-dependent failures. Contributor/reviewer. |
| CODE / RCS-002 | C; TypeScript source | JSDoc, arrows where suitable, scoped formatting/logging and repository runtime pins. Inventory covers46 files/232 named functions across seven new packages and shared health/extractors, plus19 App/adapters files/60 named functions. | All inventoried named functions have a general description. Three codec descriptions and one submission helper description are independently verified comment-only deltas; executable ASTs and prior functional evidence remain unchanged. Contributor. |
| SCAN / RCS-003 Scanner | E/C; BCH RPC | Separate BCH RPC connector/scanner package; exact database entity/migration exports. | Current scanner and observation suites pass 172 and11 cases after convention/helper correction. Previous PostgreSQL and actual Service ingestion results qualify unchanged production joins: legacy35/BCH36 migrations, one observation/cursor, duplicate-tip idempotency and isolated identity rejection. Deployment remains pending. Contributor/operators. |
| SCAN-CLEANUP / operator recovery requirement | Necessary dependency; generic SQL fix | Per-extractor reference predicates preserve branch-local parameters, limits, NULL behavior and scanner ownership. | This correction and its SQLite/PostgreSQL fixtures are prepared as a separate Scanner prerequisite, outside the BCH PR. Its preserved Action suite passes 42 cases and skips eight PG cases without a URL; previous independent PG results qualify the retained SQL inputs. Accepted integration/release remains pending. Contributor/Rosen. |
| CODEC / RCS-003 Address Codec | E; ordinary CashAddr | Utils address-codec-chains/bitcoin-cash and address-codec dispatch. | 70 codec and two dispatcher cases pass under Node22. Generated address fixtures/helpers and exact literal target summaries follow the current test convention; package typing and scoped style pass. Contributor. |
| EXTRACT-RPC / RCS-003 Rosen Extractor Network-based | E; BCHN transactions | RPC extractor, shared transaction type and mirrored framing/amount helpers. | 48 RPC and 17 helper cases independently pass; build, typing and lint pass. BCH source support does not assign a destination index. Contributor. |
| OBSERVE / RCS-003 Observation Extractor | E/C; scanner observations | Distinct observation package, shared transaction type, Watcher/Service registrations and exact entity export. | Package, Watcher and Service tests pass. Exact-version histories and populated legacy-to-BCH alias CRUD retain their reviewed scopes. Actual Service config, AddressManager bootstrap, token-map parser, scanner and extractor persist one observation in PostgreSQL; duplicate-tip and isolated invalid-identity cases preserve the expected state. Full deployed Service operation remains pending. Contributor/operators. |
| CHAIN-BASE / RCS-003 Abstract Chain Bases                          | E; BCH is UTXO based                                             | Guard chain/network use UTXO bases and native selection metadata after parent authentication.                                                                          | 126 tests and typecheck pass; independent review and 12 selector tests pass. Contributor/reviewer.                                                                                     |
| EXTRACT-UNIVERSAL / RCS-003 Rosen Extractor Universal | E; Guard transaction JSON | String extractor reuses Utils BCH transaction type and performs amount wrapping once. Shared active destination registry preserves indices 0–9 and rejects unassigned 10. | Five universal and three registry regressions independently pass within the 73-case Utils closure; observation and Guard joins pass after rebuild. Contributor. |
| CHAIN / RCS-003 Abstract Chain | E; payment/recovery/verification | Guard native BCH chain, transaction envelope and serialization utilities use UTXO bases. | Current chain/helper closure passes 201 cases; the earlier base126 and selector12 results retain their scoped independent review. Four current-source join cases reconstruct and recover the exact historical accepted bytes and reject reserved parents, changed value and changed signature. Historical signing evidence is reused only for identical bytes; a new threshold cycle remains pending. Contributor/operators. |
| PROVIDER / RCS-003 Abstract Chain Network | E/C; BCHN API | Guard packages/networks/bitcoin-cash-rpc, rate-limited client, identity and raw-prevout checks; bounded read-only capability API. | Current RPC/helper closure passes 156 cases. Earlier probes, mutants, native observations and capability-consumer checks retain their separate scopes. Capability checks isolate allowlist, request and deadline guards. Package build,20-file archive, nine unpacked TSX consumer assertions and declaration consumer pass. Plain Node import retains the existing extensionless-import limitation. Released installation and independent operator endpoint qualification remain pending. Contributor/operators. |
| HEALTH / RCS-003 Asset Check                                       | E; native treasury balance                                       | Health Check asset-check/bitcoinCash extends AbstractAssetHealthCheckParam; Guard thin adapter.                                                                        | 27 shared and 25 consumer tests pass; independent review/replay passes. Released dependency still pending. Rosen.                                                                      |
| WATCH-CONFIG / RCS-003 Watcher Service | E; config, defaults, secrets | BCH config/defaults, separate scanner/observation imports and username/password environment mappings. Generic Node/CI/Docker declarations are restored to the baseline. | Prior legacy/configuration fixtures qualify unchanged inputs. The separate runtime/build candidates use Node22.18/npm11.6.2. Their installed build closure passes 19 cases, including real SQLite, Snappy and source-entry loading; normal patch-package postinstall is checked. Windows installation required a process-local N-API target6. This is prerequisite preparation, not a normal released BCH install or CI/image result. Runtime direction and released installation remain pending. Contributor/Rosen. |
| WATCH-JOBS / RCS-003 Watcher Service | E; scanner, observation, jobs, sync health | Scanner factory, scheduled scanning, fee readiness and sync registration; bounded BCH fee-read adapter. | Focused adapter/handler tests and isolated negatives cover native HTTP-body abort and expired queued requests. Previous composed startup observations include ready/failure job ordering, API routes and SQLite migrations; they depend on the now-separated runtime/build/retention inputs. They do not qualify the restored baseline entry. Current BCH preparation retains the fee gate; ordinary startup after accepted prerequisites, deployed health and operational commitment/redeem remain open. Contributor/operators. |
| GUARD-CONFIG / RCS-003 Guard Service | E; chain, addresses, confirmations, networks, secrets and batching | GuardsBitcoinCashConfigs, chain/network registration, readiness checks and username/password mappings. RPC batch default9999 follows RCS; the validated integer1..10000 range is a contributor design choice. | 55 config and14 balance-consumer cases independently pass. Native batches1/9999 both make exactly two asset RPC reads and two persistence calls. Types/lint pass. Nine fresh node-config processes qualify configuration/environment loading with synthetic inputs and exact mapping files; container execution and released installation remain pending. The mount arrangement below supplies the files excluded by the Docker build context. Contributor/operators. |
| GUARD-JOINS / RCS-003 Guard Service | E; processing, recovery and health | BCH registrations, authenticated envelope context, recovered signed-byte persistence and database compatibility before jobs. | Processor59 passes; its 12 compatibility cases independently pass. Without the recovery hook, provider call arity, deferred deserialization and Doge skip order match the baseline. BCH authenticates approval context before reads and awaits recovered signed-byte persistence before advancing status. The pre-correction source fails all ten legacy regressions while both BCH mismatch negatives still pass. Current index retains two BCH imports and an awaited database guard before jobs. Generic bootstrap and AbstractChain API extensions are separate prerequisites; the API passes 55 package tests and its build. Earlier relocated-init receipts do not qualify the current entry. Ordinary startup/types after producer releases, custody and deployed roundtrip remain pending. Contributor/Rosen/operators. |
| UI-BASE / RCS-003 Icons, Constants, Utils, Bases, App | E/C; one base-data contribution | BCH icon, registry index -1, explorer data and BCH-local availability gates; shared generic behavior restored. | Constants two and app registration three cases pass. Custom dialog removed, Cashonize inactive. No current browser/build closure; assigned index and accepted wallet interaction pending. Contributor/Rosen. |
| UI-BUILD / RCS-003 Network and Wallet build instructions | E; repository build mechanism | This baseline has no build.sh. Existing networks/* and wallets/* discovery and standard workspace dependency builds include the private BCH packages. | Package builds/types pass in local preparation. A preceding default Next/Turbopack attempt reported 293 errors in the private linked graph; its raw log was not recovered or replayed in this audit. Normal clean install and declared app build after producer releases remain pending. Contributor/Rosen. |
| UI-CALC / RCS-003 Asset Calculator | E; native balances | Native BCH calculator and optional constructor config; explicit server-only TLS Electrum read provider factory. | Final37 mixed cases and four Service factory tests retain independent review. Two actual Service calculator/provider/session/TokenMap/PostgreSQL fixtures store100001 satoshis as2 normalized units and the synthetic represented-token supply as1000. Repetition preserves rows; an isolated parent-value mismatch produces exactly one expected rejection warning and preserves existing amounts. TLS is substituted; live accounting and atomic failure handling are not established. Contributor/operators. |
| UI-SERVICE / RCS-003 Rosen Service | E; scanner, observation, events, calculator and health | Optional BCH scanner/observations/accounting/health, public AssetCalculator consumption, constant scanner cadence and global healthCheck thresholds. | Six affected suites pass 170 cases; independent source and exact-input review passes. The public calculator entry verifies actual update/save behavior. Thresholds load and validate only when BCH is enabled; obsolete nested scanner configuration rejects. The existing checks array registers BCH health. Scanner-v2/v4 TS2345 needs the separate scheduler prerequisite. Whole entry and normal released installation remain pending. Contributor/Rosen/operators. |
| UI-DB / RCS-003 Rosen Service/Scanner | D; preserve legacy persistence while adding BCH identities | Service-local pre-initialization registration; unchanged shared data-source API. | 11 local cases pass: legacy constructor/migration preservation, enabled/disabled wiring, ownership guards and actual populated PostgreSQL upgrade. Legacy rows, alias CRUD, uniqueness, rollback-only DOWN and reconnect checked. Independent source review does not replay PostgreSQL; wider deployment data and released graph remain pending. Contributor/operators. |
| UI-NETWORK / RCS-003 Network Package | E; height, fee, min/max and complete lock transaction | Network-owned metadata, native construction/signature validation, quote/limits, provider and typed client ports. | 458 package cases and type/build checks pass locally; app actions/configuration/registration 22 cases pass. Ownership review finds no relaxed predicates in the moved bodies. Default app build and released consumer closure remain pending. Contributor/Rosen. |
| UI-TRANSPORT / RCS-003 Network/App | D; bounded backend submission contract | Network-owned client/codec/streamed body/handler; thin app route and standard wrapped query actions. | Retained boundary tests are part of the 458-case package suite. Five actual NextRequest/POST cases pass after using the dedicated package entry. Deadline, cancellation and byte bounds retained. Agreement on the dedicated submission contract and normal production build remain pending. Contributor/Rosen. |
| UI-WALLET / RCS-003 Wallet, App wallet configuration | E; at least one wallet | Wallet-owned Cashonize config, session, pairing and signing; prepared app factory excluded from active registry. | 86 cases in six suites and package typing pass. No team-owned connection component consumed. Accepted pairing interaction, SDK direction, actual app activation and relay qualification remain pending; the old custom dialog is excluded. Contributor/Rosen/operators. |
| UI-FORM / RCS-001, RCS-003 App | E applicability; reuse current form behavior | Existing upstream form/wallet hooks retained; only registry imports change. | Generic stale-response fixes and their tests are preserved as separate work, outside this contribution. Their earlier receipts do not describe current BCH behavior. Enabled wallet/form qualification follows the accepted interaction. Contributor/Rosen. |
| UI-BROWSER / RCS-003 Network/App | E applicability; client-side transaction/address APIs | Standard app build configuration restored; no BCH-specific shared Webpack adaptation. | Earlier Webpack/WASM/Chromium receipts apply to the prior candidate only. Current default build fails in the private linked graph. Normal released install/build and enabled browser/relay checks remain open. Contributor/Rosen/operators. |
| CONTRACTS / RCS-003 Contracts                                      | E; Rosen-owned outputs                                           | Contracts, protocol chain index, token map, RWT/permit/fraud addresses and represented tokens.                                                                         | Pending Rosen team. Contributor supplies documented interfaces and fixtures.                                                                                                           |
| CHAIN-INFO / RCS-003 recommended information                       | R; reviewer/operator context                                     | Address/decimal/confirmation policy described above; deployment profile must supply finality, derivation and node sizing.                                              | Partly supplied; operator profile pending. Operators.                                                                                                                                  |
| RELEASE / RCS-003 Integration Notes, cross-repository dependencies | C/E applicability; reproducible installation | Package inventory and dependency order below; dedicated tss-api patch changeset covers the Go runtime, separately from npm TSS. | A clean local-tarball installation rehearsal and release preparation are supplied. Actual accepted versions, package/binary publication and private UI deployment remain Rosen-owned; published-version lock regeneration and native/full-application installation qualification remain contributor work after those releases. |
| OP-START / operator review on Watcher #17 | D; BCH startup lifecycle | Await BCH-applicable fee histories before service exposure; propagate failure through initialization. | Focused initializer failure/ordering coverage is retained. Previous process exit and full-entry observations depend on the separated generic startup/build inputs; they do not certify the restored entry. Qualify that entry after accepted prerequisites. A deployed supervisor remains operator-owned. |
| OP-TRANSPORT / operator review on Watcher #17 | D; Watcher and Guard RPC | Shared configuration/connector validation, literal loopback HTTP or HTTPS, paired credentials, no redirects. | Endpoint negatives and actual local HTTP redirect tests pass. Local HTTP cases supplement mocked unit tests; production TLS/authentication remains endpoint-specific. |
| OP-SCAN / operator review on Watcher #17 | D; bounded scanning and recovery | Configurable scanner budgets, distinct resource failure and unchanged checkpoint recovery; Watcher and Rosen Service forward the shared limits. | Scanner suite passes 172 cases. The retained BCHN 4,097-output observation confirms default-limit failure and same-block retry; SQLite restart preserves records and advances once after increasing the budget. The corrected Service closure passes 170 cases with independent exact-input review. Deployment memory and selected history remain to qualify. |
| OP-DEPOSIT / current native deposit profile | D; matched extractor/Guard admission | Keep the deposit envelope distinct from scanner work budgets and payout construction limits. | Twelve canonical boundary cases cover the inclusive input/output/byte limits and one above each across the two consumers. Rosen must accept the supported profile; these fixtures establish no consensus/script validity. |
| OP-FINALITY / operator review on Watcher #17 | D; proposed pre-sign and pre-broadcast policy | Recorded block identity, two endpoint views, finalized active ancestry, parked-fork checks, coherent snapshots and deadlines. | RPC negatives and actual consumer tests pass; persisted queue readback/retry passes with SQLite migrations and reopen. Twelve native source/build checks pass under explicit regtest controls. Rosen must accept the proposed policy and verify deployed cleanup contracts; production delay and operator endpoint independence remain to qualify. |
| OP-QUEUE / persisted retry invariant | Generic prerequisite | A height-only database update must preserve newer validity/removal fields. | The identical retained BCH retry fails on the unpatched baseline and passes with the separate height-update prerequisite. Three independent SQLite stale-state cases also pass. This remains an integration dependency rather than a weakened test. Contributor prepares and Rosen integrates the prerequisite. |
| OP-IMPORTS / second operator review on Watcher #17 | Review concern; module isolation | Dedicated BCH extractor entry and deferred BCH Watcher imports remain. Generic Rollup/native loading changes are extracted. | Dedicated BCH and existing Bitcoin source entries pass. Legacy root exposes its existing erased-interface export defect; a separate type-export prerequisite has a passing fresh-process regression. Built-entry and Watcher startup require separate build/runtime prerequisites. Literal no-libauth remains open because pure CashAddr modules load; Rosen decides the registry boundary. Contributor/Rosen. |
| OP-GUARD / second operator review on Watcher #17 | D; finality/branch compatibility with Watcher cleanup | Existing Guard confirmation and event-verification semantics, with a shared deterministic event. | Five migrated-SQLite cases prove compatible admission, depth wait/recovery, branch retry/recovery in two phases and an unrelated amount-mismatch rejection. Three Watcher cases consume the same fixture. Deployment configuration and arbitrary endpoint histories remain operator-owned. |
| OP-WITNESS / second operator review on Watcher #17 | D; pruned finality-only deployment and latency | Header/index-only gate, required primary and witness vetoes, pinned BCHN 29.2.0 policy. | Seven maintained native regtest checks pass on fresh history, including pruned event/checkpoint bodies, a wrong hash, and isolated default age/depth thresholds. Simulated time is explicit. Operators still qualify independent administration, primary scan history and selected daemon policy. |
| OP-HEALTH / second operator review on Watcher #17 | D; distinguish routine waits from faults | Typed veto reasons, both endpoint outcomes and latest-attempt health parameter; routine waits use debug logs. | Real RPC transports and HealthCheck registry tests isolate waits, witness/source failure, disagreement, parked forks, malformed input and racing checks. Diagnostics never grant eligibility or summarize the entire queue. |
| ACCEPTANCE / external state | E before acceptance/activation claims | Six coordinated BCH PRs, maintainer decisions, merge/release and deployment receipts. | The six BCH PRs remain drafts; operator-review changes are proposed while document feedback and scope acceptance remain pending. Sign Protocols #9 is reviewed separately as a generic fix. No merge, integration acceptance or activation is established. Rosen/operators. |

## Validation and release dependencies

The current-source UI regtest receipt records exact binary, parent, unsigned,
signed and mutated bytes. Two BCHN `testmempoolaccept` results and seven negative
results were observed locally; independent review reproduced the signed bytes,
signature checks and both compiled extractor joins offline. This does not prove
WalletConnect relay, threshold custody or an observed on-chain deposit. The
wallet-disabled, peerless fixture node was stopped after verification, with an
empty mempool and its data retained.

Validation follows producer-to-consumer joins. An unchanged result remains valid
for its frozen input scope; a changed producer requires its downstream join to
be checked again.

PostgreSQL is a selected persistence validation boundary rather than an explicit
database product requirement in the pinned RCS. Local execution used
PostgreSQL17.11, pg8.11.3 and TypeORM0.3.26 with schema synchronization disabled.
Scanner cleanup ran eight isolated scenarios through the installed Action and
native EntityManager. The shared UI factory ran both disabled and BCH-enabled
histories on fresh databases, preserved legacy/BCH block aliases and applied
no migrations on reconnect. Selected source/runtime pins remained unchanged.
All test schemas/databases were removed and the isolated server stopped.
An additional same-database test starts from35 legacy migrations and seeds one
block, one extractor status and one observation. Enabling BCH applies only
`migration1788340428756` and preserves every mapped field of those three rows.
All three legacy/BCH alias pairs pass populated insert/read/update/delete;
three duplicate-row attempts fail with PostgreSQL23505. The block case proves
its observed hash/scanner rejection, not isolated coverage of every block index.
The added migration's declared DOWN executes inside a transaction that is
rolled back; data survives and reconnect adds no migrations. This recovery test
does not qualify downgrading the complete legacy history.
Independent review inspected the harnesses, source pins, SQL, results and cleanup
evidence without replaying those PostgreSQL fixtures. The maintained Scanner
command below also has independent native PostgreSQL execution. Actual Service
observation ingestion is qualified within the bounded fixture scope below;
wider legacy-data coverage and the complete Service runtime remain separate gates.

The retained TSS HTTP fixture completes two rounds across three synthetic peers.
Its six low-S signatures verify against raw message digests; six corresponding
rehashed-digest checks reject. Current 21 TSS API source inputs and three installed
Guard/TSS consumer sources match the frozen evidence inputs. This comparison
reuses the prior independent receipt without rerunning MPC. Duplicate message
IDs return 409 in the exercised admission cases; cross-kind ID reuse and broader
concurrency are outside that scope. Fixture relay authentication does not
qualify production peer authentication, an accepted key ceremony or custody.

### Maintained PostgreSQL checks

The separately prepared Scanner retention prerequisite supplies eight PostgreSQL Action
cases and four cleanup-ownership falsifiers. Each schema records its creation
token, OID and name, verifies the search path before DDL, and rechecks ownership
before removal. The tests preserve foreign schemas and close their connections.
After that prerequisite is integrated, supply a dedicated test database URL
privately and run in the Scanner repository:

```sh
SCANNER_POSTGRES_TEST_URL='<dedicated-test-database-url>' npm run test:postgres --workspace=@rosen-bridge/abstract-scanner
```

The explicit command rejects a missing URL. The ordinary test command skips
the eight database cases when that URL is absent. All 12 maintained cases have
independent execution on PostgreSQL 17.11; they use synthetic extractor-reference
queries and do not establish deployment compatibility or a clean released install.

UI's Rosen Service supplies a maintained populated-upgrade test and four
isolated ownership/URL guards. Together with registration/wiring checks,
11 cases pass locally with independent source review; the ordinary suite skips the database case
without a URL. After building the UI workspace and Service-declared BCH packages,
set `ROSEN_UI_TEST_POSTGRES_URL` privately to a dedicated test-server connection
whose role can create and drop databases, then run in the UI repository:

```sh
npm run test:postgres --workspace=@rosen-bridge/rosen-service
```

The command rejects a missing URL. A random database is required because the
legacy migration history explicitly addresses indexes in `public`; a separate
schema is insufficient. URL query/fragment overrides reject before connection.
Database name, OID and nonce must match before migration and cleanup; connections
close before removal and forced disconnection is excluded. The populated test
preserves three legacy rows through the 35→36 migration extension, exercises all
three alias CRUD paths and duplicate-key checks, rolls back the added DOWN, then
reconnects without migration replay. Independent review does not replay PostgreSQL.

### Producer and consumer checks

| Producer                                | Consumer and required closure                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Utils codec and RPC/universal extractor | Scanner observations, Guard source verification and UI metadata interoperability.                                   |
| BCH scanner/observation packages        | Watcher imports/types, scheduled scanning, extraction and scanner health.                                           |
| Shared scanner block-retention queries  | Actual SQLite selection/deletion and the compiled Watcher's BCH/Ergo extractor cleanups; preserve per-query limits. |
| Shared BCH asset-check                  | Guard adapter, actual health history/error recovery and released dependency installation.                           |
| Guard BCH chain/provider                | Configured chain registration, payout validation, approval persistence, signing, recovery and broadcast boundaries. |
| UI registry/codec/read provider         | Calculator, Network, Rosen Service, wallet signing and application rendering.                                       |
| Rosen deployment outputs                | Final chain index/address/token configuration and operational end-to-end qualification.                             |

Local workspaces currently exercise unpublished package sources. In particular,
the Guard shared-health tests use an ignored compiled-source overlay. This is
bounded integration evidence; dependent public lockfiles must be regenerated
against actual released packages before a fresh-install claim can be made.
No fabricated registry resolution or integrity hash substitutes for that release.

Shared fixes are prepared separately from the BCH PRs:

| Prerequisite | BCH consumer and current gate |
| --- | --- |
| TypeORM ESM imports | Guard/Service source startup; standalone correction prepared. Utils #6 is closed and unmerged, so it supplies no accepted dependency. |
| Ergo/Cardano browser codec loading | Existing UI destinations in the shared registry; prepared independently from BCH. |
| Extractor type-only root exports | Legacy source-root loading; exact baseline defect reproduced and standalone fresh-process regression passes. Dedicated BCH source entry remains isolated. |
| Scanner retention SQL | Watcher cleanup; preserved SQLite/PostgreSQL regression coverage. |
| Watcher runtime/build | Ordinary emitted startup, ESM/native loading and supported Node graph; separated from BCH. Runtime direction remains unresolved. |
| Watcher queue height update | Persisted BCH finality retry; the unpatched consumer fails rather than losing its safety assertion. |
| Guard bootstrap initialization order | Source entry/logger initialization; separated from BCH database gating. |
| AbstractChain persisted identity API | Optional context and recovery hook; 55 package tests and declaration build pass separately. BCH consumers require the producer release before normal types/build. |
| UI scanner scheduler type | Public v2/v4 scanner consumer; type-only prerequisite and seven contract checks prepared. |

[Utils #6](https://github.com/rosen-bridge/utils/pull/6) and
[Watcher #12](https://github.com/rosen-bridge/watcher/pull/12) are closed without
merge. [Watcher #16](https://github.com/rosen-bridge/watcher/pull/16) is a Zcash
proposal with an unresolved runtime direction, not an accepted generic runtime
release. [UI #31](https://github.com/rosen-bridge/ui/pull/31) proposes the legacy
observation alignment separately. Contributor preparation is supplied; separate
submission, integration and releases still require coordination. The
[runtime discussion](https://github.com/rosen-bridge/watcher/pull/12#issuecomment-5022983382)
does not establish adoption of the local build.

### Guard deployment configuration

The Guard build context excludes `**/docker*`; its image does not contain the
environment mapping or `docker/production.yaml`. The service working directory
is `/app/services/guard-service`, and the Dockerfile does not set `NODE_CONFIG_DIR`.
Mount the configuration files into its default `config` directory. From the
Guard Service repository's `services/guard-service` directory, add these options
to the operator's complete container launch command:

```sh
--workdir /app/services/guard-service \
--env NODE_ENV=production \
--env BITCOIN_CASH_RPC_USERNAME \
--env BITCOIN_CASH_RPC_PASSWORD \
--mount type=bind,src=./docker/custom-environment-variables.yaml,dst=/app/services/guard-service/config/custom-environment-variables.yaml,readonly \
--mount type=bind,src=./docker/production.yaml,dst=/app/services/guard-service/config/production.yaml,readonly \
--mount type=bind,src=./config/local.yaml,dst=/app/services/guard-service/config/local.yaml,readonly
```

The operator supplies `config/local.yaml`, paired credential environment values,
the selected image, database/TSS/network configuration and persistent-data mounts.
The image's service user must be able to read each mounted file. Relative sources
and read-only file mounts follow [Docker's bind-mount syntax](https://docs.docker.com/engine/storage/bind-mounts/).
An alternative mapping mount at `/run/guard-env/custom-environment-variables.yaml`
uses `NODE_CONFIG_DIR=/app/services/guard-service/config:/run/guard-env` on Linux;
the production and operator policy files still belong in the service config directory.

Nine fresh Node22.18.0/node-config3.3.8 processes exercised default search,
present/absent mappings, both/one/no/empty credentials, explicit directory lists
and tracked defaults with production and synthetic `local.json` overrides.
A separate fresh-process check loads tracked `default.yaml`, exact production
and environment mapping files, and a synthetic `local.yaml`; it confirms enabled
BCH, URL, paired synthetic credentials and PostgreSQL selection. Real deprecation
warnings are retained. The directory-list execution used Windows' delimiter;
Linux's colon follows the inspected loader implementation. The BCH configuration
consumers have separate existing unit evidence. No image build, container start,
mount readability, real RPC authentication or full Guard initialization follows
from these configuration-loading results.

### Release execution checklist

The following packages start at `0.0.0` and each has a minor initialization
changeset. The first five publish backend packages; the UI packages remain
private workspaces deployed with their consumers.

| Producer repository | Package | Required producer closure |
| --- | --- | --- |
| Utils | `@rosen-bridge/address-codec-bitcoin-cash` | Address codec dispatch and Rosen extractor consume it. |
| Scanner | `@rosen-bridge/bitcoin-cash-scanner` | Updated abstract scanner, Utils codecs/extractor. |
| Scanner | `@rosen-bridge/bitcoin-cash-observation-extractor` | BCH scanner and BCH-enabled Rosen extractor. |
| Guard Service | `@rosen-chains/bitcoin-cash` | Updated Utils codec and Rosen extractor. |
| Guard Service | `@rosen-chains/bitcoin-cash-rpc` | BCH chain package. |
| UI | `@rosen-network/bitcoin-cash` | Updated codecs, constants, icons and network base. |
| UI | `@rosen-ui/cashonize-wallet` | BCH network and wallet API. |

1. Select accepted commits, shared prerequisites and release scope. Preserve
   unrelated changesets. Calculate the plan before applying repository version
   scripts: `npm run version` also installs dependencies and writes version files.
2. Release Utils' BCH codec before address-codec dispatch and Rosen extractor.
   Release the matched Ergo/Cardano browser codec packages before their UI consumers.
3. Release the updated abstract scanner, then BCH scanner, then BCH observation
   extractor. Release Health Check's BCH-enabled asset-check before Guard consumers.
4. Release the separate AbstractChain context/recovery API before Guard's BCH
   chain and service consumers; release the BCH chain before its RPC provider. Backend workspace publication
   can be scoped, for example
   `npm run release --workspace=@rosen-bridge/address-codec-bitcoin-cash` in Utils.
   Root release scripts can publish unrelated workspaces; use only the accepted plan.
5. Update downstream external dependency ranges to actual published versions.
   Run `npm install --package-lock-only`, inspect registry resolutions/integrities,
   then run `npm ci` in a clean disposable checkout without source overlays.
   Existing `0.0.0` ranges are source-workspace placeholders, not registry releases.
6. Recheck the affected installed joins: Watcher build/types/tests and startup;
   Guard chain/config/shared-health; UI Service factory/bootstrap/types/tests;
   App typing and its standard declared build. Record package metadata, lockfile
   digest, clean-install evidence and binary/image identities.
7. Publish the TSS API binary containing the Go admission/registry fixes using
   the repository's `tss-api-*` tag workflow. Its private package has a dedicated
   patch changeset. Publishing `@rosen-bridge/tss` alone does not ship these fixes.
   Watcher's release script produces a host binary; private Guard/UI deployment
   and TSS API binary publication are separate from npm package publication.

Read-only release-plan assembly was recalculated against the corrected UI
manifests and nine BCH changesets using `@changesets/get-release-plan` 4.0.12.
The full workspace plan and both BCH-only plans assemble. With the existing
Service exclusions, the BCH-only plan keeps the network and calculator needed
by Service; their calculated versions are 0.1.0 and 2.5.0. Service calculates
4.5.0, constants 1.2.0 and the prepared Cashonize package 0.1.0. The app-inclusive
plan also calculates Rosen App 5.8.0, icons 4.1.0 and utils 1.2.0, with dependency
propagation to existing workspaces.

The unfiltered `version:rosen-service` selection still fails on the inherited
mixed `handshake-review-cleanup` changeset. This is separate from BCH's plan;
an accepted selection must preserve unrelated changesets and required internal
dependencies. No version files, installation or publication were performed.
These calculated versions are preparation, not Rosen's selected release outputs.

A disposable consumer graph also passes offline `npm ci` under Node 22.18.0
and npm 11.6.2 using nine local producer tarballs and 458 registry package
identities pinned from the existing locks. It contains no filesystem links;
283 installed dist files match the packed payloads. Twelve runtime checks
exercise installed codecs, scanner budgets/finality, Guard transport and the
unchanged Rosen Service configuration source. Install scripts are disabled,
the crypto backend is JavaScript and TypeScript loads through installed `tsx`.
This qualifies the local package-consumer joins; published package resolution,
native-module rebuilds, full application startup and container deployment still
require their own accepted release graph.

For the second-review candidate, five changed producer packages were rebuilt
with fresh TypeScript build-info files and staged from their production emitted
file lists. The archives and fresh offline installation contain 228 emitted
files plus 11 metadata files, with no test, fixture or mock payloads. Eleven
installed runtime probes pass, including the dedicated extractor entry and
typed finality diagnostics; the installation contains no filesystem links.
Four unchanged producer archives retain their earlier pins. This rehearsal
uses disabled install scripts and the JavaScript crypto backend. It qualifies
the selected package payloads and joins, not a clean build of every monorepo
project, native installation or an application release.

The earlier Windows rehearsal used the original lock and tarballs with normal
install scripts and no forced crypto backend. The `sqlite3` 5.1.7 package's default installer selection
requests an unavailable ABI artifact on Node 22.18.0. Selecting its declared
N-API 6 build with the process-local `npm_config_target=6` setting permits the
installation. The cached prebuild matches a fresh download of the official
release artifact. All twelve smoke checks then pass, together with native
SQLite 3.44.2 create/insert/read/close and esbuild 0.27.3 transformation checks.
This setting is qualified for that exact Windows dependency graph; it is not a
fleet-wide default. Release qualification must resolve the installer selection
for each accepted target, alongside full application and container checks.

### Shared module isolation decision

The codec now loads CashAddr functions through the pure address module of the
exact-pinned `@bitauth/libauth` 3.0.0 package. A fresh synchronous import test
rejects any libauth crypto initialization. This removes that dependency from
address-only consumers.

Before this follow-up, the shared Rosen extractor barrel exported BCH eagerly;
transaction decoding reached libauth crypto initialization and top-level await.
Watcher's previous flattened bundle evaluated dynamic imports eagerly too.
Guard still constructs its chain registry synchronously and imports its BCH
chain explicitly: the extractor-root isolation claim does not establish a
libauth-free Guard startup.

The proposed dedicated extractor entry is
`@rosen-bridge/rosen-extractor/dist/bitcoinCash.js`. It preserves synchronous
methods and removes unreleased BCH exports from the legacy root; BCH
observation and Guard consumers import the dedicated entry. Fresh-process
tests independently exercise source and built legacy-root imports while
rejecting libauth's root/crypto imports, plus BCH positive and rejection controls and
the existing Bitcoin deep entry. Rosen's approval of this API and shared
release scope remains pending. Keeping the previous eager entry would require
explicit acceptance of the
shared Node/runtime impact. Neither option is presented as accepted.

Watcher now emits `out/index.cjs` as a Node launcher with adjacent `.mjs`
chunks. Keep the complete `out` directory and its `libs` together. Source
imports and emitted chunks have separate runtime sentinels: tree shaking does
not prove that the TypeScript/Docker source entry is isolated. The narrower
crypto/extractor check and the literal operator criterion are intentionally
separate commands:

```sh
npm run build
npm run test:build-isolation
node scripts/check-bch-startup-isolation.mjs --strict
```

The BCH scanner factory also awaits extractor registration before returning.
Its real construction test follows service startup order, with the database
uninitialized during scanner construction and migrated afterward. Separate
delayed and rejected registration cases verify that startup waits and propagates
failure. These checks cover construction; they do not start application jobs.

The strict command remains failing while pure CashAddr modules load through
the common destination-address registry. The emitted graph retains three pure
modules; the source graph also follows the pure formatting barrel. BCH address
support is needed on non-BCH Watchers for transfers whose destination is BCH.
The pending choices are an explicitly accepted pure-module exception with the
crypto sentinel retained, or a separately reviewed change to codec loading/API
or address implementation. Replacing the codec also requires address-vector,
malformed-input and every destination-consumer regression checks. The current
tests expose this gap rather than treating crypto isolation as full closure.

Native binary packaging is a separate open gate: the current `pkg` 5.8.1
command under Node 22 fails with `No available node version satisfies 'node22'`.
The Node build and source/Docker execution do not establish a packaged-binary
release. Selecting a packager/runtime combination must preserve the Node/WASM
requirements, adjacent chunks, native-library paths and startup-failure behavior;
then the complete release artifact needs its own native startup/SQLite checks.

### Fleet rollout and rollback procedure

Record a deployment inventory before rollout: service role, chain, accepted
package/binary/image identity, database version and operator. Include existing
chain watchers that will encode BCH as a destination. Match the assigned index,
contracts, token map and supported deposit envelope across every producer and
consumer before exposing the route. Operators supply the fleet topology,
threshold membership and maintenance-window authority.

1. Hold new BCH route intake and signing/broadcast work using the deployment's
   operator controls. Record already submitted transaction identities. Drain or
   explicitly retain pending work; an uncertain broadcast outcome must be
   reconciled against chain and persisted state before retry. No universal
   application pause switch is supplied by this contribution.
2. After writers stop, take a consistent database backup and record scanner
   checkpoints, pending observations/payments, reserved inputs, queue rows and
   the exact prior software/configuration profile. Prove restoration on an
   isolated copy. A file copy of a running database is insufficient.
3. Install the accepted producer/consumer versions without development links.
   Check the fleet version inventory, dependency locks and TSS API binary
   separately. Apply migrations to the isolated copy first; use the supported
   startup/read checks with submission disabled by operator controls.
4. Qualify source and witness history, identity and administrative independence;
   check fee readiness, scanner progress, health and retained queue state.
   Confirm every destination encoder has the assigned BCH index and matching
   metadata rules. Do not enable the route during a mixed-version interval.
5. Enable the approved operator subset and execute the authorized acceptance
   sequence below. Expand only after exact amounts, transaction identities,
   finality checks and pending-work recovery agree across the deployed graph.
6. On inconsistent history, configuration, fees, queue state or signing results,
   hold new work and preserve evidence. Reconcile possible broadcasts before
   resuming. Roll back software only if the retained database/configuration is
   compatible; otherwise restore the qualified backup under an approved recovery
   plan. A database restore must not erase knowledge of a transaction already
   submitted to a chain. Never restart old code against an unqualified new schema.

### Remaining work and deployment inputs

| Matrix items | Contributor work before external input | Missing external input/action and owner |
| --- | --- | --- |
| DOC, CHANGESETS, TESTS, CODE | Compare the exact final candidate, changed metadata and remaining joins with this matrix. Reuse unchanged validated scopes. | Maintainer review of accepted contribution scope. Rosen. |
| PACKAGES, RELEASE, HEALTH, WATCH-RUNTIME, UI-BUILD | Inventory, package dry-runs, clean local-tarball consumer rehearsal and release order are supplied. Qualify published-version/native/full-application installs and regenerate dependent locks once packages exist. | Accepted producer releases, registry versions/tags and UI build-script adaptation decision. Rosen. |
| SCAN, OBSERVE, UI-DB, UI-SERVICE | Maintained Scanner/PostgreSQL cleanup and populated UI upgrade commands, plus actual Service ingestion/accounting/health joins, are supplied. The Service entry's startup assembly has source/test review; its full operational run also starts eight existing chain services without disable switches and needs the accepted whole-service profile. | Actual database/deployment profile, whole-service legacy-chain configuration and released graph for activation. Operators/Rosen. |
| GUARD-CONFIG, GUARD-JOINS, FEE | Mapping/mount checks, synthetic initialization/health and maintained nonempty provider/processor/SQLite recovery tests are supplied. Three private recovery/order cases have independent selected-source and saved-database review. Apply retained validators and negatives to accepted production inputs. | Contract/token configuration, aggregate treasury key, fee/confirmation/health policy and deployed services. Rosen/operators. |
| UI-BASE, UI-WALLET, UI-FORM, UI-BROWSER, LOCK, DAPP | Package algorithms, validators and thin app joins prepared; custom UI and generic fixes excluded. Qualify standard released build, then enabled wallet/operational acceptance on the accepted interaction. | RCS/design review, producer releases, scanner prerequisite, accepted pairing/SDK/submission contracts and authorized operational deposit. Rosen/operators/user. |
| ENDPOINTS, PROVIDER | Bounded Guard read-only capability API, sample inventory and synthetic/package consumer validation are supplied. Scanner's separate read-only block-body example includes sample checks, limits and supervision guidance. | Independent BCHN deployments, credentials and imported treasury/history; selected Electrum deployment. Operators. |
| CONTRACTS, TOKENS, CHAIN-INFO | Parameterized interfaces, deterministic fixtures and the input/acceptance checklist below are supplied. Apply existing startup validators to the actual accepted outputs when supplied. | BCH chain index, represented Ergo token, contracts/RWT/permit/fraud addresses, aggregate-key derivation and production policy. Rosen/operators. |
| CUSTODY, IDENTITY, WATCH-JOBS, ACCEPTANCE | Current TSS source reuse, synthetic threshold fixtures, maintained recovery tests and bounded fee-read checks are supplied. Earlier composed Watcher startup receipts depend on the separate runtime/build prerequisites; qualify the restored entry after the accepted release graph is available. The operational threshold/roundtrip acceptance sequence is supplied below. | Threshold group/key ceremony, accepted TSS binary, coordinated PR acceptance/merge/release and authorized activation. Rosen/operators/user. |

### Runtime fixture boundaries

Watcher BCH fee reads use one cancellation owner and deadline per initialization
or refresh batch. Duplicate NFT lookups share their result. Limits are 20 total
requests, 50 rows per page, 1 MiB per response and 8 MiB per batch; the terminal
empty page counts as a request. These are defensive read policies, not protocol
limits. Both numeric JSON and nonnegative decimal-string Ergo amounts are
preserved as BigInt, with a 20-digit conversion bound. Malformed amounts reject.
Independent tests include actual MinimumFeeBox consumers for both Node and
Explorer wire shapes. Initial publication checks ownership and time after all
fetching and register decoding. Refresh propagates failure and rejects overlap
while retaining the existing non-atomic per-box updates; it provides no rollback
or stale-configuration availability guarantee.

The maintained Guard recovery cases execute actual processTransactions,
DatabaseAction, serializer, BCH chain and RPC provider against SQLite. Synthetic
read-only RPC history returns the retained unsigned/signed fixture bodies.
Positive recovery persists signed bytes before sent status. Changing one raw
locktime byte under the unchanged advertised ID rejects and preserves the
unsigned sign-failed row. A private no-op persistence mutant is killed by the
pre-status database observer. Single-chain registry injection and synthetic
RPC transport are explicit substitutions. The recovery path dispatches no
signing or broadcast. Maintained test setup creates a synthetic signed fixture;
the three private cases reuse retained bodies and run all 45 migrations without
new signing or network requests. Their connections close after execution. Selected source
custody includes both configuration fixtures and the actual TokenMap dependency
closure. Independent review verifies 2,913 source pins and opens all three saved
SQLite databases read-only, including exact signed/sent and unsigned/sign-failed
rows. It does not replay the recovery runtime. Concurrent recovery and crash
durability are outside these cases.

The Service ingestion fixtures use actual configuration, bootstrap, token-map
parsing, scanner/connector and extractor code against native PostgreSQL. Synthetic
RPC responses, an in-memory index assignment and token map supply the missing
deployment inputs; the recursive follow-up scan timer is held. Disabled/enabled
metadata has21/24 entities and35/36 migrations. Positive ingestion retains one
block, observation and cursor1; a transaction-ID fault retains zero blocks and
observations with the initial cursor0. The five cases have independent source
and evidence review over3,364 selected pins, without an independent PG replay.

The two accounting/health fixtures execute the actual Service calculator start,
server provider factory, Electrum session/raw-parent decoding, TokenMap and
PostgreSQL models. Synthetic TLS socket events and one represented-token supply
HTTP response are explicit substitutions. A parent-value fault must produce
exactly the expected treasury warning: unchanged normalized amounts alone cannot
prove rejection. Actual scanner persistence feeds the legacy last-block reader
and health thresholds; missing, non-PROCEED and other-scanner negatives are
isolated. Independent review verifies2,122 selected pins and replays five socket
boundary negatives in memory. It does not replay PostgreSQL or establish atomic
accounting failure handling. The full Service main loop is outside these bounded
joins because it also starts the existing unrelated-chain services.

Two maintained registration tests join the actual Service health start, BCH
health factory and real HealthCheck registry through controlled scanner/config
and last-block-reader ports. Enabled BCH registers exactly one BCH parameter
whose update reads only BCH state; disabled BCH preserves the ten legacy/log
checks and makes no BCH persistence read. The report timer is held. Removing
only the BCH registration call makes the enabled case fail while its disabled
control passes. Both cases have independent execution and exact mutant-evidence
review. They execute no periodic report job or full Service entry.

The preceding App fixture used `npm run build --workspace @rosen-bridge/rosen-app`
with the former Webpack adaptation and actual `next start`. Its extended TypeORM
wrapper was bundled because its installed ESM entry used extensionless imports;
`typeorm` itself remained external. Build43 and server45 selected inputs, seven build
outputs, HTTP logs, screenshots and accessibility snapshots have independent
source/evidence review. Browser execution is author-run. The empty fixture
database and disabled BCH configuration qualify startup/rendering only. Both
browser WASM requests and the Events API return200. Servers and owned databases
are closed after capture; unrelated local services are preserved.

These selected pins do not cover every transitive installed dependency. Private
development links unify duplicate native modules, AddressManager identity and
the declared pg dependency. The release checklist's clean installation remains
necessary once accepted producer packages exist. These historical App results
do not close the corrected candidate's default-build or browser gates.

### Deployment inputs and acceptance procedure

Record one versioned deployment profile before enabling BCH. Keep endpoint
credentials and wallet material in private operator configuration. Publish only
the accepted public parameters and sanitized acceptance results.

| Required input | Producer and consuming check |
| --- | --- |
| Assigned BCH protocol index | Rosen; replace the unassigned registry value consistently across codecs, App and Service. Check existing indices remain unchanged and unavailable routes stay disabled until the assignment is present. |
| Contract version, Ergo configuration box, RWT/permit/fraud addresses and token identifiers | Rosen; Watcher and Guard must consume the same contract configuration. Run the existing configuration validators, authenticate the configuration box and verify the required fee configuration loads before jobs start. |
| Native and represented token map, decimal/amount conversion and destination routes | Rosen; retain native eight-decimal satoshi handling and verify exact Rosen amount conversion through extractor, calculator, quote and payout consumers. |
| Aggregate public key, derivation policy and treasury CashAddr | Rosen threshold operators; derive the ordinary P2PKH script and match the configured treasury. Record the accepted TSS API binary separately from the npm mediator version. |
| Endpoint deployment inventory and historical starting point | Operators; qualify each BCHN endpoint with selected wallet/history samples and the Scanner block-body path. Establish rescan/pruning coverage and infrastructure independence separately from URL agreement. |
| Observation/payment/cold/manual/arbitrary confirmations, fee rate/cap and health thresholds | Operators; supply a reviewed chain/deployment policy, run positive and isolated invalid configuration cases, and retain the approved values. Fixture defaults are not production recommendations. |
| Database, image/runtime, released package graph and browser wallet profile | Operators/Rosen; follow the release checklist, validate the real mounted configuration and run fresh/upgrade/restart checks on an isolated copy of the selected database. Supply the WalletConnect project and accepted Cashonize version. |

Execute these steps on the explicitly selected network and deployment. A step
requiring signatures, funds or publication must have the corresponding approval.

1. Freeze the accepted commits, registry versions, lockfiles, binaries, images and
   public deployment profile. Run startup validation with BCH disabled, then with
   the accepted BCH configuration. Missing index, token, contract, fee data or
   mismatched treasury must stop the affected enabled path.
2. Qualify reads before authorizing any submission. Record endpoint identity,
   selected block/transaction/outpoint samples, imported treasury/history status
   and each capability result. An unexercised result needs a suitable sample;
   it is not a passed operational check. Verify Scanner historical block bodies,
   Electrum parent authentication and configured health consumers separately.
3. Start Watcher, Guard and Rosen Service against the selected isolated database.
   Observe fee readiness, scanner progress, extraction, deduplication and health.
   Restart and verify cursor, observation and pending-payment retention before
   accepting a deposit or payout. Preserve database recovery evidence.
4. Qualify the approved threshold group on an exact retained unsigned BCH body.
   Record participant admission, operation identity, returned signatures, the
   final signed bytes and actual signed transaction ID. Check every signature
   and authenticated parent, then apply BCHN non-broadcast policy validation.
   Reuse local rejected-body/signature vectors; a noncryptographic TSS fixture
   does not close this step.
5. Exercise the actual App and Cashonize relay with the selected wallet profile.
   Verify the approved first account, address, current quote, native amount and
   destination payload. Check cancellation, account/context changes and rejected
   signing leave no submission. Keep the signed body tied to the approved quote
   and relisted authenticated UTXOs.
6. After separate funds/broadcast authorization, follow one BCH-to-Ergo deposit
   through confirmed source transaction, observation, commitment/event and the
   represented asset. Follow the authorized return through its source event,
   approval identity, signed BCH ID and confirmed payout. Match amounts and fees
   in their respective raw/normalized units; record hashes, heights and statuses.
   A returned transaction ID alone is not a confirmed roundtrip.
7. Exercise the retained pending-payment restart/recovery path in the approved
   test environment. Verify reserved inputs, recovered signed-body identity and
   one payout for the accepted event, including an interrupted submission whose
   outcome is uncertain. Stop new work on inconsistent state; reconcile the
   recorded event/transaction/database state before retrying. Close acceptance
   only with the operator and maintainer receipts for the exact deployed graph.

An external production decision leaves its local fixtures, configuration checks,
release plan and acceptance preparation with the contributor. Items still
described as contributor work above are open preparation, not completed gates.

The coordinated draft PRs are submitted. Maintainer acceptance, merge, release
and operational activation remain pending. Complete compliance depends on every applicable
mandatory matrix item closing or receiving an evidenced accepted exception.
