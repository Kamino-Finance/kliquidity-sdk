import type { MaybeAccount } from '@solana/kit';

/** Unwrap codama MaybeAccount to match old T | null pattern */
export function unwrapAccount<T extends object>(account: MaybeAccount<T>): T | null {
  return account.exists ? account.data : null;
}

/** Unwrap array of MaybeAccounts */
export function unwrapAccounts<T extends object>(accounts: MaybeAccount<T>[]): (T | null)[] {
  return accounts.map((a) => (a.exists ? a.data : null));
}
