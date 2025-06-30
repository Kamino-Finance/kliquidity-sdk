import { address, Address } from "@solana/kit" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"
import { borshAddress } from "../utils"

export interface PermanentJSON {
  kind: "Permanent"
}

export class Permanent {
  static readonly discriminator = 0
  static readonly kind = "Permanent"
  readonly discriminator = 0
  readonly kind = "Permanent"

  toJSON(): PermanentJSON {
    return {
      kind: "Permanent",
    }
  }

  toEncodable() {
    return {
      Permanent: {},
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromDecoded(obj: any): types.LockTypeLabelKind {
  if (typeof obj !== "object") {
    throw new Error("Invalid enum object")
  }

  if ("Permanent" in obj) {
    return new Permanent()
  }

  throw new Error("Invalid enum object")
}

export function fromJSON(
  obj: types.LockTypeLabelJSON
): types.LockTypeLabelKind {
  switch (obj.kind) {
    case "Permanent": {
      return new Permanent()
    }
  }
}

export function layout(property?: string) {
  const ret = borsh.rustEnum([borsh.struct([], "Permanent")])
  if (property !== undefined) {
    return ret.replicate(property)
  }
  return ret
}
