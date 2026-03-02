/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface EnableJSON {
  kind: "Enable"
}

export class Enable {
  static readonly discriminator = 0
  static readonly kind = "Enable"
  readonly discriminator = 0
  readonly kind = "Enable"

  toJSON(): EnableJSON {
    return {
      kind: "Enable",
    }
  }

  toEncodable() {
    return {
      Enable: {},
    }
  }
}

export interface DisableJSON {
  kind: "Disable"
}

export class Disable {
  static readonly discriminator = 1
  static readonly kind = "Disable"
  readonly discriminator = 1
  readonly kind = "Disable"

  toJSON(): DisableJSON {
    return {
      kind: "Disable",
    }
  }

  toEncodable() {
    return {
      Disable: {},
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromDecoded(obj: any): types.PoolStatusBitFlagKind {
  if (typeof obj !== "object") {
    throw new Error("Invalid enum object")
  }

  if ("Enable" in obj) {
    return new Enable()
  }
  if ("Disable" in obj) {
    return new Disable()
  }

  throw new Error("Invalid enum object")
}

export function fromJSON(
  obj: types.PoolStatusBitFlagJSON
): types.PoolStatusBitFlagKind {
  switch (obj.kind) {
    case "Enable": {
      return new Enable()
    }
    case "Disable": {
      return new Disable()
    }
  }
}

export function layout(property?: string) {
  const ret = borsh.rustEnum([
    borsh.struct([], "Enable"),
    borsh.struct([], "Disable"),
  ])
  if (property !== undefined) {
    return ret.replicate(property)
  }
  return ret
}
