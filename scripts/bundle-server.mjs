import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Find esbuild.exe in node_modules
function findEsbuild(dir) {
  const pnpmDir = path.join(dir, 'node_modules', '.pnpm');
  if (fs.existsSync(pnpmDir)) {
    const entries = fs.readdirSync(pnpmDir);
    for (const entry of entries) {
      if (entry.includes('@esbuild+win32-x64') || entry.includes('esbuild-windows')) {
        const candidate = path.join(pnpmDir, entry, 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe');
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  return 'esbuild';
}

const esbuildPath = findEsbuild(root);
const serverSrc = path.join(root, 'packages', 'server', 'src', 'index.ts');
const serverDist = path.join(root, 'packages', 'server', 'dist', 'index.js');

console.log(`Bundling server with ${path.basename(esbuildPath)}...`);

const res = spawnSync(esbuildPath, [
  serverSrc,
  '--bundle',
  '--platform=node',
  '--target=node20',
  '--format=esm',
  `--outfile=${serverDist}`,
], {
  stdio: 'inherit',
});

if (res.status === 0) {
  const bytes = fs.statSync(serverDist).size;
  console.log(`✔ Server successfully bundled into standalone file: ${serverDist} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
} else {
  console.error(`❌ Failed to bundle server. Exit code: ${res.status}`);
  process.exit(res.status || 1);
}
