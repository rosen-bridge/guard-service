# @rosen-chains/doge-blockcypher

## 1.0.3

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@4.0.0
  - @rosen-chains/abstract-chain@16.0.0
  - @rosen-chains/doge@4.0.0
  - @rosen-clients/rate-limited-axios@1.1.1

## 1.0.2

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@15.0.2
  - @rosen-chains/doge@3.0.2

## 1.0.1

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@15.0.1
  - @rosen-chains/doge@3.0.1

## 1.0.0

### Major Changes

- Update node version to 22.18

### Minor Changes

- Replace `axios` and `axios-rate-limit` with `@rosen-clients/rate-limited-axios@1.1.0`

### Patch Changes

- Fix `implements` variable
- Follow no-explicit-any eslint rule
- Sort imports
- Update dependencies
  - @rosen-bridge/abstract-logger@3.0.1
  - @rosen-bridge/tokens@4.0.1
  - @rosen-chains/doge@3.0.0
  - @rosen-chains/abstract-chain@15.0.0

## 0.2.1

### Patch Changes

- Update Rosen utility packages
- Update dependencies
  - @rosen-chains/abstract-chain@14.0.1
  - @rosen-chains/doge@2.2.1

## 0.2.0

### Minor Changes

- Add getActualTxId method to chains

### Patch Changes

- Update dependencies
  - @rosen-chains/doge@2.2.0
  - @rosen-chains/abstract-chain@14.0.0

## 0.1.3

### Patch Changes

- Update dependencies
  - @rosen-chains/doge@2.1.1

## 0.1.2

### Patch Changes

- Add error handling to the `getAddressBoxes`
- Improve the `getTxConfirmations` method to avoid extra requests to the explorer when the transaction is finalized.
- Inherit partial doge network
- Fix transaction submission
- Update dependencies
  - @rosen-chains/doge@2.1.0

## 0.1.1

### Patch Changes

- Enhance logging and fix undefined issue for the txrefs field
- Filter out unconfirmed txs
- Update dependencies
  - @rosen-chains/doge@2.0.1
