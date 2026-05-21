import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import {
  address,
  createDefaultRpcTransport,
  createRpc,
  createSolanaRpcApi,
  DEFAULT_RPC_CONFIG,
  Rpc,
  SolanaRpcApi,
} from '@solana/kit';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import Decimal from 'decimal.js';
import { RaydiumService } from '../src/services/RaydiumService';
import { fetchMaybePersonalPositionState, fetchMaybePoolState } from '../src/@codegen/raydium/accounts';
import { fetchMaybeWhirlpoolStrategy } from '../src/@codegen/kliquidity/accounts';
import { unwrapAccount } from '../src/utils/codamaHelpers';
import { AMM_V3_PROGRAM_ADDRESS } from '../src/@codegen/raydium/programs';
import { decodeRaydiumPersonalPosition } from '../src/utils/raydiumSdkCompat';

type Args = {
  env?: string;
  rpc?: string;
  pool?: string;
  position?: string;
  strategy?: string;
  raydiumProgram?: string;
  help?: string;
};

function loadEnv(path = '.env') {
  const envPath = resolve(process.cwd(), path);
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = rawValue.trim().replace(/^['"]|['"]$/g, '');
    process.env[key] ??= value;
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = 'true';
      continue;
    }

    const [keyWithPrefix, inlineValue] = arg.split('=', 2);
    if (!keyWithPrefix.startsWith('--')) {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }

    const key = keyWithPrefix.slice(2).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) as keyof Args;
    const value = inlineValue ?? argv[++i];
    if (!value) throw new Error(`Missing value for ${keyWithPrefix}`);
    args[key] = value;
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  yarn read:raydium --pool <POOL> [--position <POSITION>] [--strategy <STRATEGY>]

Environment:
  RPC_ENDPOINT, RPC_URL, SOLANA_RPC_URL, or MAINNET_RPC_URL in .env

Options:
  --env <path>              .env path, default .env
  --rpc <url>               RPC URL override
  --pool <address>          Raydium CLMM pool address
  --position <address>      Raydium personal position address
  --strategy <address>      Kamino strategy address; pool/position are inferred when omitted
  --raydium-program <addr>  Raydium program override, default ${AMM_V3_PROGRAM_ADDRESS}

The pool read also fetches Raydium API indexed stats for day/week/month volume.
`);
}

function createRpcClient(rpcUrl: string): Rpc<SolanaRpcApi> {
  const api = createSolanaRpcApi<SolanaRpcApi>({
    ...DEFAULT_RPC_CONFIG,
    defaultCommitment: 'confirmed',
  });
  return createRpc({ api, transport: createDefaultRpcTransport({ url: rpcUrl }) });
}

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (BN.isBN(value)) return value.toString();
  if (value instanceof Decimal) return value.toString();
  if (value instanceof PublicKey) return value.toBase58();
  if (Buffer.isBuffer(value)) return { type: 'Buffer', length: value.length, base64: value.toString('base64') };
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const maybePublicKey = value as { toBase58?: () => string };
    if (typeof maybePublicKey.toBase58 === 'function') return maybePublicKey.toBase58();

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => typeof item !== 'function')
        .map(([key, item]) => [key, serialize(item)])
    );
  }
  return value;
}

function printSection(title: string, value: unknown) {
  console.log(`\n## ${title}`);
  console.log(JSON.stringify(serialize(value), null, 2));
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function fetchAccountData(rpc: Rpc<SolanaRpcApi>, accountAddress: string) {
  const accountInfo = await rpc
    .getAccountInfo(address(accountAddress), { commitment: 'confirmed', encoding: 'base64' })
    .send();

  if (!accountInfo.value) return null;
  return Buffer.from(accountInfo.value.data[0], 'base64');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  loadEnv(args.env);

  const rpcUrl =
    args.rpc ??
    process.env.RPC_ENDPOINT ??
    process.env.RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    process.env.MAINNET_RPC_URL;
  if (!rpcUrl) {
    printHelp();
    throw new Error('Missing RPC URL. Set RPC_ENDPOINT in .env or pass --rpc <url>.');
  }

  const rpc = createRpcClient(rpcUrl);
  const raydiumProgramId = address(args.raydiumProgram ?? AMM_V3_PROGRAM_ADDRESS);
  const raydium = new RaydiumService(rpc, raydiumProgramId);

  let pool = args.pool;
  let position = args.position;

  if (args.strategy) {
    const strategyAddress = address(args.strategy);
    const strategy = unwrapAccount(await fetchMaybeWhirlpoolStrategy(rpc, strategyAddress));
    if (!strategy) throw new Error(`Strategy ${args.strategy} not found`);

    printSection('Kamino Strategy', {
      address: strategyAddress,
      pool: strategy.pool,
      position: strategy.position,
      tokenAMint: strategy.tokenAMint,
      tokenBMint: strategy.tokenBMint,
      tokenAMintDecimals: strategy.tokenAMintDecimals,
      tokenBMintDecimals: strategy.tokenBMintDecimals,
      strategyDex: strategy.strategyDex,
      raydiumPoolConfigOrBaseVaultAuthority: strategy.raydiumPoolConfigOrBaseVaultAuthority,
      raydiumProtocolPositionOrBaseVaultAuthority: strategy.raydiumProtocolPositionOrBaseVaultAuthority,
    });

    pool ??= strategy.pool.toString();
    position ??= strategy.position.toString();
  }

  if (position) {
    const positionAddress = address(position);
    try {
      const positionState = unwrapAccount(await fetchMaybePersonalPositionState(rpc, positionAddress));

      printSection(
        'Raydium Generated Position Reader',
        positionState
          ? {
              address: positionAddress,
              poolId: positionState.poolId,
              nftMint: positionState.nftMint,
              tickLowerIndex: positionState.tickLowerIndex,
              tickUpperIndex: positionState.tickUpperIndex,
              liquidity: positionState.liquidity,
              tokenFeesOwed0: positionState.tokenFeesOwed0,
              tokenFeesOwed1: positionState.tokenFeesOwed1,
            }
          : { address: positionAddress, found: false }
      );

      pool ??= positionState?.poolId.toString();
    } catch (error) {
      printSection('Raydium Generated Position Reader', {
        address: positionAddress,
        error: formatError(error),
      });
    }

    const positionData = await fetchAccountData(rpc, position);
    if (positionData) {
      const sdkPosition = decodeRaydiumPersonalPosition(positionData);
      printSection('Raydium SDK PersonalPositionLayout Reader', {
        address: positionAddress,
        poolId: sdkPosition.poolId,
        nftMint: sdkPosition.nftMint,
        tickLower: sdkPosition.tickLower,
        tickUpper: sdkPosition.tickUpper,
        liquidity: sdkPosition.liquidity,
        tokenFeesOwedA: sdkPosition.tokenFeesOwedA,
        tokenFeesOwedB: sdkPosition.tokenFeesOwedB,
      });

      pool ??= sdkPosition.poolId.toString();
    } else {
      printSection('Raydium SDK PersonalPositionLayout Reader', {
        address: positionAddress,
        found: false,
      });
    }
  }

  if (!pool) {
    printHelp();
    throw new Error('Pass --pool, --position, or --strategy so a Raydium pool can be resolved.');
  }

  const poolAddress = address(pool);
  try {
    const generatedPool = unwrapAccount(await fetchMaybePoolState(rpc, poolAddress));

    printSection(
      'Raydium Generated Pool Reader',
      generatedPool
        ? {
            address: poolAddress,
            ammConfig: generatedPool.ammConfig,
            tokenMint0: generatedPool.tokenMint0,
            tokenMint1: generatedPool.tokenMint1,
            tokenVault0: generatedPool.tokenVault0,
            tokenVault1: generatedPool.tokenVault1,
            mintDecimals0: generatedPool.mintDecimals0,
            mintDecimals1: generatedPool.mintDecimals1,
            tickSpacing: generatedPool.tickSpacing,
            tickCurrent: generatedPool.tickCurrent,
            sqrtPriceX64: generatedPool.sqrtPriceX64,
            liquidity: generatedPool.liquidity,
            rewardInfos: generatedPool.rewardInfos.map((reward) => ({
              tokenMint: reward.tokenMint,
              tokenVault: reward.tokenVault,
              rewardState: reward.rewardState,
              emissionsPerSecondX64: reward.emissionsPerSecondX64,
            })),
          }
        : { address: poolAddress, found: false }
    );
  } catch (error) {
    printSection('Raydium Generated Pool Reader', {
      address: poolAddress,
      error: formatError(error),
    });
  }

  const sdkPool = await raydium.getRpcClmmPoolInfo(poolAddress);
  printSection('Raydium SDK PoolInfoLayout Reader', {
    address: poolAddress,
    configId: sdkPool.configId,
    mintA: sdkPool.mintA,
    mintB: sdkPool.mintB,
    vaultA: sdkPool.vaultA,
    vaultB: sdkPool.vaultB,
    mintDecimalsA: sdkPool.mintDecimalsA,
    mintDecimalsB: sdkPool.mintDecimalsB,
    tickSpacing: sdkPool.tickSpacing,
    tickCurrent: sdkPool.tickCurrent,
    sqrtPriceX64: sdkPool.sqrtPriceX64,
    currentPrice: sdkPool.currentPrice,
    feeOn: sdkPool.feeOn,
    dynamicFeeInfo: sdkPool.dynamicFeeInfo,
  });

  const indexedPoolStats = await raydium.getRaydiumApiPoolInfo(poolAddress.toString());
  printSection(
    'Raydium API Indexed Pool Stats',
    indexedPoolStats
      ? {
          id: indexedPoolStats.id,
          tvl: indexedPoolStats.tvl,
          day: indexedPoolStats.day,
          week: indexedPoolStats.week,
          month: indexedPoolStats.month,
        }
      : { id: poolAddress, found: false }
  );

  const apiPool = await raydium.getPoolInfoFromRpc(poolAddress.toString(), indexedPoolStats);
  printSection('Raydium RPC-built ApiV3 Pool Info', {
    id: apiPool.id,
    programId: apiPool.programId,
    config: apiPool.config,
    price: apiPool.price,
    feeRate: apiPool.feeRate,
    feeOn: apiPool.feeOn,
    hasDynamicFee: apiPool.hasDynamicFee,
    mintA: apiPool.mintA,
    mintB: apiPool.mintB,
    mintAmountA: apiPool.mintAmountA,
    mintAmountB: apiPool.mintAmountB,
    day: apiPool.day,
    week: apiPool.week,
    month: apiPool.month,
  });

  printSection('Raydium Positions Count By Pool', {
    pool: poolAddress,
    positionsCount: await raydium.getPositionsCountByPool(poolAddress),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
