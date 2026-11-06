import {
  couverture,
  disposition,
  dureePlan,
  FORMATS_STUDIO,
  IMAGES_PAR_SECONDE,
  lignesSousTitres,
  motsSortie,
  reglagesSousTitres,
  srt,
  type PlanMontage,
  type PlanVideo,
  type Rectangle,
} from '@ph/core/studio';
import type { ProjetStudio } from '@ph/firebase/studio';
import { themeStudio } from '@ph/ui/tokens';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dansDossier, executer, sonder } from './outils';
import { deposer, telecharger } from './stockage';
import { imagesSurcouche } from './surcouche';

/**
 * Rendu final (STUDIO.md §5) : chaque plan est composé par ffmpeg (fond, visuel recadré, caméra)
 * aux rectangles de `disposition`/`couverture`, les plans sont mis bout à bout, la surcouche
 * (calques, sous-titres) est posée par-dessus, la voix est coupée aux mêmes endroits et mise au
 * volume des réseaux (-14 LUFS). Sortie : MP4 H.264 + .srt + miniature.
 */

const FPS = IMAGES_PAR_SECONDE;
const s = (ms: number) => (ms / 1000).toFixed(3);
const couleur = (hex: string) => `0x${hex.replace('#', '')}`;

interface Source {
  fichier: string;
  largeur: number;
  hauteur: number;
}

/** Vidéo à fréquence constante (les enregistrements du navigateur sont à fréquence variable). */
async function normaliser(entree: string, sortie: string): Promise<Source> {
  await executer('ffmpeg', [
    '-y',
    '-i',
    entree,
    '-vf',
    `fps=${FPS}`,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '17',
    '-g',
    String(FPS),
    sortie,
  ]);
  const d = await sonder(sortie);
  return { fichier: sortie, largeur: d.largeur, hauteur: d.hauteur };
}

function cadre(
  src: Source,
  r: Rectangle,
  zoom: PlanVideo['zoom'],
  etiquette: string,
  entree: number,
) {
  const c = couverture(src, r, zoom);
  return `[${entree}:v]crop=${c.largeur}:${c.hauteur}:${c.x}:${c.y},scale=${r.largeur}:${r.hauteur},setsar=1[${etiquette}]`;
}

