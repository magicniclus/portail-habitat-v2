import type { LigneSousTitre, PlanMontage } from '@ph/core/studio';
import { dureePlan, FORMATS_STUDIO, IMAGES_PAR_SECONDE } from '@ph/core/studio';
import { themeStudio } from '@ph/ui/tokens';
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEPOT } from './demo/environnement';

const RACINE = new URL('..', import.meta.url).pathname;

/**
 * Images PNG transparentes de la surcouche, une par image de la vidéo (30 par seconde), dessinées
 * dans Chromium avec le code de l'aperçu. Renvoie le motif à donner à ffmpeg.
 */
export async function imagesSurcouche(
  plan: PlanMontage,
  lignes: LigneSousTitre[],
  dossier: string,
): Promise<{ motif: string; images: number }> {
  const { largeur, hauteur } = FORMATS_STUDIO[plan.format];
  const images = Math.round((dureePlan(plan) * IMAGES_PAR_SECONDE) / 1000);
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
    await page.evaluate((e) => window.preparerStudio(e), {
      plan,
      lignes,
      theme: themeStudio,
      police,
      largeur,
      hauteur,
    });
    for (let n = 0; n < images; n++) {
      const url = await page.evaluate(
        (t) => window.imageStudio(t),
        (n * 1000) / IMAGES_PAR_SECONDE,
      );
      await writeFile(
        join(dossier, `${String(n).padStart(6, '0')}.png`),
        Buffer.from(url.split(',')[1]!, 'base64'),
      );
    }
  } finally {
    await navigateur.close();
  }
  return { motif: join(dossier, '%06d.png'), images };
}
