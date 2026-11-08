import { themeStudio } from '@ph/ui/tokens';
import { chromium, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEPOT } from './demo/environnement';

const RACINE = new URL('..', import.meta.url).pathname;

/** Image `data:` du canevas enregistrée en PNG. */
export const ecrirePng = (fichier: string, url: string) =>
  writeFile(fichier, Buffer.from(url.split(',')[1]!, 'base64'));

/**
 * Page Chromium chargée avec le code de dessin de l'aperçu (`dist/surcouche.js`) et la police
 * des vidéos (base64), fermée à la fin.
 */
export async function avecPageDessin(f: (page: Page, police: string) => Promise<void>) {
  const navigateur = await chromium.launch();
  try {
    const page = await navigateur.newPage({ viewport: { width: 400, height: 400 } });
    await page.setContent(
      '<!doctype html><html><body style="margin:0;background:transparent"></body></html>',
    );
    await page.addScriptTag({ content: await readFile(join(RACINE, 'dist/surcouche.js'), 'utf8') });
    const police = (
      await readFile(join(DEPOT, 'apps/web/public', themeStudio.fichierPolice))
    ).toString('base64');
    await f(page, police);
  } finally {
    await navigateur.close();
  }
}
