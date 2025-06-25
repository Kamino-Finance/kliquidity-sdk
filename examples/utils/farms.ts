import Decimal from 'decimal.js/decimal';
import BN from 'bn.js';
import { Address } from '@solana/kit';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  Farms,
  FarmState,
  getUserStatePDA,
  lamportsToCollDecimal,
  scaleDownWads,
  UserState,
  WAD,
} from '@kamino-finance/farms-sdk';
import { toLegacyPublicKey, U64_MAX } from '@kamino-finance/kliquidity-sdk';

// Helper function to safely convert Decimal to BN for large numbers
function decimalToBN(decimal: Decimal): BN {
  // Convert to string without scientific notation
  const str = decimal.toFixed();
  return new BN(str);
}

// Helper function to safely multiply by WAD using BN
function multiplyByWadSafely(amount: Decimal): string {
  try {
    const amountBN = decimalToBN(amount);
    const wadBN = new BN(WAD.toString());
    const result = amountBN.mul(wadBN);

    // Additional safety check - ensure result doesn't exceed u64 max
    const U64_MAX_BN = new BN(U64_MAX); // 2^64 - 1
    if (result.gt(U64_MAX_BN)) {
      console.warn(`Warning: Result ${result.toString()} exceeds u64 max, clamping to u64 max`);
      return U64_MAX.toString();
    }

    return result.toString();
  } catch (error) {
    console.error('Error in multiplyByWadSafely:', error);
    throw new Error(`Failed to safely multiply ${amount.toString()} by WAD: ${error}`);
  }
}

// Helper function to check if a Decimal value is safe to multiply by WAD
export function isSafeForWadMultiplication(amount: Decimal): boolean {
  try {
    const amountBN = decimalToBN(amount);
    const wadBN = new BN(WAD.toString());
    const result = amountBN.mul(wadBN);
    const U64_MAX = new BN('18446744073709551615');
    return result.lte(U64_MAX);
  } catch {
    return false;
  }
}

export async function getFarmStakeIxs(
  connection: Connection,
  user: Address,
  lamportsToStake: Decimal,
  farmAddress: Address,
  fetchedFarmState?: FarmState
): Promise<TransactionInstruction[]> {
  const farmState = fetchedFarmState
    ? fetchedFarmState
    : await FarmState.fetch(connection, toLegacyPublicKey(farmAddress));
  if (!farmState) {
    throw new Error(`Farm state not found for ${farmAddress}`);
  }

  const farmClient = new Farms(connection);
  const scopePricesArg = farmState.scopePrices.equals(PublicKey.default)
    ? farmClient.getProgramID()
    : farmState!.scopePrices;

  const stakeIxs: TransactionInstruction[] = [];
  const userState = getUserStatePDA(farmClient.getProgramID(), toLegacyPublicKey(farmAddress), toLegacyPublicKey(user));
  const userStateExists = await connection.getAccountInfo(userState);
  if (!userStateExists) {
    const createUserIx = farmClient.createNewUserIx(toLegacyPublicKey(user), toLegacyPublicKey(farmAddress));
    stakeIxs.push(createUserIx);
  }

  // if lamportsToStake is U64::MAX the smart contract will stake everything
  const stakeIx = farmClient.stakeIx(
    toLegacyPublicKey(user),
    toLegacyPublicKey(farmAddress),
    lamportsToStake,
    farmState.token.mint,
    scopePricesArg
  );
  stakeIxs.push(stakeIx);

  return stakeIxs;
}

export async function getStakedTokens(
  connection: Connection,
  user: Address,
  farmAddress: Address,
  fetchedFarmState?: FarmState,
  fetchedUserState?: UserState
): Promise<Decimal> {
  const farmState = fetchedFarmState
    ? fetchedFarmState
    : await FarmState.fetch(connection, toLegacyPublicKey(farmAddress));
  if (!farmState) {
    throw new Error(`Farm state not found for ${farmAddress}`);
  }

  let userState = fetchedUserState;
  if (!userState) {
    const farmClient = new Farms(connection);

    const userStateAddress = getUserStatePDA(
      farmClient.getProgramID(),
      toLegacyPublicKey(farmAddress),
      toLegacyPublicKey(user)
    );
    const userStateFromChain = await UserState.fetch(connection, userStateAddress);
    if (!userStateFromChain) {
      return new Decimal(0);
    }
    userState = userStateFromChain;
  }

  return lamportsToCollDecimal(
    new Decimal(scaleDownWads(userState.activeStakeScaled)),
    farmState.token.decimals.toNumber()
  );
}

export async function getFarmUnstakeAndWithdrawIxs(
  connection: Connection,
  user: Address,
  farmAddress: Address,
  sharesToUnstake: Decimal,
  fetchedFarmState?: FarmState,
  fetchedUserState?: UserState
): Promise<TransactionInstruction[]> {
  const farmState = fetchedFarmState
    ? fetchedFarmState
    : await FarmState.fetch(connection, toLegacyPublicKey(farmAddress));
  if (!farmState) {
    throw new Error(`Farm state not found for ${farmAddress}`);
  }

  const farmClient = new Farms(connection);

  const userStateAddress = getUserStatePDA(
    farmClient.getProgramID(),
    toLegacyPublicKey(farmAddress),
    toLegacyPublicKey(user)
  );

  const userState = fetchedUserState ? fetchedUserState : await UserState.fetch(connection, userStateAddress);

  if (!userState) {
    return [];
  }

  // Use BN for safe large number arithmetic instead of Decimal
  const unstakeAmountString = multiplyByWadSafely(sharesToUnstake);

  const unstakeIx = farmClient.unstakeIx(
    toLegacyPublicKey(user),
    toLegacyPublicKey(farmAddress),
    unstakeAmountString,
    farmClient.getProgramID()
  );

  const ixs: TransactionInstruction[] = [unstakeIx];

  if (sharesToUnstake.gt(new Decimal(0))) {
    const withdrawIx = farmClient.withdrawUnstakedDepositIx(
      toLegacyPublicKey(user),
      userStateAddress,
      toLegacyPublicKey(farmAddress),
      farmState.token.mint
    );
    ixs.push(withdrawIx);
  }

  return ixs;
}
