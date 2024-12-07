# @rosen-chains/ergo

## 10.1.4

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@11.0.3

## 10.1.3

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.2

## 10.1.2

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@11.0.1

## 10.1.1

### Patch Changes

- Add creation height verification

## 10.1.0

### Minor Changes

- Add signingStatus to verifyTransactionExtraConditions function arguments

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.0

## 10.0.0

### Major Changes

- Add arbitrary transaction type

### Minor Changes

- Add verifyPaymentTransaction function which checks data consistency within a PaymentTransaction Object

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@10.0.0

## 9.0.2

### Patch Changes

- Improve logs
- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@9.0.2

## 9.0.1

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@9.0.1

## 9.0.0

### Major Changes

- Change `verifyLockTransactionExtraConditions` to async
- Add reason and expectation status to isTxValid result

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@9.0.0

## 8.0.0

### Major Changes

- Consider decimals drop
- Change `getBoxInfo` and `getCoveringBoxes` functions to protected

### Patch Changes

- Add NATIVE_TOKEN_ID variable to ErgoChain
- Update dependencies
  - @rosen-chains/abstract-chain@8.0.0

## 7.0.2

### Patch Changes

- Update rosen-extractor
- Update dependencies
  - @rosen-chains/abstract-chain@7.0.2

## 7.0.1

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@7.0.1

## 7.0.0

### Major Changes

- Update minimum-fee to v1 and remove feeRatioDivisor from constructor

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@7.0.0

## 6.0.0

### Major Changes

- Init rosen-extractor in chain and remove it from its network

### Minor Changes

- Change generateTransaction to generateMultipleTransaction due to its update in AbstractChain
- Update generators and verifiers to support multiple change box

### Patch Changes

- Updated rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@6.0.0

## 5.0.0

### Major Changes

- Change verifyTransactionFee to async

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@5.0.0

## 4.0.0

### Major Changes

- Change register type in generateTransaction function
- Update dependencies
  - @rosen-chains/abstract-chain@4.0.0
