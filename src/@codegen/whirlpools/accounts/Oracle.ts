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

export interface OracleFields {
  whirlpool: Address
  tradeEnableTimestamp: BN
  adaptiveFeeConstants: types.AdaptiveFeeConstantsFields
  adaptiveFeeVariables: types.AdaptiveFeeVariablesFields
  reserved: Array<number>
}

export interface OracleJSON {
  whirlpool: string
  tradeEnableTimestamp: string
  adaptiveFeeConstants: types.AdaptiveFeeConstantsJSON
  adaptiveFeeVariables: types.AdaptiveFeeVariablesJSON
  reserved: Array<number>
}

export class Oracle {
  readonly whirlpool: Address
  readonly tradeEnableTimestamp: BN
  readonly adaptiveFeeConstants: types.AdaptiveFeeConstants
  readonly adaptiveFeeVariables: types.AdaptiveFeeVariables
  readonly reserved: Array<number>

  static readonly discriminator = Buffer.from([
    139, 194, 131, 179, 140, 179, 229, 244,
  ])

  static readonly layout = borsh.struct<Oracle>([
    borshAddress("whirlpool"),
    borsh.u64("tradeEnableTimestamp"),
    types.AdaptiveFeeConstants.layout("adaptiveFeeConstants"),
    types.AdaptiveFeeVariables.layout("adaptiveFeeVariables"),
    borsh.array(borsh.u8(), 128, "reserved"),
  ])

  constructor(fields: OracleFields) {
    this.whirlpool = fields.whirlpool
    this.tradeEnableTimestamp = fields.tradeEnableTimestamp
    this.adaptiveFeeConstants = new types.AdaptiveFeeConstants({
      ...fields.adaptiveFeeConstants,
    })
    this.adaptiveFeeVariables = new types.AdaptiveFeeVariables({
      ...fields.adaptiveFeeVariables,
    })
    this.reserved = fields.reserved
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
      throw new Error("account doesn't belong to this program")
    }

    return this.decode(Buffer.from(info.data))
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
        throw new Error("account doesn't belong to this program")
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): Oracle {
    if (!data.slice(0, 8).equals(Oracle.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = Oracle.layout.decode(data.slice(8))

    return new Oracle({
      whirlpool: dec.whirlpool,
      tradeEnableTimestamp: dec.tradeEnableTimestamp,
      adaptiveFeeConstants: types.AdaptiveFeeConstants.fromDecoded(
        dec.adaptiveFeeConstants
      ),
      adaptiveFeeVariables: types.AdaptiveFeeVariables.fromDecoded(
        dec.adaptiveFeeVariables
      ),
      reserved: dec.reserved,
    })
  }

  toJSON(): OracleJSON {
    return {
      whirlpool: this.whirlpool,
      tradeEnableTimestamp: this.tradeEnableTimestamp.toString(),
      adaptiveFeeConstants: this.adaptiveFeeConstants.toJSON(),
      adaptiveFeeVariables: this.adaptiveFeeVariables.toJSON(),
      reserved: this.reserved,
    }
  }

  static fromJSON(obj: OracleJSON): Oracle {
    return new Oracle({
      whirlpool: address(obj.whirlpool),
      tradeEnableTimestamp: new BN(obj.tradeEnableTimestamp),
      adaptiveFeeConstants: types.AdaptiveFeeConstants.fromJSON(
        obj.adaptiveFeeConstants
      ),
      adaptiveFeeVariables: types.AdaptiveFeeVariables.fromJSON(
        obj.adaptiveFeeVariables
      ),
      reserved: obj.reserved,
    })
  }
}
