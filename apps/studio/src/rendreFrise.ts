import {
  dureeFrise,
  fichierDuClip,
  FORMATS_STUDIO,
  grapheFrise,
  IMAGES_PAR_SECONDE,
  lignesSousTitres,
  motsFrise,
  reglagesSousTitres,
  srt,
  type EntreeClip,
} from '@ph/core/studio';
import { friseDuProjet, type ProjetStudio } from '@ph/firebase/studio';
import { themeStudio } from '@ph/ui/tokens';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { dansDossier, executer, sonderFlux } from './outils';
import { deposer, telecharger } from './stockage';
import { avecPageDessin, ecrirePng } from './surcouche';

/**
 * Rendu de la frise multipistes (STUDIO.md §5 bis) : fichiers téléchargés une fois, cartons et
 * surcouche (effets, sous-titres) dessinés dans Chromium avec le code de l'aperçu, puis un seul
 * passage ffmpeg avec le graphe de `grapheFrise`. Sortie : MP4 H.264 + .srt + miniature.
 */

const FPS = IMAGES_PAR_SECONDE;
const sec = (ms: number) => (ms / 1000).toFixed(3);

export async function rendreFrise(
  p: ProjetStudio,
): Promise<{ video: string; srt: string; miniature: string; dureeMs: number }> {
  const f = friseDuProjet(p);
  const D = dureeFrise(f);
  if (!D) throw new Error('frise vide');
  const { largeur: L, hauteur: H } = FORMATS_STUDIO[f.format];
  const fichiers = { prise: p.prise?.fichiers ?? {}, captures: p.captures };
  return dansDossier(async (d) => {
    // Chaque fichier n'est téléchargé et sondé qu'une fois, même utilisé par plusieurs clips.
    const locaux = new Map<
      string,
      { local: string; largeur: number; hauteur: number; son: boolean }
    >();
    for (const piste of f.pistes)
      for (const c of piste.clips) {
        const x = fichierDuClip(f, c, fichiers);
        if (!x || locaux.has(x.chemin)) continue;
        const local = await telecharger(x.chemin, d, `f${locaux.size}${extname(x.chemin)}`);
        locaux.set(x.chemin, { local, ...(await sonderFlux(local)) });
      }

    const lignes = f.sousTitres
      ? lignesSousTitres(motsFrise(f, p.mots), reglagesSousTitres(f.format))
      : [];
    const effets = f.pistes.some((x) => x.type === 'texte' && !x.muet && x.clips.length);
    const cartons = new Map<string, string>();
    const dossierImages = join(d, 'surcouche');
    await mkdir(dossierImages);
    const images = Math.ceil((D * FPS) / 1000);
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
          await ecrirePng(
            fichier,
            await page.evaluate((t) => window.cartonFrise(t), c.source.texte),
          );
          cartons.set(c.id, fichier);
        }
      if (!effets && !lignes.length) return;
      for (let n = 0; n < images; n++)
        await ecrirePng(
          join(dossierImages, `${String(n).padStart(6, '0')}.png`),
          await page.evaluate((t) => window.imageFrise(t), (n * 1000) / FPS),
        );
    });

    const args = [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `color=c=0x${themeStudio.sombre.replace('#', '')}:s=${L}x${H}:r=${FPS}:d=${sec(D)}`,
      '-f',
      'lavfi',
      '-i',
      `anullsrc=r=48000:cl=stereo:d=${sec(D)}`,
    ];
    let index = 2;
    const entrees: Record<string, EntreeClip> = {};
    const fixe = (fichier: string, dureeMs: number) =>
      args.push('-loop', '1', '-framerate', String(FPS), '-t', sec(dureeMs + 100), '-i', fichier);
    for (const piste of f.pistes)
      for (const c of piste.clips) {
        const carton = cartons.get(c.id);
        if (carton) {
          fixe(carton, c.duree);
          entrees[c.id] = { index: index++, largeur: L, hauteur: H, son: false, fixe: true };
          continue;
        }
        const x = fichierDuClip(f, c, fichiers);
        const l = x ? locaux.get(x.chemin) : undefined;
        if (!x || !l) continue;
        if (x.type === 'image') fixe(l.local, c.duree);
        else {
          const depart = 'debutSource' in c.source ? c.source.debutSource : 0;
          args.push('-ss', sec(depart), '-t', sec(c.duree * (c.vitesse ?? 1) + 100), '-i', l.local);
        }
        entrees[c.id] = {
          index: index++,
          largeur: x.type === 'audio' ? 0 : l.largeur,
          hauteur: x.type === 'audio' ? 0 : l.hauteur,
          son: x.type !== 'image' && l.son,
          fixe: x.type === 'image',
        };
      }
    let surcouche: number | null = null;
    if (effets || lignes.length) {
      args.push('-framerate', String(FPS), '-i', join(dossierImages, '%06d.png'));
      surcouche = index++;
    }
    let musique: number | null = null;
    if (f.musique) {
      // Nappe discrète (accords tenus), fondue au début et à la fin.
      args.push(
        '-f',
        'lavfi',
        '-i',
        `aevalsrc='0.04*sin(2*PI*220*t)+0.03*sin(2*PI*277.18*t)+0.03*sin(2*PI*329.63*t)':s=48000:d=${sec(D)}`,
      );
      musique = index++;
    }
    const video = join(d, 'video.mp4');
    await executer('ffmpeg', [
      ...args,
      '-filter_complex',
      grapheFrise(f, entrees, { silence: 1, surcouche, musique }),
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-t',
      sec(D),
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '20',
      '-profile:v',
      'high',
      '-pix_fmt',
      'yuv420p',
      '-r',
      String(FPS),
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-ar',
      '48000',
      '-movflags',
      '+faststart',
      video,
    ]);
    const miniature = join(d, 'miniature.jpg');
    await executer('ffmpeg', [
      '-y',
      '-ss',
      sec(Math.min(1_200, D / 2)),
      '-i',
      video,
      '-frames:v',
      '1',
      '-q:v',
      '3',
      miniature,
    ]);
    const fichierSrt = join(d, 'sous-titres.srt');
    await writeFile(fichierSrt, srt(lignes));
    const dossier = `studioRendus/${p.id}/frise-${Date.now().toString(36)}`;
    return {
      video: await deposer(video, `${dossier}/video.mp4`, 'video/mp4'),
      srt: await deposer(fichierSrt, `${dossier}/sous-titres.srt`, 'application/x-subrip'),
      miniature: await deposer(miniature, `${dossier}/miniature.jpg`, 'image/jpeg'),
      dureeMs: D,
    };
  });
}
