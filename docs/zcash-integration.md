# Zcash transparent integration review

**Author:** A. Shannon

**Review date:** 5 October 2026

**Target:** integration-document review before coordinated source review

## Review request

This proposal adds transparent Zcash support to Rosen Bridge and maps the work to
[RCS-003]. Seven source PRs are already submitted, open, and unmerged. Review of
the integration document by Rosen has not been evidenced; source-review readiness
remains blocked by the contribution gates below. Submission does not establish
Rosen acceptance, release, or activation.

The candidate supports native transparent ZEC deposits into a P2PKH Rosen reserve,
representation on Ergo, and transparent ZEC redemption from that reserve.
Reserve spending uses Rosen guard threshold ECDSA.

The current proposal is **not Mainnet-ready**. Its execution evidence uses Zebra
Regtest, an isolated Ergo devnet, synthetic funds, and synthetic keys.
The Zallet companion accepts Regtest, Testnet, and Mainnet configurations, with
network/genesis and NU6.3 branch checks for Mainnet. The executed evidence is
local; Mainnet wallet and operator qualification remain pending. The separate
Ergo companion is restricted to an isolated devnet.

Deposits containing shielded components are outside this profile, even when they
also pay the transparent reserve. Direct shielded withdrawal is a separate
Ironwood transaction-v6 scope. It must not be inferred from the transparent path.
The submitted sources also contain a Regtest NU6.2 Orchard experiment, including
payment helpers and UI admission. That is outside the proposed release scope and
does not implement Ironwood. Local corrections restrict the planner, signing
capability and address admission to transparent P2PKH; they are separate from
the submitted heads. The local native payment candidate now excludes all four
Orchard commands, their implementation, PCZT vendor tree and experimental examples.
The prototype is preserved separately. Guard-side experimental dispatch/helpers
have also been extracted locally; real canonical parsing remains for refusal.

## Contribution baseline and requirements

[RCS-001], [RCS-002], and the complete [RCS-003] were checked against repository
revision `7b9784dae9d8d5b66b80de7a6043d1ba36a3a4bf`, unchanged when rechecked
on 5 October 2026.
Transparent native ZEC is the contributor scope. Rosen agreement with the
structural alternatives below has not been established. Architecture-dependent
expansion awaits the Watcher v1 versus Service2 decision.

The source baseline below is separate from the September execution campaigns.
Changes made after those campaigns are not covered by a new full roundtrip.
This document reports changeset, package-ownership and admission corrections
prepared locally on top of these heads, rather than additional submitted code commits. Unless a row
identifies a local correction, implementation and submission refer to this table.
No row has established Rosen maintainer acceptance. Historical execution, current
source inspection and newly executed focused regressions remain distinct evidence.
These are submitted source baselines; this documentation update does not change
their implementation or extend the scope of the execution evidence.

