# @rosen-chains/abstract-chain

## 14.0.0

### Major Changes

- Add getActualTxId method to chains
- Remove `getBoxInfo` and `getCoveringBoxes` from `AbstractUtxoChain` and replace it with `boxSelection` property with type `AbstractBoxSelection` with generic type

### Patch Changes

- Update `@rosen-bridge/rosen-extractor`, `@rosen-bridge/tokens` and `@rosen-bridge/minimum-fee` packages to their latest version
- Update box-selection packages

## 13.1.0

### Minor Changes

- Add optional 'tokens' arg to getAddressAssets

## 13.0.0

### Major Changes

- Update tokens package to v3 and rosen-extractor to 7.2.1

## 12.0.0

### Major Changes

- Update rosen-extractor and token packages

## 11.0.3

### Patch Changes

- Update rosen-extractor version

## 11.0.2

### Patch Changes

- Rethrow any unexpected errors while verifying events

## 11.0.1

### Patch Changes

- Update rosen-extractor version

## 11.0.0

### Major Changes

- Add signingStatus to verifyTransactionExtraConditions function arguments

## 10.0.0

### Major Changes

- Add verifyPaymentTransaction function which checks data consistency within a PaymentTransaction Object
- Add arbitrary transaction type

### Minor Changes

- Add order encoder and decoder

## 9.0.2

### Patch Changes

- Update rosen-extractor version
- Update minimum-fee version

## 9.0.1

### Patch Changes

- Update rosen-extractor version

## 9.0.0

### Major Changes

- Change `verifyLockTransactionExtraConditions` to async
- Add reason and expectation status to isTxValid result

## 8.0.0

### Major Changes

- Add abstract NATIVE_TOKEN_ID variable
- Add RosenTokens to constructor arguments
- Consider decimals drop
  - Every function of `AbstractChain` and `AbstractUtxoChain` gets and returns the wrapped values
  - Network functions (functions of `AbstractChainNetwork` and `AbstractUtxoChainNetwork`) should still return **the actual values**
- Change `getBoxInfo` and `getCoveringBoxes` functions to protected

## 7.0.2

### Patch Changes

- Update rosen-extractor and minimum-fee packages

## 7.0.1

### Patch Changes

- Update rosen-extractor version

## 7.0.0

### Major Changes

- Update minimum-fee to v1 and remove feeRatioDivisor from constructor

## 6.0.0

### Major Changes

- Add generateMultipleTransactions to AbstractChain and implement generateTransaction
- Implement verifyEvent and add verifyLockTransactionExtraConditions to be implemented in child classes

### Minor Changes

- Introduced new error types for EvmChain

### Patch Changes

- Allow undefined extractor
- Update rosen-extractor version

## 5.0.0

### Major Changes

- Change verifyTransactionExtraConditions to abstract
- Implement getRWTToken
- Implement getTxConfirmationStatus
- Change verifyTransactionFee to async

### Patch Changes

- Update dependencies versions

## 4.0.0

### Major Changes

- Update event trigger type according to latest version of contracts
