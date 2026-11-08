import { effetsDe, effetsVideoFfmpeg, transitionFfmpeg } from './effetsFrise';
import { IMAGES_PAR_SECONDE } from './formats';
import { dureeFrise, type Clip, type Frise, type Piste, type PointAutomation } from './frise';
import { rectangleClip } from './imageFrise';
import { couverture } from './montage';
import { prolongement } from './operationsFrise';

/**
 * Rendu de la frise par ffmpeg (STUDIO.md §5 bis, robot `apps/studio`) : construction pure du
 * graphe de filtres. Images : pistes vidéo de bas en haut, chaque clip recadré à sa place, avec
 * vitesse, filtres, fondus et opacité (automation comprise), posé à son instant. Son : chaque
 * clip audible avec sa vitesse, ses filtres et son volume (piste, clip, fondus, automation),
 * décalé à son instant, puis mélangé et mis au volume des réseaux. Le robot donne les entrées.
 */

const sec = (ms: number) => +(ms / 1000).toFixed(3);
const nb = (v: number) => +v.toFixed(4);

/** Entrée ffmpeg d'un clip : numéro d'entrée et dimensions de l'image (0 pour un son). */
export interface EntreeClip {
  index: number;
  largeur: number;
  hauteur: number;
  /** Le fichier a une piste son. */
  son: boolean;
  /** Image fixe (photo ou carton) bouclée par le robot. */
  fixe: boolean;
}

/** Valeur d'une automation en expression ffmpeg de `t` (secondes depuis le début du clip). */
export function expressionPoints(
  points: readonly PointAutomation[] | undefined,
  defaut: number,
  variable = 't',
): string {
  if (!points?.length) return String(nb(defaut));
  let e = String(nb(points.at(-1)!.v));
  for (let i = points.length - 1; i >= 1; i--) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const segment =
      a.t === b.t
        ? String(nb(b.v))
        : `${nb(a.v)}+${nb(b.v - a.v)}*(${variable}-${sec(a.t)})/${sec(b.t - a.t)}`;
    e = `if(lt(${variable},${sec(b.t)}),${segment},${e})`;
  }
  return `if(lt(${variable},${sec(points[0]!.t)}),${nb(points[0]!.v)},${e})`;
}

/** Fondus d'entrée et de sortie en facteur de `t` (secondes), ou rien. */
function fondus(c: Clip, variable: string): string[] {
  const r: string[] = [];
  if (c.fondus?.entree) r.push(`min(1,${variable}/${sec(c.fondus.entree)})`);
  if (c.fondus?.sortie)
    r.push(`min(1,max(0,(${sec(c.duree)}-${variable})/${sec(c.fondus.sortie)}))`);
  return r;
}

/** Le clip est-il entendu (piste et clip non muets, solo respecté) ? */
export function clipAudible(p: Piste, c: Clip, soloActif: boolean): boolean {
  return !p.muet && !c.muet && (!soloActif || p.solo) && p.volume * (c.volume ?? 1) > 0;
}

/** Volume du clip au cours du temps (`volume=…:eval=frame`). */
export function expressionGain(p: Piste, c: Clip): string {
  const facteurs = [String(nb(p.volume * (c.volume ?? 1)))];
  if (c.automations?.volume?.length)
    facteurs.push(`(${expressionPoints(c.automations.volume, 1)})`);
  facteurs.push(...fondus(c, 't'));
  return facteurs.join('*');
}

/** Vitesse en `atempo` (chaque maillon entre 0,5 et 2). */
export function atempo(vitesse: number): string[] {
  const r: string[] = [];
  let v = vitesse;
  while (v > 2) {
    r.push('atempo=2');
    v /= 2;
  }
  while (v < 0.5) {
    r.push('atempo=0.5');
    v /= 0.5;
  }
  if (Math.abs(v - 1) > 1e-6) r.push(`atempo=${nb(v)}`);
  return r;
}

