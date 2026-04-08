# @rosen-chains/evm

## 10.0.0

### Major Changes

- Replace `signFunction` argument with `signMediator`, an object with the type of `EcdsaSignMediator`
  Remove `TssSignFunction` type
- Add `isTransactionInSign` function, which checks if the corresponding signer service is signing the transaction or not

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@4.0.0
  - @rosen-bridge/rosen-extractor@11.3.0
  - @rosen-bridge/tokens@6.0.0
  - @rosen-chains/abstract-chain@16.0.0
  - ethers@6.16.0

## 9.0.2

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@15.0.2

## 9.0.1

### Patch Changes

- Update dependencies
  - @rosen-bridge/rosen-extractor@11.0.0
  - @rosen-chains/abstract-chain@15.0.1

## 9.0.0

### Major Changes

- Update node version to 22.18

### Patch Changes

- Fix `NotEnoughAssetsError` to display unwrapped value instead of wrapped value
- Follow no-explicit-any eslint rule
- Sort imports
- Update dependencies
  - @rosen-bridge/abstract-logger@3.0.1
  - @rosen-bridge/json-bigint@1.1.0
  - @rosen-bridge/rosen-extractor@10.1.1
  - @rosen-bridge/tokens@4.0.1
  - @rosen-chains/abstract-chain@15.0.0

## 8.2.1

### Patch Changes

- Downgrade `ethers` to v6.13.2
- Update Rosen utility packages
- Update dependencies
  - @rosen-chains/abstract-chain@14.0.1

## 8.2.0

### Minor Changes

- Add getActualTxId method to chains
- Add token map callback registration in `EvmChain.constructor` to update `supportedTokens` on token map updates
- Add token map callback registeration on `EvmChain.constructor` to update `supportedTokens` on each token map update

### Patch Changes

- Update `@rosen-bridge/rosen-extractor`, `@rosen-bridge/tokens` and `@rosen-bridge/minimum-fee` packages to their latest version
- Update ethers version to v6.14.3
- Update dependencies
  - @rosen-chains/abstract-chain@14.0.0

## 8.1.0

### Minor Changes

- Add optional 'tokens' arg to getAddressAssets

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@13.1.0

## 8.0.0

### Major Changes

- Update tokens package to v3 and rosen-extractor to 7.2.1

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@13.0.0

## 7.0.0

### Major Changes

- Update rosen-extractor and token packages
- Removed `supportedTokens` from constructor arguments. Now, it is initialized by given TokenMap in constructor and can be updated using `updateSupportedTokens` function

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@12.0.0

## 6.0.1

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@11.0.3

## 6.0.0

### Major Changes

- Replace getMaxFeePerGas and getMaxPriorityFeePerGas functions with getFeeData function in AbstractEvmNetwork
- Support both type 0 and type 2 transactions

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.2

## 5.1.1

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@11.0.1

## 5.1.0

### Minor Changes

- Add signingStatus to verifyTransactionExtraConditions function arguments

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.0

## 5.0.0

### Major Changes

- Add arbitrary transaction type

### Minor Changes

- Add verifyPaymentTransaction function which checks data consistency within a PaymentTransaction Object

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@10.0.0

## 4.1.2

### Patch Changes

- Fix UInt8Array type error

## 4.1.1

### Patch Changes

- Check lock address balance for required assets before estimating the tx required gas

## 4.1.0

### Minor Changes

- Enable transaction chaining by limiting max parallel transactions to single nonce

## 4.0.2

### Patch Changes

- Improve logs
- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@9.0.2

## 4.0.1

### Patch Changes

- Catch errors while checking tx before submission

## 4.0.0

### Major Changes

- Add gasLimitCap to EvmConfigs (the cap is used in tx generation and fee verification when required gas is too high)

## 3.0.0

### Major Changes

- Add chain name and native token id to constructor to fix extractor intialization
- Add getAddressTransactionByNonce to AbstractEvmNetwork

### Patch Changes

- Fix tx serialization for rosen-extractor
- Update rosen-extractor version
- Improve isTxValid to not invalid the tx when tx is not found
- Update dependencies
  - @rosen-chains/abstract-chain@9.0.1

## 2.0.1

### Patch Changes

- Fix signTransaction

## 2.0.0

### Major Changes

- Consider transaction failure
- Change `verifyLockTransactionExtraConditions` to async
- Add reason and expectation status to isTxValid result

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@9.0.0

## 1.0.0

### Major Changes

- Consider decimals drop

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@8.0.0

## 0.1.3

### Patch Changes

- Update rosen-extractor
- Update dependencies
  - @rosen-chains/abstract-chain@7.0.2

## 0.1.2

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@7.0.1
