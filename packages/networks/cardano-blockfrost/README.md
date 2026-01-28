# @rosen-chains/cardano-blockfrost-network

## Table of contents

- [Introduction](#introduction)
- [Installation](#installation)

## Introduction

`@rosen-chains/cardano-blockfrost-network` is a package to be used as network api provider for `@rosen-chains/cardano` package

## Installation

npm:

```sh
npm i @rosen-chains/cardano-blockfrost-network
```

yarn:

```sh
yarn add @rosen-chains/cardano-blockfrost-network
```

## Usage

```ts
import { CardanoChain } from '@rosen-chains/cardano';
import CardanoBlockFrostNetwork from '@rosen-chains/cardano-blockfrost-network';

let tokens: RosenTokens;
const cardanoBlockFrostNetwork = new CardanoBlockFrostNetwork(
  'PROJECT_ID', // blockFrost project id
  'lockAddress', // bridge lock address in Cardano (used in CardanoRosenExtractor)
  tokens, // bridge supported tokens config, provided by `rosen-bridge/contract`
  undefined, // backend url, uses main blockFrost backend if no url is passed
);

const height = await cardanoBlockFrostNetwork.getHeight();
```
