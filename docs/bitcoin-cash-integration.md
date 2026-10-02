# Bitcoin Cash integration

Status: implementation in progress. Updated: 2026-10-02.

This is the coordinating document for native BCH support across Rosen Utils,
Scanner, Guard, Watcher, Health Check, UI and Sign Protocols. The contribution
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
their local tests. The declared Next Webpack build compiles the complete graph,
including the Bridge page, BCH POST route and two browser WASM assets. This
compile-mode result does not qualify database prerendering, wallet relay or
operational activation.

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
| CUSTODY / RCS-003 Requirements                                     | E; native treasury                                               | Guard BCH chain and Sign Protocols ECDSA/ForkID adapter; authenticated prevouts and aggregate-key/address match.                                                       | Local fixtures exist; threshold group and actual key ceremony pending. Rosen/operators.                                                                                                |
| LOCK / RCS-003 Requirements | E; deposits | Canonical UI unsigned/signed transactions and RPC/universal extractors. Current-source BCHN regtest accepts two signed candidates, rejects seven mutations and decodes the same bytes into two matching extractor events. | Dated node observation and independent offline byte/signature/extractor replay pass. No candidate broadcast; wallet relay and operational deposit flow pending. Contributor/operators. |
| ENDPOINTS / RCS-003 Requirements | E; Watcher, Guard and UI | BCHN RPC connector; certified TLS Electrum address-indexed provider and dated public endpoint notes. | Two public Electrum services pass protocol/checkpoint/tip reads; no spendable fixture outputs. Watcher/Guard independent BCHN RPC and wallet-history qualification pending. Operators/contributor. |
| TOKENS / RCS-003 Requirements                                      | Conditional; native BCH scope                                    | Token-aware addresses and CashTokens rejected. No foreign asset representation on BCH is proposed.                                                                     | BCH token support N/A for this native-only contribution; Ergo representation pending Rosen.                                                                                            |
| DAPP / RCS-003 Requirements, Wallet package | Conditional convenience at base; explicit wallet surface for UI | Cashonize signing/session adapter and native read provider; actual BaseWallet adapter. | 47 signing/session and 25 adapter cases independently pass, including disconnect cancellation. App registration, typing and compile-mode build pass; operational relay pending. Contributor/operators. |
| CHAINING / RCS-003 Requirements                                    | D; excluded initially                                            | Confirmed input selection and reservation sets; no spending unconfirmed change.                                                                                        | Implemented policy; document throughput tradeoff. Contributor.                                                                                                                         |
| IDENTITY / RCS-003 Requirements | E; concurrent/restarted payouts | Approval envelopes, signed-ID derivation and persisted recovery. Current chain/provider reconstruct exact previously observed unsigned/signed bytes and recover their envelope through bounded RPC history. | Four current-source join cases pass with independent review. Signing/recovery executable AST is unchanged across the documented UTXO-base adaptation. Operational custody and configured roundtrip remain pending. Contributor/operators. |
| FEE / RCS-003 Requirements | Applicable design concern | Integer miner byte rate/cap, exact signed body, normalized metadata and trusted current server quote/ratio. | Builder/validator, 40 Network, trusted quote23 and min/max29 cases independently pass, including token refresh and absolute quote deadlines. Actual App/config compilation passes; operator monitoring pending. Contributor/operators. |
| SCAFFOLD / RCS-002, RCS-003 Modules                                | C; new backend packages                                          | Kodegen 0.12.0 official templates rendered for five backend packages; candidate metadata, portable test scripts and TypeScript settings compared to generated outputs. | Locally checked. Generation used the unmodified template engine with scripted prompts; ancillary shell actions were recorded and package installation handled separately. Contributor. |
| PACKAGES / RCS-003 Integration Notes | C; new packages | Exact manifest/changeset inventory covers codec, chain, provider, scanner, observation, UI network and wallet. | Seven version0.0.0 manifests retain one minor initialization changeset each. Seven npm11 package dry-runs include every main/types/export target. Five backend manifests exclude only TypeScript build caches; retained runtime/declaration bytes are unchanged. UI packages retain the repository's private-workspace convention. Released dependency installation remains pending. Contributor/Rosen. |
| CHANGESETS / RCS-003 Integration Notes | C; each PR | Integration changesets retained; Guard service integration uses major. Watcher uses major because its declared Node floor changes to22.18.0. Two minor changesets cover existing Ergo/Cardano browser codecs. Unrelated bootstrap changeset preserved. | Scoped inventories pass; exact final candidate review remains due. Contributor. |
| TESTS / RCS-001 | E/C; TypeScript tests | Vitest, mirrored paths, primary-source/method groups, four scenario sections and isolated mocks. Utils73, Service79, data-source7 and UI server180 cases pass with independent scoped review. Guard audit covers198 documented blocks. | Guard455 official and321 mixed cases pass with scoped review. Watcher previously ran185 legacy Mocha+89 Vitest cases; its config delta increases36→40, giving93 current Vitest cases through composed evidence. Its14-path port and UI metadata/calculator/POST mirrors are reviewed. Codec/scanner/observation regrouping passes141 cases with unchanged assertions/fixtures. Builder45 cases and its final root-group delta have independent review. Final environment fixture redaction reruns40+55 config cases;14 balance cases remain unchanged. Contributor/reviewer. |
| CODE / RCS-002 | C; TypeScript source | JSDoc, arrows where suitable, scoped formatting/logging and repository runtime pins. Inventory covers46 files/232 named functions across seven new packages and shared health/extractors, plus19 App/adapters files/60 named functions. | All inventoried named functions have a general description. Three codec descriptions and one submission helper description are independently verified comment-only deltas; executable ASTs and prior functional evidence remain unchanged. Contributor. |
| SCAN / RCS-003 Scanner | E/C; BCH RPC | Separate BCH RPC connector/scanner package; exact database entity/migration exports. | 72 BCH cases:61 scanner/validation and11 observation cases pass with independent convention review; nine unchanged legacy-chain regressions remain qualified. Service constructor compatibility and offline history checks pass. Genuine shared UI PostgreSQL factory runs35 legacy migrations and36 with BCH on fresh databases. Service runtime and deployed database qualification remain pending. Contributor/operators. |
| SCAN-CLEANUP / RCS-001, RCS-003 Scanner | E applicability; shared block retention used by Watcher | Each extractor reference query remains a separate NOT IN predicate, preserving parameters, NULL behavior, branch-local ORDER/LIMIT, scanner namespace, age and batch limits. | 38 scoped tests and nine independent installed-module scenarios pass on SQLite3.44.2. The original nested UNION fails seven new cases; flattening the UNION fails the branch-limit case. Eight genuine local PostgreSQL17.11 Action/EntityManager scenarios execute seven migrations per schema and preserve the expected rows. These use synthetic reference queries and have independent source/evidence review, without independent PG replay. The rebuilt Watcher completes BCH and Ergo cleanup. Local scope closed; deployment remains an operator gate. |
| CODEC / RCS-003 Address Codec | E; ordinary CashAddr | Utils address-codec-chains/bitcoin-cash and address-codec dispatch. | 69 codec cases pass after function-specific regrouping; two dispatcher cases remain reusable. Assertions/fixtures and runtime AST are unchanged, independently reviewed. Package build/type/style evidence remains valid for that executable scope. Contributor. |
| EXTRACT-RPC / RCS-003 Rosen Extractor Network-based | E; BCHN transactions | RPC extractor, shared transaction type and mirrored framing/amount helpers. | 48 RPC and 17 helper cases independently pass; build, typing and lint pass. BCH source support does not assign a destination index. Contributor. |
| OBSERVE / RCS-003 Observation Extractor | E/C; scanner observations | Distinct observation package, shared transaction type, Watcher/Service registrations and exact entity export. | Package, Watcher and Service tests pass. Production-lock observation1.0.10/2.0.0 identities/history have independent offline review. Actual shared UI PG factory executes the histories. A populated legacy-to-BCH upgrade preserves synthetic observation/status rows and qualifies their alias CRUD. Service observation ingestion/runtime remain pending. Contributor/operators. |
| CHAIN-BASE / RCS-003 Abstract Chain Bases                          | E; BCH is UTXO based                                             | Guard chain/network use UTXO bases and native selection metadata after parent authentication.                                                                          | 126 tests and typecheck pass; independent review and 12 selector tests pass. Contributor/reviewer.                                                                                     |
| EXTRACT-UNIVERSAL / RCS-003 Rosen Extractor Universal | E; Guard transaction JSON | String extractor reuses Utils BCH transaction type and performs amount wrapping once. Shared active destination registry preserves indices 0–9 and rejects unassigned 10. | Five universal and three registry regressions independently pass within the 73-case Utils closure; observation and Guard joins pass after rebuild. Contributor. |
| CHAIN / RCS-003 Abstract Chain | E; payment/recovery/verification | Guard native BCH chain, transaction envelope and serialization utilities use UTXO bases. | Chain195, base126 and selector12 cases have scoped independent review. Four fresh current-source join cases reconstruct and recover the exact historical accepted bytes and reject reserved parents, changed value and changed signature. Historical signing evidence is reused only for identical bytes; a new threshold cycle remains pending. Contributor/operators. |
| PROVIDER / RCS-003 Abstract Chain Network | E/C; BCHN API | Guard packages/networks/bitcoin-cash-rpc, rate-limited client, identity and raw-prevout checks. | 62 cases,32 probes, six mutants and four native observations are qualified. Current four provider source ASTs match the reviewed RPC freeze; build and current generator/recovery join pass. Released installation and independent operator endpoint qualification remain pending. Contributor/operators. |
| HEALTH / RCS-003 Asset Check                                       | E; native treasury balance                                       | Health Check asset-check/bitcoinCash extends AbstractAssetHealthCheckParam; Guard thin adapter.                                                                        | 27 shared and 25 consumer tests pass; independent review/replay passes. Released dependency still pending. Rosen.                                                                      |
| WATCH-CONFIG / RCS-003 Watcher Service | E; config, defaults, secrets | BCH config/defaults, separate scanner/observation imports and username/password environment mappings. Node22.18/npm11.6.2 profile agrees across manifest, lock, CI and Docker declarations. | Previous declared185 legacy+89 Vitest run passes; actual environment mapping increases config36→40 and reruns40 green. The unchanged53 other cases give a composed93-case current Vitest closure. Typing and SQLite event/cursor/deduplication receipt are reviewed. Rollup build and unmodified test-mode smoke pass; SQLite loads with no network attempts or created DB. Snappy is emitted but unexercised. CI, Docker and released installation remain pending. Contributor/Rosen. |
| WATCH-JOBS / RCS-003 Watcher Service | E; scanner, observation, jobs, sync health | Scanner factory, scheduled scanning, fee readiness and sync registration. | The rebuilt, unmodified compiled entry starts eleven timers after fee readiness. A held fee read expires at2008ms and starts only two scanners, with no downstream jobs. Three API routes return200 in both modes. Real SQLite executes43 migrations, persists BCH/Ergo block1 as PROCEED and completes both extractor cleanups without SQL errors. A recent synthetic BCH header reaches the actual scanner-health parameter as Healthy; WID, ERG balance and the deliberately stale Ergo block still report Broken. No proof-of-work or global health claim follows. Physical Axios cancellation, deployed health and operational commitment/redeem remain open. Contributor/operators. |
| GUARD-CONFIG / RCS-003 Guard Service | E; chain, addresses, confirmations, networks, secrets and batching | GuardsBitcoinCashConfigs, chain/network registration, readiness checks and username/password mappings. RPC batch default9999 follows RCS; the validated integer1..10000 range is a contributor design choice. | 55 config and14 balance-consumer cases independently pass. Native batches1/9999 both make exactly two asset RPC reads and two persistence calls. Types/lint pass. Nine fresh node-config processes qualify configuration/environment loading with synthetic inputs and exact mapping files; container execution and released installation remain pending. The mount arrangement below supplies the files excluded by the Docker build context. Contributor/operators. |
| GUARD-JOINS / RCS-003 Guard Service | E; source/target processing, balance/health | Event ingestion, transaction verification, amount boundary, persistence/recovery, mediator and shared health. | Guard455 official/321 mixed cases, persistence/restart/sync probes, actual mediator digest/callback and shared health27+adapter25 are qualified in their recorded scopes. Current generator/recovery join adds four independently reviewed cases. Actual Guard initialization now registers BitcoinCashChain; removing only its contract or native token mapping rejects registration. The three local cases have independent review of 29 selected source/runtime pins, zero payment rows and verified process/socket cleanup. Transitive compiled dependencies are not all independently pinned. A noncryptographic TSS sink permits wrapper initialization and TSS scheduling; the absent Ergo configuration box then stops initialization before downstream processors and health activation. BCH RPC is configured but uncalled. Full configured Guard, a new threshold signing cycle and BCH→Ergo→BCH roundtrip remain pending. Contributor/operators. |
| UI-BASE / RCS-003 Icons, Constants, Utils, Bases, App              | E/C; one base-data contribution                                  | Monochrome icon, registry index -1, explorer URLs, metadata workspace and unavailable-route filtering. | 32 base tests and icon declaration/build pass. Actual registration/config, App typing and compile-mode build pass. One actual PairingDialog DOM fixture passes; visual browser and operational rendering qualification pending. Contributor/operators. |
| UI-BUILD / RCS-003 Network and Wallet build instructions | E; named build.sh instructions at this RCS revision | This UI baseline has no build.sh. Existing root workspace discovery includes networks/* and wallets/*; Turbo/workspace builds consume these packages. | Workspace builds and the App compile graph pass locally. Using this repository's current build procedure is a proposed deviation from the named script; maintainer agreement remains pending. Contributor/Rosen. |
| UI-CALC / RCS-003 Asset Calculator                                 | E; native balances                                               | Native BCH calculator and optional constructor config; explicit server-only TLS Electrum read provider factory. | Final37 mixed cases pass, including27 native BCH and three constructor cases; four Service factory tests pass. Independent method/primitive-assertion review and actual App compilation pass. Operational accounting pending. Contributor/operators. |
| UI-SERVICE / RCS-003 Rosen Service | E; scanner, observation, events, calculator, sync health | Optional scanner, observations, commitments, event triggers, accounting and sync-health joins; explicit configuration. | 79 tests and full source TypeScript check pass. Declared test configuration passes from package cwd without the ignored harness. Disabled legacy consumers preserved; released-dependency install and operational start pending. Contributor/operators. |
| UI-DB / RCS-003 Rosen Service/Scanner | D; retain legacy persistence while adding BCH package identities | Optional data-source entity/history extension; scanner2.0.3/4.0.0 and exact-lock observation1.0.10/2.0.0 histories. | Seven tests, three offline probes and independent exact-version review pass. Genuine shared factory/native pg executes35 migrations/21 entity identities disabled and36/24 enabled. A seeded same-database upgrade applies only the additional migration, preserves three synthetic legacy records and passes populated block/status/observation alias CRUD and three duplicate-row rejections. The added migration's DOWN runs inside a rolled-back transaction; reconnect adds no migrations. Independent source/evidence review passes without PG replay. Service ingestion/runtime, wider legacy-data coverage and deployment remain separate gates. Contributor/operators. |
| UI-NETWORK / RCS-003 Network Package | E; height, fee, min/max and complete lock transaction | Canonical metadata, authenticated unsigned deposit/fee estimator, signed Schnorr validator and typed client ports. | Frozen builder/validator and40 client cases independently pass; the consolidated metadata mirror passes22. App quote23/min-max29 and registry3 cases pass. Actual App wiring/typing/compile-mode build pass. Contributor. |
| UI-TRANSPORT / RCS-003 Network/App | D; bounded backend policy and submission | TLS read/submission, native cancellation and one trusted absolute HTTP deadline propagated through quote, authorization and final socket write. | 180 server, quote23/handler13 and browser15 cases independently pass. Real mocked whole join refuses late quote with zero socket/broadcast. Browser rejects post-settlement expiry. Five actual NextRequest/POST cases and compile-mode route build pass. Server RCS method-group delta independently closed with unchanged runtime. Contributor. |
| UI-WALLET / RCS-003 Wallet, App wallet configuration | E; at least one wallet | Cashonize session/signing wire and actual BaseWallet adapter pinned to wallet/SDK sources; explicit first-account pairing confirmation. | 47 signing/session,25 adapter,18 pairing/startup/createEnv and six source-lease hook cases independently pass. Actual DOM pairing, App typing and full-graph compile pass. A source change or unmount invalidates old connect/restore/disconnect continuations. Full browser/relay interoperability remains pending. Contributor/operators. |
| UI-FORM / RCS-001, RCS-003 App | E applicability; field validation consumes current wallet, asset and destination | Current upstream debounced form integration; context snapshots, input revisions and reset/unmount revocation prevent obsolete amount/address responses from publishing. | 29 mirrored cases independently pass with the declared Vitest configuration, including isolated balance/address/max/min boundaries, token identity/type, field changes and identical resets. A real React/React Hook Form replay confirms a late minimum rejection leaves the reset field clear and stops its spinner. Broader real-browser behavior remains pending. Contributor/operators. |
| UI-BROWSER / RCS-003 Network/App | E applicability; client-side transaction and address APIs. D; browser dependency mapping | Shared Ergo/Cardano codec packages map matching exact Node/browser WASM versions; App uses Webpack async WASM and its existing Buffer provider. | Declared Next compile has19 routes, nonempty Bridge/POST bundles and two WASM assets, independently checked. Controlled web-target VM passes22 first-use checks: exact metadata, two observed synthetic signed bodies/signatures and seven mutants; entry waits for both WASM loads. Full browser, database prerendering and wallet relay remain pending. Contributor/operators. |
| CONTRACTS / RCS-003 Contracts                                      | E; Rosen-owned outputs                                           | Contracts, protocol chain index, token map, RWT/permit/fraud addresses and represented tokens.                                                                         | Pending Rosen team. Contributor supplies documented interfaces and fixtures.                                                                                                           |
| CHAIN-INFO / RCS-003 recommended information                       | R; reviewer/operator context                                     | Address/decimal/confirmation policy described above; deployment profile must supply finality, derivation and node sizing.                                              | Partly supplied; operator profile pending. Operators.                                                                                                                                  |
| RELEASE / RCS-003 Integration Notes, cross-repository dependencies | C/E applicability; reproducible installation | Package inventory and dependency order below; dedicated tss-api patch changeset covers the Go runtime, separately from npm TSS. | Release preparation supplied. Actual accepted versions, package/binary publication and private UI deployment remain Rosen-owned; dependent lock regeneration and clean-install qualification remain contributor work after those releases. |
| ACCEPTANCE / external state                                        | E before acceptance/activation claims                            | Coordinated upstream PRs, maintainer decisions, merge/release and deployment receipts.                                                                                 | This task has submitted no BCH upstream PR and records no maintainer acceptance. Rosen/operators.                                                                                       |

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
evidence without replaying PostgreSQL. Wider legacy-data coverage, Service
observation ingestion and the complete Service runtime need separate qualification.

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

### Remaining work and deployment inputs

| Matrix items | Contributor work before external input | Missing external input/action and owner |
| --- | --- | --- |
| DOC, CHANGESETS, TESTS, CODE | Compare the exact final candidate, changed metadata and remaining joins with this matrix. Reuse unchanged validated scopes. | Maintainer review of accepted contribution scope. Rosen. |
| PACKAGES, RELEASE, HEALTH, WATCH-RUNTIME, UI-BUILD | Inventory, package dry-runs and release order are supplied. Qualify real released installs and regenerate dependent locks once packages exist. | Accepted producer releases, registry versions/tags and UI build-script adaptation decision. Rosen. |
| SCAN, OBSERVE, UI-DB, UI-SERVICE | Fresh-database and bounded populated upgrade/recovery qualification are supplied. Service runtime/ingestion preparation remains contributor work. | Actual database/deployment profile and released graph for activation. Operators/Rosen. |
| GUARD-CONFIG, GUARD-JOINS, FEE | Mapping/mount preparation is supplied. Complete synthetic configuration/processor joins and prepare the final policy checks within their accepted scope. | Contract/token configuration, aggregate treasury key, fee/confirmation/health policy and deployed services. Rosen/operators. |
| UI-BASE, UI-WALLET, UI-FORM, UI-BROWSER, LOCK, DAPP | Runtime/build/controlled-browser fixtures exist. A real-browser synthetic smoke and an operational acceptance procedure remain contributor work. | WalletConnect/Wallet approval, real wallet session and authorized operational deposit. Operators/user. |
| ENDPOINTS, PROVIDER | Transport/parser fixtures and dated Electrum reads exist. Prepare read-only capability checks for the exact BCHN wallet/transaction-history interface. | Independent BCHN deployments, credentials and imported treasury/history; selected Electrum deployment. Operators. |
| CONTRACTS, TOKENS, CHAIN-INFO | Retain parameterized interfaces and deterministic fixtures; list and validate supplied deployment outputs. Prepare the reviewed profile and acceptance checklist. | BCH chain index, represented Ergo token, contracts/RWT/permit/fraud addresses, aggregate-key derivation and production policy. Rosen/operators. |
| CUSTODY, IDENTITY, WATCH-JOBS, ACCEPTANCE | Prepare the threshold/roundtrip acceptance sequence and recovery evidence without creating production keys or spending funds. | Threshold group/key ceremony, accepted TSS binary, coordinated PR acceptance/merge/release and authorized activation. Rosen/operators/user. |

An external production decision leaves its local fixtures, configuration checks,
release plan and acceptance preparation with the contributor. Items still
described as contributor work above are open preparation, not completed gates.

Upstream submission, maintainer acceptance, merge, release and operational
activation remain pending. Complete compliance depends on every applicable
mandatory matrix item closing or receiving an evidenced accepted exception.
