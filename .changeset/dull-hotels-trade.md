---
'@rosen-chains/evm': major
---

Replace getMaxFeePerGas and getMaxPriorityFeePerGas functions with getFeeData function in AbstractEvmNetwork
Use gas price instead of getMaxFee variables in tx generation and verification only if maxFee variables are not defined in the network
