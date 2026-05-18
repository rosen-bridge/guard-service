# Rosen Bridge Guard Service

<p align="center">
  <img src="https://img.shields.io/github/actions/workflow/status/rosen-bridge/guard-service/ci-publish.yml?logo=github">
  <a href="https://github.com/rosen-bridge/guard-service/releases/latest"><img src="https://img.shields.io/github/v/release/rosen-bridge/guard-service"></a>
  <img src="https://img.shields.io/github/license/rosen-bridge/guard-service"></a>
  <img src="https://img.shields.io/github/last-commit/rosen-bridge/guard-service">
<p>

Guard Service is a core component of [Rosen Bridge](https://rosen.tech), responsible for validating approved events and executing cross-chain transactions through a multi-signature or threshold signing scheme.

It operates as part of the second layer in Rosen's architecture, where Guards independently verify events reported by Watchers and collectively sign transactions on target chains.

You can also read about Rosen Bridge [here](https://github.com/rosen-bridge).

## Contents

- [Overview](#overview)
- [Repository Structure](#repository-structure)
- [Core Responsibilities](#core-responsibilities)
- [Getting Started](#getting-started)
- [Contribution](#contribution)
- [License](#license)

## Overview

Rosen Bridge is an Ergo-centric cross-chain bridge enabling asset transfers between Ergo and other blockchains without requiring smart contracts on destination chains.

The system is composed of two main roles:

- **Watchers**: Monitor chains and report events
- **Guards**: Verify events and sign transactions

The Guard Service implements the logic for Guards, including:

- Event validation
- Consensus participation (M-of-N)
- Transaction construction and signing
- Broadcasting to target chains

> Guards act as the final authority: no transfer is executed unless a quorum verifies it.

## Repository Structure

This repository follows a modular monorepo structure:

```
guard-service/
├── packages/
│   ├── abstract-chain    → General logic and requirements for supporting blockchains
│   ├── chains/           → Chain-specific implementations for each supported blockchain
│   └── networks/         → Network API providers for each supported chain
└── services/
    └── guard-service     → Guard service implementation
```

## Core Responsibilities

The Guard Service is responsible for:

- Verifying approved events against source chains
- Preventing double-spends and duplicate executions
- Coordinating with other Guards to reach consensus
- Signing transactions using:
  - Multi-signature wallets, or
  - Threshold Signature Schemes (TSS)
- Broadcasting finalized transactions:
  - Payment to the user on the target chain
  - Distributing rewards between contributing watchers
- Tracking execution state and confirmations

## Getting Started

To set up and run the Guard Service, refer to [the Operation repository](https://github.com/rosen-bridge/operation/blob/dev/docs/guard/setup.md).

Framework requirement:

- ![node](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2Frosen-bridge%2Fguard-service%2Fraw%2Fdev%2Fpackage.json&query=%24.engines.node&label=node)
- ![npm](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2Frosen-bridge%2Fguard-service%2Fraw%2Fdev%2Fpackage.json&query=%24.engines.npm&label=npm)

## Contribution

To integrate a new chain or implement a new network provider for a supported chain, refer to [the Bridge Expansion Kit](https://github.com/rosen-bridge/rcs/tree/master/rcs-003).

## License

[MIT](./LICENSE) License © 2025 Rosen Bridge
