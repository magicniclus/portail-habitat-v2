import { dureeFrise, IMAGES_PAR_SECONDE, type Frise, type LigneSousTitre } from '@ph/core/studio';
import { themeStudio } from '@ph/ui/tokens';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { avecPageDessin, ecrirePng } from './surcouche';

const FPS = IMAGES_PAR_SECONDE;

/**
 * Dessins faits dans Chromium avec le code de l'aperçu : un PNG par carton, le texte de la
 * miniature, et la surcouche image par image (effets, sous-titres) s'il y en a.
 */
export async function dessinsFrise(f: Frise, lignes: LigneSousTitre[], d: string) {
  const cartons = new Map<string, string>();
  const texteMiniature = f.miniature ? join(d, 'miniature-texte.png') : null;
  const effets = f.pistes.some((x) => x.type === 'texte' && !x.muet && x.clips.length);
  const dossierImages = join(d, 'surcouche');
  await mkdir(dossierImages);
  await avecPageDessin(async (page, police) => {
    await page.evaluate((e) => window.preparerFrise(e), {
      frise: f,
      lignes,
      theme: themeStudio,
      police,
    });
    for (const piste of f.pistes)
      for (const c of piste.clips) {
        if (c.source.type !== 'carton') continue;
        const fichier = join(d, `carton-${c.id}.png`);
        await ecrirePng(fichier, await page.evaluate((t) => window.cartonFrise(t), c.source.texte));
        cartons.set(c.id, fichier);
      }
    if (f.miniature && texteMiniature)
      await ecrirePng(
        texteMiniature,
        await page.evaluate((m) => window.miniatureFrise(m), {
          texte: f.miniature.texte,
          accent: f.miniature.accent,
        }),
      );
    if (!effets && !lignes.length) return;
    const images = Math.ceil((dureeFrise(f) * FPS) / 1000);
    for (let n = 0; n < images; n++)
      await ecrirePng(
        join(dossierImages, `${String(n).padStart(6, '0')}.png`),
        await page.evaluate((t) => window.imageFrise(t), (n * 1000) / FPS),
      );
  });
  return {
    cartons,
    texteMiniature,
    surcouche: effets || lignes.length ? join(dossierImages, '%06d.png') : null,
  };
}
