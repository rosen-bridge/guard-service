---
'@rosen-chains/firo': patch
---

Fix payment transaction generation failing with `Transaction has unexpected data` when an input UTXO was created by a Firo special transaction (e.g. a Spark spend), by attaching the previous transaction (`nonWitnessUtxo`) only to inputs that spend a signed transaction and using `witnessUtxo` for the rest. `verifyPaymentTransaction` verifies the value and lock script of each input against its `nonWitnessUtxo`, or against its `witnessUtxo` and the network
