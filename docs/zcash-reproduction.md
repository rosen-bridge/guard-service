# Zcash replay and service acceptance

**Author:** A. Shannon

**Review date:** 5 October 2026

This guide accompanies [the integration proposal](zcash-integration.md). Use its
seven-repository source heads as the submitted baseline. The October 5 corrections
and commands below are prepared locally on top of those heads; they are not yet
submitted. The focused evidence does not execute another complete bridge campaign
or qualify ordinary public-registry installation of the new-chain graph.

## Installation boundary

The selected JavaScript graph uses Node 22.18.0, npm 11.6.2 and
`abstract-observation-extractor@1.0.10`. New package manifests remain `0.0.0`;
their initialization changesets prospectively release `0.1.0`. This does not
mean that those versions have been published.

Run the package commands only after installing the matching candidate graph and
building its producer workspaces. Submitted consumer locks do not yet resolve
the complete new graph from the public registry. A disposable local registry
with packed candidate artifacts and generated scratch locks, or official
producer releases followed by consumer lock regeneration, is required. A
portable script reconstructing that local registry graph and the full synthetic
roundtrip remains contributor work. Do not substitute released old packages and
describe their results as validation of the candidate.

Record repository commits, native executable SHA-256, package archives and
resolved dependency versions with each replay. Inspect failures and skipped
tests separately from successful assertions.

## Native inspector setup

From the utils repository, select an external build directory and use the
committed Cargo manifest and lock. Initial dependency acquisition needs network
access; later locked offline builds require the acquired cache.

```sh
export CARGO_TARGET_DIR="<external-build-directory>"
cargo fetch --locked --manifest-path native/zcash-inspector/Cargo.toml
cargo test --locked --offline --manifest-path native/zcash-inspector/Cargo.toml
cargo build --release --locked --offline --manifest-path native/zcash-inspector/Cargo.toml
export ZCASH_INSPECTOR_BIN="$CARGO_TARGET_DIR/release/rosen-zcash-native-inspector"
export ZCASH_INSPECTOR_SHA256="$(node -e 'const fs=require("node:fs");const c=require("node:crypto");process.stdout.write(c.createHash("sha256").update(fs.readFileSync(process.env.ZCASH_INSPECTOR_BIN)).digest("hex"))')"
```

The example uses POSIX shell syntax. On Windows, set the same environment
variables and use the executable's `.exe` suffix. The inspector manifest binds
librustzcash to `5345dbe0cd6c7f2057e631a34a74dffa84ff1d48`. The native payment
tool has a separate manifest, lock and build contract; it is not required by the
scanner replays below.

## Example lock and extractor agreement

Utils fixture directory:
`packages/rosen-extractor/tests/getRosenData/zcash/fixtures`.

`zcash-block-106.json` contains this synthetic Regtest lock:

| Field                  | Expected value                                                             |
| ---------------------- | -------------------------------------------------------------------------- |
| Transaction            | `aaf9bf3fc7be562ff268327ee983510480d212df65e2f91883f82aea60f7727b`         |
| Block / height         | `cfe65311fe34bf402a685debf1cdd968aec23a88a11d11389ec2d1bbf3ceb240` / `106` |
| Branch                 | `c2d6d0b4`                                                                 |
| Reserve                | `tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt`                                      |
| Target chain / address | `ergo` / `9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd`             |
| Native amount          | `100000000` zatoshis                                                       |
| Bridge / network fees  | `5000` / `2200`                                                            |
| Input reference        | `box:f5ffc9c9d6fa6f4035a83debd4ed68421392dede37879d23f30ab00da7cda1e2.1`   |

The fixture's target token is `ab` repeated 32 times, a synthetic allocation.
The input reference is an outpoint descriptor, not a sender wallet address.
`deposit-inspection.json` and `native-delivered-block-106.json` preserve related
inspection/delivery data. The scanner also carries its block-106 fixture. These
are historical test-network inputs, not production deployment parameters.

From utils:

```sh
npm test --workspace @rosen-bridge/rosen-extractor -- --run tests/getRosenData/zcash/zcashRpcRosenExtractor.spec.ts
```

This runs the extractor cases, including the native-byte check when the inspector
environment is set. The stub-inspection cases alone do not prove native decoding.
The October5 final spec ran23 ordinary cases, then the two previously skipped
real-native cases separately with the current inspector:2/2 passed. The second
run filtered the unchanged23 cases; neither selected native case was skipped.
The command does not run the entire wallet-to-settlement path or establish
agreement with every Guard consumer.

## Public persistence and resource replays

Run each command from its repository root on the installed candidate graph.

