# @rosen-chains/ergo-node-network

## Table of contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)

## Introduction

`@rosen-chains/ergo-node-network` is a package to be used as network api
provider for `@rosen-chains/ergo` package.

## Installation

npm:

```sh
npm i @rosen-chains/ergo-node-network
```

yarn:

```sh
yarn add @rosen-chains/ergo-node-network
```

## Usage

```ts
import { ErgoChain } from '@rosen-chains/ergo';
import ErgoNodeNetwork from '@rosen-chains/ergo-node-network';

const ergoNodeNetwork = new ErgoNodeNetwork({
  nodeBaseUrl: 'SOME_NODE_URL',
  extractorOptions: {
    lockAddress: 'SOME_LOCK_ADDRESS',
    tokens: {
      // SOME_TOKENS_OBJECT
    },
  },
});
const ergoChainConfig = {
  // SOME_ERGO_CHAIN_CONFIG
};
const ergoChain = new ErgoChain(ergoNodeNetwork, ergoChainConfig);
```

Please note that the node should support `blockchain` apis, which can be checked
through `isExplorer` flag from `info` api.
