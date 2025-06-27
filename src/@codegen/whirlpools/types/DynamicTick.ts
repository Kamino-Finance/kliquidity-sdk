import { address, Address } from "@solana/kit" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"
import { borshAddress } from "../utils"

export interface UninitializedJSON {
  kind: "Uninitialized"
}

export class Uninitialized {
  static readonly discriminator = 0
  static readonly kind = "Uninitialized"
  readonly discriminator = 0
  readonly kind = "Uninitialized"

  toJSON(): UninitializedJSON {
    return {
      kind: "Uninitialized",
    }
  }

  toEncodable() {
    return {
      Uninitialized: {},
    }
  }
}

export type InitializedFields = [types.DynamicTickDataFields]
export type InitializedValue = [types.DynamicTickData]

export interface InitializedJSON {
  kind: "Initialized"
  value: [types.DynamicTickDataJSON]
}

export class Initialized {
  static readonly discriminator = 1
  static readonly kind = "Initialized"
  readonly discriminator = 1
  readonly kind = "Initialized"
  readonly value: InitializedValue

  constructor(value: InitializedFields) {
    this.value = [new types.DynamicTickData({ ...value[0] })]
  }

  toJSON(): InitializedJSON {
    return {
      kind: "Initialized",
      value: [this.value[0].toJSON()],
    }
  }

  toEncodable() {
    return {
      Initialized: {
        _0: types.DynamicTickData.toEncodable(this.value[0]),
      },
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromDecoded(obj: any): types.DynamicTickKind {
  if (typeof obj !== "object") {
    throw new Error("Invalid enum object")
  }

  if ("Uninitialized" in obj) {
    return new Uninitialized()
  }
  if ("Initialized" in obj) {
    const val = obj["Initialized"]
    return new Initialized([types.DynamicTickData.fromDecoded(val["_0"])])
  }

  throw new Error("Invalid enum object")
}

export function fromJSON(obj: types.DynamicTickJSON): types.DynamicTickKind {
  switch (obj.kind) {
    case "Uninitialized": {
      return new Uninitialized()
    }
    case "Initialized": {
      return new Initialized([types.DynamicTickData.fromJSON(obj.value[0])])
    }
  }
}

export function layout(property?: string) {
  const ret = borsh.rustEnum([
    borsh.struct([], "Uninitialized"),
    borsh.struct([types.DynamicTickData.layout("_0")], "Initialized"),
  ])
  if (property !== undefined) {
    return ret.replicate(property)
  }
  return ret
}