| Repository / command                                                                                                       | Public fixture                                                                                | Deciding claim                                                                                                                                                                 | Limit                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| watcher: `npm test -- --grep "Zcash process and file database recovery"`                                                   | `tests/utils/zcashScannerProcess.ts`, `tests/utils/fixtures/zcashScannerProcessChild.mts`     | Kill during a `PROCESSING` block, reopen the same SQLite file, retain cursor under a persistent fault, replay without duplicate request IDs, rollback and process replacements | Real scanner/storage child; synthetic observations/producer; no application API, scheduler, commitments or guard path                          |
| watcher: `npm test -- --grep "Zcash durable scanner progress"`                                                             | `tests/utils/zcashScannerProgress.ts`                                                         | Swallowed extraction failure leaves cursor behind `PROCESSING` and readiness halted                                                                                            | In-memory SQLite; halt cause is process-local and not persisted acknowledgement                                                                |
| scanner: `npm test --workspace @rosen-bridge/zcash-observation-extractor -- --run nativeObservation.test.ts`               | `packages/observation-extractors/zcash-observation-extractor/tests/nativeObservation.test.ts` | Later native-batch refusal writes nothing; valid replay deduplicates; rollback drains overlapping inspection/storage                                                           | Real native tool and in-memory SQLite; skips without inspector binding; no process/service restart                                             |
| scanner: `npm test --workspace @rosen-bridge/zcash-scanner -- --run tests/integration/zcashRpcNetwork.integration.spec.ts` | `packages/scanners/zcash-scanner/tests/integration/zcashRpcNetwork.integration.spec.ts`       | RPC projection validation, timeout bounds, exactly2,000,000 decoded bytes accepted and larger input refused                                                                    | HTTP integration35/35 reused; moved body unchanged apart from four relative paths. Arbitrary oversized bytes do not prove node-valid admission |
| scanner: `npm test --workspace @rosen-bridge/zcash-scanner -- --run tests/zcashRpcNetwork.spec.ts`                         | `packages/scanners/zcash-scanner/tests/zcashRpcNetwork.spec.ts`                               | Mocked transport config, ordered RPC/genesis identities, exact transaction/amount preservation and foreign-version refusal                                                     | Unit4/4 in current-source preparation graph; observation producer still requests^12.2.0 while the local installed extractor manifest is12.1.2  |

The file-database test is bounded to 60 seconds, with each child bounded to
15 seconds. Native batches are bounded to 32 transactions and 2,000,000 aggregate
decoded bytes, 4,016,384 input JSON bytes and 36 MiB output. The default native
deadline is 10 seconds; the maximum accepted timer is 2,147,483,647 milliseconds.
The source allows one batch in flight per inspector and checks the executable
hash for each batch. These are local resource controls, not new consensus rules.

The corrected Watcher candidate adds a real native recovery command:

```sh
npm run test:zcash-recovery
```

It selects `tests/utils/zcashNativeRecovery.mts` and
`tests/utils/zcashObservationContext.mts`, using the inspector environment above.
Missing inspector bindings cause a skip, not a successful native replay. The
native process case has a 190-second overall bound and 45-second child bounds.
The child requires actual `abstract-observation-extractor@1.0.10` and delegates
counted calls to the real asynchronous native batch inspector. An older binary
that lacks that protocol, even with a matching configured SHA, cannot qualify it.

The October 5 execution passed 9/9 with no skips in a disposable current-source
graph. The inspector was rebuilt from the locked Rust source in debug mode;
its tested Windows SHA256 was
`cfa77547ab452ce5b3a485f72245f8a1552075c4086f7944f1ebc3674b66653e`.
This is local build evidence, not an official release artifact. The fixture uses
actual entities and file SQLite with schema synchronization, loopback RPC from a
native transaction fixture, seeded downstream custody and a counted queue sender.
It checks crash/restart, native refusal/retry, rollback and transaction reinclusion
before stored identity can be overwritten. Removing the pre-extraction check
fails both reinclusion cases. Production migrations, actual Ergo commitment/reveal,
the full API process, retention/cleanup and mixed historical databases remain
separate service acceptance cases.

Package fixtures remain supporting evidence. A healthy API response or a
successfully resolved scanner update does not prove readiness of scheduled jobs
or durable downstream processing.

## Prepared acceptance cases for the selected service

On the local corrected candidate, unsupported canonical data and signing
admission have direct replay commands from the Guard repository:

```sh
node --import tsx --test packages/chains/zcash-payment/tests/unsupportedScope.spec.ts
npm run test:unit --workspace guard-service
```

Each passed 1/1 on Node22.18.0. They import the real model, codec and capability
but control the native/evidence/TSS endpoints. Canonical schema-2 data remains
parseable for refusal; no Orchard native operation, proof or payment is executed.
Inserting native digest before scope refusal makes the new model negative fail.
The unit command has a tracked isolated Vitest config without private aliases or
service bootstrap. It does not qualify the unchanged full service integration
suite, whose Windows ESM/CJS dependency collection boundary remains disclosed.

