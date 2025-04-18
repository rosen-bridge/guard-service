# Guard-Service

### Table of Contents

- [Description](#description)
- [Components](#components)
- [How to Run the Guard-Service](#how-to-run-the-guard-service)
  - [Set configs](#set-configs)
  - [Run in development mode](#run-in-development-mode)
  - [Run in production mode](#run-in-production-mode)
  - [Run using docker](#run-using-docker)
- [Contributing](#contributing)
- [License](#license)
  <a name="headers"/>

## Description

A guard is a well-known party performing final actions in the system. Actually, a set of trusted guards are needed to transfer money between chains. The guard set is a group of well-known entities. Each guard individually verifies the events and performs the required action. However, all (or a quorum of) guards should agree on one event to make the final operation.

## Components

Guard-Service composed of these components:

- **Scanner** & **Extractor**: A blockchain scanner on Ergo chain and Rosen-Bridge watcher data extractor to extract commitment and event trigger data from scanned blocks
- **P2P**: A service for communication of guards
- **EventProcessor**: Process every event captures by extractor, verify and generate tx for it
- **TxAgreement**: Each guard process to agree on single transaction for an event trigger
- **TransactionProcessor**: Process every transaction generated by guards, signs and sends it and check it afterward for enough confirmation
- **MultiSig**: Multi Signature service which sign Ergo transactions
- **TSS**: Threshold Signature Scheme which sign Cardano transactions
- **BaseChain**: A service for generating and verifying payment transactions, implemented for Each chain
- **Reward**: A service for generating and verifying reward distribution transactions in Ergo chain

## How to Run the Guard-Service

This project is written in node-js using Esnext module and typeorm database. In order to run the project follow these steps.

### Set configs

Before starting project, there are multiple configs need to be set, which are:

- Cardano network configs
  - `koios.url`: API url to [Koios](https://api.koios.rest/) (care about testnet and mainnet)
  - `blockFrost.projectId`: projectId provided by [BlockFrost](https://blockfrost.io/)
  - `lockAddress`: address which bridge users lock their assets to in Cardano chain
- Ergo network configs
  - `explorer.url`: API url to Ergo Explorer
  - `node.url`: API url to Ergo Node (public nodes NOT recommended)
  - `bankAddress`: address to repo containing bridge assets in Cardano chain
  - `lockAddress`: address which bridge users lock their assets to in Ergo chain
- Reward distribution configs
  - `bridgeFeeRepoAddress`: address which will receive guards share from reward distribution transactions bridge fee
  - `networkFeeRepoAddress`: address which will receive guards share from reward distribution transactions network fee
  - `watchersSharePercent`: watcher share for reward value in distribution transactions
  - `watchersRSNSharePercent`: watcher share for RSN tokens in reward distribution transactions
- P2P configs
  - `address`: relay address
- Guard configs
  - `guardId`: index of guard
  - `secret`: guard secret key
  - `guardsLen`: number of guards
  - `guards`: list of other guards info which contains:
    - `guardId`: index of that guard
    - `guardPubKey`: public key of thet guard

### Run in development mode

```shell
npm install
npm run start:dev
```

### Run in production mode

```shell
npm install
npm run start
```

### Run using docker

> **Note**
> First of all create `.env` file based on `./docker/.env.template` file in the root of the project and fill in its values then run the below commands:

```shell
mkdir -p logs/guard-logs logs/tss-api-logs
chown -R 8080:8080 logs
docker pull ghcr.io/rosen-bridge/guard-service
docker-compose up
```
