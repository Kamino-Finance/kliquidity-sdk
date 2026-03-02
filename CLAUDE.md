1. Use `yarn`
2. When new gotchas or things that took a lot of stpes figured out update learnings. Update learnings when stuck as well. 
3. Whatever you change test after that

# Learnings
- Codegen now uses codama (`@codama/renderers-js`). Run `yarn codegen` to regenerate from IDLs in `src/idl/`.
- Codegen script is `scripts/codegen.js` (plain CJS, not TS — tsx had ESM/CJS issues with codama).
- `renderVisitor()` is async — MUST `await codama.accept(renderVisitor(...))`.
- Codama generates code for `@solana/kit` 6.x but we use 2.x. Local shim at `src/@codegen/_shims/programClientCore.ts` bridges the gap.
- Post-processing in codegen.js: replaces `@solana/program-client-core` imports, fixes error codes, injects program addresses, simplifies programs/ dir.
- Codama API patterns: `fetchMaybeXxx(rpc, addr)` returns `MaybeAccount<T>`, use `unwrapAccount()` from `src/utils/codamaHelpers.ts` to get `T | null`.
- Instructions: `getXxxInstruction({...args, ...accounts}, { programAddress })` — single combined input object.
- Enums are TS numeric enums: `RebalanceType.Manual` instead of `new Manual()` or `Manual.discriminator`.
- Program addresses: `YVAULTS_PROGRAM_ADDRESS`, `WHIRLPOOL_PROGRAM_ADDRESS`, `AMM_V3_PROGRAM_ADDRESS`, `LB_CLMM_PROGRAM_ADDRESS` from `programs/` dirs.
- Account sizes: use `getXxxEncoder().fixedSize` instead of old `Xxx.layout.span + 8` (encoder includes discriminator).
- Raydium SDK still uses BN.js. Use `toBN`/`fromBN` from `src/utils/raydiumBridge.ts` at Raydium boundaries.
- BN→bigint migration patterns: `.toNumber()` → `Number()`, `new BN(x)` → `BigInt(x)`, `.isZero()` → `=== 0n`, `.eq(new BN(0))` → `=== 0n`, `.add(x)` → `+ x`, `.mul(x)` → `* x`
- Running test validator needs: `solana-keygen new`, `--gossip-port 18000` if port 8000 is in use (SurrealDB)

