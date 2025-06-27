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

export interface LockConfigFields {
  position: Address
  positionOwner: Address
  whirlpool: Address
  lockedTimestamp: BN
  lockType: types.LockTypeLabelKind
}

export interface LockConfigJSON {
  position: string
  positionOwner: string
  whirlpool: string
  lockedTimestamp: string
  lockType: types.LockTypeLabelJSON
}

export class LockConfig {
  readonly position: Address
  readonly positionOwner: Address
  readonly whirlpool: Address
  readonly lockedTimestamp: BN
  readonly lockType: types.LockTypeLabelKind

  static readonly discriminator = Buffer.from([
    106, 47, 238, 159, 124, 12, 160, 192,
  ])

  static readonly layout = borsh.struct<LockConfig>([
    borshAddress("position"),
    borshAddress("positionOwner"),
    borshAddress("whirlpool"),
    borsh.u64("lockedTimestamp"),
    types.LockTypeLabel.layout("lockType"),
  ])

  constructor(fields: LockConfigFields) {
    this.position = fields.position
    this.positionOwner = fields.positionOwner
    this.whirlpool = fields.whirlpool
    this.lockedTimestamp = fields.lockedTimestamp
    this.lockType = fields.lockType
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<LockConfig | null> {
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
  ): Promise<Array<LockConfig | null>> {
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

  static decode(data: Buffer): LockConfig {
    if (!data.slice(0, 8).equals(LockConfig.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = LockConfig.layout.decode(data.slice(8))

    return new LockConfig({
      position: dec.position,
      positionOwner: dec.positionOwner,
      whirlpool: dec.whirlpool,
      lockedTimestamp: dec.lockedTimestamp,
      lockType: types.LockTypeLabel.fromDecoded(dec.lockType),
    })
  }

  toJSON(): LockConfigJSON {
    return {
      position: this.position,
      positionOwner: this.positionOwner,
      whirlpool: this.whirlpool,
      lockedTimestamp: this.lockedTimestamp.toString(),
      lockType: this.lockType.toJSON(),
    }
  }

  static fromJSON(obj: LockConfigJSON): LockConfig {
    return new LockConfig({
      position: address(obj.position),
      positionOwner: address(obj.positionOwner),
      whirlpool: address(obj.whirlpool),
      lockedTimestamp: new BN(obj.lockedTimestamp),
      lockType: types.LockTypeLabel.fromJSON(obj.lockType),
    })
  }
}
