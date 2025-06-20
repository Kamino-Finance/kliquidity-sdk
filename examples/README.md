# Kliquidity SDK Typescript Examples

## Table of Contents

- [How to run](#how-to-run)
  - [Setup](#setup)
- [Examples](#examples)
  - [Deposit and stake](#deposit-and-stake)

## How to run

Make sure to define the `RPC_ENDPOINT` environment variable with your RPC URL. If you want to also send transactions using our transaction sending mechanism you need to define an `WS_ENDPOINT` environment variable with your WS URL.

### Setup

```bash
cd kliquidity-sdk/examples
yarn install
export RPC_ENDPOINT=YOUR_RPC_URL_HERE
export WS_ENDPOINT=YOUR_WS_ENDPOINT_HERE
```

## Examples

### Deposit and stake

Deposit in strategy and stake shares in strategy's farm

Example tx: <https://explorer.solana.com/tx/4cbd7Xzka1TnSBkxgH5Ex1ZsqGM4sNj2r1T9HzBHnsUj5a3kohKsK9tRsQKmvfVbrFD45Sh6WEz39ZM1gMEHLNVi>

```bash
yarn deposit-and-stake
```
