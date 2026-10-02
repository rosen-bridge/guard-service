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
| SCAN / RCS-003 Scanner | E/C; BCH RPC | Separate BCH RPC connector/scanner package; exact database entity/migration exports. | 72 BCH cases:61 scanner/validation and11 observation cases pass with independent convention review; nine unchanged legacy-chain regressions remain qualified. Service scanner2-manager/scanner4 constructor port and offline DB metadata/history qualified; real PG execution pending. Contributor/operators. |
| SCAN-CLEANUP / RCS-001, RCS-003 Scanner | E applicability; shared block retention used by Watcher | Each extractor reference query remains a separate NOT IN predicate, preserving parameters, NULL behavior, branch-local ORDER/LIMIT, scanner namespace, age and batch limits. | 38 scoped tests and nine independent installed-module scenarios pass on SQLite3.44.2. The original nested UNION fails seven new cases; flattening the UNION fails the branch-limit case. PostgreSQL SQL generation is checked without a database connection. The rebuilt Watcher completes BCH and Ergo cleanup. Contributor; PostgreSQL execution remains an operator gate. |
| CODEC / RCS-003 Address Codec | E; ordinary CashAddr | Utils address-codec-chains/bitcoin-cash and address-codec dispatch. | 69 codec cases pass after function-specific regrouping; two dispatcher cases remain reusable. Assertions/fixtures and runtime AST are unchanged, independently reviewed. Package build/type/style evidence remains valid for that executable scope. Contributor. |
| EXTRACT-RPC / RCS-003 Rosen Extractor Network-based | E; BCHN transactions | RPC extractor, shared transaction type and mirrored framing/amount helpers. | 48 RPC and 17 helper cases independently pass; build, typing and lint pass. BCH source support does not assign a destination index. Contributor. |
| OBSERVE / RCS-003 Observation Extractor | E/C; scanner observations | Distinct observation package, shared transaction type, Watcher/Service registrations and exact entity export. | Package, Watcher and Service tests pass. Production-lock observation1.0.10/2.0.0 entity/history compatibility independently qualified offline; real DB execution pending. Contributor/operators. |
| CHAIN-BASE / RCS-003 Abstract Chain Bases                          | E; BCH is UTXO based                                             | Guard chain/network use UTXO bases and native selection metadata after parent authentication.                                                                          | 126 tests and typecheck pass; independent review and 12 selector tests pass. Contributor/reviewer.                                                                                     |
| EXTRACT-UNIVERSAL / RCS-003 Rosen Extractor Universal | E; Guard transaction JSON | String extractor reuses Utils BCH transaction type and performs amount wrapping once. Shared active destination registry preserves indices 0–9 and rejects unassigned 10. | Five universal and three registry regressions independently pass within the 73-case Utils closure; observation and Guard joins pass after rebuild. Contributor. |
| CHAIN / RCS-003 Abstract Chain | E; payment/recovery/verification | Guard native BCH chain, transaction envelope and serialization utilities use UTXO bases. | Chain195, base126 and selector12 cases have scoped independent review. Four fresh current-source join cases reconstruct and recover the exact historical accepted bytes and reject reserved parents, changed value and changed signature. Historical signing evidence is reused only for identical bytes; a new threshold cycle remains pending. Contributor/operators. |
| PROVIDER / RCS-003 Abstract Chain Network | E/C; BCHN API | Guard packages/networks/bitcoin-cash-rpc, rate-limited client, identity and raw-prevout checks. | 62 cases,32 probes, six mutants and four native observations are qualified. Current four provider source ASTs match the reviewed RPC freeze; build and current generator/recovery join pass. Released installation and independent operator endpoint qualification remain pending. Contributor/operators. |
| HEALTH / RCS-003 Asset Check                                       | E; native treasury balance                                       | Health Check asset-check/bitcoinCash extends AbstractAssetHealthCheckParam; Guard thin adapter.                                                                        | 27 shared and 25 consumer tests pass; independent review/replay passes. Released dependency still pending. Rosen.                                                                      |
| WATCH-CONFIG / RCS-003 Watcher Service | E; config, defaults, secrets | BCH config/defaults, separate scanner/observation imports and username/password environment mappings. Node22.18/npm11.6.2 profile agrees across manifest, lock, CI and Docker declarations. | Previous declared185 legacy+89 Vitest run passes; actual environment mapping increases config36→40 and reruns40 green. The unchanged53 other cases give a composed93-case current Vitest closure. Typing and SQLite event/cursor/deduplication receipt are reviewed. Rollup build and unmodified test-mode smoke pass; SQLite loads with no network attempts or created DB. Snappy is emitted but unexercised. CI, Docker and released installation remain pending. Contributor/Rosen. |
| WATCH-JOBS / RCS-003 Watcher Service | E; scanner, observation, jobs, sync health | Scanner factory, scheduled scanning, fee readiness and sync registration. | The rebuilt, unmodified compiled entry starts eleven timers after fee readiness. A held fee read expires at2008ms and starts only two scanners, with no downstream jobs. Three API routes return200 in both modes. Real SQLite executes43 migrations, persists BCH/Ergo block1 as PROCEED and completes both extractor cleanups without SQL errors. A recent synthetic BCH header reaches the actual scanner-health parameter as Healthy; WID, ERG balance and the deliberately stale Ergo block still report Broken. No proof-of-work or global health claim follows. Physical Axios cancellation, deployed health and operational commitment/redeem remain open. Contributor/operators. |
| GUARD-CONFIG / RCS-003 Guard Service | E; chain, addresses, confirmations, networks, secrets and batching | GuardsBitcoinCashConfigs, chain/network registration, readiness checks and username/password mappings. RPC batch default9999 follows RCS; the validated integer1..10000 range is a contributor design choice. | 55 config and14 balance-consumer cases independently pass, with actual node-config environment reads. Native batches1/9999 both make exactly two asset RPC reads and two persistence calls. Types/lint pass. Docker mapping must be loaded through NODE_CONFIG_DIR or an operator mount; container wiring and released installation remain pending. Contributor/operators. |
| GUARD-JOINS / RCS-003 Guard Service | E; source/target processing, balance/health | Event ingestion, transaction verification, amount boundary, persistence/recovery, mediator and shared health. | Guard455 official/321 mixed cases, persistence/restart/sync probes, actual mediator digest/callback and shared health27+adapter25 are qualified in their recorded scopes. Current generator/recovery join adds four independently reviewed cases. Actual Guard initialization now registers BitcoinCashChain; removing only its contract or native token mapping rejects registration. The three local cases have independent review of 29 selected source/runtime pins, zero payment rows and verified process/socket cleanup. Transitive compiled dependencies are not all independently pinned. A noncryptographic TSS sink permits wrapper initialization and TSS scheduling; the absent Ergo configuration box then stops initialization before downstream processors and health activation. BCH RPC is configured but uncalled. Full configured Guard, a new threshold signing cycle and BCH→Ergo→BCH roundtrip remain pending. Contributor/operators. |
| UI-BASE / RCS-003 Icons, Constants, Utils, Bases, App              | E/C; one base-data contribution                                  | Monochrome icon, registry index -1, explorer URLs, metadata workspace and unavailable-route filtering. | 32 base tests and icon declaration/build pass. Actual registration/config, App typing and compile-mode build pass. One actual PairingDialog DOM fixture passes; visual browser and operational rendering qualification pending. Contributor/operators. |
| UI-BUILD / RCS-003 Network and Wallet build instructions | E; named build.sh instructions at this RCS revision | This UI baseline has no build.sh. Existing root workspace discovery includes networks/* and wallets/*; Turbo/workspace builds consume these packages. | Workspace builds and the App compile graph pass locally. Using this repository's current build procedure is a proposed deviation from the named script; maintainer agreement remains pending. Contributor/Rosen. |
| UI-CALC / RCS-003 Asset Calculator                                 | E; native balances                                               | Native BCH calculator and optional constructor config; explicit server-only TLS Electrum read provider factory. | Final37 mixed cases pass, including27 native BCH and three constructor cases; four Service factory tests pass. Independent method/primitive-assertion review and actual App compilation pass. Operational accounting pending. Contributor/operators. |
| UI-SERVICE / RCS-003 Rosen Service | E; scanner, observation, events, calculator, sync health | Optional scanner, observations, commitments, event triggers, accounting and sync-health joins; explicit configuration. | 79 tests and full source TypeScript check pass. Declared test configuration passes from package cwd without the ignored harness. Disabled legacy consumers preserved; released-dependency install and operational start pending. Contributor/operators. |
| UI-DB / RCS-003 Rosen Service/Scanner | D; retain legacy persistence while adding BCH package identities | Optional data-source entity/history extension; scanner2.0.3/4.0.0 and exact-lock observation1.0.10/2.0.0 histories. | Seven tests, three offline probes and independent exact-version review pass: 24 entities, 36 unique sorted IDs and six exact identities. No DB connection or migration execution; PG deployment gate pending. Contributor/operators. |
| UI-NETWORK / RCS-003 Network Package | E; height, fee, min/max and complete lock transaction | Canonical metadata, authenticated unsigned deposit/fee estimator, signed Schnorr validator and typed client ports. | Frozen builder/validator and40 client cases independently pass; the consolidated metadata mirror passes22. App quote23/min-max29 and registry3 cases pass. Actual App wiring/typing/compile-mode build pass. Contributor. |
| UI-TRANSPORT / RCS-003 Network/App | D; bounded backend policy and submission | TLS read/submission, native cancellation and one trusted absolute HTTP deadline propagated through quote, authorization and final socket write. | 180 server, quote23/handler13 and browser15 cases independently pass. Real mocked whole join refuses late quote with zero socket/broadcast. Browser rejects post-settlement expiry. Five actual NextRequest/POST cases and compile-mode route build pass. Server RCS method-group delta independently closed with unchanged runtime. Contributor. |
| UI-WALLET / RCS-003 Wallet, App wallet configuration | E; at least one wallet | Cashonize session/signing wire and actual BaseWallet adapter pinned to wallet/SDK sources; explicit first-account pairing confirmation. | 47 signing/session,25 adapter,18 pairing/startup/createEnv and six source-lease hook cases independently pass. Actual DOM pairing, App typing and full-graph compile pass. A source change or unmount invalidates old connect/restore/disconnect continuations. Full browser/relay interoperability remains pending. Contributor/operators. |
| UI-FORM / RCS-001, RCS-003 App | E applicability; field validation consumes current wallet, asset and destination | Current upstream debounced form integration; context snapshots, input revisions and reset/unmount revocation prevent obsolete amount/address responses from publishing. | 29 mirrored cases independently pass with the declared Vitest configuration, including isolated balance/address/max/min boundaries, token identity/type, field changes and identical resets. A real React/React Hook Form replay confirms a late minimum rejection leaves the reset field clear and stops its spinner. Broader real-browser behavior remains pending. Contributor/operators. |
| UI-BROWSER / RCS-003 Network/App | E applicability; client-side transaction and address APIs. D; browser dependency mapping | Shared Ergo/Cardano codec packages map matching exact Node/browser WASM versions; App uses Webpack async WASM and its existing Buffer provider. | Declared Next compile has19 routes, nonempty Bridge/POST bundles and two WASM assets, independently checked. Controlled web-target VM passes22 first-use checks: exact metadata, two observed synthetic signed bodies/signatures and seven mutants; entry waits for both WASM loads. Full browser, database prerendering and wallet relay remain pending. Contributor/operators. |
| CONTRACTS / RCS-003 Contracts                                      | E; Rosen-owned outputs                                           | Contracts, protocol chain index, token map, RWT/permit/fraud addresses and represented tokens.                                                                         | Pending Rosen team. Contributor supplies documented interfaces and fixtures.                                                                                                           |
| CHAIN-INFO / RCS-003 recommended information                       | R; reviewer/operator context                                     | Address/decimal/confirmation policy described above; deployment profile must supply finality, derivation and node sizing.                                              | Partly supplied; operator profile pending. Operators.                                                                                                                                  |
| RELEASE / RCS-003 Integration Notes, cross-repository dependencies | C/E applicability; reproducible installation                     | Utils/Scanner/Health releases precede dependent Guard/Watcher/UI lock regeneration.                                                                                    | Pending release coordination. Rosen/contributor.                                                                                                                                       |
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

Upstream submission, maintainer acceptance, merge, release and operational
activation remain pending. Complete compliance depends on every applicable
mandatory matrix item closing or receiving an evidenced accepted exception.
