const { spawnSync } = require('node:child_process');
const { rmSync } = require('node:fs');

const compiler = spawnSync(
  process.execPath,
  [
    require.resolve('typescript/bin/tsc'),
    'prisma/seed.ts',
    '--module', 'commonjs',
    '--target', 'es2022',
    '--esModuleInterop',
    '--skipLibCheck',
    '--outDir', '.seed-dist',
  ],
  { stdio: 'inherit' },
);

if (compiler.status !== 0) {
  process.exit(compiler.status ?? 1);
}

const seed = spawnSync(process.execPath, ['.seed-dist/seed.js'], { stdio: 'inherit' });
rmSync('.seed-dist', { recursive: true, force: true });
process.exit(seed.status ?? 1);
