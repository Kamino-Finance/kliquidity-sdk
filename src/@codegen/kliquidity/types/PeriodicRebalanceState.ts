/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface PeriodicRebalanceStateFields {
  lastRebalanceTimestamp: bigint
}

export interface PeriodicRebalanceStateJSON {
  lastRebalanceTimestamp: string
}

export class PeriodicRebalanceState {
  readonly lastRebalanceTimestamp: bigint

  constructor(fields: PeriodicRebalanceStateFields) {
    this.lastRebalanceTimestamp = fields.lastRebalanceTimestamp
  }

  static layout(property?: string) {
    return borsh.struct([borsh.u64("lastRebalanceTimestamp")], property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new PeriodicRebalanceState({
      lastRebalanceTimestamp: obj.lastRebalanceTimestamp,
    })
  }

  static toEncodable(fields: PeriodicRebalanceStateFields) {
    return {
      lastRebalanceTimestamp: fields.lastRebalanceTimestamp,
    }
  }

  toJSON(): PeriodicRebalanceStateJSON {
    return {
      lastRebalanceTimestamp: this.lastRebalanceTimestamp.toString(),
    }
  }

  static fromJSON(obj: PeriodicRebalanceStateJSON): PeriodicRebalanceState {
    return new PeriodicRebalanceState({
      lastRebalanceTimestamp: BigInt(obj.lastRebalanceTimestamp),
    })
  }

  toEncodable() {
    return PeriodicRebalanceState.toEncodable(this)
  }
}
