# @rosen-chains/cardano-koios-network

## 13.0.2

### Patch Changes

- Update dependencies
  - @rosen-bridge/abstract-logger@4.0.0
  - @rosen-chains/abstract-chain@16.0.0
  - @rosen-chains/cardano@16.0.0
  - @rosen-clients/cardano-koios@3.1.1

## 13.0.1

### Patch Changes

- Update dependencies
  - @rosen-chains/cardano@15.0.1
  - @rosen-chains/abstract-chain@15.0.2

## 13.0.0

### Major Changes

- Change the type of `metadata` field in `CardanoTx` interface to combination of parsed JSON and raw CBOR

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@15.0.1
  - @rosen-chains/cardano@15.0.0

## 12.0.0

### Major Changes

- Update node version to 22.18

### Patch Changes

- Follow no-explicit-any eslint rule
- Sort imports
- Update dependencies
  - @rosen-bridge/abstract-logger@3.0.1
  - @rosen-bridge/tokens@4.0.1
  - @rosen-chains/cardano@14.0.0
  - @rosen-chains/abstract-chain@15.0.0
  - @rosen-clients/cardano-koios@3.1.0

## 11.0.1

### Patch Changes

- Update Rosen utility packages
- Update dependencies
  - @rosen-chains/abstract-chain@14.0.1
  - @rosen-chains/cardano@13.0.1

## 11.0.0

### Major Changes

- Remove `value` and `assets` fields from `CardanoTx.inputs` type
- Rename `policy_id` to **`policyId`** and `asset_name` to **`assetName`** in `CardanoAsset` interface (which affects `CardanoUtxo`, `CardanoBoxCandidate` and `CardanoTx` interfaces)

### Minor Changes

- Add getActualTxId method to chains
- Replace `/tx_info` API calls with `/tx_cbor`

### Patch Changes

- Update dependencies
  - @rosen-chains/cardano@13.0.0
  - @rosen-chains/abstract-chain@14.0.0

## 10.0.11

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@13.1.0
  - @rosen-chains/cardano@12.0.1

## 10.0.10

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@13.0.0
  - @rosen-chains/cardano@12.0.0

## 10.0.9

### Patch Changes

- update CSL to version 13
- Update dependencies
  - @rosen-chains/cardano@11.0.0
  - @rosen-chains/abstract-chain@12.0.0

## 10.0.8

### Patch Changes

- Update dependencies
  - @rosen-chains/cardano@10.1.4

## 10.0.7

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.3
  - @rosen-chains/cardano@10.1.3

## 10.0.6

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.2
  - @rosen-chains/cardano@10.1.2

## 10.0.5

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.1
  - @rosen-chains/cardano@10.1.1

## 10.0.4

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@11.0.0
  - @rosen-chains/cardano@10.1.0

## 10.0.3

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@10.0.0
  - @rosen-chains/cardano@10.0.0

## 10.0.2

### Patch Changes

- Update dependencies
  - @rosen-chains/cardano@9.0.2
  - @rosen-chains/abstract-chain@9.0.2

## 10.0.1

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@9.0.1
  - @rosen-chains/cardano@9.0.1

## 10.0.0

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@9.0.0
  - @rosen-chains/cardano@9.0.0

## 9.0.0

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@8.0.0
  - @rosen-chains/cardano@8.0.0

## 8.0.2

### Patch Changes

- Fix client when authToken is empty

## 8.0.1

### Patch Changes

- Update client version

## 8.0.0

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@7.0.0
  - @rosen-chains/cardano@7.0.0

## 7.0.0

### Major Changes

- Remove rosen-extractor initialization

### Patch Changes

- Update dependencies
  - @rosen-chains/cardano@6.0.0
  - @rosen-chains/abstract-chain@6.0.0

## 6.0.0

### Patch Changes

- Update dependencies
  - @rosen-chains/abstract-chain@5.0.0
  - @rosen-chains/cardano@5.0.0

## 5.0.0

### Major Changes

- Update dependencies
  - @rosen-chains/abstract-chain@4.0.0
  - @rosen-chains/cardano@3.2.4
