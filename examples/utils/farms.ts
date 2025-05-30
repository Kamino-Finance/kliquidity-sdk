import Decimal from 'decimal.js/decimal';
import { Address } from '@solana/kit';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Farms, FarmState, getUserStatePDA } from '@kamino-finance/farms-sdk';
import { toLegacyPublicKey } from '@kamino-finance/kliquidity-sdk';

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
