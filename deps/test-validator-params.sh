#!/bin/bash

function print_args {
  # kliquidity
  echo "--account GKnHiWh3RRrE1zsNzWxRkomymHc374TvJPSTv2wPeYdB deps/kliquidity/global-config.json"
  # mainnet version may be out-of-sync with the localnet .so, but to dump the mainnet idl run: `solana account -u m -o "./deps/kliquidity/idl.json" --output json "7CCg9Pt2QofuDhuMRegeQAmB6CGGozx8E3x8mbZ18m3H"` and update the owner in the json to "E6qbhrt4pFmCotNUSSEh6E5cRQCEJpMcd79Z56EG9KY"
  echo "--account Fh5hZtAxz2iRXhJEkiEEmXDwg9WsytFNsv36UkAbp47n deps/kliquidity/idl.json" # Add IDL to improve solana explorer ux - use the latest idl to match the dumped program

  # pyth
  echo "--account Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD deps/pyth/Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD.json"

  # programs
  echo "--bpf-program E6qbhrt4pFmCotNUSSEh6E5cRQCEJpMcd79Z56EG9KY ./deps/kliquidity/kliquidity.so"
  echo "--bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s ./deps/metaplex/metaplex.so"
  echo "--bpf-program devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH ./deps/raydium/raydium.so"
  echo "--bpf-program HFn8GnPADiny6XqUoWE8uRPPxb29ikn4yTuPa9MF2fWJ ./deps/scope/scope.so"
  echo "--bpf-program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc ./deps/whirlpools/whirlpools.so"

  # scope
  echo "--clone 3NJYftD5sjVfxSnUdZ1wVML8f3aC6mp1CXCL6L7TnU8C" # oracle prices
  echo "--clone GMprgtqUv2G74GAFHhHhrH21n1cnnNZcPb6TAz5GhqU" # token metadatas

  # options
  echo "--reset --quiet -u m"
}

print_args
