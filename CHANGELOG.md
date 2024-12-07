# guard-service

## 5.0.5

### Patch Changes

- Patch JS floating error in BitcoinRpcRosenExtractor

## 5.0.4

### Patch Changes

- Fix termination bug in APIs
- Add creation height validation to ErgoChain

## 5.0.3

### Patch Changes

- Fix commitment verification

## 5.0.2

### Patch Changes

- Validate not merged commitments before create reward transaction

## 5.0.1

### Patch Changes

- change default maxAllowedErrorCount to 35
- fix RPC auth token and ETH decimals in asset health-check
- fix health-check notification repeat
- fix reading event ID in tx-progress health-check parameter
- fix logger
- fix emission token name and decimals in revenue API
- fix health-check error handling

## 5.0.0

### Major Changes

- integrate ethereum
- change paymentTxId format in R4 from hex string to string
- support contract and tokensMap version and update info controller for version configs
- consider decimals drop

### Minor Changes

- update health-check APIs regarding to latest changes
- consider reason of invalidation while marking txs as invalid
- limit number of try for events based on their unexpected failures
- add notification to health-check
- add warn level to logger health parameter and tune the thresholds
- add tx progress health-check parameter
- refactor cold storage tx verification and its insertion handler to support parallel cold storage txs

### Patch Changes

- update notification handler
- send notification whenever a transaction becomes invalid
- change ergo scanner sync health-check thresholds
- add guard current version to logs
- update dependencies
- add TSS parallel sign limit to config
- change default requeue waiting events interval to 6 hours
- catch scanner errors to avoid crash
- fix bug in TransactionProcessor while recognizing a potential signed tx as unsigned
- skip tx reinsertion for invalid txs
- change default tx processor interval to 1 minute
- fix unhandled promise in TransactionVerifier

## 4.1.2

### Patch Changes

- patch koios client

## 4.1.1

### Patch Changes

- fix handling invalid cold storage tx as active ones

## 4.1.0

### Minor Changes

- refactor cold storage config structure and verification process

## 4.0.0

### Major Changes

- configurable emission token

### Patch Changes

- remove keygen scenario from guard-service
- read cold address from contract files

## 3.0.1

### Patch Changes

- patch release version

## 3.0.0

### Major Changes

- integrate bitcoin
- update tss to latest version and add ecdsa signer
- update minimum-fee to v1

### Minor Changes

- register bitcoin health check parameters
- register bitcoin scanner and extractors
- change payment box index in ErgoTransactions
- revamp tss key configs

### Patch Changes

- update dependencies
- improve rewardTxId and paymentTxId columns in events history API
- update scanner and watcher-data-extractor
- update health-check and network packages
- update typeorm to latest

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
