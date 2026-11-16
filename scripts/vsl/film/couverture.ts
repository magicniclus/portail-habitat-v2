// Image de couverture de la VSL (16:9 et 9:16), photographiée depuis `couverture.html`.
// Usage : tsx scripts/vsl/film/couverture.ts   → .vsl/livrables/couverture-16x9.png et -9x16.png,
//         plus les affiches du lecteur de la landing (sans bouton) : affiche-16x9.png et -9x16.png
import { chromium } from '@playwright/test';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

const racine = resolve(__dirname, '../../..');
const sortie = join(racine, '.vsl/livrables');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
};

async function main() {
  mkdirSync(sortie, { recursive: true });
  const serveur = createServer((req, res) => {
    const chemin = join(racine, decodeURIComponent((req.url ?? '/').split('?')[0]!));
    if (!chemin.startsWith(racine) || !existsSync(chemin)) return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' });
    createReadStream(chemin).pipe(res);
  });
  await new Promise<void>((ok) => serveur.listen(0, '127.0.0.1', ok));
  const port = (serveur.address() as { port: number }).port;
  const navigateur = await chromium.launch();
  for (const [nom, largeur, hauteur, requete] of [
    ['couverture-16x9.png', 1920, 1080, ''],
    ['couverture-9x16.png', 1080, 1920, '?vertical'],
    ['affiche-16x9.png', 1920, 1080, '?affiche'],
    ['affiche-9x16.png', 1080, 1920, '?vertical&affiche'],
  ] as const) {
    const page = await navigateur.newPage({ viewport: { width: largeur, height: hauteur } });
    await page.goto(`http://127.0.0.1:${port}/scripts/vsl/film/couverture.html${requete}`);
    await page.evaluate(() =>
      Promise.all([
        document.fonts.load('800 40px "Source Sans 3"'),
        document.fonts.load('italic 600 40px "Source Serif 4"'),
      ]).then(() => document.fonts.ready),
    );
    await page.screenshot({ path: join(sortie, nom) });
    await page.close();
    console.log(`✓ ${nom}`);
  }
  await navigateur.close();
  serveur.close();
}
main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
