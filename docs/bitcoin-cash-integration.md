# Bitcoin Cash integration

Status: draft contribution; further BCH implementation paused pending Rosen's document review and agreement on scope. Updated: 2026-10-03.

This is the coordinating document for native BCH support across Rosen Utils,
Scanner, Guard, Watcher, Health Check and UI. The contribution
includes ordinary native BCH deposits and payouts. CashTokens, arbitrary scripts
and token-aware CashAddr are outside this scope. Wrapped representations and
Ergo-side deployment outputs require Rosen's contract and token work.

The authoritative contribution baseline is
[`rosen-bridge/rcs@7b9784dae9d8d5b66b80de7a6043d1ba36a3a4bf`](https://github.com/rosen-bridge/rcs/tree/7b9784dae9d8d5b66b80de7a6043d1ba36a3a4bf),
verified on 2026-10-02:

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
detailed feedback. Further BCH implementation is paused until that feedback
has been addressed and the next scope agreed. The six integration PRs remain
drafts; retained test results do not establish acceptance of the documents.

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

Watcher BCH startup fetches the fee histories for TokenMap entries that include
`bitcoin-cash` before opening the API or starting scanners and jobs. A failed or
empty applicable fee set reaches the entry point and terminates startup with
exit status 1. The service supervisor can then restart it. Fees for entries
that do not include BCH are outside this startup gate.

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
An eligible result is never cached. Queue height updates write only their owned
column so a stale queue object cannot undo newer validity or removal flags.

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
raw-transaction reads. A pruned node is usable only where every block body
required by the selected start, reorganization recovery and rescan range remains
available. `initial.height` is the last processed height; `-1` starts at genesis.
Choose it from verified history and deployment policy. The configurable request
timeout is 1–300 seconds; its default is 10 seconds. Qualify full-block latency
and memory under the intended deployment limits. Do not copy the obsolete
`excessiveblocksize` option into a 29.2.0 node profile.

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
endpoint notes record the exact scope and rejected self-signed endpoint. These
Electrum methods do not supply Watcher/Guard BCHN RPC or wallet-history APIs;
independent operator deployment and RPC qualification remain open.

### Wallet and chain information

The wallet adapter uses Cashonize through WalletConnect. Its source exposes
address discovery and transaction signing, while balances and UTXOs require
the separate read provider. Signing uses the first approved HD account, ordinary
P2PKH addresses and Schnorr SIGHASH_ALL/ForkID0x41. The adapter independently
validates the signed body and every input signature; the server separately
checks policy and relists authenticated UTXOs before one submission attempt.
Trusted App quote and min/max producers have independent local review. They
snapshot mutable token metadata before asynchronous reads. Actual App
registration, browser/HTTP cancellation and bounded submission wiring pass
their local tests. The declared normal Next Webpack production build completes
compilation, typing, page-data collection and static generation against an empty
migrated PostgreSQL fixture. Chromium renders the Bridge with disabled controls
under an empty token map and BCH disabled; Events reads the database and displays
zero entries. Both browser WASM assets load and the current browser run records
no console errors. This installed development graph does not qualify released
installation, an enabled BCH wallet session or relay interoperability.

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
| Watcher | Configuration: `src/config/config.ts`, `src/config/rosenConfig.ts` and `docker/custom-environment-variables.yaml`; scanner factory: `src/utils/scanner.ts`; jobs/init: `src/jobs/initScanner.ts`, `src/init.ts`; fee readiness: `src/utils/MinimumFeeHandler.ts`; runtime profile: `.nvmrc`, `package.json`, `Dockerfile` and `.github/workflows/ci.yml`. |
| UI | Chain data: `packages/constants/src/index.ts` and `packages/icons/src/networks/bitcoin-cash.svg`; network/metadata/signature validation and server provider: `networks/bitcoin-cash/src/`; wallet: `wallets/cashonize/src/`. |
| UI App | Server policy/config: `apps/rosen/src/networks/bitcoin-cash/`; HTTP submit: `apps/rosen/src/app/api/bitcoin-cash/submit/route.ts`; wallet authority: `apps/rosen/src/hooks/useWallet.tsx`; browser build: `apps/rosen/next.config.ts`. |
| UI Service | Scanner integration: `apps/rosen-service/src/scanner/chains/bitcoin-cash.ts`; calculator: `packages/asset-calculator/lib/calculator/chains/bitcoin-cash-calculator.ts`; entity/history compatibility: `packages/data-source/src/dataSource.ts` and `migrations.ts`. |
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
| DAPP / RCS-003 Requirements, Wallet package | Conditional convenience at base; explicit wallet surface for UI | Cashonize signing/session adapter and native read provider; actual BaseWallet adapter. | 47 signing/session and 25 adapter cases independently pass, including disconnect cancellation. App registration, typing, normal production build and disabled-state browser rendering pass; operational relay pending. Contributor/operators. |
| CHAINING / RCS-003 Requirements                                    | D; excluded initially                                            | Confirmed input selection and reservation sets; no spending unconfirmed change.                                                                                        | Implemented policy; document throughput tradeoff. Contributor.                                                                                                                         |
| IDENTITY / RCS-003 Requirements | E; concurrent/restarted payouts | Approval envelopes, signed-ID derivation and persisted recovery. Current chain/provider reconstruct exact previously observed unsigned/signed bytes and recover their envelope through bounded RPC history. | Four current-source join cases and 47 maintained transaction-processor tests pass. Two maintained cases join the actual processor, RPC provider and SQLite persistence, including an isolated recovered-body mismatch. Three private recovery/order cases pass with 2,913 stable selected pins and independent source/evidence/read-only database review. Operational custody and configured roundtrip remain pending. Contributor/operators. |
| FEE / RCS-003 Requirements | Applicable design concern | Integer miner byte rate/cap, exact signed body, normalized metadata and trusted current server quote/ratio. | Builder/validator, 40 Network, trusted quote23 and min/max29 cases independently pass, including token refresh and absolute quote deadlines. Actual App/config compilation passes; operator monitoring pending. Contributor/operators. |
| SCAFFOLD / RCS-002, RCS-003 Modules                                | C; new backend packages                                          | Kodegen 0.12.0 official templates rendered for five backend packages; candidate metadata, portable test scripts and TypeScript settings compared to generated outputs. | Locally checked. Generation used the unmodified template engine with scripted prompts; ancillary shell actions were recorded and package installation handled separately. Contributor. |
| PACKAGES / RCS-003 Integration Notes | C; new packages | Exact manifest/changeset inventory covers codec, chain, provider, scanner, observation, UI network and wallet. | Seven version0.0.0 manifests retain one minor initialization changeset each. Seven npm11 package dry-runs include every main/types/export target. Five backend manifests exclude only TypeScript build caches; retained runtime/declaration bytes are unchanged. UI packages retain the repository's private-workspace convention. Released dependency installation remains pending. Contributor/Rosen. |
| CHANGESETS / RCS-003 Integration Notes | C; each PR | Integration changesets retained; Guard service integration uses major. Watcher uses major because its declared Node floor changes to 22.18.0. Two minor changesets cover existing Ergo/Cardano browser codecs. Unrelated bootstrap changeset preserved. | Scoped inventories pass; compare the exact selected bytes and metadata with this matrix at promotion. Contributor. |
| TESTS / RCS-001 | E/C; TypeScript tests | Vitest, mirrored paths, primary-source/method groups, four scenario sections and isolated mocks. Utils 73, prior Service 79, data-source 7 and UI server 180 cases retain their reviewed scopes. Guard audit covers 198 documented blocks. | Prior Guard 455 official/321 mixed results retain their frozen-input scope; the current 47-case processor file includes two new recovery cases. Watcher's prior 185 legacy/93 composed Vitest evidence is reused only where inputs remain unchanged; the changed fee join passes 81 focused cases separately. These counts overlap and are not summed. Two new Service health-registration cases pass with independent execution and one killed registration mutant. Maintained Scanner 12 and UI 5 PostgreSQL/ownership cases retain the scopes below. The 14-path port and UI metadata/calculator/POST mirrors are reviewed. Codec/scanner/observation regrouping passes 141 unchanged cases; builder 45 and final root-group review pass. Environment fixture redaction reruns 40+55 config cases; 14 balance cases remain unchanged. Contributor/reviewer. |
| CODE / RCS-002 | C; TypeScript source | JSDoc, arrows where suitable, scoped formatting/logging and repository runtime pins. Inventory covers46 files/232 named functions across seven new packages and shared health/extractors, plus19 App/adapters files/60 named functions. | All inventoried named functions have a general description. Three codec descriptions and one submission helper description are independently verified comment-only deltas; executable ASTs and prior functional evidence remain unchanged. Contributor. |
| SCAN / RCS-003 Scanner | E/C; BCH RPC | Separate BCH RPC connector/scanner package; exact database entity/migration exports. | 72 BCH cases:61 scanner/validation and11 observation cases pass with independent convention review; nine unchanged legacy-chain regressions remain qualified. Genuine shared UI PostgreSQL factory runs35 legacy migrations and36 with BCH. Actual Service scanner startup persists a block, observation and cursor through the real extractor; an isolated transaction-identity fault persists no block or observation and retains the initial cursor0. Repeated same-tip scanning adds no records. Deployment remains pending. Contributor/operators. |
| SCAN-CLEANUP / RCS-001, RCS-003 Scanner | E applicability; shared block retention used by Watcher | Each extractor reference query remains a separate NOT IN predicate, preserving parameters, NULL behavior, branch-local ORDER/LIMIT, scanner namespace, age and batch limits. | 38 scoped tests and nine independent installed-module scenarios pass on SQLite 3.44.2. The original nested UNION fails seven new cases; flattening the UNION fails the branch-limit case. The maintained PostgreSQL command below passes eight actual Action/EntityManager scenarios and four cleanup-ownership falsifiers, with independent execution. Every schema runs seven migrations. The default Action file passes 42 cases and skips eight PG cases without a URL. The rebuilt Watcher completes BCH and Ergo cleanup. Deployment remains an operator gate. |
| CODEC / RCS-003 Address Codec | E; ordinary CashAddr | Utils address-codec-chains/bitcoin-cash and address-codec dispatch. | 69 codec cases pass after function-specific regrouping; two dispatcher cases remain reusable. Assertions/fixtures and runtime AST are unchanged, independently reviewed. Package build/type/style evidence remains valid for that executable scope. Contributor. |
| EXTRACT-RPC / RCS-003 Rosen Extractor Network-based | E; BCHN transactions | RPC extractor, shared transaction type and mirrored framing/amount helpers. | 48 RPC and 17 helper cases independently pass; build, typing and lint pass. BCH source support does not assign a destination index. Contributor. |
| OBSERVE / RCS-003 Observation Extractor | E/C; scanner observations | Distinct observation package, shared transaction type, Watcher/Service registrations and exact entity export. | Package, Watcher and Service tests pass. Exact-version histories and populated legacy-to-BCH alias CRUD retain their reviewed scopes. Actual Service config, AddressManager bootstrap, token-map parser, scanner and extractor persist one observation in PostgreSQL; duplicate-tip and isolated invalid-identity cases preserve the expected state. Full deployed Service operation remains pending. Contributor/operators. |
| CHAIN-BASE / RCS-003 Abstract Chain Bases                          | E; BCH is UTXO based                                             | Guard chain/network use UTXO bases and native selection metadata after parent authentication.                                                                          | 126 tests and typecheck pass; independent review and 12 selector tests pass. Contributor/reviewer.                                                                                     |
| EXTRACT-UNIVERSAL / RCS-003 Rosen Extractor Universal | E; Guard transaction JSON | String extractor reuses Utils BCH transaction type and performs amount wrapping once. Shared active destination registry preserves indices 0–9 and rejects unassigned 10. | Five universal and three registry regressions independently pass within the 73-case Utils closure; observation and Guard joins pass after rebuild. Contributor. |
| CHAIN / RCS-003 Abstract Chain | E; payment/recovery/verification | Guard native BCH chain, transaction envelope and serialization utilities use UTXO bases. | Chain195, base126 and selector12 cases have scoped independent review. Four fresh current-source join cases reconstruct and recover the exact historical accepted bytes and reject reserved parents, changed value and changed signature. Historical signing evidence is reused only for identical bytes; a new threshold cycle remains pending. Contributor/operators. |
| PROVIDER / RCS-003 Abstract Chain Network | E/C; BCHN API | Guard packages/networks/bitcoin-cash-rpc, rate-limited client, identity and raw-prevout checks; bounded read-only capability API. | Existing62 cases,32 probes, six mutants and four native observations retain their scopes. Capability preparation adds29 tests,13 independent probes and three killed mutants for allowlist/request/deadline guards. Package build,20-file archive, nine unpacked TSX consumer assertions and declaration consumer pass. Plain Node import retains the existing extensionless-import limitation. Released installation and independent operator endpoint qualification remain pending. Contributor/operators. |
| HEALTH / RCS-003 Asset Check                                       | E; native treasury balance                                       | Health Check asset-check/bitcoinCash extends AbstractAssetHealthCheckParam; Guard thin adapter.                                                                        | 27 shared and 25 consumer tests pass; independent review/replay passes. Released dependency still pending. Rosen.                                                                      |
| WATCH-CONFIG / RCS-003 Watcher Service | E; config, defaults, secrets | BCH config/defaults, separate scanner/observation imports and username/password environment mappings. Node 22.18/npm 11.6.2 profile agrees across manifest, lock, CI and Docker declarations. | Prior 185 legacy/89 Vitest run and environment-mapping config 36→40 rerun retain their reviewed scope. The earlier composed 93 cases are predecessor evidence where inputs remain unchanged; changed fee validation is recorded separately. Typing and SQLite event/cursor/deduplication receipt are reviewed. Rollup build and unmodified test-mode smoke pass; SQLite loads with no network attempts or created DB. Snappy is emitted but unexercised. CI, Docker and released installation remain pending. Contributor/Rosen. |
| WATCH-JOBS / RCS-003 Watcher Service | E; scanner, observation, jobs, sync health | Scanner factory, scheduled scanning, fee readiness and sync registration; bounded BCH fee-read adapter. | The fee adapter/handler passes 81 focused cases and seven isolated guard mutants with independent execution, including native HTTP-body abort and expired queued-request suppression. The rebuilt entry loads actual fee boxes and reaches job readiness. Its 12 timer observations include the batch watchdog. A held read expires at 2001 ms, installs no fee handler and starts only two scanner timers, with no downstream jobs. Three API routes return 200 in both modes. SQLite executes 43 migrations, retains BCH/Ergo PROCEED blocks and completes both cleanups. Independent source/evidence review verifies both 64-pin startup closures without replaying startup. Synthetic scanner health retains its earlier scoped result; deployed health and operational commitment/redeem remain open. Contributor/operators. |
| GUARD-CONFIG / RCS-003 Guard Service | E; chain, addresses, confirmations, networks, secrets and batching | GuardsBitcoinCashConfigs, chain/network registration, readiness checks and username/password mappings. RPC batch default9999 follows RCS; the validated integer1..10000 range is a contributor design choice. | 55 config and14 balance-consumer cases independently pass. Native batches1/9999 both make exactly two asset RPC reads and two persistence calls. Types/lint pass. Nine fresh node-config processes qualify configuration/environment loading with synthetic inputs and exact mapping files; container execution and released installation remain pending. The mount arrangement below supplies the files excluded by the Docker build context. Contributor/operators. |
| GUARD-JOINS / RCS-003 Guard Service | E; source/target processing, balance/health | Event ingestion, transaction verification, amount boundary, persistence/recovery, mediator and shared health. | Guard 455 official/321 mixed cases and four generator/recovery cases retain their reviewed scopes. Two bootstrap/init fixtures decode real WASM synthetic Guard membership and eight fee boxes, persist BCH balances, invoke empty processors and observe health Healthy→Broken→Healthy. Their 44 selected pins and eight boundary negatives have independent review. The maintained 47-case processor file adds two nonempty actual-provider/SQLite recovery cases. Three private cases prove signed persistence before sent status, reject a recovered raw-body mismatch and kill a no-op persistence mutant; independent review checks 2,913 selected pins and saved SQLite rows. Index-wrapper execution, public-IP discovery, production threshold custody and deployed roundtrip remain open. Contributor/operators. |
| UI-BASE / RCS-003 Icons, Constants, Utils, Bases, App | E/C; one base-data contribution | Monochrome icon, registry index -1, explorer URLs, metadata workspace and unavailable-route filtering. | 32 base tests and icon declaration/build pass. Actual registration/config, production App build and disabled-state Chromium rendering pass. One actual PairingDialog DOM fixture passes. Enabled wallet/deployment qualification remains pending. Contributor/operators. |
| UI-BUILD / RCS-003 Network and Wallet build instructions | E; named build.sh instructions at this RCS revision | This UI baseline has no build.sh. Existing root workspace discovery includes networks/* and wallets/*; Turbo/workspace builds consume these packages. | Workspace builds and the normal production App build pass locally. Using this repository's current build procedure is a proposed deviation from the named script; maintainer agreement remains pending. Contributor/Rosen. |
| UI-CALC / RCS-003 Asset Calculator | E; native balances | Native BCH calculator and optional constructor config; explicit server-only TLS Electrum read provider factory. | Final37 mixed cases and four Service factory tests retain independent review. Two actual Service calculator/provider/session/TokenMap/PostgreSQL fixtures store100001 satoshis as2 normalized units and the synthetic represented-token supply as1000. Repetition preserves rows; an isolated parent-value mismatch produces exactly one expected rejection warning and preserves existing amounts. TLS is substituted; live accounting and atomic failure handling are not established. Contributor/operators. |
| UI-SERVICE / RCS-003 Rosen Service | E; scanner, observation, events, calculator, sync health | Optional scanner, observations, commitments, event triggers, accounting and sync-health joins; explicit configuration. | Prior 79 tests retain their scope. Two enabled/disabled health-registration cases pass with independent execution and a killed registration mutant; current TypeScript check passes. Five fresh-process ingestion/config fixtures and two accounting/health fixtures join actual consumers to PostgreSQL, including identity, persistence and threshold negatives. Independent source/evidence review passes within those scopes. Operational full-entry startup needs the accepted whole-service profile; released installation and deployed operation remain pending. Contributor/operators. |
| UI-DB / RCS-003 Rosen Service/Scanner | D; retain legacy persistence while adding BCH package identities | Optional data-source entity/history extension; scanner2.0.3/4.0.0 and exact-lock observation1.0.10/2.0.0 histories. | Seven tests, three offline probes and exact-version review pass. Genuine factory/native pg runs35 migrations/21 entity identities disabled and36/24 enabled. A populated upgrade preserves three legacy records, alias CRUD and three duplicate-row rejections; added-migration DOWN is rolled back and reconnect adds no migrations. Actual Service ingestion/accounting and App Events additionally consume PostgreSQL. Review inspects source and author evidence without independent PG replay. Wider legacy-data coverage and deployment remain separate gates. Contributor/operators. |
| UI-NETWORK / RCS-003 Network Package | E; height, fee, min/max and complete lock transaction | Canonical metadata, authenticated unsigned deposit/fee estimator, signed Schnorr validator and typed client ports. | Frozen builder/validator and40 client cases independently pass; the consolidated metadata mirror passes22. App quote23/min-max29 and registry3 cases pass. Actual App wiring, typing and normal production build pass. Contributor. |
| UI-TRANSPORT / RCS-003 Network/App | D; bounded backend policy and submission | TLS read/submission, native cancellation and one trusted absolute HTTP deadline propagated through quote, authorization and final socket write. | 180 server, quote23/handler13 and browser15 cases independently pass. Real mocked whole join refuses late quote with zero socket/broadcast. Browser rejects post-settlement expiry. Five actual NextRequest/POST cases and normal production route build pass. Server RCS method-group delta independently closed with unchanged runtime. Contributor. |
| UI-WALLET / RCS-003 Wallet, App wallet configuration | E; at least one wallet | Cashonize session/signing wire and actual BaseWallet adapter pinned to wallet/SDK sources; explicit first-account pairing confirmation. | 47 signing/session,25 adapter,18 pairing/startup/createEnv and six source-lease hook cases independently pass. Actual DOM pairing, App typing and full-graph compile pass. A source change or unmount invalidates old connect/restore/disconnect continuations. Full browser/relay interoperability remains pending. Contributor/operators. |
| UI-FORM / RCS-001, RCS-003 App | E applicability; field validation consumes current wallet, asset and destination | Current upstream debounced form integration; context snapshots, input revisions and reset/unmount revocation prevent obsolete amount/address responses from publishing. | 29 mirrored cases independently pass with the declared Vitest configuration, including isolated balance/address/max/min boundaries, token identity/type, field changes and identical resets. A real React/React Hook Form replay confirms a late minimum rejection leaves the reset field clear and stops its spinner. Broader real-browser behavior remains pending. Contributor/operators. |
| UI-BROWSER / RCS-003 Network/App | E applicability; client-side transaction and address APIs. D; browser dependency mapping | Shared Ergo/Cardano codec packages map matching exact Node/browser WASM versions; App uses Webpack async WASM and its existing Buffer provider. | Controlled web-target VM and real Chromium execute22 first-use metadata/signature checks, including seven mutants and independently held WASM replies. The normal production App build additionally completes page-data/static generation against genuine empty PostgreSQL. Actual Chromium renders disabled Bridge controls, loads both WASM assets and receives200 from the empty Events API with no current console errors. Selected inputs are pinned; browser execution is author-run. Private dependency deduplication and a native pg resolution link are part of this installed graph. Clean released installation, enabled BCH interaction and wallet relay remain separate gates. Contributor/operators. |
| CONTRACTS / RCS-003 Contracts                                      | E; Rosen-owned outputs                                           | Contracts, protocol chain index, token map, RWT/permit/fraud addresses and represented tokens.                                                                         | Pending Rosen team. Contributor supplies documented interfaces and fixtures.                                                                                                           |
| CHAIN-INFO / RCS-003 recommended information                       | R; reviewer/operator context                                     | Address/decimal/confirmation policy described above; deployment profile must supply finality, derivation and node sizing.                                              | Partly supplied; operator profile pending. Operators.                                                                                                                                  |
| RELEASE / RCS-003 Integration Notes, cross-repository dependencies | C/E applicability; reproducible installation | Package inventory and dependency order below; dedicated tss-api patch changeset covers the Go runtime, separately from npm TSS. | A clean local-tarball installation rehearsal and release preparation are supplied. Actual accepted versions, package/binary publication and private UI deployment remain Rosen-owned; published-version lock regeneration and native/full-application installation qualification remain contributor work after those releases. |
| OP-START / operator review on Watcher #17 | D; BCH startup lifecycle | Await BCH-applicable fee histories before service exposure; propagate failure to exit status 1. | Actual entry/init child-process failures and positive ordering pass. Current Watcher BCH suite passes 249 cases; the legacy suite passes 185. A deployed supervisor remains operator-owned. |
| OP-TRANSPORT / operator review on Watcher #17 | D; Watcher and Guard RPC | Shared configuration/connector validation, literal loopback HTTP or HTTPS, paired credentials, no redirects. | Endpoint negatives and actual local HTTP redirect tests pass. Local HTTP cases supplement mocked unit tests; production TLS/authentication remains endpoint-specific. |
| OP-SCAN / operator review on Watcher #17 | D; bounded scanning and recovery | Configurable scanner budgets, distinct resource failure and unchanged checkpoint recovery; Watcher and Rosen Service forward the shared limits. | Scanner suite passes 168 cases. Actual BCHN 4,097-output block confirms the default-limit failure and same-block retry. SQLite restart preserves block/extractor rows and advances once after increasing the budget. Rosen Service's affected suite passes 141 cases, with 128 configuration/factory cases independently replayed. Deployment memory and selected history remain to qualify. |
| OP-DEPOSIT / current native deposit profile | D; matched extractor/Guard admission | Keep the deposit envelope distinct from scanner work budgets and payout construction limits. | Twelve canonical boundary cases cover the inclusive input/output/byte limits and one above each across the two consumers. Rosen must accept the supported profile; these fixtures establish no consensus/script validity. |
| OP-FINALITY / operator review on Watcher #17 | D; proposed pre-sign and pre-broadcast policy | Recorded block identity, two endpoint views, finalized active ancestry, parked-fork checks, coherent snapshots and deadlines. | RPC negatives and actual consumer tests pass; persisted queue readback/retry passes with SQLite migrations and reopen. Twelve native source/build checks pass under explicit regtest controls. Rosen must accept the proposed policy and verify deployed cleanup contracts; production delay and operator endpoint independence remain to qualify. |
| OP-QUEUE / persisted retry fixture | D; shared transaction bookkeeping invariant | Update the height column without saving stale validity/removal fields. | Actual SQLite tests isolate stale invalid, deleted and combined state. Historic Watcher suite passes 185 cases on the corrected source. |
| OP-IMPORTS / operator review on Watcher #17 | D; shared module evaluation | CashAddr imports the pure address module from exact-pinned libauth 3.0.0. | 70 codec cases and five shared-dispatch cases pass, including fresh synchronous loading that rejects crypto imports. The eager transaction extractor and flattened service bundles still need an agreed package/API isolation design. |
| ACCEPTANCE / external state | E before acceptance/activation claims | Six coordinated BCH PRs, maintainer decisions, merge/release and deployment receipts. | The six BCH PRs remain drafts; further implementation is paused pending document feedback and agreement on scope. Sign Protocols #9 is reviewed separately as a generic fix. No merge, integration acceptance or activation is established. Rosen/operators. |

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

Scanner's abstract-scanner package supplies eight isolated PostgreSQL Action
cases and four cleanup-ownership falsifiers. Each schema records its creation
token, OID and name, verifies the search path before DDL, and rechecks ownership
before removal. The tests preserve foreign schemas and close their connections.
Supply a dedicated test database URL privately, then run in the Scanner repository:

```sh
SCANNER_POSTGRES_TEST_URL='<dedicated-test-database-url>' npm run test:postgres --workspace=@rosen-bridge/abstract-scanner
```

The explicit command rejects a missing URL. The ordinary test command skips
the eight database cases when that URL is absent. All 12 maintained cases have
independent execution on PostgreSQL 17.11; they use synthetic extractor-reference
queries and do not establish deployment compatibility or a clean released install.

UI's data-source package supplies a maintained populated-upgrade test and four
isolated ownership/URL guards. Its five cases pass with independent source and
evidence review; the ordinary suite passes 11 cases and skips the database case
without a URL. After building the UI workspace and Service-declared BCH packages,
set `ROSEN_UI_TEST_POSTGRES_URL` privately to a dedicated test-server connection
whose role can create and drop databases, then run in the UI repository:

```sh
npm run test:postgres --workspace=@rosen-ui/data-source
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

Shared prerequisites must be coordinated with existing contributions:
[Utils#6](https://github.com/rosen-bridge/utils/pull/6) contains the same four
TypeORM ESM fixes, and [Watcher#16](https://github.com/rosen-bridge/watcher/pull/16)
already proposes Node22.18/npm11.6.2. The BCH Rollup entry, source-map and native
loading adaptations are distinct. [UI#31](https://github.com/rosen-bridge/ui/pull/31)
already proposes the legacy observation1.0.10 alignment. These prerequisites
remain maintainer-owned decisions; their presence in local validation does not
establish Rosen adoption. See the [runtime migration decision](https://github.com/rosen-bridge/watcher/pull/12#issuecomment-5022983382).

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
4. Release Guard's BCH chain before its RPC provider. Backend workspace publication
   can be scoped, for example
   `npm run release --workspace=@rosen-bridge/address-codec-bitcoin-cash` in Utils.
   Root release scripts can publish unrelated workspaces; use only the accepted plan.
5. Update downstream external dependency ranges to actual published versions.
   Run `npm install --package-lock-only`, inspect registry resolutions/integrities,
   then run `npm ci` in a clean disposable checkout without source overlays.
   Existing `0.0.0` ranges are source-workspace placeholders, not registry releases.
6. Recheck the affected installed joins: Watcher build/types/tests and startup;
   Guard chain/config/shared-health; UI Service factory/bootstrap/types/tests;
   App typing and its declared Webpack build. Record package metadata, lockfile
   digest, clean-install evidence and binary/image identities.
7. Publish the TSS API binary containing the Go admission/registry fixes using
   the repository's `tss-api-*` tag workflow. Its private package has a dedicated
   patch changeset. Publishing `@rosen-bridge/tss` alone does not ship these fixes.
   Watcher's release script produces a host binary; private Guard/UI deployment
   and TSS API binary publication are separate from npm package publication.

Read-only release-plan assembly succeeds for the coordinated UI candidate.
Its selective `version:rosen-service`, `version:guard` and `version:watcher`
scripts currently reject ignored dependency edges and mixed changesets.
Ignoring BCH network would also conflict with Rosen Service, which consumes
its server provider. A separate application release therefore needs an accepted
dependency closure and split mixed changesets; blindly excluding the new
packages is insufficient. Calculated version bumps do not select Rosen's
release versions or authorize publishing.

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

A second Windows rehearsal uses the same lock and tarballs with normal install
scripts and no forced crypto backend. The `sqlite3` 5.1.7 package's default installer selection
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

The shared Rosen extractor barrel still exports the BCH extractor eagerly.
Transaction decoding reaches libauth crypto initialization and top-level await.
Watcher flattens dynamic imports in its Rollup output, and Guard constructs its
chain registry synchronously. Adding a dynamic import alone would not establish
isolation for those consumers.

The proposed package boundary is a dedicated BCH extractor entry or package
that preserves synchronous extractor methods. Its migration would remove the
new BCH exports from the legacy root, move BCH observation/Guard imports to the
dedicated entry and verify both source and emitted consumer graphs. Rosen must
choose that boundary and the shared release scope before this API migration.
Keeping the current eager entry instead requires explicit acceptance of the
shared Node/runtime impact. Neither option is presented as accepted.

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
| UI-BASE, UI-WALLET, UI-FORM, UI-BROWSER, LOCK, DAPP | Real-browser crypto/metadata fixtures, normal production App build and disabled-state App smoke are supplied. Execute the enabled wallet/operational acceptance procedure once its inputs and authority exist. | WalletConnect/Wallet approval, real wallet session and authorized operational deposit. Operators/user. |
| ENDPOINTS, PROVIDER | Bounded Guard read-only capability API, sample inventory and synthetic/package consumer validation are supplied. Scanner's separate read-only block-body example includes sample checks, limits and supervision guidance. | Independent BCHN deployments, credentials and imported treasury/history; selected Electrum deployment. Operators. |
| CONTRACTS, TOKENS, CHAIN-INFO | Parameterized interfaces, deterministic fixtures and the input/acceptance checklist below are supplied. Apply existing startup validators to the actual accepted outputs when supplied. | BCH chain index, represented Ergo token, contracts/RWT/permit/fraud addresses, aggregate-key derivation and production policy. Rosen/operators. |
| CUSTODY, IDENTITY, WATCH-JOBS, ACCEPTANCE | Current TSS source reuse, synthetic threshold fixtures, maintained recovery tests, bounded fee-read tests and rebuilt Watcher startup review are supplied. The operational threshold/roundtrip acceptance sequence is supplied below. | Threshold group/key ceremony, accepted TSS binary, coordinated PR acceptance/merge/release and authorized activation. Rosen/operators/user. |

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

The App uses the declared `npm run build --workspace @rosen-bridge/rosen-app`
production command and actual `next start`. The extended TypeORM wrapper is
bundled because its installed ESM entry uses extensionless imports; `typeorm`
itself remains external. Build43 and server45 selected inputs, seven build
outputs, HTTP logs, screenshots and accessibility snapshots have independent
source/evidence review. Browser execution is author-run. The empty fixture
database and disabled BCH configuration qualify startup/rendering only. Both
browser WASM requests and the Events API return200. Servers and owned databases
are closed after capture; unrelated local services are preserved.

These selected pins do not cover every transitive installed dependency. Private
development links unify duplicate native modules, AddressManager identity and
the declared pg dependency. The release checklist's clean installation remains
necessary once accepted producer packages exist.

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