The UI address regression is in
`apps/rosen/tests/networks/zcash/server.spec.ts`. From the UI repository root:

```sh
npm run test:zcash-unit --workspace @rosen-bridge/rosen-app
npm test --workspace @rosen-network/zcash -- --run
npm test --workspace @rosen-ui/zallet-wallet -- --run
```

App4/4, network utility8/8 and wallet4/4 passed with Node22.18.0 and actual TokenMap/codec
and server serialization/client unwrapping. The unchanged receipt1/1 and wallet
utility1/1 are reused; the three regrouped unit files have identical test-body
ASTs. These checks are not a fresh run of every UI test. RPC is controlled. The
app unit config excludes unrelated database setup and uses the repository's
dependency transform.
The eight/three-decimal one-zatoshi remainder catches the incomplete earlier
maximum-transfer formula; reserving wrapped fee plus one wrapped unit now passes.
The normal browser/application database and registry release graph are separate
gates. Package test scripts use POSIX environment assignment; on Windows set
`NODE_OPTIONS=--import tsx` and invoke the same installed Vitest runner directly.

The independently prepared generic Watcher runtime prerequisite has these commands
after its ordinary public-registry install:

```sh
npm run test:packaging
npm run type-check
npm run release
```

Its normal packaging test passed 1/1: real host Snappy compression/decompression
and SQLite query execute inside both the Rollup bundle and a packaged fixture
executable. The full Watcher executable also reached the expected missing-config
refusal, without native-loader errors. Build tools used Node22.18.0/npm11.6.2;
the packager's host executable embeds Node22.23.2. Windows host qualification does
not qualify other platforms, Docker or a valid full service configuration.

The contribution owns disposable configurations, databases, fixtures, commands,
browser checks, package packing and lock rehearsal. The route and operating
policies need agreement before dependent implementation. Each case below must
use the selected real application entrypoint and real persistence/jobs.

| Case                                | Contributor setup and falsifier                                                                                                                                      | Exact external decision/input                                                                                              | Passing outcome                                                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Startup and failure                 | Start with valid configuration, then missing config and unavailable RPC/fee source; inspect API/readiness, scanner cursor and actual job outputs                     | Watcher v1/runtime split or Service2; accepted failure/exit/retry policy                                                   | Healthy status only when required producers/jobs are available; failed initialization is observable and cannot enable commitments |
| Crash and unresolved incident       | Stop during `PROCESSING`; reopen the same database; compare cursor, incident and pending work before any repair                                                      | Persisted incident/checkpoint and repair/rescan authorization policy                                                       | Restart cannot erase an unresolved fault; approved repair replays without duplicate observation or downstream action              |
| Rollback after downstream progress  | Persist an observation and actual commitment/reveal state, replace its source block, then run selected cleanup/reconciliation                                        | Confirmation/finality, guard refusal and liability/cleanup policy                                                          | Invalidated evidence cannot progress or pay twice; affected downstream state is observable and reconciled                         |
| Existing chains with Zcash inactive | Existing-chain configs without Zcash RPC/native settings, with and without a Zcash token-map entry; check import, migration, scan, jobs, health and packaged startup | Accepted shared runtime baseline and packaging/chain-family matrix                                                         | Existing chains start and progress on the new graph; eager dependency resolution is explicitly accounted for                      |
| Node-valid resource boundary        | Produce input admitted by the selected Zebra build around the local resource envelope; inspect cursor, blocked status, backlog, memory and event-loop delay          | Supported node/transaction envelope and resource/refusal/recovery thresholds                                               | Unsupported valid input is visible, remains unprocessed, and has an approved recovery path without skipping events                |
| Browser and release graph           | Parameterized UI/Service2 data, disposable database, packed archives, scratch locks and both-direction browser steps                                                 | Official package versions/native artifacts; accepted wallets, contracts/token IDs, endpoints and fee/confirmation settings | Installed public exports reach the actual consumers; browser amount, asset, destination and identity agree with settlement        |

The actual service startup/recovery runner, persisted incident acknowledgement,
downstream rollback replay, existing-chain runtime matrix and portable full
roundtrip are not delivered by the scanner fixtures. This table prepares their
acceptance contract; it does not claim those cases were executed.

After route selection, the smallest real replay is service startup -> observable
scanner/job progress -> persisted observation -> permitted commitment/reveal,
followed by stop/restart and one rollback against the same disposable database.
Then exercise an existing chain with Zcash inactive on that exact runtime graph.
Use only local/test networks and synthetic funds for this campaign.
