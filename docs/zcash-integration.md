# Zcash transparent integration review

**Author:** A. Shannon

**Review date:** 26 September 2026

**Target:** coordinated review across seven Rosen repositories

## Review request

This proposal adds transparent Zcash support to Rosen Bridge and maps the work to
[RCS-003]. It is ready for coordinated source review and release planning.

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

## RCS-003 mapping

### Base requirements

| RCS-003 requirement | Candidate implementation | Current evidence and limit |
| --- | --- | --- |
| Multi-signer address | Transparent P2PKH reserve derived from Rosen DKG and spent by threshold ECDSA | Four guards converged in the isolated settlement; operator independence and Mainnet availability remain unqualified |
| Writing data | Zero-value `OP_RETURN` encodes target chain, target address, bridge fee, and network fee | Zallet and UI constructed, reviewed, signed, submitted, and verified a Regtest deposit; only synthetic funds were used |
| Node/API endpoints | Zebra RPC is consumed by scanner, Service2, watcher, guard, and health check components | Real isolated Zebra RPC was exercised; production endpoints, topology, and operations remain open |

### Additional requirements

| RCS-003 requirement | Candidate implementation | Current evidence and limit |
| --- | --- | --- |
| Token support | Native ZEC and its Rosen representation | Importing arbitrary assets to Zcash is outside scope |
| dApp connector | Rosen UI plus a Zallet companion accepting Regtest, Testnet, and Mainnet configurations, and a separate one-use Ergo devnet companion | Browser deposits ran on Zcash Regtest and return orders on Ergo devnet; Mainnet wallet, operator, and end-to-end qualification remain pending |
| Transaction chaining | The candidate does not claim or qualify transaction chaining; durable attempt/settlement state and intent binding protect payment integrity rather than implement the RCS throughput mechanism | Concurrent requests, dependent transactions, and deadlock/delay handling remain to be designed and qualified |
| Event distinction | Source transaction, output index, block, network, and request identifier distinguish events | Recovery converged without a duplicate payment; production reorg policy remains open |
| Fees | Bridge and network fees are encoded; Zcash payment validates exact zatoshis, change, and ZIP-317 fee | Mainnet fee policy and reserve-capacity policy remain open |

The Rosen payload is bounded by Zcash's standard 80-byte null-data policy.
The 18-byte fixed prefix leaves at most 62 bytes for the encoded target address.
Address length alone does not establish that the destination is valid or admitted.

Amounts are integer zatoshis throughout. Floating-point amounts are not accepted.
The configured network, genesis, consensus branch schedule, reserve address, and
confirmation policy must agree across producers and consumers. Unknown or
contradictory branch evidence fails closed.

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
   lock construction, receipt verification, and the bounded companions.

Contracts, token identifiers, fee boxes, and deployment configuration remain
Rosen operational inputs.

## Release and lock order

The source PRs can be reviewed in parallel. Publication and consumer locks must
follow the dependency graph:

1. Release the changed `utils` packages and the separately built native inspector
   and payment artifacts from reviewed source and lockfiles.
2. Release the Zcash scanner and observation extractor against those official
   `utils` versions.
3. Release `health-check` and `sign-protocols`; these can proceed independently
   once their reviews pass.
4. Resolve the new official packages in `guard-service` and `watcher`, regenerate
   their locks from the public registry, and run hosted CI on the resolved graph.
5. Resolve the official packages in `ui`/Service2, regenerate its lock, and run
   hosted CI and the application build against the reviewed configuration.
6. Promote contracts and configuration only after the operational decisions below.

The Changesets in each repository remain the versioning authority. Unpublished
package archives and non-upstream lockfiles establish only that
the reviewed bytes can be installed together; they are not evidence of an npm
release or of hosted CI.

## Executed integration evidence

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

An automated, portable full-roundtrip harness remains to be packaged. The source
repositories expose the package scripts and bounded interfaces below. Fresh
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
- The watcher documents its configuration and `npm run start`; its package exposes
  `npm run type-check` and `npm run build`.
- The UI documents bootstrap and application build commands. The [Zallet companion] documents
  separate `serve`, `prepare`, and human-approved `submit` steps; confirmation and
  watcher observation are separate verifier steps.

The public source and protocol references are [RCS-003], [ZIP-244], [ZIP-317],
[ZIP-258], [ZIP-229], the [Zcash consensus parameters], [Zebra RPC], and the
[librustzcash transparent builder].

## Maintainer decisions before production

1. Review the seven source diffs and Changesets as one compatibility set.
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
[librustzcash transparent builder]: https://github.com/zcash/librustzcash/blob/6192772887e1bcfd3fc4b7af2d945f8b6b267e60/zcash_transparent/src/builder.rs
