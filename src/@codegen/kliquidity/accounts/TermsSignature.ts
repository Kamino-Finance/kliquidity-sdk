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
import * as borsh from "../utils/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface TermsSignatureFields {
  signature: Array<number>
}

export interface TermsSignatureJSON {
  signature: Array<number>
}

export class TermsSignature {
  readonly signature: Array<number>

  static readonly discriminator = new Uint8Array([
    197, 173, 136, 91, 182, 49, 113, 19,
  ])

  static readonly layout = borsh.struct<TermsSignature>([
    borsh.array(borsh.u8(), 64, "signature"),
  ])

  constructor(fields: TermsSignatureFields) {
    this.signature = fields.signature
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<TermsSignature | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `TermsSignatureFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(new Uint8Array(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<TermsSignature | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `TermsSignatureFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(new Uint8Array(info.data))
    })
  }

  static decode(data: Uint8Array): TermsSignature {
    if (data.length < TermsSignature.discriminator.length) {
      throw new Error("invalid account discriminator")
    }
    for (let i = 0; i < TermsSignature.discriminator.length; i++) {
      if (data[i] !== TermsSignature.discriminator[i]) {
        throw new Error("invalid account discriminator")
      }
    }

    const dec = TermsSignature.layout.decode(
      data.subarray(TermsSignature.discriminator.length)
    )

    return new TermsSignature({
      signature: dec.signature,
    })
  }

  toJSON(): TermsSignatureJSON {
    return {
      signature: this.signature,
    }
  }

  static fromJSON(obj: TermsSignatureJSON): TermsSignature {
    return new TermsSignature({
      signature: obj.signature,
    })
  }
}
