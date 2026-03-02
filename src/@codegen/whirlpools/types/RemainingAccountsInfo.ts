/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface RemainingAccountsInfoFields {
  slices: Array<types.RemainingAccountsSliceFields>
}

export interface RemainingAccountsInfoJSON {
  slices: Array<types.RemainingAccountsSliceJSON>
}

export class RemainingAccountsInfo {
  readonly slices: Array<types.RemainingAccountsSlice>

  constructor(fields: RemainingAccountsInfoFields) {
    this.slices = fields.slices.map(
      (item) => new types.RemainingAccountsSlice({ ...item })
    )
  }

  static layout(property?: string) {
    return borsh.struct(
      [borsh.vec(types.RemainingAccountsSlice.layout(), "slices")],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new RemainingAccountsInfo({
      slices: obj.slices.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.RemainingAccountsSlice.fromDecoded(item)
      ),
    })
  }

  static toEncodable(fields: RemainingAccountsInfoFields) {
    return {
      slices: fields.slices.map((item) =>
        types.RemainingAccountsSlice.toEncodable(item)
      ),
    }
  }

  toJSON(): RemainingAccountsInfoJSON {
    return {
      slices: this.slices.map((item) => item.toJSON()),
    }
  }

  static fromJSON(obj: RemainingAccountsInfoJSON): RemainingAccountsInfo {
    return new RemainingAccountsInfo({
      slices: obj.slices.map((item) =>
        types.RemainingAccountsSlice.fromJSON(item)
      ),
    })
  }

  toEncodable() {
    return RemainingAccountsInfo.toEncodable(this)
  }
}
