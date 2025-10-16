# @rosen-chains/bitcoin-runes

## 2.0.0

### Major Changes

- Update node version to 22.18

### Patch Changes

- Fix `NotEnoughAssetsError` to display unwrapped value instead of wrapped value
- Fix bug on transaction generation where Runes boxes can also cover the required BTC
- Fix required BTC while selecting UTxOs to generate a transaction
- Follow no-explicit-any eslint rule
- Improve `NotEnoughValidBoxesError` to display uncovered assets instead of required assets
- Improve box selection to forbid selected boxes to avoid duplicate input in case of unexpected behavior from Unisat APIs
- Sort imports
- Update dependencies
  - @rosen-bridge/abstract-logger@3.0.1
  - @rosen-bridge/bitcoin-runes-utxo-selection@2.0.1
  - @rosen-bridge/json-bigint@1.1.0
  - @rosen-bridge/rosen-extractor@10.1.1
  - @rosen-bridge/tokens@4.0.1
  - @rosen-chains/abstract-chain@15.0.0
  - @rosen-chains/bitcoin@9.0.0

## 1.0.0

### Major Changes

- Add abstract `getAddressRunesBoxes`, `getAddressBtcBoxes` and `getRemainingBoxes` functions to `AbstractBitcoinRunesNetwork`
- Implement `AbstractBitcoinRunesNetwork.getAddressBoxes` function to throw error (this function should not be used)
- Replace abstract `getMempoolTxIds` function with abstract `isTxInMempool` function in `AbstractBitcoinRunesNetwork`

### Minor Changes

- Re-export `CONFIRMATION_TARGET` constant from `@rosen-chains/bitcoin`

### Patch Changes

- Revamp `BitcoinRunesChain.generateMultipleTransactions` to get address boxes by selecting Runes boxes first and then selecting other boxes to cover required BTC
- Update Rosen utility packages
- Update dependencies
  - @rosen-chains/abstract-chain@14.0.1
  - @rosen-chains/bitcoin@8.1.1
