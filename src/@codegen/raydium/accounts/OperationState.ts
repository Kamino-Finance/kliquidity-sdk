/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  address,
  Address,
  fetchEncodedAccount,
  fetchEncodedAccounts,
  GetAccountInfoApi,
  GetMultipleAccountsApi,
  Rpc,
} from "@solana/kit"
/* eslint-enable @typescript-eslint/no-unused-vars */
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface OperationStateFields {
  bump: number
  operationOwners: Array<Address>
  whitelistMints: Array<Address>
}

export interface OperationStateJSON {
  bump: number
  operationOwners: Array<string>
  whitelistMints: Array<string>
}

export class OperationState {
  readonly bump: number
  readonly operationOwners: Array<Address>
  readonly whitelistMints: Array<Address>

  static readonly discriminator = Buffer.from([
    19, 236, 58, 237, 81, 222, 183, 252,
  ])

  static readonly layout = borsh.struct<OperationState>([
    borsh.u8("bump"),
    borsh.array(borshAddress(), 10, "operationOwners"),
    borsh.array(borshAddress(), 100, "whitelistMints"),
  ])

  constructor(fields: OperationStateFields) {
    this.bump = fields.bump
    this.operationOwners = fields.operationOwners
    this.whitelistMints = fields.whitelistMints
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<OperationState | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `OperationStateFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<OperationState | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `OperationStateFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): OperationState {
    if (!data.slice(0, 8).equals(OperationState.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = OperationState.layout.decode(data.slice(8))

    return new OperationState({
      bump: dec.bump,
      operationOwners: dec.operationOwners,
      whitelistMints: dec.whitelistMints,
    })
  }

  toJSON(): OperationStateJSON {
    return {
      bump: this.bump,
      operationOwners: this.operationOwners,
      whitelistMints: this.whitelistMints,
    }
  }

  static fromJSON(obj: OperationStateJSON): OperationState {
    return new OperationState({
      bump: obj.bump,
      operationOwners: obj.operationOwners.map((item) => address(item)),
      whitelistMints: obj.whitelistMints.map((item) => address(item)),
    })
  }
}
