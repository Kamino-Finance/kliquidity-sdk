/* eslint-disable @typescript-eslint/no-unused-vars */
import { address, Address } from "@solana/kit"
import * as types from "../types"
import * as borsh from "../utils/borsh"
import { borshAddress } from "../utils"
/* eslint-enable @typescript-eslint/no-unused-vars */
export interface UserRewardInfoFields {
  rewardPerTokenCompletes: Array<bigint>
  rewardPendings: Array<bigint>
}

export interface UserRewardInfoJSON {
  rewardPerTokenCompletes: Array<string>
  rewardPendings: Array<string>
}

export class UserRewardInfo {
  readonly rewardPerTokenCompletes: Array<bigint>
  readonly rewardPendings: Array<bigint>

  constructor(fields: UserRewardInfoFields) {
    this.rewardPerTokenCompletes = fields.rewardPerTokenCompletes
    this.rewardPendings = fields.rewardPendings
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.array(borsh.u128(), 2, "rewardPerTokenCompletes"),
        borsh.array(borsh.u64(), 2, "rewardPendings"),
      ],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new UserRewardInfo({
      rewardPerTokenCompletes: obj.rewardPerTokenCompletes,
      rewardPendings: obj.rewardPendings,
    })
  }

  static toEncodable(fields: UserRewardInfoFields) {
    return {
      rewardPerTokenCompletes: fields.rewardPerTokenCompletes,
      rewardPendings: fields.rewardPendings,
    }
  }

  toJSON(): UserRewardInfoJSON {
    return {
      rewardPerTokenCompletes: this.rewardPerTokenCompletes.map((item) =>
        item.toString()
      ),
      rewardPendings: this.rewardPendings.map((item) => item.toString()),
    }
  }

  static fromJSON(obj: UserRewardInfoJSON): UserRewardInfo {
    return new UserRewardInfo({
      rewardPerTokenCompletes: obj.rewardPerTokenCompletes.map((item) =>
        BigInt(item)
      ),
      rewardPendings: obj.rewardPendings.map((item) => BigInt(item)),
    })
  }

  toEncodable() {
    return UserRewardInfo.toEncodable(this)
  }
}