/** Un plan en clip muet, à la taille du format. */
async function clip(
  plan: PlanMontage,
  x: PlanVideo,
  sources: { ecran?: Source; camera?: Source; captures: Record<string, Source> },
  sortie: string,
) {
  const { largeur, hauteur } = FORMATS_STUDIO[plan.format];
  const duree = x.source.fin - x.source.debut;
  const images = Math.max(1, Math.round((duree * FPS) / 1000));
  const d = disposition(plan.format, x.visuel, x.camera);
  const args: string[] = [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=${couleur(x.visuel === 'carton' ? themeStudio.fond : themeStudio.sombre)}:s=${largeur}x${hauteur}:r=${FPS}`,
  ];
  const filtres: string[] = [];
  let dernier = '0:v';
  let n = 1;
  const poser = (
    src: Source | undefined,
    depuis: number,
    r: Rectangle | null,
    zoom: PlanVideo['zoom'],
    prolonger: boolean,
  ) => {
    if (!src || !r) return;
    args.push('-ss', s(depuis), '-t', s(duree + 200), '-i', src.fichier);
    const e = `v${n}`;
    filtres.push(cadre(src, r, zoom, e, n) + (prolonger ? '' : ''));
    const pad = prolonger ? `[${e}]tpad=stop_mode=clone:stop_duration=${s(duree)}[${e}p];` : '';
    filtres.push(
      `${pad}[${dernier}][${prolonger ? `${e}p` : e}]overlay=${r.x}:${r.y}:eof_action=repeat[o${n}]`,
    );
    dernier = `o${n}`;
    n++;
  };
  if (x.visuel === 'ecran') poser(sources.ecran, x.source.debut, d.principal, x.zoom, false);
  if (x.visuel === 'capture' && x.captureId)
    poser(sources.captures[x.captureId], 0, d.principal, x.zoom, true);
  if (d.camera) poser(sources.camera, x.source.debut, d.camera, undefined, false);
  args.push(
    ...(filtres.length
      ? ['-filter_complex', filtres.join(';'), '-map', `[${dernier}]`]
      : ['-map', '0:v']),
    '-frames:v',
    String(images),
    '-r',
    String(FPS),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '17',
    '-pix_fmt',
    'yuv420p',
    sortie,
  );
  await executer('ffmpeg', args);
}

/** Voix coupée comme les images, fondus de 10 ms aux coupes, volume des réseaux. */
function filtreVoix(plan: PlanMontage, musique: boolean): string {
  const morceaux = plan.plans.map(
    (x, i) =>
      `[a0]atrim=${s(x.source.debut)}:${s(x.source.fin)},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=${s(Math.max(0, x.source.fin - x.source.debut - 10))}:d=0.01[m${i}]`,
  );
  const separe = `[2:a]asplit=${plan.plans.length}${plan.plans.map((_, i) => (i ? `[a${i}]` : '[a0]')).join('')}`;
  const corrige = morceaux.map((m, i) => m.replace('[a0]', `[a${i}]`));
  const voix = `${plan.plans.map((_, i) => `[m${i}]`).join('')}concat=n=${plan.plans.length}:v=0:a=1,highpass=f=80,loudnorm=I=-14:TP=-1.5:LRA=11[voix]`;
  if (!musique) return [separe, ...corrige, voix.replace('[voix]', '[a]')].join(';');
  // Nappe discrète (accords tenus), baissée sous la voix.
  const duree = s(dureePlan(plan));
  const nappe = `aevalsrc='0.04*sin(2*PI*220*t)+0.03*sin(2*PI*277.18*t)+0.03*sin(2*PI*329.63*t)':s=48000:d=${duree},afade=t=in:d=1,afade=t=out:st=${Math.max(0, dureePlan(plan) / 1000 - 1.5).toFixed(2)}:d=1.5[nappe]`;
  // La nappe baisse quand la voix parle (compression déclenchée par la voix), puis mélange
  // recoupé à la durée exacte de la vidéo.
  return [
    separe,
    ...corrige,
    voix,
    nappe,
    '[voix]asplit[v1][v2]',
    '[nappe][v2]sidechaincompress=threshold=0.03:ratio=8[fond]',
    `[v1][fond]amix=inputs=2:duration=longest:normalize=0,apad,atrim=0:${duree}[a]`,
  ].join(';');
}

export async function rendre(
  p: ProjetStudio,
  /** Variante d'accroche : rendue dans son propre dossier. */
  nom?: string,
): Promise<{ video: string; srt: string; miniature: string; dureeMs: number }> {
  if (!p.plan || !p.prise) throw new Error('plan ou prise manquant');
  const plan = p.plan;
  const prise = p.prise;
  return dansDossier(async (d) => {
    const sources: { ecran?: Source; camera?: Source; captures: Record<string, Source> } = {
      captures: {},
    };
    if (prise.fichiers.ecran && plan.plans.some((x) => x.visuel === 'ecran'))
      sources.ecran = await normaliser(
        await telecharger(prise.fichiers.ecran, d, 'ecran.webm'),
        join(d, 'ecran.mp4'),
      );
    if (
      prise.fichiers.camera &&
      plan.plans.some((x) => disposition(plan.format, x.visuel, x.camera).camera)
    )
      sources.camera = await normaliser(
        await telecharger(prise.fichiers.camera, d, 'camera.webm'),
        join(d, 'camera.mp4'),
      );
    for (const c of plan.captures) {
      const f = p.captures[`${c.id}:${c.scene}`];
      if (f)
        sources.captures[c.id] = await normaliser(
          await telecharger(f, d, `capture-${c.id}.webm`),
          join(d, `capture-${c.id}.mp4`),
        );
    }
    const voix = await telecharger(prise.fichiers.voix, d, 'voix.webm');
    const liste: string[] = [];
    for (const [i, x] of plan.plans.entries()) {
      const f = join(d, `clip-${i}.mp4`);
      await clip(plan, x, sources, f);
      liste.push(`file '${f}'`);
    }
    await writeFile(join(d, 'clips.txt'), liste.join('\n'));
    const base = join(d, 'base.mp4');
    await executer('ffmpeg', [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      join(d, 'clips.txt'),
      '-c',
      'copy',
      base,
    ]);
    const lignes = lignesSousTitres(motsSortie(plan, p.mots), reglagesSousTitres(plan.format));
    const dossierImages = join(d, 'surcouche');
    await mkdir(dossierImages);
    const { motif, miniature: texteMiniature } = await imagesSurcouche(plan, lignes, dossierImages);
    const video = join(d, 'video.mp4');
    await executer('ffmpeg', [
      '-y',
      '-i',
      base,
      '-framerate',
      String(FPS),
      '-i',
      motif,
      '-i',
      voix,
      '-filter_complex',
      `[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v];${filtreVoix(plan, plan.musique)}`,
      '-map',
      '[v]',
      '-map',
      '[a]',
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
      '-shortest',
      video,
    ]);
    const miniature = join(d, 'miniature.jpg');
    // Miniature : l'image choisie par Claude, sous le texte de couverture (même rendu que l'aperçu).
    const instant = ((plan.miniature?.tempsMs ?? 1200) / 1000).toFixed(2);
    await executer(
      'ffmpeg',
      texteMiniature
        ? [
            '-y',
            '-ss',
            instant,
            '-i',
            base,
            '-i',
            texteMiniature,
            '-filter_complex',
            '[0:v][1:v]overlay=0:0',
            '-frames:v',
            '1',
            '-q:v',
            '3',
            miniature,
          ]
        : ['-y', '-ss', instant, '-i', video, '-frames:v', '1', '-q:v', '3', miniature],
    );
    const fichierSrt = join(d, 'sous-titres.srt');
    await writeFile(fichierSrt, srt(lignes));
    const dossier = `studioRendus/${p.id}/v${p.version}${nom ? `-${nom}` : ''}`;
    return {
      video: await deposer(video, `${dossier}/video.mp4`, 'video/mp4'),
      srt: await deposer(fichierSrt, `${dossier}/sous-titres.srt`, 'application/x-subrip'),
      miniature: await deposer(miniature, `${dossier}/miniature.jpg`, 'image/jpeg'),
      dureeMs: dureePlan(plan),
    };
  });
}
