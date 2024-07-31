#!/bin/bash

function dump {
  ## Programs
  ## dump latest idls to match the dumped program for the local explorer

  ### kliquidity (devnet) (not dumped)
  mkdir -p deps/kliquidity
  #solana program dump -u d "E6qbhrt4pFmCotNUSSEh6E5cRQCEJpMcd79Z56EG9KY" "deps/kliquidity/kliquidity.so"
  ### metaplex
  mkdir -p deps/metaplex
  solana program dump -u m "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s" "deps/metaplex/metaplex.so"
  ### raydium (devnet) (not dumped)
  mkdir -p deps/raydium
  #solana program dump -u m "devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH" "deps/raydium/raydium.so"
  ### scope
  mkdir -p deps/scope
  solana program dump -u m "HFn8GnPADiny6XqUoWE8uRPPxb29ikn4yTuPa9MF2fWJ" "deps/scope/scope.so"
  solana account -u m -o "./deps/scope/idl-mainnet.json" --output json "AWUuZ6o4ZJX2fDqjUqDaA1pfHenZ6XEbmuTamMgM911E"
  ### whirlpools
  mkdir -p deps/whirlpools
  solana program dump -u m "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc" "deps/whirlpools/whirlpools.so"
  solana account -u m -o "./deps/whirlpools/idl-mainnet.json" --output json "2KFqE4RWoPVbvodo8vbggCFeHPS8TDvgpwp79ALMrcyn"

}

dump
