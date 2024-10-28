# @rosen-chains/evm

## 4.2.0

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
