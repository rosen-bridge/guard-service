# guard-service

## 3.0.0

### Major Changes

- integrate bitcoin
- update tss to latest version and add ecdsa signer
- update minimum-fee to v1

### Minor Changes

- Upgrade health check package to latest
- Add and register BTC asset health check parameter.
- update rosen-chains packages to latest versions
- change payment box index in ErgoTransactions
- update scanner to scan bitcoin commitments and event triggers
- update minimum-fee (remove address requirement)
- revamp tss key configs

### Patch Changes

- update depndencies
- improve rewardTxId and paymentTxId columns in events history API
- Fix issue of not supporting Bitcoin native token in assets and general info APIs
- update scanner and watcher-data-extractor
- Update health-check and network packages
- Update typeorm to latest

## 2.1.1

### Patch Changes

- Fix a bug when `constructor` or `__proto__` exists system can not process transaction
- Update @fastify/swagger-ui to latest version

## 2.1.0

### Minor Changes

- Add Cors headers to all apis according to config
- Add rate limit to all apis
- add trust key to Tss

### Patch Changes

- add salt to the apiKey to prevent precomputed hash attacks

## 2.0.0

### Major Changes

- update guard according to contracts_V3 changes

### Patch Changes

- add version to /info api
