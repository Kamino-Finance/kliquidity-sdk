/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface BinFields {
  /** Amount of token X in the bin. This already excluded protocol fees. */
  amountX: bigint
  /** Amount of token Y in the bin. This already excluded protocol fees. */
  amountY: bigint
  /** Bin price */
  price: bigint
  /** Liquidities of the bin. This is the same as LP mint supply. q-number */
  liquiditySupply: bigint
  /** reward_a_per_token_stored */
  rewardPerTokenStored: Array<bigint>
  /** Swap fee amount of token X per liquidity deposited. */
  feeAmountXPerTokenStored: bigint
  /** Swap fee amount of token Y per liquidity deposited. */
  feeAmountYPerTokenStored: bigint
  /** Total token X swap into the bin. Only used for tracking purpose. */
  amountXIn: bigint
  /** Total token Y swap into he bin. Only used for tracking purpose. */
  amountYIn: bigint
}

export interface BinJSON {
  /** Amount of token X in the bin. This already excluded protocol fees. */
  amountX: string
  /** Amount of token Y in the bin. This already excluded protocol fees. */
  amountY: string
  /** Bin price */
  price: string
  /** Liquidities of the bin. This is the same as LP mint supply. q-number */
  liquiditySupply: string
  /** reward_a_per_token_stored */
  rewardPerTokenStored: Array<string>
  /** Swap fee amount of token X per liquidity deposited. */
  feeAmountXPerTokenStored: string
  /** Swap fee amount of token Y per liquidity deposited. */
  feeAmountYPerTokenStored: string
  /** Total token X swap into the bin. Only used for tracking purpose. */
  amountXIn: string
  /** Total token Y swap into he bin. Only used for tracking purpose. */
  amountYIn: string
}

export class Bin {
  /** Amount of token X in the bin. This already excluded protocol fees. */
  readonly amountX: bigint
  /** Amount of token Y in the bin. This already excluded protocol fees. */
  readonly amountY: bigint
  /** Bin price */
  readonly price: bigint
  /** Liquidities of the bin. This is the same as LP mint supply. q-number */
  readonly liquiditySupply: bigint
  /** reward_a_per_token_stored */
  readonly rewardPerTokenStored: Array<bigint>
  /** Swap fee amount of token X per liquidity deposited. */
  readonly feeAmountXPerTokenStored: bigint
  /** Swap fee amount of token Y per liquidity deposited. */
  readonly feeAmountYPerTokenStored: bigint
  /** Total token X swap into the bin. Only used for tracking purpose. */
  readonly amountXIn: bigint
  /** Total token Y swap into he bin. Only used for tracking purpose. */
  readonly amountYIn: bigint

  constructor(fields: BinFields) {
    this.amountX = fields.amountX
    this.amountY = fields.amountY
    this.price = fields.price
    this.liquiditySupply = fields.liquiditySupply
    this.rewardPerTokenStored = fields.rewardPerTokenStored
    this.feeAmountXPerTokenStored = fields.feeAmountXPerTokenStored
    this.feeAmountYPerTokenStored = fields.feeAmountYPerTokenStored
    this.amountXIn = fields.amountXIn
    this.amountYIn = fields.amountYIn
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.u64("amountX"),
        borsh.u64("amountY"),
        borsh.u128("price"),
        borsh.u128("liquiditySupply"),
        borsh.array(borsh.u128(), 2, "rewardPerTokenStored"),
        borsh.u128("feeAmountXPerTokenStored"),
        borsh.u128("feeAmountYPerTokenStored"),
        borsh.u128("amountXIn"),
        borsh.u128("amountYIn"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new Bin({
      amountX: obj.amountX,
      amountY: obj.amountY,
      price: obj.price,
      liquiditySupply: obj.liquiditySupply,
      rewardPerTokenStored: obj.rewardPerTokenStored,
      feeAmountXPerTokenStored: obj.feeAmountXPerTokenStored,
      feeAmountYPerTokenStored: obj.feeAmountYPerTokenStored,
      amountXIn: obj.amountXIn,
      amountYIn: obj.amountYIn,
    })
  }

  static toEncodable(fields: BinFields) {
    return {
      amountX: fields.amountX,
      amountY: fields.amountY,
      price: fields.price,
      liquiditySupply: fields.liquiditySupply,
      rewardPerTokenStored: fields.rewardPerTokenStored,
      feeAmountXPerTokenStored: fields.feeAmountXPerTokenStored,
      feeAmountYPerTokenStored: fields.feeAmountYPerTokenStored,
      amountXIn: fields.amountXIn,
      amountYIn: fields.amountYIn,
    }
  }

  toJSON(): BinJSON {
    return {
      amountX: this.amountX.toString(),
      amountY: this.amountY.toString(),
      price: this.price.toString(),
      liquiditySupply: this.liquiditySupply.toString(),
      rewardPerTokenStored: this.rewardPerTokenStored.map((item) =>
        item.toString()
      ),
      feeAmountXPerTokenStored: this.feeAmountXPerTokenStored.toString(),
      feeAmountYPerTokenStored: this.feeAmountYPerTokenStored.toString(),
      amountXIn: this.amountXIn.toString(),
      amountYIn: this.amountYIn.toString(),
    }
  }

  static fromJSON(obj: BinJSON): Bin {
    return new Bin({
      amountX: BigInt(obj.amountX),
      amountY: BigInt(obj.amountY),
      price: BigInt(obj.price),
      liquiditySupply: BigInt(obj.liquiditySupply),
      rewardPerTokenStored: obj.rewardPerTokenStored.map((item) =>
        BigInt(item)
      ),
      feeAmountXPerTokenStored: BigInt(obj.feeAmountXPerTokenStored),
      feeAmountYPerTokenStored: BigInt(obj.feeAmountYPerTokenStored),
      amountXIn: BigInt(obj.amountXIn),
      amountYIn: BigInt(obj.amountYIn),
    })
  }

  toEncodable() {
    return Bin.toEncodable(this)
  }
}