/** Filtres son : égaliseur trois bandes, voix claire, réduction de bruit. */
export function filtresSonFfmpeg(s: Clip['son']): string[] {
  if (!s) return [];
  const r: string[] = [];
  if (s.reductionBruit) r.push('highpass=f=120', 'afftdn=nf=-25', 'lowpass=f=9000');
  else if (s.voixClaire) r.push('highpass=f=90');
  if (s.graves) r.push(`bass=g=${s.graves}`);
  if (s.mediums) r.push(`equalizer=f=1000:t=o:w=1:g=${s.mediums}`);
  if (s.aigus) r.push(`treble=g=${s.aigus}`);
  if (s.voixClaire) r.push('equalizer=f=3000:t=o:w=1:g=4');
  return r;
}

/** Filtres image : même effet que l'aperçu (`filtreCss`). */
export function filtresImageFfmpeg(f: Clip['filtres']): string[] {
  if (!f) return [];
  const eq: string[] = [];
  if (f.luminosite) eq.push(`brightness=${nb(f.luminosite / 2)}`);
  if (f.contraste !== undefined && f.contraste !== 1) eq.push(`contrast=${nb(f.contraste)}`);
  const saturation = f.noirEtBlanc ? 0 : f.saturation;
  if (saturation !== undefined && saturation !== 1) eq.push(`saturation=${nb(saturation)}`);
  const r = eq.length ? [`eq=${eq.join(':')}`] : [];
  if (f.chaleur) {
    const k = nb(f.chaleur * 0.3);
    r.push(`colorbalance=rm=${k}:bm=${nb(-k)}`);
  }
  if (f.flou) r.push(`gblur=sigma=${nb(f.flou / 2)}`);
  return r;
}

/**
 * Graphe complet : entrée 0 = fond uni de la durée de la vidéo, `silence` = son vide de la même
 * durée, `surcouche` = images PNG des effets et sous-titres (facultatif). Sorties `[v]` et `[a]`.
 */
