/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Address,
  isSome,
  IAccountMeta,
  IAccountSignerMeta,
  IInstruction,
  Option,
  TransactionSigner,
} from "@solana/kit"
/* eslint-enable @typescript-eslint/no-unused-vars */
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface TwoHopSwapV2Args {
  amount: BN
  otherAmountThreshold: BN
  amountSpecifiedIsInput: boolean
  aToBOne: boolean
  aToBTwo: boolean
  sqrtPriceLimitOne: BN
  sqrtPriceLimitTwo: BN
  remainingAccountsInfo: types.RemainingAccountsInfoFields | null
}

export interface TwoHopSwapV2Accounts {
  whirlpoolOne: Address
  whirlpoolTwo: Address
  tokenMintInput: Address
  tokenMintIntermediate: Address
  tokenMintOutput: Address
  tokenProgramInput: Address
  tokenProgramIntermediate: Address
  tokenProgramOutput: Address
  tokenOwnerAccountInput: Address
  tokenVaultOneInput: Address
  tokenVaultOneIntermediate: Address
  tokenVaultTwoIntermediate: Address
  tokenVaultTwoOutput: Address
  tokenOwnerAccountOutput: Address
  tokenAuthority: TransactionSigner
  tickArrayOne0: Address
  tickArrayOne1: Address
  tickArrayOne2: Address
  tickArrayTwo0: Address
  tickArrayTwo1: Address
  tickArrayTwo2: Address
  oracleOne: Address
  oracleTwo: Address
  memoProgram: Address
}

export const layout = borsh.struct([
  borsh.u64("amount"),
  borsh.u64("otherAmountThreshold"),
  borsh.bool("amountSpecifiedIsInput"),
  borsh.bool("aToBOne"),
  borsh.bool("aToBTwo"),
  borsh.u128("sqrtPriceLimitOne"),
  borsh.u128("sqrtPriceLimitTwo"),
  borsh.option(types.RemainingAccountsInfo.layout(), "remainingAccountsInfo"),
])

export function twoHopSwapV2(
  args: TwoHopSwapV2Args,
  accounts: TwoHopSwapV2Accounts,
  remainingAccounts: Array<IAccountMeta | IAccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.whirlpoolOne, role: 1 },
    { address: accounts.whirlpoolTwo, role: 1 },
    { address: accounts.tokenMintInput, role: 0 },
    { address: accounts.tokenMintIntermediate, role: 0 },
    { address: accounts.tokenMintOutput, role: 0 },
    { address: accounts.tokenProgramInput, role: 0 },
    { address: accounts.tokenProgramIntermediate, role: 0 },
    { address: accounts.tokenProgramOutput, role: 0 },
    { address: accounts.tokenOwnerAccountInput, role: 1 },
    { address: accounts.tokenVaultOneInput, role: 1 },
    { address: accounts.tokenVaultOneIntermediate, role: 1 },
    { address: accounts.tokenVaultTwoIntermediate, role: 1 },
    { address: accounts.tokenVaultTwoOutput, role: 1 },
    { address: accounts.tokenOwnerAccountOutput, role: 1 },
    {
      address: accounts.tokenAuthority.address,
      role: 2,
      signer: accounts.tokenAuthority,
    },
    { address: accounts.tickArrayOne0, role: 1 },
    { address: accounts.tickArrayOne1, role: 1 },
    { address: accounts.tickArrayOne2, role: 1 },
    { address: accounts.tickArrayTwo0, role: 1 },
    { address: accounts.tickArrayTwo1, role: 1 },
    { address: accounts.tickArrayTwo2, role: 1 },
    { address: accounts.oracleOne, role: 1 },
    { address: accounts.oracleTwo, role: 1 },
    { address: accounts.memoProgram, role: 0 },
    ...remainingAccounts,
  ]
  const identifier = Buffer.from([186, 143, 209, 29, 254, 2, 194, 117])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      amount: args.amount,
      otherAmountThreshold: args.otherAmountThreshold,
      amountSpecifiedIsInput: args.amountSpecifiedIsInput,
      aToBOne: args.aToBOne,
      aToBTwo: args.aToBTwo,
      sqrtPriceLimitOne: args.sqrtPriceLimitOne,
      sqrtPriceLimitTwo: args.sqrtPriceLimitTwo,
      remainingAccountsInfo:
        (args.remainingAccountsInfo &&
          types.RemainingAccountsInfo.toEncodable(
            args.remainingAccountsInfo
          )) ||
        null,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
