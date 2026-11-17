---
'@rosen-chains/firo': patch
---

Fix payment transaction generation failing with `Transaction has unexpected data` when an input UTXO was created by a Firo special transaction (e.g. a Spark spend), by no longer attaching the previous transaction of each input to the PSBT
