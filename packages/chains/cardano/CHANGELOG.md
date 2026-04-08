# @rosen-chains/cardano

## 16.0.0

### Major Changes

- Add `isTransactionInSign` function, which checks if the corresponding signer service is signing the transaction or not
- Replace `signFunction` argument with `signMediator`, an object with the type of `EddsaSignMediator`

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@4.0.0
  - @rosen-bridge/cardano-utxo-selection@3.0.3
  - @rosen-bridge/rosen-extractor@11.3.0
  - @rosen-bridge/tokens@6.0.0
  - @rosen-chains/abstract-chain@16.0.0

## 15.0.1

### Patch Changes

- Remove dependency bech32
- Update dependencies
  - @rosen-chains/abstract-chain@15.0.2

## 15.0.0

### Major Changes

- Change the type of `metadata` field in `CardanoTx` interface to combination of parsed JSON and raw CBOR

### Patch Changes

- Update dependencies
  - @rosen-bridge/rosen-extractor@11.0.0
  - @rosen-chains/abstract-chain@15.0.1

## 14.0.0

### Major Changes

- Update node version to 22.18

### Patch Changes

- Follow no-explicit-any eslint rule
- Improve `NotEnoughValidBoxesError` to display uncovered assets instead of required assets
- Sort imports
- Update dependencies
  - @rosen-bridge/abstract-logger@3.0.1
  - @rosen-bridge/cardano-utxo-selection@3.0.1
  - @rosen-bridge/json-bigint@1.1.0
  - @rosen-bridge/rosen-extractor@10.1.1
  - @rosen-bridge/tokens@4.0.1
  - @rosen-chains/abstract-chain@15.0.0

## 13.0.1

### Patch Changes

- Update box-selection packages
- Update Rosen utility packages
- Update dependencies
  - @rosen-chains/abstract-chain@14.0.1

## 13.0.0

### Major Changes

- Remove `value` and `assets` fields from `CardanoTx.inputs` type
- Rename `policy_id` to **`policyId`** and `asset_name` to **`assetName`** in `CardanoAsset` interface (which affects `CardanoUtxo`, `CardanoBoxCandidate` and `CardanoTx` interfaces)

### Minor Changes

- Integrate new Rosen box selection packages
- Add getActualTxId method to chains

### Patch Changes

- Update `@rosen-bridge/rosen-extractor`, `@rosen-bridge/tokens` and `@rosen-bridge/minimum-fee` packages to their latest version
- Fix bug in calculating tx ID
- Update box-selection packages
- Update dependencies
  - @rosen-chains/abstract-chain@14.0.0

## 12.0.1

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@13.1.0

## 12.0.0

### Major Changes

- Update tokens package to v3 and rosen-extractor to 7.2.1

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@13.0.0

## 11.0.0

### Major Changes

- Update CSL to version 13, which results in generating transactions with the new structure and different id
- Update rosen-extractor and token packages

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@12.0.0

## 10.1.4

### Patch Changes

- Fix order of the inputUtxos in CardanoTransaction object in generateMultipleTransactions function

## 10.1.3

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@11.0.3

## 10.1.2

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.2

## 10.1.1

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@11.0.1

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

- Add NATIVE_TOKEN_ID variable to CardanoChain
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

### Patch Changes

- Update rosen-extractor version
- Update dependencies
  - @rosen-chains/abstract-chain@6.0.0

## 5.0.0

### Major Changes

- Change verifyTransactionFee to async

### Patch Changes

- Fix verifyTransactionExtraConditions function name
- Update dependencies
  - @rosen-chains/abstract-chain@5.0.0

## 4.0.0

### Major Changes

- Update dependencies
  - @rosen-chains/abstract-chain@4.0.0
