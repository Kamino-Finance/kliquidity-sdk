import { Address } from '@solana/kit';

export type TreasuryFeeVault = {
  treasuryFeeTokenAVault: Address;
  treasuryFeeTokenBVault: Address;
  treasuryFeeVaultAuthority: Address;
};

export default TreasuryFeeVault;
