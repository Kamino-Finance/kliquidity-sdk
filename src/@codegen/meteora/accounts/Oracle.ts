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

export interface OracleFields {
  /** Index of latest observation slot */
  idx: bigint
  /** Size of active sample. Active sample is initialized observation. */
  activeSize: bigint
  /** Number of observations */
  length: bigint
}

export interface OracleJSON {
  /** Index of latest observation slot */
  idx: string
  /** Size of active sample. Active sample is initialized observation. */
  activeSize: string
  /** Number of observations */
  length: string
}

export class Oracle {
  /** Index of latest observation slot */
  readonly idx: bigint
  /** Size of active sample. Active sample is initialized observation. */
  readonly activeSize: bigint
  /** Number of observations */
  readonly length: bigint

  static readonly discriminator = new Uint8Array([
    139, 194, 131, 179, 140, 179, 229, 244,
  ])

  static readonly layout = borsh.struct<Oracle>([
    borsh.u64("idx"),
    borsh.u64("activeSize"),
    borsh.u64("length"),
  ])

  constructor(fields: OracleFields) {
    this.idx = fields.idx
    this.activeSize = fields.activeSize
    this.length = fields.length
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<Oracle | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `OracleFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(new Uint8Array(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<Oracle | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `OracleFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(new Uint8Array(info.data))
    })
  }

  static decode(data: Uint8Array): Oracle {
    if (data.length < Oracle.discriminator.length) {
      throw new Error("invalid account discriminator")
    }
    for (let i = 0; i < Oracle.discriminator.length; i++) {
      if (data[i] !== Oracle.discriminator[i]) {
        throw new Error("invalid account discriminator")
      }
    }

    const dec = Oracle.layout.decode(data.subarray(Oracle.discriminator.length))

    return new Oracle({
      idx: dec.idx,
      activeSize: dec.activeSize,
      length: dec.length,
    })
  }

  toJSON(): OracleJSON {
    return {
      idx: this.idx.toString(),
      activeSize: this.activeSize.toString(),
      length: this.length.toString(),
    }
  }

  static fromJSON(obj: OracleJSON): Oracle {
    return new Oracle({
      idx: BigInt(obj.idx),
      activeSize: BigInt(obj.activeSize),
      length: BigInt(obj.length),
    })
  }
}
