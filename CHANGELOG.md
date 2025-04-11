# guard-service

## 6.0.2

### Patch Changes

- Support new tokens
  - PALM
  - SOCKZ

## 6.0.1

### Patch Changes

- Patch @rosen-bridge/evm-address-tx-extractor to improve speed

## 6.0.0

### Major Changes

- Integrate binance

### Minor Changes

- Add Event Reprocess feature: Allow requesting other guards through API to reprocess an event where its status is either 'timeout', 'rejected', 'payment-waiting' or 'reward-waiting'
- Add Event Synchronization feature: Communicate with other guards to get the payment transaction of an event and move it to reward distribution
- Add Arbitrary Order feature: Submit a request in guard to consensus on a transaction to satisfy it
- Migrate from node 18.17 to 20.11
- Add event progress health-check parameter

### Patch Changes

- Catch errors in NotificationHandler
- Schedule transaction and scanned-events jobs on start instead of running them
- Add transaction network validation in case of event transactions
- Use @rosen-bridge/extended-typeorm to prevent db transaction conflicts
- Fix event status on `/events` API when event is just scanned
- Fix p2p connection check to restart the guard
- Notable updates in rosen-chains packages:
  - Add verifyPaymentTransaction function which checks data consistency within a PaymentTransaction Object
  - Rethrow any unexpected errors while verifying events
  - Fix EVM gas estimation so that only required fields are sent to the RPC

## 5.0.8

### Patch Changes

- Add logger for GuardDetection instances

## 5.0.7

### Patch Changes

- Set default gasLimit 30M before gasEstimate due to an issue on rpc call gasEstimate with data field

## 5.0.6

### Patch Changes

- Support new tokens
  - AHT
  - BANA
  - Bober
  - COS
  - CYPX
  - EPOS
  - ErgOne
  - GIF
  - GluonW GAU
  - GluonW GAUC
  - MEW
  - MNT
  - NIKEPIG
  - Paideia
  - QUACKS
  - SUGAR
  - O
  - Troll
  - WALRUS
  - DIS
  - sOADA
  - OADA

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

- Change default maxAllowedErrorCount to 35
- Fix RPC auth token and ETH decimals in asset health-check
- Fix health-check notification repeat
- Fix reading event ID in tx-progress health-check parameter
- Fix logger
- Fix emission token name and decimals in revenue API
- Fix health-check error handling

## 5.0.0

### Major Changes

- Integrate ethereum
- Change paymentTxId format in R4 from hex string to string
- Support contract and tokensMap version and update info controller for version configs
- Consider decimals drop

### Minor Changes

- Update health-check APIs regarding to latest changes
- Consider reason of invalidation while marking txs as invalid
- Limit number of try for events based on their unexpected failures
- Add notification to health-check
- Add warn level to logger health parameter and tune the thresholds
- Add tx progress health-check parameter
- Refactor cold storage tx verification and its insertion handler to support parallel cold storage txs

### Patch Changes

- Update notification handler
- Send notification whenever a transaction becomes invalid
- Change ergo scanner sync health-check thresholds
- Add guard current version to logs
- Update dependencies
- Add TSS parallel sign limit to config
- Change default requeue waiting events interval to 6 hours
- Catch scanner errors to avoid crash
- Fix bug in TransactionProcessor while recognizing a potential signed tx as unsigned
- Skip tx reinsertion for invalid txs
- Change default tx processor interval to 1 minute
- Fix unhandled promise in TransactionVerifier

## 4.1.2

### Patch Changes

- Patch koios client

## 4.1.1

### Patch Changes

- Fix handling invalid cold storage tx as active ones

## 4.1.0

### Minor Changes

- Refactor cold storage config structure and verification process

## 4.0.0

### Major Changes

- Configurable emission token

### Patch Changes

- Remove keygen scenario from guard-service
- Read cold address from contract files

## 3.0.1

### Patch Changes

- Patch release version

## 3.0.0

### Major Changes

- Integrate bitcoin
- Update tss to latest version and add ecdsa signer
- Update minimum-fee to v1

### Minor Changes

- Register bitcoin health check parameters
- Register bitcoin scanner and extractors
- Change payment box index in ErgoTransactions
- Revamp tss key configs

### Patch Changes

- Update dependencies
- Improve rewardTxId and paymentTxId columns in events history API
- Update scanner and watcher-data-extractor
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
- Add trust key to Tss

### Patch Changes

- Add salt to the apiKey to prevent precomputed hash attacks

## 2.0.0

### Major Changes

- Update guard according to contracts_V3 changes

### Patch Changes

- Add version to /info api
