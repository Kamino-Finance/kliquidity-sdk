export interface MeteoraPoolsResponse {
  pairs: MeteoraPoolAPI[];
  total: number;
  meta?: {
    cursor?: {
      previous: string | null;
      next: string | null;
    };
    total?: number;
    page?: number;
    size?: number;
  };
}

export interface MeteoraPoolAPI {
  address: string;
  name: string;
  mint_x: string;
  mint_y: string;
  bin_step: number;
  base_fee_percentage: string;
  max_fee_percentage: string;
  protocol_fee_percentage: string;
  liquidity: string;
  reward_fee_percentage: string;
  fees_24h: string;
  today_fees: string;
  trade_volume_24h: string;
  cumulative_trade_volume: string;
  cumulative_fee_volume: string;
  current_price: string;
  apr: string;
  apy: string;
  farm_apr: string;
  farm_apy: string;
  hide: boolean;
  pair_point_data?: {
    pool_address: string;
    total_point: string;
    point_per_second: string;
    updated_at: string;
  };
  token_x?: MeteoraTokenAPI;
  token_y?: MeteoraTokenAPI;
  active_bin?: {
    bin_id: number;
    price: string;
    liquidity_x: string;
    liquidity_y: string;
  };
}

export interface MeteoraTokenAPI {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo_uri?: string;
  coingecko_id?: string;
  tags?: string[];
}
