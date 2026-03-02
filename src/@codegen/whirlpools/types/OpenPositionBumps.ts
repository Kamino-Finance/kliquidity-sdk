/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface OpenPositionBumpsFields {
  positionBump: number
}

export interface OpenPositionBumpsJSON {
  positionBump: number
}

export class OpenPositionBumps {
  readonly positionBump: number

  constructor(fields: OpenPositionBumpsFields) {
    this.positionBump = fields.positionBump
  }

  static layout(property?: string) {
    return borsh.struct([borsh.u8("positionBump")], property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new OpenPositionBumps({
      positionBump: obj.positionBump,
    })
  }

  static toEncodable(fields: OpenPositionBumpsFields) {
    return {
      positionBump: fields.positionBump,
    }
  }

  toJSON(): OpenPositionBumpsJSON {
    return {
      positionBump: this.positionBump,
    }
  }

  static fromJSON(obj: OpenPositionBumpsJSON): OpenPositionBumps {
    return new OpenPositionBumps({
      positionBump: obj.positionBump,
    })
  }

  toEncodable() {
    return OpenPositionBumps.toEncodable(this)
  }
}
