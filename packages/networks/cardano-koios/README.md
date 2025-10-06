# @rosen-chains/cardano-koio-network

## Table of contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)

## Introduction

`@rosen-chains/cardano-koios-network` is a package to be used as network api
provider for `@rosen-chains/cardano` package.

## Installation

npm:

```sh
npm i @rosen-chains/cardano-koios-network
```

yarn:

```sh
yarn add @rosen-chains/cardano-koios-network
```

## Usage

```ts
import { CardanoChain } from '@rosen-chains/cardano';
import CardanoKoiosNetwork from '@rosen-chains/cardano-koios-network';

let tokens: RosenTokens;
const cardanoKoiosNetwork = new CardanoKoiosNetwork(
  'https://api.koios.rest/api/v0', // koios api url
  'lockAddress', // bridge lock address in Cardano (used in CardanoRosenExtractor)
  tokens, // bridge supported tokens config, provided by `rosen-bridge/contract`
  loggerFactory('KoiosNetwork'), // logger (optional)
);

const height = await cardanoKoiosNetwork.getHeight();
```
