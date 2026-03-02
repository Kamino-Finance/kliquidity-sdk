#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const { rootNodeFromAnchor } = require('@codama/nodes-from-anchor');
const { renderVisitor } = require('@codama/renderers-js');
const { createFromRoot } = require('codama');
const {
  readFileSync,
  rmSync,
  writeFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  cpSync,
} = require('node:fs');
const path = require('node:path');

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

async function main() {
  // Clean output root
  rmSync(path.join(ROOT, 'src/@codegen'), { recursive: true, force: true });

  const tempDir = path.join(ROOT, '.codegen-temp');
  rmSync(tempDir, { recursive: true, force: true });

  for (const prog of programs) {
    const idlPath = path.join(ROOT, prog.idl);
    // Use relative path for renderVisitor (it works with relative paths)
    const tempOutRel = `.codegen-temp/${path.basename(prog.out)}`;
    const tempOutAbs = path.join(ROOT, tempOutRel);

    console.log(`Generating ${prog.out} from ${prog.idl}...`);

    const anchorIdl = JSON.parse(readFileSync(idlPath, 'utf-8'));
    const rootNode = rootNodeFromAnchor(anchorIdl);
    const codama = createFromRoot(rootNode);

    // MUST await - renderVisitor is async
    await codama.accept(
      renderVisitor(tempOutRel, {
        formatCode: false,
      })
    );

    // Flatten: move from temp/{name}/src/generated/* to src/@codegen/{name}/*
    const srcGenDir = path.join(tempOutAbs, 'src', 'generated');
    const dstDir = path.join(ROOT, prog.out);
    mkdirSync(dstDir, { recursive: true });
    cpSync(srcGenDir, dstDir, { recursive: true });

    // Post-process all .ts files
    postProcessDir(dstDir, prog.programId);

    // Simplify programs/ dir - replace with simple address export
    simplifyProgramsDir(dstDir, prog.programId);

    console.log(`  -> Done: ${prog.out}`);
  }

  // Write the shared shim for @solana/program-client-core
  writeShim();

  // Clean temp
  rmSync(tempDir, { recursive: true, force: true });

  console.log('All codegen complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

// --- Helper functions ---

function postProcessDir(dir, programId) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      postProcessDir(fullPath, programId);
    } else if (entry.endsWith('.ts')) {
      postProcessFile(fullPath, programId);
    }
  }
}

function postProcessFile(filePath, programId) {
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
  //    These don't exist in @solana/kit 2.x - remove from imports only, add local constants
  const errorCodeMap = {
    'SOLANA_ERROR__PROGRAM_CLIENTS__INSUFFICIENT_ACCOUNT_METAS': 7340032,
    'SOLANA_ERROR__PROGRAM_CLIENTS__FAILED_TO_IDENTIFY_ACCOUNT': 7340033,
    'SOLANA_ERROR__PROGRAM_CLIENTS__FAILED_TO_IDENTIFY_INSTRUCTION': 7340034,
    'SOLANA_ERROR__PROGRAM_CLIENTS__UNRECOGNIZED_INSTRUCTION_TYPE': 7340035,
  };

  const missingImports = [];
  for (const code of Object.keys(errorCodeMap)) {
    if (content.includes(code)) {
      missingImports.push(code);
    }
  }

  // Remove error codes ONLY from import { ... } from '@solana/kit' statements
  if (missingImports.length > 0) {
    content = content.replace(/(import\s*\{[^}]+\}\s*from\s*'@solana\/kit'\s*;)/g, (importStatement) => {
      let result = importStatement;
      for (const code of missingImports) {
        // Remove ", CODE" or "CODE, " from the import
        result = result.replace(new RegExp(`,\\s*${code}`), '');
        result = result.replace(new RegExp(`${code},\\s*`), '');
      }
      return result;
    });

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

  // 3. Replace SolanaError with plain Error for parse functions (not used by consumer code)
  //    SolanaError in @solana/kit 2.x requires specific error codes not available here
  content = content.replace(
    /new SolanaError\(SOLANA_ERROR__PROGRAM_CLIENTS__\w+,\s*(\{[^}]+\})\)/g,
    'new Error(`Program client error: ${JSON.stringify($1)}`)'
  );

  // Also remove SolanaError import if it's only used in parse functions
  // (keep it if used elsewhere)

  // 4. Fix empty program address
  content = content.replace(
    /= '' as Address<''>/g,
    `= '${programId}' as Address<'${programId}'>`
  );

  writeFileSync(filePath, content);
}

function simplifyProgramsDir(dstDir, programId) {
  const programsDir = path.join(dstDir, 'programs');
  if (!require('fs').existsSync(programsDir)) return;

  // Read the program file to extract the PROGRAM_ADDRESS constant name
  const programFiles = readdirSync(programsDir).filter(f => f !== 'index.ts' && f.endsWith('.ts'));
  const programNames = [];

  for (const pf of programFiles) {
    const content = readFileSync(path.join(programsDir, pf), 'utf-8');
    const match = content.match(/export const (\w+_PROGRAM_ADDRESS)\s*=/);
    if (match) {
      programNames.push({ name: match[1], file: pf.replace('.ts', '') });
    }
  }

  // Rewrite each program file to just export the address constant
  for (const pf of programFiles) {
    const content = readFileSync(path.join(programsDir, pf), 'utf-8');
    const match = content.match(/export const (\w+_PROGRAM_ADDRESS)\s*=\s*'([^']+)'\s*as\s*Address<'[^']+'>/);
    if (match) {
      const simplified = `import { type Address } from '@solana/kit';\n\nexport const ${match[1]} = '${match[2]}' as Address<'${match[2]}'>;`;
      writeFileSync(path.join(programsDir, pf), simplified);
    }
  }

  // Rewrite index.ts to just re-export
  const indexContent = programNames
    .map(p => `export { ${p.name} } from './${p.file}';`)
    .join('\n') + '\n';
  writeFileSync(path.join(programsDir, 'index.ts'), indexContent);
}

function writeShim() {
  const shimDir = path.join(ROOT, 'src/@codegen/_shims');
  mkdirSync(shimDir, { recursive: true });

  writeFileSync(path.join(shimDir, 'programClientCore.ts'), `/**
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
`);
}
