import { mkdir, rm, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { build as esbuild } from 'esbuild';
import { build as viteBuild } from 'vite';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptsDir, '..');
const distDir = resolve(rootDir, 'dist');

async function prepareDist() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await copyFile(
    resolve(rootDir, 'public/manifest.json'),
    resolve(distDir, 'manifest.json')
  );
}

function sharedBuildOptions() {
  return {
    bundle: true,
    sourcemap: true,
    target: 'chrome120',
    logLevel: 'info'
  };
}

await prepareDist();

await viteBuild({
  configFile: resolve(rootDir, 'vite.config.ts')
});

await Promise.all([
  esbuild({
    ...sharedBuildOptions(),
    entryPoints: [resolve(rootDir, 'src/background/index.ts')],
    format: 'esm',
    outfile: resolve(distDir, 'background.js')
  }),
  esbuild({
    ...sharedBuildOptions(),
    entryPoints: [resolve(rootDir, 'src/content/index.ts')],
    format: 'iife',
    outfile: resolve(distDir, 'content.js')
  })
]);
