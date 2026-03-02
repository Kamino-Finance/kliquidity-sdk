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
import * as borsh from "../utils/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface ScopeChainAccountFields {
  chainArray: Array<Array<number>>
}

export interface ScopeChainAccountJSON {
  chainArray: Array<Array<number>>
}

export class ScopeChainAccount {
  readonly chainArray: Array<Array<number>>

  static readonly discriminator = new Uint8Array([
    180, 51, 138, 247, 240, 173, 119, 79,
  ])

  static readonly layout = borsh.struct<ScopeChainAccount>([
    borsh.array(borsh.array(borsh.u16(), 4), 512, "chainArray"),
  ])

  constructor(fields: ScopeChainAccountFields) {
    this.chainArray = fields.chainArray
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<ScopeChainAccount | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `ScopeChainAccountFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(new Uint8Array(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<ScopeChainAccount | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `ScopeChainAccountFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(new Uint8Array(info.data))
    })
  }

  static decode(data: Uint8Array): ScopeChainAccount {
    if (data.length < ScopeChainAccount.discriminator.length) {
      throw new Error("invalid account discriminator")
    }
    for (let i = 0; i < ScopeChainAccount.discriminator.length; i++) {
      if (data[i] !== ScopeChainAccount.discriminator[i]) {
        throw new Error("invalid account discriminator")
      }
    }

    const dec = ScopeChainAccount.layout.decode(
      data.subarray(ScopeChainAccount.discriminator.length)
    )

    return new ScopeChainAccount({
      chainArray: dec.chainArray,
    })
  }

  toJSON(): ScopeChainAccountJSON {
    return {
      chainArray: this.chainArray,
    }
  }

  static fromJSON(obj: ScopeChainAccountJSON): ScopeChainAccount {
    return new ScopeChainAccount({
      chainArray: obj.chainArray,
    })
  }
}
