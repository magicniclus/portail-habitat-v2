import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

/** COMPORTEMENT §2 : le traceur pèse moins de 6 Ko compressé, une fois minifié. */
describe('poids du traceur', () => {
  it('reste sous 6 Ko gzip', async () => {
    const sortie = await build({
      entryPoints: [new URL('./index.ts', import.meta.url).pathname],
      bundle: true,
      minify: true,
      format: 'esm',
      write: false,
      platform: 'browser',
      target: 'es2022',
    });
    const taille = gzipSync(sortie.outputFiles[0]!.contents).length;
    expect(taille).toBeLessThan(6 * 1024);
  });
});
