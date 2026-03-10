import { mkdir, rm, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { context as esbuildContext } from 'esbuild';
import { build as viteBuild, loadConfigFromFile, mergeConfig } from 'vite';

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

const loadedConfig = await loadConfigFromFile(
  { command: 'build', mode: 'development' },
  resolve(rootDir, 'vite.config.ts')
);

if (!loadedConfig) {
  throw new Error('Could not load Vite config.');
}

const viteWatcher = await viteBuild(
  mergeConfig(loadedConfig.config, {
    build: {
      emptyOutDir: false,
      watch: {}
    }
  })
);

const backgroundContext = await esbuildContext({
  ...sharedBuildOptions(),
  entryPoints: [resolve(rootDir, 'src/background/index.ts')],
  format: 'esm',
  outfile: resolve(distDir, 'background.js')
});

const contentContext = await esbuildContext({
  ...sharedBuildOptions(),
  entryPoints: [resolve(rootDir, 'src/content/index.ts')],
  format: 'iife',
  outfile: resolve(distDir, 'content.js')
});

await Promise.all([backgroundContext.watch(), contentContext.watch()]);

console.log('Watching extension files. Reload the unpacked extension after changes.');

async function shutdown() {
  if ('close' in viteWatcher && typeof viteWatcher.close === 'function') {
    viteWatcher.close();
  }
  await Promise.all([backgroundContext.dispose(), contentContext.dispose()]);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
