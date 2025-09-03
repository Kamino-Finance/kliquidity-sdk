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

export interface ObservationStateFields {
  initialized: boolean
  poolId: Address
  observations: Array<types.ObservationFields>
  padding: Array<BN>
}

export interface ObservationStateJSON {
  initialized: boolean
  poolId: string
  observations: Array<types.ObservationJSON>
  padding: Array<string>
}

export class ObservationState {
  readonly initialized: boolean
  readonly poolId: Address
  readonly observations: Array<types.Observation>
  readonly padding: Array<BN>

  static readonly discriminator = Buffer.from([
    122, 174, 197, 53, 129, 9, 165, 132,
  ])

  static readonly layout = borsh.struct<ObservationState>([
    borsh.bool("initialized"),
    borshAddress("poolId"),
    borsh.array(types.Observation.layout(), 1000, "observations"),
    borsh.array(borsh.u128(), 5, "padding"),
  ])

  constructor(fields: ObservationStateFields) {
    this.initialized = fields.initialized
    this.poolId = fields.poolId
    this.observations = fields.observations.map(
      (item) => new types.Observation({ ...item })
    )
    this.padding = fields.padding
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<ObservationState | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `ObservationStateFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<ObservationState | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `ObservationStateFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): ObservationState {
    if (!data.slice(0, 8).equals(ObservationState.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = ObservationState.layout.decode(data.slice(8))

    return new ObservationState({
      initialized: dec.initialized,
      poolId: dec.poolId,
      observations: dec.observations.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => types.Observation.fromDecoded(item)
      ),
      padding: dec.padding,
    })
  }

  toJSON(): ObservationStateJSON {
    return {
      initialized: this.initialized,
      poolId: this.poolId,
      observations: this.observations.map((item) => item.toJSON()),
      padding: this.padding.map((item) => item.toString()),
    }
  }

  static fromJSON(obj: ObservationStateJSON): ObservationState {
    return new ObservationState({
      initialized: obj.initialized,
      poolId: address(obj.poolId),
      observations: obj.observations.map((item) =>
        types.Observation.fromJSON(item)
      ),
      padding: obj.padding.map((item) => new BN(item)),
    })
  }
}
