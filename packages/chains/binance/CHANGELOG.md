# @rosen-chains/binance

## 4.0.0

### Major Changes

- Add `isTransactionInSign` function, which checks if the corresponding signer service is signing the transaction or not
- Replace `signFunction` argument with `signMediator`, an object with the type of `EvmChainSignMediator` (which is exactly the same as `EcdsaSignMediator`)

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@4.0.0
  - @rosen-bridge/tokens@6.0.0
  - @rosen-chains/evm@10.0.0

## 3.0.2

### Patch Changes

- Remove dependency @rosen-chains/abstract-chain
- Update dependencies
  - @rosen-chains/evm@9.0.2

## 3.0.1

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@15.0.1
  - @rosen-chains/evm@9.0.1

## 3.0.0

### Major Changes

- Update node version to 22.18

### Patch Changes

- Follow no-explicit-any eslint rule
- Sort imports
- Update dependencies
  - @rosen-bridge/abstract-logger@3.0.1
  - @rosen-bridge/tokens@4.0.1
  - @rosen-chains/abstract-chain@15.0.0
  - @rosen-chains/evm@9.0.0

## 2.1.1

### Patch Changes

- Update Rosen utility packages
- Update dependencies
  - @rosen-chains/abstract-chain@14.0.1
  - @rosen-chains/evm@8.2.1

## 2.1.0

### Minor Changes

- Add getActualTxId method to chains

### Patch Changes

- Update `@rosen-bridge/rosen-extractor`, `@rosen-bridge/tokens` and `@rosen-bridge/minimum-fee` packages to their latest version

- Update dependencies
  - @rosen-chains/abstract-chain@14.0.0
  - @rosen-chains/evm@8.2.0

## 2.0.1

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@13.1.0
  - @rosen-chains/evm@8.1.0

## 2.0.0

### Major Changes

- Update tokens package to v3 and rosen-extractor to 7.2.1

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@13.0.0
  - @rosen-chains/evm@8.0.0

## 1.0.0

### Major Changes

- Update rosen-extractor and token packages
- Removed `supportedTokens` from constructor arguments. Now, it is initialized by given TokenMap in constructor and can be updated using `updateSupportedTokens` function

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@12.0.0
  - @rosen-chains/evm@7.0.0

## 0.2.3

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.3
  - @rosen-chains/evm@6.0.1

## 0.2.2

### Patch Changes

- Update dependencies
  - @rosen-chains/evm@6.0.0
  - @rosen-chains/abstract-chain@11.0.2

## 0.2.1

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.1
  - @rosen-chains/evm@5.1.1

## 0.2.0

### Minor Changes

- Add signingStatus to verifyTransactionExtraConditions function arguments

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.0
  - @rosen-chains/evm@5.1.0

## 0.1.2

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@10.0.0
  - @rosen-chains/evm@5.0.0

## 0.1.1

### Patch Changes

- Update dependencies
  - @rosen-chains/evm@4.1.2
