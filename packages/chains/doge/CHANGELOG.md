# @rosen-chains/doge

## 3.0.2

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@15.0.2

## 3.0.1

### Patch Changes

- Update dependencies
  - @rosen-bridge/rosen-extractor@11.0.0
  - @rosen-chains/abstract-chain@15.0.1

## 3.0.0

### Major Changes

- Update node version to 22.18

### Patch Changes

- Follow no-explicit-any eslint rule
- Improve `NotEnoughValidBoxesError` to display uncovered assets instead of required assets
- Sort imports
- Update dependencies
  - @rosen-bridge/abstract-logger@3.0.1
  - @rosen-bridge/bitcoin-utxo-selection@2.0.1
  - @rosen-bridge/json-bigint@1.1.0
  - @rosen-bridge/rosen-extractor@10.1.1
  - @rosen-bridge/tokens@4.0.1
  - @rosen-chains/abstract-chain@15.0.0

## 2.2.1

### Patch Changes

- Update box-selection packages
- Update Rosen utility packages
- Update dependencies
  - @rosen-chains/abstract-chain@14.0.1

## 2.2.0

### Minor Changes

- Integrate new Rosen box selection packages
- Add getActualTxId method to chains

### Patch Changes

- Update `@rosen-bridge/rosen-extractor`, `@rosen-bridge/tokens` and `@rosen-bridge/minimum-fee` packages to their latest version
- Update box-selection packages
- Update dependencies
  - @rosen-chains/abstract-chain@14.0.0

## 2.1.1

### Patch Changes

- Fix Doge minimum UTxO value (changed to 0.01 DOGE)

## 2.1.0

### Minor Changes

- Add partial and combined network definitions to account for issues in different block explorers.

## 2.0.1

### Patch Changes

- Remove redundant `redeemScript` in the `generateMultipleTransactions`

## 2.0.0

### Major Changes

- Update abstract network to be more efficient for finding txs in the mempool

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@13.1.0

## 1.0.0

### Major Changes

- Update tokens package to v3 and rosen-extractor to 7.2.1

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@13.0.0
