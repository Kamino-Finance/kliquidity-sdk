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
  existsSync,
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


  for (const prog of programs) {
    const idlPath = path.join(ROOT, prog.idl);
    // v1.7.0 outputs directly into the target dir (no src/generated subdirectory)
    const outRel = prog.out;
    const dstDir = path.join(ROOT, prog.out);

    console.log(`Generating ${prog.out} from ${prog.idl}...`);

    const anchorIdl = JSON.parse(readFileSync(idlPath, 'utf-8'));
    const rootNode = rootNodeFromAnchor(anchorIdl);
    const codama = createFromRoot(rootNode);

    // MUST await - renderVisitor is async
    await codama.accept(
      renderVisitor(outRel, {
        formatCode: false,
      })
    );

    // Post-process: fix empty program addresses (Anchor v0 IDLs don't include them)
    postProcessDir(dstDir, prog.programId);

    // Simplify programs/ dir - replace with simple address export
    simplifyProgramsDir(dstDir);

    console.log(`  -> Done: ${prog.out}`);
  }

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
  let changed = false;

  // Fix empty program address (Anchor v0 IDLs don't embed program IDs)
  const fixed = content.replace(
    /= '' as Address<''>/g,
    `= '${programId}' as Address<'${programId}'>`
  );
  if (fixed !== content) {
    content = fixed;
    changed = true;
  }

  if (changed) {
    writeFileSync(filePath, content);
  }
}

function simplifyProgramsDir(dstDir) {
  const programsDir = path.join(dstDir, 'programs');
  if (!existsSync(programsDir)) return;

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
