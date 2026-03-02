/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface InitPermissionPairIxFields {
  activeId: number
  binStep: number
  baseFactor: number
  minBinId: number
  maxBinId: number
  lockDurationInSlot: bigint
}

export interface InitPermissionPairIxJSON {
  activeId: number
  binStep: number
  baseFactor: number
  minBinId: number
  maxBinId: number
  lockDurationInSlot: string
}

export class InitPermissionPairIx {
  readonly activeId: number
  readonly binStep: number
  readonly baseFactor: number
  readonly minBinId: number
  readonly maxBinId: number
  readonly lockDurationInSlot: bigint

  constructor(fields: InitPermissionPairIxFields) {
    this.activeId = fields.activeId
    this.binStep = fields.binStep
    this.baseFactor = fields.baseFactor
    this.minBinId = fields.minBinId
    this.maxBinId = fields.maxBinId
    this.lockDurationInSlot = fields.lockDurationInSlot
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.i32("activeId"),
        borsh.u16("binStep"),
        borsh.u16("baseFactor"),
        borsh.i32("minBinId"),
        borsh.i32("maxBinId"),
        borsh.u64("lockDurationInSlot"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new InitPermissionPairIx({
      activeId: obj.activeId,
      binStep: obj.binStep,
      baseFactor: obj.baseFactor,
      minBinId: obj.minBinId,
      maxBinId: obj.maxBinId,
      lockDurationInSlot: obj.lockDurationInSlot,
    })
  }

  static toEncodable(fields: InitPermissionPairIxFields) {
    return {
      activeId: fields.activeId,
      binStep: fields.binStep,
      baseFactor: fields.baseFactor,
      minBinId: fields.minBinId,
      maxBinId: fields.maxBinId,
      lockDurationInSlot: fields.lockDurationInSlot,
    }
  }

  toJSON(): InitPermissionPairIxJSON {
    return {
      activeId: this.activeId,
      binStep: this.binStep,
      baseFactor: this.baseFactor,
      minBinId: this.minBinId,
      maxBinId: this.maxBinId,
      lockDurationInSlot: this.lockDurationInSlot.toString(),
    }
  }

  static fromJSON(obj: InitPermissionPairIxJSON): InitPermissionPairIx {
    return new InitPermissionPairIx({
      activeId: obj.activeId,
      binStep: obj.binStep,
      baseFactor: obj.baseFactor,
      minBinId: obj.minBinId,
      maxBinId: obj.maxBinId,
      lockDurationInSlot: BigInt(obj.lockDurationInSlot),
    })
  }

  toEncodable() {
    return InitPermissionPairIx.toEncodable(this)
  }
}
