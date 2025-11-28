# guard-service

## 8.0.2

### Patch Changes

- Adjust default thresholds for BTC asset health check
- Adjust default transaction confirmations
  - Bitcoin (6 to 2)
  - Binance (200 to 900)
  - Cardano (120 to 40)
  - Doge (40 to 20)
  - Ergo
    - 20 to 5 for event trigger transactions
    - 20 to 14 for other transactions
  - Ethereum (50, unchanged)
- Update dependencies
  - @rosen-bridge/communication@2.0.1
  - @rosen-bridge/detection@2.0.1
  - @rosen-bridge/encryption@1.0.1
  - @rosen-bridge/ergo-multi-sig@2.1.0
  - @rosen-bridge/tss@5.0.1

## 8.0.1

### Patch Changes

- Remove public ip access on rosenet for direct message
- Change Bitcoin Runes asset check label from `bitcoin` to `bitcoin-runes`
- Update dependencies
  - @rosen-chains/bitcoin-runes-rpc@2.0.3

## 8.0.0

### Major Changes

- Add filters and pagination query parameters to balance API
- Integrate Bitcoin Runes
- Integrate Rosenet into the guard-service
- Integrate `@rosen-bridge/ergo-multi-sig`
- Move balance section out of `/info` route into a separate `/balance` route
- Remove assets API
- Update node version to 22.18
- Use the actual transaction id of the payment transaction in reward distribution instead of unsigned id (this change affects events targeted to EVM chains and Doge)

### Minor Changes

- Add Balance Handler feature: A new module that periodically fetches assets from lock and cold addresses and stores them in the database
- Add `actualTxId` to event synchronization response
- Add RPS configuration for Doge Blockcypher and RPC networks
- Add `EventTriggerExtractor` initialization to config
- Remove redundant `networkType` from config of each chain (only name of contract files were using it which are always `mainnet`)
- Replace default logger with `CallbackLogger`
- Replace `axios` with `@rosen-clients/rate-limited-axios`

### Patch Changes

- Fix a bug in `DatabaseHandler` while inserting a new transaction where it should throw error if there is an advanced transaction for the event/order of the new transaction
- Fix bug where service should have stopped when database initialization or migrations are failed
- Fix `TxAgreement` memory clean up for Arbitrary Order transactions
- Remove `tokenId` from `/revenue` route query parameter (it had no effect as it was unused)
- Replace `@rosen-bridge/operation` with `@rosen-bridge/cli` in .github/workflows
- Sort imports
- Update winston patch
- Remove unused health-check parameter packages from dependencies
  - @rosen-bridge/log-level-check
  - @rosen-bridge/p2p-network-check
- Remove redundant dependencies
  - @blockfrost/blockfrost-js
  - @emurgo/cardano-serialization-lib-nodejs
  - axios
  - big-integer
  - cross-env
  - discord.js
  - json-bigint
  - process
  - reflect-metadata
  - secp256k1
- Update dependencies
  - @rosen-bridge/abstract-notification@1.0.0
  - @rosen-bridge/abstract-scanner@0.2.2
  - @rosen-bridge/asset-check@6.0.0
  - @rosen-bridge/callback-logger@1.0.1
  - @rosen-bridge/communication@2.0.0
  - @rosen-bridge/detection@2.0.0
  - @rosen-bridge/dialer@0.2.1
  - @rosen-bridge/discord-notification@1.0.0
  - @rosen-bridge/encryption@1.0.0
  - @rosen-bridge/ergo-multi-sig@2.0.0
  - @rosen-bridge/ergo-scanner@0.1.3
  - @rosen-bridge/event-progress-check@2.0.0
  - @rosen-bridge/evm-address-tx-extractor@1.2.3
  - @rosen-bridge/evm-scanner@0.1.3
  - @rosen-bridge/extended-typeorm@1.0.1
  - @rosen-bridge/health-check@8.0.0
  - @rosen-bridge/minimum-fee@3.1.0
  - @rosen-bridge/node-sync-check@3.0.0
  - @rosen-bridge/rosenet-utils@0.4.1
  - @rosen-bridge/scanner-interfaces@0.2.1
  - @rosen-bridge/scanner-sync-check@8.1.0
  - @rosen-bridge/tokens@4.0.1
  - @rosen-bridge/tss@5.0.0
  - @rosen-bridge/tx-progress-check@3.0.0
  - @rosen-bridge/watcher-data-extractor@12.3.0
  - @rosen-bridge/winston-logger@2.0.1
  - @rosen-chains/abstract-chain@15.0.2
  - @rosen-chains/binance@3.0.2
  - @rosen-chains/bitcoin@9.0.2
  - @rosen-chains/bitcoin-esplora@5.0.2
  - @rosen-chains/bitcoin-runes@3.0.2
  - @rosen-chains/bitcoin-runes-rpc@2.0.2
  - @rosen-chains/cardano@15.0.1
  - @rosen-chains/cardano-blockfrost-network@10.0.1
  - @rosen-chains/cardano-koios-network@13.0.1
  - @rosen-chains/doge@3.0.2
  - @rosen-chains/doge-blockcypher@1.0.2
  - @rosen-chains/doge-esplora@2.0.2
  - @rosen-chains/doge-rpc@1.0.2
  - @rosen-chains/ergo@13.0.2
  - @rosen-chains/ergo-explorer-network@10.0.2
  - @rosen-chains/ergo-node-network@10.0.2
  - @rosen-chains/ethereum@3.0.2
  - @rosen-chains/evm@9.0.2
  - @rosen-chains/evm-rpc@4.0.3
  - @rosen-clients/rate-limited-axios@1.1.0

## 7.0.1

### Major Changes

- Update tokens package to v3
- Integrate Doge network
- Integrate new TSS package with new detection structure

### Patch Changes

- Add error handling to NotificationHandler
- Fix bug where arbitrary order is not arranged before inserting
- Reduce number of confirmation check for Doge transactions by randomness
- Fix cold storage tx verification failure when threshold is not defined for the native token
- Improve Cold Storage process to skip the chain when no threshold config is set for it
- Fix p2p restart after broken period
- (Docker only) Fix Doge lock address
- (_v7.0.0 to v7.0.1_) Remove Doge balance check

~~## 7.0.0~~

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
