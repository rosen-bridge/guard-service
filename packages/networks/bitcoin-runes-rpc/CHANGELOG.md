# @rosen-chains/bitcoin-runes-rpc

## 2.0.5

### Patch Changes

- Fix bug where pagination were ignored while fetching address or transaction runes"

## 2.0.4

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@4.0.0
  - @rosen-chains/abstract-chain@16.0.0
  - @rosen-chains/bitcoin-runes@4.0.0
  - @rosen-clients/rate-limited-axios@1.1.1

## 2.0.3

### Patch Changes

- Fix bug in the error handling of Bitcoin RPC

## 2.0.2

### Patch Changes

- Update dependencies
  - @rosen-chains/bitcoin-runes@3.0.2
  - @rosen-chains/abstract-chain@15.0.2

## 2.0.1

### Patch Changes

- Fix slight error in the `getFeeRatio` function
- Update dependencies
  - @rosen-chains/bitcoin-runes@3.0.1

## 2.0.0

### Major Changes

- Add pagination args to getAddressBtcBoxes and getRemainingBoxes

### Patch Changes

- Update dependencies
  - @rosen-chains/bitcoin-runes@3.0.0
  - @rosen-chains/abstract-chain@15.0.1

## 1.0.0

### Major Changes

- Update node version to 22.18
- Replace `@rosen-bridge/rate-limited-axios` with `@rosen-clients/rate-limited-axios`

### Patch Changes

- Add Unisat indexed height validation
- Fix authorization header for Unisat client
- Follow no-explicit-any eslint rule
- Sort imports
- Update dependencies
  - @rosen-bridge/abstract-logger@3.0.1
  - @rosen-bridge/tokens@4.0.1
  - @rosen-chains/bitcoin-runes@2.0.0
  - @rosen-chains/abstract-chain@15.0.0
