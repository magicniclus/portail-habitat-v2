// Miniatures 3D des objets du menu Équiper (Plans) : une image par objet du catalogue, rendue
// avec three.js comme dans l'éditeur (vrai modèle glb s'il existe, sinon la forme simple).
// Usage : pnpm dessin:miniatures — écrit apps/web/public/dessin/miniatures/{id}.webp.
// À relancer après tout ajout ou changement d'objet, de dimensions ou de modèle 3D.
import { CATALOGUE_OBJETS, formeObjet3D, miniatureObjet, modele3D } from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const racine = resolve(__dirname, '..');
const publics = join(racine, 'apps/web/public');
const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.glb': 'model/gltf-binary',
};

/** Serveur local : la page de rendu, three.js depuis node_modules, les modèles de public/. */
const serveur = createServer((req, res) => {
  const chemin = decodeURIComponent((req.url ?? '/').split('?')[0]!);
  const fichier =
    chemin === '/'
      ? join(racine, 'scripts/miniaturesDessin.html')
      : chemin.startsWith('/dessin/')
        ? join(publics, chemin)
        : join(racine, chemin);
  try {
    const vrai = realpathSync(fichier);
    if (!vrai.startsWith(racine)) throw new Error('hors dépôt');
    res.writeHead(200, { 'content-type': TYPES[extname(vrai)] ?? 'application/octet-stream' });
    res.end(readFileSync(vrai));
  } catch {
    res.writeHead(404).end();
  }
});

async function principal() {
  await new Promise<void>((ok) => serveur.listen(0, '127.0.0.1', ok));
  const adresse = serveur.address();
  const port = typeof adresse === 'object' && adresse ? adresse.port : 0;
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage();
  page.on('pageerror', (e) => console.error(e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => (window as unknown as { pret?: boolean }).pret === true);
  mkdirSync(join(publics, 'dessin/miniatures'), { recursive: true });
  let poids = 0;
  for (const o of CATALOGUE_OBJETS) {
    const scene = {
      url: modele3D(o.id),
      primitives: formeObjet3D(o.symbole, o.dimensions, o.style),
      dimensions: o.dimensions,
      couleurs: COULEURS_3D,
    };
    const png = await page.evaluate(
      (s) => (window as unknown as { rendre: (x: typeof s) => Promise<string> }).rendre(s),
      scene,
    );
    const image = await sharp(Buffer.from(png.split(',')[1]!, 'base64'))
      .trim({ threshold: 1 })
      .resize(112, 112, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 82, alphaQuality: 90 })
      .toFile(join(publics, miniatureObjet(o.id)));
    poids += image.size;
  }
  console.log(`${CATALOGUE_OBJETS.length} miniatures, ${Math.round(poids / 1024)} Ko`);
  await navigateur.close();
  serveur.close();
}

void principal();
