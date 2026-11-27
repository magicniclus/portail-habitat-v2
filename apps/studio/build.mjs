// Regroupe le robot de rendu et le code partagé (@ph/core, @ph/firebase) dans dist/.
// Seules les dépendances déclarées dans package.json restent externes (installées dans l'image).
// dist/surcouche.js : le code de dessin des calques, chargé dans Chromium pour le rendu.
import { readFileSync } from 'node:fs';
import * as esbuild from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

await esbuild.build({
  entryPoints: { index: 'src/index.ts', preparer: 'src/demo/preparer.ts' },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  external: Object.keys(pkg.dependencies),
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
});
await esbuild.build({
  entryPoints: ['src/navigateur/surcouche.ts'],
  outfile: 'dist/surcouche.js',
  bundle: true,
  platform: 'browser',
  target: 'chrome120',
  format: 'iife',
  logLevel: 'info',
});
