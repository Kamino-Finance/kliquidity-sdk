import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import { renderVisitor } from '@codama/renderers-js';
import { createFromRoot } from 'codama';
import {
  readFileSync,
  rmSync,
  writeFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  cpSync,
} from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

const programs = [
  {
    idl: 'src/idl/kliquidity.json',
    out: 'src/@codegen/kliquidity',
    programId: '6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc',
  },
  {
    idl: 'src/idl/meteora.json',
    out: 'src/@codegen/meteora',
    programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  },
  {
    idl: 'src/idl/raydium.json',
    out: 'src/@codegen/raydium',
    programId: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  },
  {
    idl: 'src/idl/whirlpools.json',
    out: 'src/@codegen/whirlpools',
    programId: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  },
];

// Clean output root
rmSync(path.join(ROOT, 'src/@codegen'), { recursive: true, force: true });

const tempDir = path.join(ROOT, '.codegen-temp');
rmSync(tempDir, { recursive: true, force: true });

for (const prog of programs) {
  const idlPath = path.join(ROOT, prog.idl);
  const tempOut = path.join(tempDir, path.basename(prog.out));

  console.log(`Generating ${prog.out} from ${prog.idl}...`);

  const anchorIdl = JSON.parse(readFileSync(idlPath, 'utf-8'));
  const rootNode = rootNodeFromAnchor(anchorIdl);
  const codama = createFromRoot(rootNode);

  codama.accept(
    renderVisitor(tempOut, {
      formatCode: false,
    })
  );

  // Flatten: move from temp/{name}/src/generated/* to src/@codegen/{name}/*
  const srcGenDir = path.join(tempOut, 'src', 'generated');
  const dstDir = path.join(ROOT, prog.out);
  mkdirSync(dstDir, { recursive: true });
  cpSync(srcGenDir, dstDir, { recursive: true });

  // Post-process all .ts files
  postProcessDir(dstDir, prog.programId);

  console.log(`  -> Done: ${prog.out}`);
}

// Write the shared shim for @solana/program-client-core
writeShim();

// Clean temp
rmSync(tempDir, { recursive: true, force: true });

console.log('All codegen complete.');

// --- Helper functions ---

function postProcessDir(dir: string, programId: string) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      postProcessDir(fullPath, programId);
    } else if (entry.endsWith('.ts')) {
      postProcessFile(fullPath, dir, programId);
    }
  }
}

function postProcessFile(filePath: string, _baseDir: string, programId: string) {
  let content = readFileSync(filePath, 'utf-8');

  // 1. Replace @solana/program-client-core import with local shim
  const shimRelPath = path.relative(path.dirname(filePath), path.join(ROOT, 'src/@codegen/_shims'));
  const shimImport = shimRelPath.startsWith('.') ? shimRelPath : './' + shimRelPath;
  content = content.replace(
    /from\s+'@solana\/program-client-core'/g,
    `from '${shimImport}/programClientCore'`
  );

  // Also handle @solana/kit/program-client-core
  content = content.replace(
    /from\s+'@solana\/kit\/program-client-core'/g,
    `from '${shimImport}/programClientCore'`
  );

  // 2. Replace missing SOLANA_ERROR__PROGRAM_CLIENTS__* error codes
  //    These don't exist in @solana/kit 2.x - replace with numeric constants
  const errorCodeMap: Record<string, number> = {
    'SOLANA_ERROR__PROGRAM_CLIENTS__INSUFFICIENT_ACCOUNT_METAS': 7340032,
    'SOLANA_ERROR__PROGRAM_CLIENTS__FAILED_TO_IDENTIFY_ACCOUNT': 7340033,
    'SOLANA_ERROR__PROGRAM_CLIENTS__FAILED_TO_IDENTIFY_INSTRUCTION': 7340034,
    'SOLANA_ERROR__PROGRAM_CLIENTS__UNRECOGNIZED_INSTRUCTION_TYPE': 7340035,
  };

  // Remove these from @solana/kit imports and add local constants
  const missingImports: string[] = [];
  for (const code of Object.keys(errorCodeMap)) {
    if (content.includes(code)) {
      // Remove from import statement
      content = content.replace(new RegExp(`,?\\s*${code}`), '');
      content = content.replace(new RegExp(`${code},?\\s*`), '');
      missingImports.push(code);
    }
  }

  // Add local constant definitions after the last import
  if (missingImports.length > 0) {
    const constants = missingImports
      .map(code => `const ${code} = ${errorCodeMap[code]} as const;`)
      .join('\n');
    // Insert after the last import statement
    const lastImportIdx = content.lastIndexOf("from '");
    if (lastImportIdx >= 0) {
      const lineEnd = content.indexOf('\n', lastImportIdx);
      content = content.slice(0, lineEnd + 1) + '\n' + constants + '\n' + content.slice(lineEnd + 1);
    }
  }

  // 3. Fix empty program address
  content = content.replace(
    /= '' as Address<''>/g,
    `= '${programId}' as Address<'${programId}'>`
  );

  writeFileSync(filePath, content);
}

function writeShim() {
  const shimDir = path.join(ROOT, 'src/@codegen/_shims');
  mkdirSync(shimDir, { recursive: true });

  const shimContent = `/**
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
    isTransactionSigner(value)
  );
}

export function getAddressFromResolvedInstructionAccount<T extends string = string>(
  inputName: string,
  value: ResolvedInstructionAccount<T>['value'] | undefined,
): Address<T> {
  if (value === null || value === undefined) {
    throw new Error(\`Resolved instruction account "\${inputName}" must be non-null\`);
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
`;

  writeFileSync(path.join(shimDir, 'programClientCore.ts'), shimContent);
}
