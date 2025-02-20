# @rosen-chains/bitcoin

## 7.0.0

### Major Changes

- Update rosen-extractor and token packages

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@12.0.0

## 6.1.3

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@11.0.3

## 6.1.2

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.2

## 6.1.1

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@11.0.1

## 6.1.0

### Minor Changes

- Add signingStatus to verifyTransactionExtraConditions function arguments

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.0

## 6.0.0

### Major Changes

- Add arbitrary transaction type

### Minor Changes

- Add verifyPaymentTransaction function which checks data consistency within a PaymentTransaction Object

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@10.0.0

## 5.1.0

### Minor Changes

- Remove legacy and script address payment restrictions in BitcoinChain
- Set minimum satoshi to 546

## 5.0.2

### Patch Changes

- Improve logs
- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@9.0.2

## 5.0.1

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@9.0.1

## 5.0.0

### Major Changes

- Change `verifyLockTransactionExtraConditions` to async
- Add reason and expectation status to isTxValid result

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@9.0.0

## 4.0.0

### Major Changes

- Consider decimals drop
- Change `getBoxInfo` and `getCoveringBoxes` functions to protected

### Patch Changes

- Export bitcoin native token id var
- Add NATIVE_TOKEN_ID variable to BitcoinChain
- Update dependencies
  - @rosen-chains/abstract-chain@8.0.0

## 3.0.1

### Patch Changes

- Update rosen-extractor
- Update dependencies
  - @rosen-chains/abstract-chain@7.0.2

## 3.0.0

### Major Changes

- Update rosen-extractor (change fromAddress to first input box ID)

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@7.0.1

## 2.0.0

### Major Changes

- Update minimum-fee to v1 and remove feeRatioDivisor from constructor

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@7.0.0

## 1.0.0

### Major Changes

- Init rosen-extractor in chain and remove it from its network
- Add signatureRecovery to return data of required signFunction

### Minor Changes

- Change generateTransaction to generateMultipleTransaction due to its update in AbstractChain

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@6.0.0
