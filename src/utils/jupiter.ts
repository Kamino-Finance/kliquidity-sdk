import { Instruction } from '@jup-ag/api';
import { AccountRole, address, Instruction as SolanaInstruction } from '@solana/kit';

export function jupInstructionToSolanaInstruction(ix: Instruction): SolanaInstruction {
  return {
    data: ix.data ? Buffer.from(ix.data, 'base64') : undefined,
    programAddress: address(ix.programId),
    accounts: ix.accounts.map((k) => ({
      address: address(k.pubkey),
      role: getAccountRole({ isSigner: k.isSigner, isMut: k.isWritable }),
    })),
  };
}

export function jupInstructionsToSolanaInstructions(ixs: Instruction[]): SolanaInstruction[] {
  return ixs.map((ix) => jupInstructionToSolanaInstruction(ix));
}

export function getAccountRole({ isSigner, isMut }: { isSigner: boolean; isMut: boolean }): AccountRole {
  if (isSigner && isMut) {
    return AccountRole.WRITABLE_SIGNER;
  }
  if (isSigner && !isMut) {
    return AccountRole.READONLY_SIGNER;
  }
  if (!isSigner && isMut) {
    return AccountRole.WRITABLE;
  }
  return AccountRole.READONLY;
}
