1. Use `yarn`
2. When new gotchas or things that took a lot of steps figured out update learnings. Update learnings when stuck as well. 
3. Whatever you change test after that

# Learnings
- Codegen now uses codama (`@codama/renderers-js` v1.7.0). Run `yarn codegen` to regenerate from IDLs in `src/idl/`.
- **IMPORTANT**: Use `@codama/renderers-js` v1.7.0 (NOT v2.0.x). v2.0.x targets `@solana/kit` 6.x and needs a shim; v1.7.0 generates a self-contained `shared/` module that works with our 2.x. Same public API.
- Codegen script is `scripts/codegen.js` (plain CJS, not TS — tsx had ESM/CJS issues with codama).
- `renderVisitor()` is async — MUST `await codama.accept(renderVisitor(...))`.
- v1.7.0 outputs directly into the target dir (no `src/generated` subdirectory like v2.0.x).
- Post-processing in codegen.js: fixes empty program addresses (Anchor v0 IDLs) and strips `process.env.NODE_ENV` production guards from error files so error messages are always available. Uses `@ast-grep/napi` for structural AST transforms.
- Codama API patterns: `fetchMaybeXxx(rpc, addr)` returns `MaybeAccount<T>`, use `unwrapAccount()` from `src/utils/codamaHelpers.ts` to get `T | null`.
- Instructions: `getXxxInstruction({...args, ...accounts}, { programAddress })` — single combined input object.
- Enums are TS numeric enums: `RebalanceType.Manual` instead of `new Manual()` or `Manual.discriminator`.
- Program addresses: `YVAULTS_PROGRAM_ADDRESS`, `WHIRLPOOL_PROGRAM_ADDRESS`, `AMM_V3_PROGRAM_ADDRESS`, `LB_CLMM_PROGRAM_ADDRESS` from `programs/` dirs.
- Account sizes: use `getXxxEncoder().fixedSize` instead of old `Xxx.layout.span + 8` (encoder includes discriminator).
- Raydium SDK still uses BN.js. Use `toBN`/`fromBN` from `src/utils/raydiumBridge.ts` at Raydium boundaries.
- BN→bigint migration patterns: `.toNumber()` → `Number()`, `new BN(x)` → `BigInt(x)`, `.isZero()` → `=== 0n`, `.eq(new BN(0))` → `=== 0n`, `.add(x)` → `+ x`, `.mul(x)` → `* x`
- Running test validator needs: `solana-keygen new`, `--gossip-port 18000` if port 8000 is in use (SurrealDB)
- `@ast-grep/napi` gotchas: `inside` rule doesn't traverse ancestors (only checks direct parent); `pattern: 'undefined'` doesn't match keyword literals in union types — use `regex: 'undefined'` instead; `has: { kind: 'literal_type' }` (without pattern) works fine.
- Codama `@codama/renderers-js` has NO option to disable production error message stripping — it's hardcoded in the `programErrors.njk` Nunjucks template. Must post-process the generated files.
- Programs dir now keeps full generated output (instruction parsing, account enums, types) — don't simplify it.

