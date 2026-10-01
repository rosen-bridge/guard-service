# Native Bitcoin Cash chain

This package implements native BCH treasury payments for Rosen Bridge. It uses
compressed-key P2PKH treasury inputs and ordinary, explicitly prefixed mainnet
CashAddr P2PKH/P2SH destinations. The RPC adapter translates those scripts to its
selected BCHN network. CashTokens treasury inputs and payment outputs are rejected.

## Transaction and signing contract

`BitcoinCashTransaction` stores canonical transaction bytes, authenticated raw
parents, the aggregate public key and the Rosen event/type context. Its `txId`
identifies the approved transaction body with empty unlocking scripts. The signed
network transaction has a different ID. Persist the complete `toJson()` envelope
alongside the approval ID; pass that envelope to payment confirmation, mempool and
actual-ID queries after restoring it through `PaymentTransactionFromJson()`.
Source-deposit confirmation instead accepts the actual network txid with
`TransactionType.lock` and no payment envelope.

The ECDSA mediator receives the 32-byte BCH `SIGHASH_ALL | SIGHASH_FORKID` digest
(`0x41`), including the spent value and locking script. It must sign that digest
without hashing it again and return a compact, low-S signature. The adapter checks
each signature, serializes canonical DER witnesses and preserves the approved
body. Connect and validate the production TSS backend separately before activation.

## Payment policy

Every selected input must have an authenticated token-free parent and be currently
unspent and confirmed; coinbase inputs require 100 confirmations. Selection excludes
inputs reserved by pending unsigned envelopes or signed raw transactions, scans a
bounded number of wallet pages and does not chain unconfirmed change.

Payments use version 2, zero locktime, final input sequences, a fixed integer
satoshi-per-byte rate and a maximum fee. The fee estimate reserves 149 bytes per
compressed-key legacy input. The final output is treasury change, which must meet
the configured minimum value. Change keeps its exact native satoshis. Payout amounts
must round-trip exactly through `TokenMap`, including when the wrapped asset has
fewer decimals than BCH. Aggregate asset balances use the shared Rosen ceiling
conversion; fee and token-burn checks use the authenticated native values.

All five configured confirmation thresholds must be positive safe integers.
Spending is bounded to 100 inputs, 100 outputs and 100 kB. Source deposits retain
their separate 1 MB/4096-input/output admission bound and allow unrelated token
outputs; the single positive treasury output must be token-free.

## Recovery and integration

Use `@rosen-chains/bitcoin-cash-rpc` with BCHN, an explicit expected network and
an imported/rescanned treasury address. Keep `txindex` enabled and synchronized.
Signed recovery matches the complete approved body in bounded wallet history,
then validates its witnesses against the persisted authenticated parents. An
exhausted or inconsistent history scan throws. If no signed body is recoverable
and approval inputs are unavailable, retries stop instead of creating another
payment.

Real RWT/Ergo contract IDs, wrapped assets, reserve funding and minimum-fee data
are operator inputs. The local BCH address wire index also needs upstream allocation
before a coordinated release. Native regtest validation does not establish live
bridge deployment or production TSS compatibility.
