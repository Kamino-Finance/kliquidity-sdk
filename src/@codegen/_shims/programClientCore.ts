/**
 * Local shim for @solana/program-client-core
 * Provides getAccountMetaFactory and ResolvedInstructionAccount for codama-generated code.
 * Compatible with @solana/kit 2.x (the version used by this project).
 */
import {
  AccountRole,
  isTransactionSigner,
  upgradeRoleToSigner,
  type AccountMeta,
  type AccountSignerMeta,
  type Address,
  type ProgramDerivedAddress,
  type TransactionSigner,
} from '@solana/kit';

export type ResolvedInstructionAccount<
  TAddress extends string = string,
  TValue extends
    | Address<TAddress>
    | ProgramDerivedAddress<TAddress>
    | TransactionSigner<TAddress>
    | null =
    | Address<TAddress>
    | ProgramDerivedAddress<TAddress>
    | TransactionSigner<TAddress>
    | null,
> = {
  isWritable: boolean;
  value: TValue;
};

function isResolvedInstructionAccountSigner<T extends string>(
  value: unknown,
): value is TransactionSigner<T> {
  return (
    !!value &&
    typeof value === 'object' &&
    'address' in value &&
    typeof (value as any).address === 'string' &&
    isTransactionSigner(value as any)
  );
}

export function getAddressFromResolvedInstructionAccount<T extends string = string>(
  inputName: string,
  value: ResolvedInstructionAccount<T>['value'] | undefined,
): Address<T> {
  if (value === null || value === undefined) {
    throw new Error(`Resolved instruction account "${inputName}" must be non-null`);
  }
  if (typeof value === 'object' && 'address' in value) {
    return (value as any).address as Address<T>;
  }
  if (Array.isArray(value)) {
    return (value as any)[0] as Address<T>;
  }
  return value as Address<T>;
}

export function getAccountMetaFactory(
  programAddress: Address,
  optionalAccountStrategy: 'omitted' | 'programId',
): (inputName: string, account: ResolvedInstructionAccount) => AccountMeta | AccountSignerMeta | undefined {
  return (inputName, account) => {
    if (!account.value) {
      if (optionalAccountStrategy === 'omitted') return undefined;
      return Object.freeze({ address: programAddress, role: AccountRole.READONLY });
    }
    const writableRole = account.isWritable ? AccountRole.WRITABLE : AccountRole.READONLY;
    const isSigner = isResolvedInstructionAccountSigner(account.value);
    return Object.freeze({
      address: getAddressFromResolvedInstructionAccount(inputName, account.value),
      role: isSigner ? upgradeRoleToSigner(writableRole) : writableRole,
      ...(isSigner ? { signer: account.value } : {}),
    } as AccountMeta | AccountSignerMeta);
  };
}
