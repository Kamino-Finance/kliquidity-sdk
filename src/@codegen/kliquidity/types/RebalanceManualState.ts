/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface RebalanceManualStateFields {}

export interface RebalanceManualStateJSON {}

export class RebalanceManualState {
  constructor(fields: RebalanceManualStateFields) {}

  static layout(property?: string) {
    return borsh.struct([], property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new RebalanceManualState({})
  }

  static toEncodable(fields: RebalanceManualStateFields) {
    return {}
  }

  toJSON(): RebalanceManualStateJSON {
    return {}
  }

  static fromJSON(obj: RebalanceManualStateJSON): RebalanceManualState {
    return new RebalanceManualState({})
  }

  toEncodable() {
    return RebalanceManualState.toEncodable(this)
  }
}