| Repository / PR                                                              | Submitted source baseline                  |
| ---------------------------------------------------------------------------- | ------------------------------------------ |
| [utils PR 8](https://github.com/rosen-bridge/utils/pull/8)                   | `1fb72264dce05de1ddf8d28fb09d88fad45bd27c` |
| [scanner PR 12](https://github.com/rosen-bridge/scanner/pull/12)             | `e9aa835ec1a800e014b77854a2f78da736eb4186` |
| [sign-protocols PR 3](https://github.com/rosen-bridge/sign-protocols/pull/3) | `ba67703f3ab91550d8a68da271a6e170df86c472` |
| [guard-service PR 22](https://github.com/rosen-bridge/guard-service/pull/22) | `e93f904d22543d091cbba95bebdf92d9df5f56b5` |
| [watcher PR 16](https://github.com/rosen-bridge/watcher/pull/16)             | `67ff561ec1afeeb260544ee8780fdf548a8f1f3a` |
| [ui PR 31](https://github.com/rosen-bridge/ui/pull/31)                       | `5b4da0b402e5f9ea431884723ca51bb7d680874e` |
| [health-check PR 4](https://github.com/rosen-bridge/health-check/pull/4)     | `fc79eac1928f5cf3bc6af85739823138e47cc195` |

All seven PRs were open and unmerged at the check. The matrix distinguishes
implementation, bounded local evidence, public replay, and unresolved acceptance.
Commands and acceptance cases are detailed in [the replay guide](zcash-reproduction.md).

| Source clause / revision                   | Authority class                                                 | Applicability / rationale                                                              | Design and path                                                                                                   | Deciding validation / command                                                                                 | Result and exact candidate                                                                                                                                           | Open work and owner                                                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| RCS-003 base: multi-signer                 | Explicit requirement                                            | Native reserve spending                                                                | P2PKH reserve, DKG, threshold ECDSA, guard coordinator                                                            | Four-guard settlement below                                                                                   | Author-reported local September 25 campaign; no portable full replay                                                                                                 | Contributor: publish runnable synthetic campaign; Rosen/operators: independent ceremony and deployment qualification                     |
| RCS-003 base: writing data                 | Explicit requirement                                            | Deposit destination and fees                                                           | Wallet -> raw `OP_RETURN` -> both extractors                                                                      | Public block-106 fixture and extractor tests                                                                  | Implemented in utils/scanner/guard baseline; native replay requires binary binding                                                                                   | Contributor: keep wrong amount/asset/destination cases and complete public end-to-end runner                                             |
| RCS-003 base: endpoints                    | Explicit requirement                                            | Independent operators must have independent endpoints                                  | Zebra RPC consumed by scanner, guard, health and Service2                                                         | Isolated real RPC campaign; RPC fixtures                                                                      | One provider implementation; production topology not qualified                                                                                                       | Contributor: parameterized config and endpoint disagreement cases; operators: actual independent endpoints/history                       |
| RCS-003 additional: assets                 | Conditional requirement                                         | Native ZEC only; arbitrary assets excluded                                             | Exact 8-decimal zatoshis and Rosen token mapping                                                                  | Token conversion/payment tests                                                                                | Implemented; deployment asset IDs are not allocated by this proposal                                                                                                 | Rosen: approve native-only scope and provide contracts/token IDs; contributor: bind supplied values                                      |
| RCS-003 additional: connector              | Conditional requirement                                         | Wallet access applies                                                                  | Zallet companion, UI lock builder, Ergo devnet companion                                                          | September browser deposit and return-order exercises                                                          | Local validation; Mainnet config support is not Mainnet qualification                                                                                                | Contributor: portable browser/config rehearsal; Rosen/operators: supported wallets and network qualification                             |
| RCS-003 additional: chaining               | Conditional efficiency requirement                              | No chaining claim in this profile                                                      | Active attempts reserve inputs; signed change chaining not implemented                                            | Current generation/recovery tests                                                                             | Payment integrity evidence does not prove chaining throughput                                                                                                        | Rosen: agree scope; contributor: design/qualify chaining only if included                                                                |
| RCS-003 additional: events/fees            | Explicit requirement                                            | Event identity and fee policy apply                                                    | Txid/output/block/network/request identity; ZIP-317, exact change                                                 | Extractor, payment and recovery tests                                                                         | Implemented; production finality, fee ceilings and capacity not qualified                                                                                            | Contributor: downstream rollback/recovery replay; Rosen/operators: finality, fee and reserve policy                                      |
| RCS-003 scanner/network                    | Explicit module contract                                        | Zcash-specific serialized bytes                                                        | GeneralScanner, RPC connector, native inspection                                                                  | Mocked network unit4/4; HTTP35/35 and native observation evidence reused                                      | Unit and integration fixtures separated locally; source-overlay preparation, not ordinary released dependency qualification                                          | Contributor: selected full-service/startup and node-valid resource acceptance cases                                                      |
| RCS-003 codecs/network extractor           | Explicit module contract                                        | Canonical network addresses and own transaction type                                   | Utils codec and ZcashRpcRosenExtractor                                                                            | Codec20/20; extractor23 ordinary cases plus separate2/2 real-native cases                                     | Local current-source checks; source/API JSDoc corrected; no native cases remain unexecuted in this selected spec                                                     | Contributor: approved producer release and real downstream consumer qualification                                                        |
| RCS-003 observation extractor              | Explicit module contract                                        | Override adds native batch/store ordering                                              | Inspect whole block before inherited observation storage                                                          | Native observation replay                                                                                     | Public fixture; actual native execution skips unless bound                                                                                                           | Contributor: maintain real database/replay coverage and explicit skip reporting                                                          |
| RCS-003 chain/provider/universal extractor | Explicit module contract; proposed deviations                   | UTXO chain with Zcash-specific bytes                                                   | AbstractChain adapter, AbstractUtxoChainNetwork, guard-side JSON extractor and coordinator                        | Current adapter tests; method map below                                                                       | Source implemented; placement/base/signing alternatives not accepted                                                                                                 | Rosen: decide deviations; contributor: adapt selected contracts and execute consumers                                                    |
| RCS-003 asset health                       | Explicit module contract                                        | Native reserve balance                                                                 | Shared RPC asset check plus guard registration                                                                    | Asset-check and guard health suites                                                                           | September campaign: 11 asset and 8 node-health/registration tests                                                                                                    | Contributor: existing-chain disabled-Zcash runtime cases; operators: thresholds                                                          |
| RCS-003 Watcher/Guard wiring               | Explicit module contract                                        | Configuration, jobs, scanners and persistence                                          | Native extraction, retained-context checks and queue readiness gate                                               | `test:zcash-recovery`; real SQLite/native join; job cases                                                     | Local current-source replay9/9 with AOE1.0.10 and actual asynchronous native batches; queue cases15/15. Submitted heads lack these corrections                       | Contributor: selected full app/migrations/actual commitment-reveal campaign; Rosen: v1 runtime split or Service2 and repair policy       |
| RCS-003 UI/network/Rosen Service           | Explicit module contract and applicable UI review direction     | Native catalogue and wallet                                                            | Local private `networks/zcash`, `wallets/zallet` and thin app wrappers; Service2 adapters                         | Package tests, wrapped/native conversion and app serialization; Doge ownership comparator                     | Local ownership move; network utility8/8, wallet4/4 and app4/4 pass, with receipt1/1 and wallet utility1/1 reused; builds/types pass. Submitted UI remains unchanged | Contributor: wire agreed shared-hook/interaction contract; Rosen: supported wallet/session and supplied components                       |
| RCS-003 configuration/contracts/tokens     | Explicit integration boundary                                   | Production constants require Rosen authority                                           | Shared network/genesis/branch/reserve/confirmations; Ergo contracts                                               | Consistency checks and synthetic devnet campaign                                                              | Synthetic values exercise logic; no activation claim                                                                                                                 | Contributor: parameterized configuration and binding checks; Rosen: authoritative deployment values                                      |
| RCS-001 TypeScript tests                   | Explicit unit-test conventions                                  | Ordinary TypeScript unit tests; native/HTTP/database integration classified separately | Mirrored .spec.ts paths, root/function groups, scenario tags and value equality; Guard/app ordinary unit commands | Focused current-source collection; preserved HTTP test body after path relocation                             | Named UI/Utils/Scanner unit corrections pass. Structured Node error assertions and whole-service framework/helper conventions are not a whole-PR compliance claim    | Contributor: remaining selected-source conventions; Rosen: route-specific framework/deviation review where applicable                    |
| RCS-002 JSDoc/arrows                       | Convention                                                      | Named functions/methods; justified exceptions allowed                                  | Utils codec/native inspector/extractor and Scanner public API documentation                                       | Seven runtime ASTs unchanged; source conventions checked separately from build                                | Named API documentation corrected locally; whole-contribution method documentation/arrow exceptions not exhaustively closed                                          | Contributor: complete convention closure against the selected implementation, preserving semantics                                       |
| RCS-002/003 packages/changesets            | Convention                                                      | Six new TypeScript packages; Guard integration                                         | `0.0.0`, initialization minor changesets, separate Guard major                                                    | Manifest/changeset comparison                                                                                 | Local metadata correction; not published or released                                                                                                                 | Contributor: complete release/lock rehearsal; Rosen: official versions and publication                                                   |
| September operator feedback                | Observed review concern                                         | Shared startup, cause visibility, batching, persistence                                | Codec-only registration, halt latch, native batches, SQLite process replay                                        | [Operator readback](https://github.com/rosen-bridge/watcher/pull/16#issuecomment-5885585129) and replay guide | Operator considers restart concern covered; no general Rosen acceptance                                                                                              | Contributor: actual lifecycle, incident acknowledgement, downstream rollback and shared-chain checks                                     |
| Transparent profile admission              | Contributor scope; Zcash-specific behavior                      | Native P2PKH deposits and withdrawals                                                  | Planner, Guard and UI refusal; executable Orchard helpers removed from native/Guard candidate                     | Canonical schema-2 parsing then typed refusal before native/evidence/TSS; transparent JSON differential       | Local extraction complete and independently reviewed; native22+1, ordinary Guard refusal and UI admission pass. Submitted heads still contain experiment             | Contributor: authorized promotion of transparent candidate; shielded/Ironwood remains a separate later proposal                          |
| Withdrawal authorization and identity      | Explicit value-release boundary; ZIP-244                        | Approved native v5 reserve payment                                                     | Event/token/fee authority, quorum approval, native SIGHASH_ALL, bound TSS; native final-byte validation           | Current signing coordinator/native capability and network source trace; existing approval/finalization tests  | Implemented/submitted; canonical txid remains stable across v5 authorization, while exact signed bytes are independently checked                                     | Contributor: current standard-service replay; Rosen: review coordinator versus generic signing contract                                  |
| Durable custody and no second payment      | Explicit value-release boundary                                 | Process/database uncertainty                                                           | SQL event/input reservations, prepared -> may_dispatch -> signed; signed bytes retained before broadcast          | Signing/broadcast stores and existing focused recovery tests; September synthetic four-guard recovery         | Implemented/submitted; unknown dispatched signature retains custody; historical execution is not complete current-head crash qualification                           | Contributor: selected real service crash/restart and incident-repair campaign, without releasing uncertain reservations                  |
| Confirmations and rollback                 | Explicit event/confirmation boundary; proposed operating policy | Zcash active chain and branch context                                                  | Exact-byte confirmation; retained-context checks before extraction/update and queue gate                          | Real native/SQLite crash/reinclusion; isolated extraction-check mutation                                      | Local9/9 recovery cases and two failing mutant cases preserve custody/halt progress; downstream rows seeded, sender controlled                                       | Contributor: selected commitment/reveal/migrations campaign; Rosen/operators: finality, repair/retention, mixed-DB and deep-reorg policy |
| Document review before code review         | Applicable Rosen review direction                               | All chain integration source review                                                    | Single integration entry outside UI                                                                               | Actual reviewer/outcome for this document revision                                                            | PENDING: no Rosen document-review evidence; operator restart comment does not satisfy this gate                                                                      | Rosen: review this entry and resolve deciding design questions; contributor: address findings                                            |
| One contribution purpose                   | Applicable Rosen review direction                               | Exact diff, including shared behavior                                                  | Seven-base path-group inventory and deciding shared hunks; separate prerequisites and excluded experiments        | Inspect semantics and preserved bytes; inventory is not exhaustive correctness review                         | Local native/Guard/companion/Ergo-devnet experiments extracted; runtime/startup, UI toast and asset-ID validation prepared separately. Submitted scope still FAILS   | Contributor: authorized separate promotion/rebase after applicable review; Rosen: shared API/presentation contracts                      |
| New UI component contract                  | Applicable Rosen UI review direction                            | Zallet session and file/intent journey                                                 | New SubmitButton dialog/upload flow and hand-built session dialog                                                 | Existing Doge/Firo behavior comparison; team-supplied component evidence                                      | PENDING: local rendering does not establish team agreement; Firo payment QR is not Zallet session pairing                                                            | Rosen: supply/identify supported component; contributor: wire agreed behavior and failure cases                                          |
| Published producer dependency closure      | Applicable release/review direction                             | Ordinary consumer installs                                                             | Exact producer/version -> lock -> clean install/build                                                             | Public npm metadata readback, 5 October; release order below                                                  | FAIL: required new packages/versions are unavailable; old asset-check 6.2.2 is available but lacks this contribution                                                 | Package owners: publish reviewed bytes; contributor: regenerate ordinary locks and qualify normal consumers                              |
| Documentation location                     | RCS-003 single document; applicable UI review direction         | Integration entry and experimental notes                                               | Guard docs outside UI; companion/devnet source moved outside UI locally                                           | Exact47-file companion and seven-file devnet preservation; sessions untouched                                 | Local dossiers relocated; submitted UI still contains old copies. Agreed review location PENDING                                                                     | Rosen: document location/review; contributor: authorized promotion of prepared relocation                                                |

The Rosen payload is bounded by Zcash's standard 80-byte null-data policy.
The 18-byte fixed prefix leaves at most 62 bytes for the encoded target address.
Address length alone does not establish that the destination is valid or admitted.

Amounts are integer zatoshis throughout. Floating-point amounts are not accepted.
The configured network, genesis, consensus branch schedule, reserve address, and
confirmation policy must agree across producers and consumers. Unknown or
contradictory branch evidence fails closed.

## Architecture and compatibility decisions

The deposit path is wallet intent -> signed lock bytes -> Zebra block -> scanner
RPC transaction -> native network extractor -> persisted observation -> watcher
commitment/reveal -> Guard universal extractor -> Ergo settlement. Redemption is
Ergo order -> guard source/event checks -> confirmed reserve inputs -> native
proposal and ZIP-244 digest -> bound TSS -> finalized bytes -> checked broadcast
-> confirmation/recovery -> Ergo reward. Amount, asset, destination and event
identity must survive every join.

The following are proposed deviations, rather than settled RCS adaptations:

- `ZcashChain` extends `AbstractChain` instead of the RCS UTXO chain base. Its
  network extends `AbstractUtxoChainNetwork`; Zcash validation/generation remain
  explicit rather than borrowing Bitcoin serialization.
- RPC evidence transport is in the payment package; the universal JSON-string
  extractor is in `zcash-event` in Guard. RCS places the provider in a network
  package and the universal extractor in Utils. Moving these boundaries requires
  agreement on package responsibilities and installed consumers.
- Generic `signTransaction` and `isTransactionInSign` refuse with
  `signing_requires_guard_coordinator`. The guard coordinator owns the bound
  signing and broadcast capabilities. This is an integration alternative that
  must be reviewed against every consumer, not a claim that the generic methods
  are implemented.

The local UI correction places chain logic in the private `networks/zcash`
package, Zallet session/transfer logic in `wallets/zallet`, and leaves thin app
wrappers. The particular wallet/session, shared-hook and new-component contracts
remain unresolved. Watcher shared Node/runtime/database changes are prepared in
a separate upstream-based prerequisite if v1 is selected; Service2 is the other
proposed service route. Preparing a separate branch does not remove those hunks
from the already submitted chain PR or establish upstream acceptance.

| Current chain responsibility                                                                          | Provider and downstream consumer                                                                                                                      |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Height, block membership, transaction lookup, confirmations, mempool                                  | `ZcashNetwork`: genesis/context, block hash/info, transaction and mempool RPC reads; event and payment confirmation consumers                         |
| `verifyEvent`, `verifyLockTransactionExtraConditions`, `serializeTx`                                  | Inherited event checks, exact transaction/block identity and `ZcashGuardRosenExtractor`; native raw-byte inspection and explicit branch context       |
| `generateMultipleTransactions`                                                                        | Confirmed reserve UTXOs, active unsigned/signed input reservations, token map and native generator; payment orders only                               |
| `getTransactionAssets`, `extractTransactionOrder`, `verifyNoTokenBurned`                              | Native-only proposal inspection and exact token conversion/conservation; payment/agreement consumers                                                  |
| `verifyTransactionFee`, `verifyTransactionExtraConditions`, `verifyPaymentTransaction`, `isTxValid`   | Native proposal/digest, signing-status and ZIP-317 checks; `isTxValid` additionally rechecks current UTXO evidence; guard agreement and authorization |
| `signTransaction`, `isTransactionInSign`                                                              | Generic methods refuse; guard coordinator and bound TSS own the proposed route                                                                        |
| `submitTransaction`, `observeTransaction`, `isTxInMempool`                                            | Signed bytes, native verification, evidence and submission hook; network broadcast and confirmation/recovery                                          |
| Actual transaction identity                                                                           | Network `getActualTxId` intentionally returns canonical txid unchanged; reserve/recovery consumers must use that invariant                            |
| `getMinimumNativeToken`, `getChainConfigs`, `PaymentTransactionFromJson`, `rawTxToPaymentTransaction` | Validated/copy-protected policy and native proposal parsing; payment and service consumers                                                            |

Accepted upstream history supplies useful invariants, rather than approval of
this candidate. Bitcoin [interface scaffold] shows why the abstract/provider map
must precede behavior claims. Doge [codec normalization], [input reservations]
and [actual transaction identity] apply to canonical address errors, all active
spend states and confirmation identity. Their Bitcoin-library/PSBT algorithms
do not transfer to Zcash. Binance's [chain specialization] and
[extractor specialization] inherit EVM semantics; that shortcut does not apply
to Zcash. These commits were confirmed as ancestors of upstream `dev`; historical
merge does not waive current RCS requirements.

The accepted UI Doge/MyDoge path at upstream ancestor
`ef1dd23081c0588306efe618525cb8dcff0d95cb` was followed from `useTransaction`
through Rosen-unit conversion, wallet transfer, network lock-data/PSBT creation,
and extension signing plus broadcast, to the returned txid. Network and wallet
packages own those operations. Zcash must retain that ownership pattern while
using its own native serialization, branch rules, ZIP-244 digests and wallet
contract; a Bitcoin-family PSBT or BCH finalization algorithm is not a substitute.

Current deposit source tracing follows Zallet's exact ZEC/8-decimal intent,
reserve/fee/destination checks, raw native inspection, and matching RPC/Guard
extractors. The protocol event/request identity is BLAKE2b(source txid), not the
browser handoff UUID. The extractor's actual 51-byte payload checks and exact
integer conversion are stricter than the general 80-byte null-data bound. The
historical example credited `49,992,800` zatoshis from `50,000,000 - 5,000 - 2,200`.
The browser receipt proves lock inclusion, not completed bridge settlement.

The maximum-transfer estimator receives Rosen wrapped units from `Wallet.getBalance`,
which rounds upward. It reserves the wrapped 20,000-zatoshi fee plus one whole
wrapped unit before subtraction. Merely wrapping 20,001 zatoshis fails when an
eight/three-decimal balance represents a native balance with a one-zatoshi remainder.
That counterexample now leaves 100,001 zatoshis; the eight/six-decimal case and
actual server serialization/client unwrapping also pass. This minimum margin
estimate does not replace the companion's actual input-dependent fee validation.

Withdrawal tracing follows stored event authority and token/fee policy, quorum
approval, input custody, native SIGHASH_ALL and the TSS operation binding. The
native finalizer verifies the resulting signatures and exact transaction intent;
the network observer also compares retained signed bytes with RPC bytes. ZIP-244
makes the v5 txid independent of authorization data, so retaining the same txid
is intentional. It does not justify identifying a signed transaction by txid
alone or treating a v4 transaction the same way.

SQL reservations and compare-and-update predicates protect the event and input
across connections. Once dispatch may have occurred, failure retains custody;
the signed transaction is persisted before broadcast and restart observes or
resubmits those same bytes. Observation/confirmation checks use canonical active
block membership and branch context, rather than a foreign-chain finalization
rule. The real current-head service lifecycle, downstream orphaned commitment
cleanup and post-settlement deep-reorg response still need qualification.

## Seven-repository change set

1. [utils] adds the Zcash address codec, shared-codec registration, Rosen RPC
   extraction, and the bounded native inspector and payment sources.
2. [scanner] adds the Zebra RPC scanner and Zcash observation extractor. The
   extractor pins `abstract-observation-extractor` to `1.0.10` for the scanner-v2
   scalar query contract.
3. [health-check] adds the Zcash RPC reserve-balance check with exact zatoshi
   comparison and recovery after an RPC failure.
4. [sign-protocols] binds TSS callbacks to the requested signing operation and
   fixes duplicate and timed-out signing completion behavior.
5. [guard-service] adds Zcash network, event-verification, payment, signing,
   broadcast, confirmation, recovery, reward, and health-check registration.
6. [watcher] registers the Zcash scanner and observation extractor and preserves
   fail-closed synchronization and the scanner-v2 dependency graph.
7. [ui] adds network/catalog data, Service2 reserve balances, address validation,
   lock construction and receipt verification. Local preparation moves its network
   and wallet algorithms into private packages. All 47 tracked companion files and
   the Ergo devnet UI helper/bypass are preserved outside the UI candidate.

Contracts, token identifiers, fee boxes, and deployment configuration remain
Rosen operational inputs.

The disposition below covers a seven-base path-group inventory: 304 tracked
candidate paths at the inventory checkpoint, plus explicit new local package,
fixture and documentation files. It does not establish correctness of every hunk.
Independent reviews close the named corrections below; unresolved shared/UI
contracts prevent a whole-contribution readiness claim. Submitted diff baselines are merge bases,
not today's target-branch tip: scanner `69fbd4c8d877bc575a086bb2d3e0538ff888ff81`,
Guard `5b8dcd408c1f70aa42d4257c09fefc4e16cd5fdd`, UI
`ef1dd23081c0588306efe618525cb8dcff0d95cb`.

| Submitted surface                                                                                        | Classification / disposition                                                   | Remaining action                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Utils Zcash codec/extractor, scanner/extractor, health-check Zcash module; registry/export/config hooks  | Chain implementation and required wiring: KEEP                                 | Close affected conventions, dependencies and real consumers                                                                                                        |
| Native transparent inspection/payment and branch rules                                                   | Chain implementation: KEEP; executable Orchard experiment locally extracted    | Canonical shielded parsing/rejection retained; four commands, module, vendor/examples and ten Guard runtime helpers removed; exact experiment sources preserved    |
| Guard Zcash adapters, coordinator, event/input reservations and Zcash-specific migrations/hooks          | Chain implementation and required wiring: KEEP, subject to reviewed interfaces | Review every downstream method/DB consumer; proposed placement/signing alternatives remain open                                                                    |
| Guard generic custody wrapper, shared approval helpers and non-Zcash hunks in agreement/database paths   | Shared behavior: inspect coupling and SPLIT independent changes                | Do not classify all shared files as unrelated; separate generic behavior from required Zcash branches                                                              |
| Guard atomic roster publication and shared TSS callback route                                            | Independent shared prerequisites: separate patches prepared                    | Runtime hunks preserve submitted behavior; changesets and documented tests; sequential clean-base application checked. TSS producer release/review remains pending |
| UI target-network renderer fallback                                                                      | Independent generic fix: separate patch prepared                               | Exact two upstream-based hunks plus app patch changeset; main candidate currently assumes this prerequisite                                                        |
| TSS/communication callback and timeout fixes in sign-protocols PR 3                                      | Independent signing-library change: already a distinct contribution            | Independent review/release before consumers; merge is not established                                                                                              |
| Watcher `.nvmrc`, Docker, CI/release, package/runtime, Rollup and extended-TypeORM patch                 | Independent shared runtime change: SPLIT                                       | Separate dependency and existing-chain qualification if Watcher v1 is chosen                                                                                       |
| Watcher Zcash codec/scanner registration, readiness and commitment/reveal gating                         | Required chain wiring: KEEP                                                    | Execute actual service startup/restart/rollback; generic cleanup TODO is not closed by observation deletion                                                        |
| App `networks/zcash/*`, wallet wrapper and shared hooks                                                  | Network/wallet ownership locally moved; hook/interaction contract WAIT         | Private packages with direct tests and thin app wiring; Rosen decides shared routing and new component contract before dependent changes                           |
| New SubmitButton session/file dialog and `requestDevnetSession.ts` DOM dialog                            | New components: WAIT                                                           | Rosen supplies or identifies reusable components; local prototypes remain preparation                                                                              |
| UI `companions/zallet/**`, `companions/ergo-devnet/**`, including vendored PCZT                          | Standalone experiment/test infrastructure: locally moved outside UI            | Exact sources preserved; ignored sessions/runtime retained; submitted PR still contains the old files                                                              |
| UI Ergo devnet wallet/session, `networks/ergo` devnet fee/height reader, `uiKitProvider` database bypass | Experiment: locally excluded and preserved separately                          | Normal Ergo readers/database restored; package build and app type check pass; historical devnet replay uses the separate fixture                                   |
| UI `BridgedList` asset-error notification                                                                | Independent generic fix: locally extracted                                     | Separate upstream-based preparation plus changeset; main candidate matches the original base file                                                                  |
| UI asset-detail token-ID validation                                                                      | Independent generic fix: locally extracted                                     | Two-path patch and patch changeset prepared against upstream; main validation and incidental changeset restored                                                    |
| UI-kit `sourceIdentifier.ts` plus Rosen/Watcher app callers, component/tests/export/config               | Independent shared behavior with hard-coded Zcash encoding: SPLIT/WAIT         | Agree generic source-identifier semantics; supply a separate changeset and consumer tests                                                                          |
| Equivalent rewrites/incidental formatting in the full upstream diff                                      | Semantic no-op: REVERT when demonstrated                                       | Full hunk inspection remains open; do not infer equivalence from path names                                                                                        |

The Watcher `init()` detached promise and swallowed late initialization failure
also exist in the upstream base. A separate local generic correction returns the
complete initialization promise and rethrows its late failure to the established
process-entrypoint exit handler. Its two focused tests and independent source
review pass. Socket/scanner readiness and recurring-job failures are separate
questions; this fix does not prove complete service readiness. It belongs with a
distinct startup fix, not silently inside Zcash.

## Release and lock order

Rosen integration-document review and the applicable contribution gates precede
source-review readiness. Subsequent package release and consumer locks follow
the dependency graph:

1. Release the changed `utils` packages and the separately built native inspector
   and payment artifacts from reviewed source and lockfiles.
2. Release the Zcash scanner and observation extractor against those official
   `utils` versions.
3. Release `health-check` and `sign-protocols`; these can proceed independently
   once their reviews pass.
4. Release Guard's three new library packages, in producer order:
   `@rosen-chains/zcash-payment`, `@rosen-chains/zcash-event`, then
   `@rosen-chains/zcash`, with Changesets updating internal ranges from `^0.0.0`.
5. Resolve the new official packages in `guard-service` and the selected service,
   regenerate their locks from the public registry, and run normal clean installs,
   builds and hosted CI on the resolved graph.
6. Resolve the official packages in `ui`/Service2, regenerate its lock, and run
   hosted CI and the application build against the reviewed configuration.
7. Promote contracts and configuration only after the operational decisions below.

The Changesets in each repository remain the versioning authority. Unpublished
package archives and non-upstream lockfiles establish only that
the reviewed bytes can be installed together; they are not evidence of an npm
release or of hosted CI.

Public registry readback on 5 October found these producer gaps. The versions are
prospective Changesets outputs or current consumer requirements, not manual
manifest bumps. New TypeScript manifests correctly remain `0.0.0`.

| Producer package                                      | Required/prospective version | Registry result                                                          |
| ----------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| `@rosen-bridge/address-codec-zcash`                   | `0.1.0`                      | Package unavailable                                                      |
| `@rosen-bridge/address-codec`                         | `2.2.0`                      | Version unavailable; latest `2.1.0`                                      |
| `@rosen-bridge/rosen-extractor`                       | `12.2.0`                     | Version unavailable; latest `12.1.2`                                     |
| `@rosen-bridge/zcash-scanner`                         | `0.1.0`                      | Package unavailable                                                      |
| `@rosen-bridge/zcash-observation-extractor`           | `0.1.0`                      | Package unavailable                                                      |
| `@rosen-chains/zcash-payment`, `zcash-event`, `zcash` | Initialization to `0.1.0`    | All three packages unavailable; submitted internal ranges still `^0.0.0` |
| `@rosen-bridge/asset-check`                           | `6.3.0`                      | Version unavailable; `6.2.2` exists without this Zcash addition          |
| `@rosen-bridge/tss`                                   | `6.0.2`                      | Version unavailable; latest `6.0.1`                                      |
| `@rosen-bridge/communication`                         | `3.0.2`                      | Version unavailable; latest `3.0.1`                                      |

Private network/wallet workspaces in the UI monorepo use its normal workspace
build contract; they do not acquire a public npm requirement merely from this
registry gate. Unchanged unavailable versions make another ordinary clean-install
attempt uninformative until the producer release state changes.

## Executed integration evidence

The 5 October local correction batch has these bounded results. No new complete
bridge campaign was executed and none of these corrections is submitted yet.

| Corrected boundary                   | Executed evidence                                                                                                                                                                                                  | Limit                                                                                                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI package and app boundaries        | Utility8/8, receipt1/1 reused, wallet4/4 plus utility1/1 reused, app4/4 on Node22.18; actual TokenMap eight/six and eight/three-decimal counterexamples; builds/app types pass                                     | Real source/export/server wrapper; RPC controlled, candidate source graph. No browser/Mainnet/ordinary-registry qualification                                                                   |
| Guard transparent-only boundary      | Ordinary `test:unit`1/1; schema-2 import/refusal1/1; payment build/types pass; chain source-overlay type check has zero diagnostics                                                                                | Native/evidence/TSS calls remain zero for unsupported data. Ordinary chain build still exposes two nominal identities of the extractor producer; source resolution is preparation               |
| Guard extraction regression          | First affected execution235/237; two fixture failures reproduced on original source, then affected19/19 and confirmation2/2 pass after fixture corrections; independent ten-file runtime review passes             | Not a rerun of all237. Inserting native digest before scope refusal makes the isolated negative fail; no Orchard proof/payment executed                                                         |
| Native transparent payment           | Locked/offline22 library +1 CLI pass; Construct/Digest/Finalize responses match the verified reference; four Orchard commands are unrecognized                                                                     | Local Windows binary and transparent differential, not hosted release qualification; executable SHA256 `c25cc602b2e66a0653c6ef97e02529b0c1217a13b1fbf140e4a3b8b871497799`                       |
| Watcher native custody recovery      | Current native asynchronous batch -> actual extractor -> file SQLite -> scheduler-source readiness:9/9; queue15/15 reused; removing pre-extraction check fails both reinclusion cases                              | Actual AOE1.0.10/current source-produced packages in disposable graph. Schema synchronize, seeded downstream rows and counted sender; no production migrations or actual Ergo commitment/reveal |
| Generic Watcher runtime prerequisite | Normal registry install1275 packages, type check, full bundle/executable build; normal packaging script1/1 exercises real Snappy/SQLite inside bundle and packaged fixture; full executable refuses missing config | Independently reviewed separate prerequisite; Windows host only. Build runtime22.18, packaged runtime22.23.2. No valid full-service or cross-platform startup qualification                     |
| Generic Watcher startup promise      | 2/2 Node 22.18.0 tests transpile the actual upstream-based source; late failure rejects and success waits for initialization. Original source failed both cases                                                    | Separate local branch; mocked dependencies, no socket/process/service campaign, legacy Mocha conventions pending                                                                                |

Independent source reviews close the named transparent extraction, custody
recovery, rounding and native-loader corrections. The earlier recovery execution
against AOE1.0.11 and an inspector without the batch protocol is superseded.
The current child requires AOE1.0.10 and counts delegated real native batch calls;
the wrong graph is refused before database/RPC work. This does not close ordinary
new-chain installation, full-service, full-diff or Rosen acceptance gates.

### Four-guard settlement, 25 September 2026

Service2 ran 34 PostgreSQL migrations, populated its asset aggregator, returned
HTTP 200 for the assets endpoint, and rendered the Zcash catalogue.

The real UI builder and a one-use Ergo companion created order
`93cf32dc97dc046cb6cdf59a8c9e80b69c6ac007d5b4d3105e76d67478c1165f`.
Four guards confirmed transparent Zcash payment
`aea638e2697203555780e7962aadde74dca4be5f4af59ff9ecfb2b252aff265c`
and Ergo reward
`3875711fb294dafb08e32469f90e38df6c28b718ae9555e7662e4697955f79e6`.
All four guard states reached `completed`, including recovery without a second
payment.

### Browser return order, 26 September 2026

The browser connected to the Ergo companion, entered `0.009928` rsZEC, displayed
the review, signed, submitted, and confirmed order
`77112b91a04466f15408e5fd8fe84433618ec5d43c41d0e4f512166ded6f0f1d`
at Ergo height 147649.

This proves the browser-to-confirmed-Ergo-order join. The guards were not rerun for
this order, and this result does **not** claim a new Zcash payout. The September 25
four-guard settlement above is the payout evidence.

### Separate NU6.3 producer exercise

An isolated NU6.3 Zebra exercise confirmed transparent v6 deposit
`c81c8d8ba686b87640003e1b91deaf835e5e36a20337f82454ce2d28156a294e`
and transparent v5 payment
`a2b67f2f4061ee7b96f5f7c09c5a23a14212633f69c9a02d7edeea2af40a9059`.
It qualifies those producer, scanner, and payment formats on the isolated node.
It is not a second four-guard proof.

### Health and clean installation

The Zcash reserve health component passed 11 asset-check tests and 8 guard
node-health/registration tests, then read a real reserve balance from Zebra RPC.
This monitors the configured reserve threshold; it is not a solvency proof.

With Node 22.18.0 and npm 11.6.2, clean lifecycle installs, builds, type checks,
and targeted real-loader imports passed for guard and watcher on Ubuntu 22.04.
The watcher Rollup bundle also passed with its reviewed SQLite ESM import patch
and Node-global handling.

On Windows, the UI/Service2 clean lifecycle install built 36 dependency packages,
resolved only `abstract-observation-extractor@1.0.10`, passed both application type
checks and installed-export checks, and completed a PostgreSQL-backed Next build.
The build generated all 12 pages and the dynamic API route catalogue.

These results validate the selected candidate bytes and dependency joins. They do
not replace official registry publication, regenerated upstream locks, hosted CI,
independent production endpoints, or controlled Mainnet qualification.

## Public reproduction surfaces

The [replay guide](zcash-reproduction.md) distinguishes submitted public fixtures
from locally prepared additions, and lists commands, native setup, limits and
the route-neutral service acceptance cases. The public
file-backed SQLite fixtures cover a killed scanner child and restart/reorg replay.
The locally prepared native recovery fixture additionally exercises scheduler-source readiness
and refuses retained observations whose blocks disappeared, including after
restart and before transaction reinclusion can overwrite custody. It does not
start the Watcher API or actual downstream commitments. A persistent mismatch
is detected again after restart; no persisted operator acknowledgement or repair
policy is implemented.

An automated, portable full-roundtrip harness remains to be packaged. The
submitted sources expose the package scripts and bounded interfaces below,
except for the explicitly marked local additions. Fresh
`npm ci` on the submitted consumer lockfiles is not yet a reproduction command:
first release the producer packages and regenerate the consumer locks, or
reconstruct the candidate graph with a local package registry. The reported clean
installs used the latter approach with separate generated locks.

- JavaScript workspaces require Node 22.18.0 and npm 11.6.2. Use `npm ci`, then
  the affected workspace's `build`, `type-check`, and `test` scripts.
- The [guard payment package] documents
  `npm run build --workspace @rosen-chains/zcash-payment`; native tests require the
  inspector and payment binary paths plus their SHA-256 values.
- The [guard event package] documents
  `npm test --workspace @rosen-chains/zcash-event` with the inspector binding.
- The [native inspector] and [native payment] READMEs document `cargo test --locked --offline`
  and `cargo build --locked --offline` with `CARGO_TARGET_DIR` outside the source.
- The locally corrected, unsubmitted Watcher adds `npm run test:zcash-recovery`
  for the native/file-database fixture. Its separately prepared generic runtime change adds
  `npm run test:packaging`, `npm run type-check` and `npm run release`.
- The UI documents bootstrap and application build commands. The [Zallet companion] documents
  separate `serve`, `prepare`, and human-approved `submit` steps; confirmation and
  watcher observation are separate verifier steps.

The public source and protocol references are [RCS-003], [ZIP-244], [ZIP-317],
[ZIP-258], [ZIP-229], the [Zcash consensus parameters], [Zebra RPC], and the
[librustzcash transparent builder].

## Contributor preparation and external decisions

Local database setup, configuration binding, browser rehearsal, artifact packing,
release-order preparation and consumer lock rehearsal belong to the contribution.
They are not delegated to Rosen merely because final release is upstream-owned.
The replay guide separates this work from the exact external inputs below.

Before architecture-dependent expansion, select Watcher v1 with a separately
qualified runtime change or Service2, and decide the proposed chain/provider,
extractor, signing and UI package boundaries. Prepare the actual startup/failure,
persisted repair, downstream rollback and existing-chain acceptance cases against
that choice. Source tests alone cannot settle these decisions.

1. Review this integration document and agree its review location, service route,
   chain/provider/signing boundaries and UI interaction contract. Once the
   applicable gates close, review the seven source diffs and Changesets as one
   compatibility set.
2. Select release versions, publish official packages and native artifacts,
   regenerate consumer locks, and require hosted CI on the exact resolved bytes.
3. Qualify supported wallets and operator journeys on the intended network.
   Mainnet configuration support in Zallet does not establish that qualification;
   the included Ergo companion remains devnet-only.
4. Set Mainnet contracts, token identifiers, endpoints, operators, confirmations,
   reorg handling, fees, reserve selection/capacity, health thresholds, monitoring,
   incident response, and recovery policy, then run controlled qualification.
5. Keep shielded withdrawal in the separate Ironwood design. A Unified Address
   must never be silently reduced to a transparent receiver.

[RCS-003]: https://github.com/rosen-bridge/rcs/blob/7b9784dae9d8d5b66b80de7a6043d1ba36a3a4bf/rcs-003/README.md
[RCS-001]: https://github.com/rosen-bridge/rcs/blob/7b9784dae9d8d5b66b80de7a6043d1ba36a3a4bf/rcs-001.md
[RCS-002]: https://github.com/rosen-bridge/rcs/blob/7b9784dae9d8d5b66b80de7a6043d1ba36a3a4bf/rcs-002.md
[interface scaffold]: https://github.com/rosen-bridge/guard-service/commit/1afb500f60669b5eeb0f399a755a9f4d7ae9bdd4
[codec normalization]: https://github.com/rosen-bridge/utils/commit/9c8886cfb0b337179c37f8afbe887a446f123a52
[input reservations]: https://github.com/rosen-bridge/guard-service/commit/efa1a4ca3fb2f4078a9ed067ec3da44dfc9ea6bf
[actual transaction identity]: https://github.com/rosen-bridge/guard-service/commit/88b86ef61bc620688d6dd677ba4d460786e8d2f6
[chain specialization]: https://github.com/rosen-bridge/guard-service/commit/12c736c0f93d3884d204017e244750e854787c62
[extractor specialization]: https://github.com/rosen-bridge/scanner/commit/6efd277e5f4a48b2f791c0a4a8546ed4fb21db6d
[utils]: https://github.com/a-shannon/utils/tree/feat/zcash-transparent-utils
[scanner]: https://github.com/a-shannon/scanner/tree/feat/zcash-transparent-scanner
[health-check]: https://github.com/a-shannon/health-check/tree/feat/zcash-asset-health
[sign-protocols]: https://github.com/a-shannon/sign-protocols/tree/feat/zcash-bound-tss-official
[guard-service]: https://github.com/a-shannon/guard-service/tree/feat/zcash-transparent-guard
[watcher]: https://github.com/a-shannon/watcher/tree/feat/zcash-transparent-watcher
[ui]: https://github.com/a-shannon/ui/tree/feat/zcash-transparent-ui
[guard payment package]: https://github.com/a-shannon/guard-service/tree/feat/zcash-transparent-guard/packages/chains/zcash-payment
[guard event package]: https://github.com/a-shannon/guard-service/tree/feat/zcash-transparent-guard/packages/chains/zcash-event
[native inspector]: https://github.com/a-shannon/utils/tree/feat/zcash-transparent-utils/native/zcash-inspector
[native payment]: https://github.com/a-shannon/utils/tree/feat/zcash-transparent-utils/native/zcash-payment
[Zallet companion]: https://github.com/a-shannon/ui/tree/feat/zcash-transparent-ui/companions/zallet
[ZIP-244]: https://zips.z.cash/zip-0244
[ZIP-317]: https://zips.z.cash/zip-0317
[ZIP-258]: https://zips.z.cash/zip-0258
[ZIP-229]: https://zips.z.cash/zip-0229
[Zcash consensus parameters]: https://zcash.github.io/librustzcash/rustdoc/latest/src/zcash_protocol/consensus.rs.html
[Zebra RPC]: https://github.com/ZcashFoundation/zebra/blob/7c64a8419388dd72664a19a70aed66e84f3e2d5b/zebra-rpc/src/methods.rs
[librustzcash transparent builder]: https://github.com/zcash/librustzcash/blob/5345dbe0cd6c7f2057e631a34a74dffa84ff1d48/zcash_transparent/src/builder.rs
