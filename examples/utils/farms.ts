import Decimal from 'decimal.js/decimal';
import BN from 'bn.js';
import { Address, IInstruction, none, Rpc, SolanaRpcApi, TransactionSigner } from '@solana/kit';
import {
  Farms,
  FarmState,
  getUserStatePDA,
  lamportsToCollDecimal,
  scaleDownWads,
  UserState,
  WAD,
} from '@kamino-finance/farms-sdk';

// Helper function to safely convert Decimal to BN for large numbers
function decimalToBN(decimal: Decimal): BN {
  // Convert to string without scientific notation
  const str = decimal.toFixed();
  return new BN(str);
}

// Helper function to safely multiply by WAD using BN
function multiplyByWad(amount: Decimal): string {
  try {
    const amountBN = decimalToBN(amount);
    const wadBN = new BN(WAD.toString());
    const result = amountBN.mul(wadBN);

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
  connection: Rpc<SolanaRpcApi>,
  user: TransactionSigner,
  lamportsToStake: Decimal,
  farmAddress: Address,
  fetchedFarmState?: FarmState
): Promise<IInstruction[]> {
  const farmState = fetchedFarmState ? fetchedFarmState : await FarmState.fetch(connection, farmAddress);
  if (!farmState) {
    throw new Error(`Farm state not found for ${farmAddress}`);
  }

  const farmClient = new Farms(connection);
  const stakeIxs: IInstruction[] = [];
  const userState = await getUserStatePDA(farmClient.getProgramID(), farmAddress, user.address);
  const userStateExists = await connection.getAccountInfo(userState).send();
  if (!userStateExists) {
    const createUserIx = await farmClient.createNewUserIx(user, farmAddress);
    stakeIxs.push(createUserIx);
  }

  // if lamportsToStake is U64::MAX the smart contract will stake everything
  const stakeIx = await farmClient.stakeIx(user, farmAddress, lamportsToStake, farmState.token.mint, none());
  stakeIxs.push(stakeIx);

  return stakeIxs;
}

export async function getStakedTokens(
  connection: Rpc<SolanaRpcApi>,
  user: Address,
  farmAddress: Address,
  fetchedFarmState?: FarmState,
  fetchedUserState?: UserState
): Promise<Decimal> {
  const farmState = fetchedFarmState ? fetchedFarmState : await FarmState.fetch(connection, farmAddress);
  if (!farmState) {
    throw new Error(`Farm state not found for ${farmAddress}`);
  }

  let userState = fetchedUserState;
  if (!userState) {
    const farmClient = new Farms(connection);

    const userStateAddress = await getUserStatePDA(farmClient.getProgramID(), farmAddress, user);
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
  connection: Rpc<SolanaRpcApi>,
  user: TransactionSigner,
  farmAddress: Address,
  sharesToUnstake: Decimal,
  fetchedFarmState?: FarmState,
  fetchedUserState?: UserState
): Promise<IInstruction[]> {
  const farmState = fetchedFarmState ? fetchedFarmState : await FarmState.fetch(connection, farmAddress);
  if (!farmState) {
    throw new Error(`Farm state not found for ${farmAddress}`);
  }

  const farmClient = new Farms(connection);

  const userStateAddress = await getUserStatePDA(farmClient.getProgramID(), farmAddress, user.address);

  const userState = fetchedUserState ? fetchedUserState : await UserState.fetch(connection, userStateAddress);

  if (!userState) {
    return [];
  }

  // Use BN for safe large number arithmetic instead of Decimal
  const unstakeAmountString = multiplyByWad(sharesToUnstake);

  const unstakeIx = await farmClient.unstakeIx(user, farmAddress, new Decimal(unstakeAmountString), none());
  const ixs: IInstruction[] = [unstakeIx];

  if (sharesToUnstake.gt(new Decimal(0))) {
    const withdrawIx = await farmClient.withdrawUnstakedDepositIx(
      user,
      userStateAddress,
      farmAddress,
      farmState.token.mint
    );
    ixs.push(withdrawIx);
  }

  return ixs;
}