export function grapheFrise(
  f: Frise,
  entrees: Readonly<Record<string, EntreeClip>>,
  o: { silence: number; surcouche: number | null; musique: number | null },
): string {
  const D = dureeFrise(f);
  const solo = f.pistes.some((p) => p.solo);
  const parties: string[] = [];
  let fond = '0:v';
  let n = 0;
  const pistesVideo = f.pistes.filter((p) => p.type === 'video' && !p.muet).reverse();
  for (const p of pistesVideo)
    for (const c of [...p.clips].sort((a, b) => a.debut - b.debut)) {
      const e = entrees[c.id];
      if (!e?.largeur) continue;
      const r = rectangleClip(f.format, c);
      const k = couverture(e, r);
      const v = c.vitesse ?? 1;
      const effets = effetsDe(p, c);
      const prolonge = prolongement(p, c);
      const tr = transitionFfmpeg(c.transition, { debut: c.debut, ...r });
      const chaine = [
        e.fixe ? 'setpts=PTS-STARTPTS' : `setpts=(PTS-STARTPTS)/${nb(v)}`,
        `fps=${IMAGES_PAR_SECONDE}`,
        `crop=${k.largeur}:${k.hauteur}:${k.x}:${k.y}`,
        `scale=${r.largeur}:${r.hauteur}`,
        'setsar=1',
        ...filtresImageFfmpeg(c.filtres),
        ...effetsVideoFfmpeg(effets),
        'format=yuva420p',
      ];
      if (prolonge) chaine.push(`tpad=stop_mode=clone:stop_duration=${sec(prolonge)}`);
      chaine.push(...tr.filtres);
      if (c.fondus?.entree) chaine.push(`fade=t=in:st=0:d=${sec(c.fondus.entree)}:alpha=1`);
      if (c.fondus?.sortie)
        chaine.push(
          `fade=t=out:st=${sec(c.duree - c.fondus.sortie)}:d=${sec(c.fondus.sortie)}:alpha=1`,
        );
      const op = c.cadre?.opacite ?? 1;
      if (op < 1) chaine.push(`colorchannelmixer=aa=${nb(op)}`);
      if (c.automations?.opacite?.length)
        chaine.push(
          `geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='alpha(X,Y)*(${expressionPoints(c.automations.opacite, 1, 'T')})'`,
        );
      let x = tr.x;
      let y = tr.y;
      if (effets.includes('pulsation') && c.transition?.type !== 'zoom') {
        const pulse = `(1+0.04*sin(2*PI*t/0.6))`;
        chaine.push(
          `scale=w='trunc(${r.largeur}*${pulse}/2)*2':h='trunc(${r.hauteur}*${pulse}/2)*2':eval=frame`,
        );
        x = `${x}+(${r.largeur}-overlay_w)/2`;
        y = `${y}+(${r.hauteur}-overlay_h)/2`;
      }
      if (effets.includes('tremblement')) {
        x = `${x}+10*sin((t-${sec(c.debut)})*90)`;
        y = `${y}+8*cos((t-${sec(c.debut)})*130)`;
      }
      const fin = c.debut + c.duree + prolonge;
      chaine.push(
        `trim=duration=${sec(c.duree + prolonge)}`,
        `setpts=PTS-STARTPTS+${sec(c.debut)}/TB`,
      );
      n++;
      parties.push(`[${e.index}:v]${chaine.join(',')}[c${n}]`);
      const place = x === String(r.x) && y === String(r.y) ? `${r.x}:${r.y}` : `x='${x}':y='${y}'`;
      parties.push(
        `[${fond}][c${n}]overlay=${place}:eof_action=pass:enable='between(t,${sec(c.debut)},${sec(fin)})'[o${n}]`,
      );
      fond = `o${n}`;
    }
  parties.push(
    o.surcouche === null
      ? `[${fond}]format=yuv420p[v]`
      : `[${fond}][${o.surcouche}:v]overlay=0:0:format=auto,format=yuv420p[v]`,
  );

  const sons: string[] = [`[${o.silence}:a]atrim=0:${sec(D)}[s0]`];
  let m = 0;
  for (const p of f.pistes)
    for (const c of p.clips) {
      const e = entrees[c.id];
      if (!e?.son || !clipAudible(p, c, solo)) continue;
      m++;
      const debut = Math.round(c.debut);
      sons.push(
        `[${e.index}:a]${[
          'asetpts=PTS-STARTPTS',
          ...atempo(c.vitesse ?? 1),
          'aresample=48000',
          'aformat=channel_layouts=stereo',
          ...filtresSonFfmpeg(c.son),
          `volume='${expressionGain(p, c)}':eval=frame`,
          `atrim=duration=${sec(c.duree)}`,
          `adelay=${debut}|${debut}`,
        ].join(',')}[s${m}]`,
      );
    }
  if (o.musique !== null) {
    m++;
    sons.push(`[${o.musique}:a]volume=0.5,atrim=0:${sec(D)}[s${m}]`);
  }
  const tous = Array.from({ length: m + 1 }, (_, i) => `[s${i}]`).join('');
  sons.push(
    `${tous}amix=inputs=${m + 1}:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,atrim=0:${sec(D)}[a]`,
  );
  return [...parties, ...sons].join(';');
}

/** Fichiers de la prise et des captures filmées du projet (chemins Storage). */
export interface FichiersFrise {
  prise: { ecran?: string; camera?: string; voix?: string };
  /** `${captureId}:${scene}` → chemin de la capture filmée. */
  captures: Readonly<Record<string, string>>;
}

/** Fichier lu par un clip (média, prise, capture) ; `null` pour un carton, un effet ou un absent. */
export function fichierDuClip(
  f: Pick<Frise, 'medias' | 'captures'>,
  c: Clip,
  fichiers: FichiersFrise,
): { chemin: string; type: 'video' | 'audio' | 'image' } | null {
  const s = c.source;
  if (s.type === 'media') {
    const m = f.medias.find((x) => x.id === s.mediaId);
    return m ? { chemin: m.chemin, type: m.type } : null;
  }
  if (s.type === 'prise') {
    const chemin = fichiers.prise[s.fichier];
    return chemin ? { chemin, type: s.fichier === 'voix' ? 'audio' : 'video' } : null;
  }
  if (s.type === 'capture') {
    const cap = f.captures.find((x) => x.id === s.captureId);
    const chemin = cap ? fichiers.captures[`${cap.id}:${cap.scene}`] : undefined;
    return chemin ? { chemin, type: 'video' } : null;
  }
  return null;
}
