import { z } from '../zod';
import { NOMS_FORMATS, type FormatStudio } from './formats';
import { artisanFictif, calque, capture, planMontage } from './plan';

/**
 * Frise multipistes du Studio (STUDIO.md §5 bis) : le montage « comme dans un logiciel de
 * montage ». Des pistes vidéo (la première passe devant), audio et d'effets ; sur chaque piste des
 * clips posés dans le temps. Un clip montre un média importé, un passage de la prise, une capture
 * de Portail Travaux, un carton ou un effet animé ; il a son volume, ses fondus, sa vitesse, ses
 * filtres image et son, et des automations (points de volume ou d'opacité dans le temps).
 * Temps en millisecondes entières ; un temps d'automation est relatif au début du clip.
 */

const ms = z.number().int().min(0).max(3_600_000);
const id = z.string().regex(/^[a-z0-9_-]{1,24}$/);

/** Limites des médias importés (octets) : par fichier et pour tout le projet. */
export const LIMITES_MEDIAS = {
  video: 1_073_741_824,
  audio: 209_715_200,
  image: 20_971_520,
  projet: 5_368_709_120,
} as const;

export const media = z.strictObject({
  id,
  type: z.enum(['video', 'audio', 'image']),
  chemin: z
    .string()
    .regex(
      /^studio\/[A-Za-z0-9_-]{1,128}\/medias\/[A-Za-z0-9_-]{1,40}\.(mp4|mov|m4v|webm|mp3|m4a|wav|aac|ogg|png|jpg|jpeg|webp)$/,
    ),
  nom: z.string().trim().min(1).max(120),
  /** Durée (0 pour une image). */
  dureeMs: ms,
  taille: z.number().int().min(0).max(LIMITES_MEDIAS.video),
});
export type Media = z.infer<typeof media>;

const source = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('media'), mediaId: id, debutSource: ms }),
  z.strictObject({
    type: z.literal('prise'),
    fichier: z.enum(['ecran', 'camera', 'voix']),
    debutSource: ms,
  }),
  z.strictObject({ type: z.literal('capture'), captureId: id, debutSource: ms }),
  z.strictObject({ type: z.literal('carton'), texte: z.string().trim().min(1).max(80) }),
  z.strictObject({ type: z.literal('effet'), calque }),
]);
export type SourceClip = z.infer<typeof source>;

const point = z.strictObject({ t: ms, v: z.number().min(0).max(2) });
export type PointAutomation = z.infer<typeof point>;

export const filtresImage = z.strictObject({
  luminosite: z.number().min(-1).max(1).optional(),
  contraste: z.number().min(0).max(2).optional(),
  saturation: z.number().min(0).max(2).optional(),
  chaleur: z.number().min(-1).max(1).optional(),
  flou: z.number().min(0).max(20).optional(),
  noirEtBlanc: z.boolean().optional(),
});
export const filtresSon = z.strictObject({
  graves: z.number().min(-12).max(12).optional(),
  mediums: z.number().min(-12).max(12).optional(),
  aigus: z.number().min(-12).max(12).optional(),
  voixClaire: z.boolean().optional(),
  reductionBruit: z.boolean().optional(),
});

export const clip = z.strictObject({
  id,
  debut: ms,
  duree: z.number().int().min(100).max(3_600_000),
  source,
  /** Volume du clip (1 = tel quel, jusqu'à 2). */
  volume: z.number().min(0).max(2).optional(),
  muet: z.boolean().optional(),
  vitesse: z.number().min(0.25).max(4).optional(),
  fondus: z
    .strictObject({
      entree: z.number().int().min(0).max(10_000),
      sortie: z.number().int().min(0).max(10_000),
    })
    .optional(),
  /** Place dans l'image (fractions) et opacité : incrustation, image dans l'image. */
  cadre: z
    .strictObject({
      x: z.number().min(-1).max(2),
      y: z.number().min(-1).max(2),
      largeur: z.number().min(0.05).max(2),
      hauteur: z.number().min(0.05).max(2),
      opacite: z.number().min(0).max(1),
    })
    .optional(),
  filtres: filtresImage.optional(),
  son: filtresSon.optional(),
  automations: z
    .strictObject({
      volume: z.array(point).max(64).optional(),
      opacite: z.array(point).max(64).optional(),
    })
    .optional(),
});
export type Clip = z.infer<typeof clip>;

export const TYPES_PISTE = ['video', 'audio', 'texte'] as const;
export type TypePiste = (typeof TYPES_PISTE)[number];
export const piste = z.strictObject({
  id,
  type: z.enum(TYPES_PISTE),
  nom: z.string().trim().min(1).max(40),
  muet: z.boolean(),
  solo: z.boolean(),
  verrou: z.boolean(),
  volume: z.number().min(0).max(2),
  clips: z.array(clip).max(300),
});
export type Piste = z.infer<typeof piste>;

export const frise = z.strictObject({
  format: z.enum(NOMS_FORMATS as [FormatStudio, ...FormatStudio[]]),
  titre: z.string().trim().min(1).max(100),
  /** De haut en bas ; entre pistes vidéo, la plus haute passe devant. */
  pistes: z.array(piste).min(1).max(16),
  medias: z.array(media).max(200),
  captures: z.array(capture).max(12),
  artisan: artisanFictif.nullable(),
  sousTitres: z.boolean(),
  /** Nappe musicale du robot (en plus des sons importés). */
  musique: z.boolean(),
  /** Durée de la prise enregistrée (limite des clips « prise »), si elle existe. */
  dureePriseMs: ms.optional(),
  /** Miniature (image de couverture) : image à `tempsMs`, texte court, mot en avant. */
  miniature: planMontage.shape.miniature,
});
export type Frise = z.infer<typeof frise>;

const LIBELLES: Record<TypePiste, string> = { video: 'Vidéo', audio: 'Audio', texte: 'Effets' };

export function nouvelIdFrise(prefixe: string, pris: Iterable<string>): string {
  const deja = new Set(pris);
  let n = 1;
  while (deja.has(`${prefixe}${n}`)) n++;
  return `${prefixe}${n}`;
}

const pisteVide = (type: TypePiste, idPiste: string, nom: string): Piste => ({
  id: idPiste,
  type,
  nom,
  muet: false,
  solo: false,
  verrou: false,
  volume: 1,
  clips: [],
});

/** Montage vide : une piste d'effets, une vidéo, une audio. */
export function creerFrise(format: FormatStudio, titre: string): Frise {
  return {
    format,
    titre,
    pistes: [
      pisteVide('texte', 't1', 'Effets'),
      pisteVide('video', 'v1', 'Vidéo 1'),
      pisteVide('audio', 'a1', 'Audio 1'),
    ],
    medias: [],
    captures: [],
    artisan: null,
    sousTitres: false,
    musique: false,
  };
}

/**
 * Nouvelle piste : une vidéo se place au-dessus des autres (devant à l'image), une piste d'effets
 * tout en haut, une audio tout en bas.
 */
export function ajouterPiste(f: Frise, type: TypePiste): Frise {
  if (f.pistes.length >= 16) return f;
  const n = f.pistes.filter((p) => p.type === type).length + 1;
  const p = pisteVide(
    type,
    nouvelIdFrise(
      type[0]!,
      f.pistes.map((x) => x.id),
    ),
    `${LIBELLES[type]} ${n}`,
  );
  const pistes = [...f.pistes];
  if (type === 'audio') pistes.push(p);
  else if (type === 'texte') pistes.unshift(p);
  else {
    const i = pistes.findIndex((x) => x.type === 'video');
    pistes.splice(i === -1 ? pistes.length : i, 0, p);
  }
  return { ...f, pistes };
}

/** Supprime une piste (jamais la dernière de son type) et ses clips. */
export function supprimerPiste(f: Frise, pisteId: string): Frise {
  const p = f.pistes.find((x) => x.id === pisteId);
  if (!p || f.pistes.filter((x) => x.type === p.type).length <= 1) return f;
  return { ...f, pistes: f.pistes.filter((x) => x.id !== pisteId) };
}

export function modifierPiste(
  f: Frise,
  pisteId: string,
  champs: Partial<Pick<Piste, 'nom' | 'muet' | 'solo' | 'verrou' | 'volume'>>,
): Frise {
  return { ...f, pistes: f.pistes.map((p) => (p.id === pisteId ? { ...p, ...champs } : p)) };
}

export const finClip = (c: Pick<Clip, 'debut' | 'duree'>) => c.debut + c.duree;

/** Durée de la vidéo : fin du dernier clip. */
export function dureeFrise(f: Pick<Frise, 'pistes'>): number {
  return f.pistes.reduce((m, p) => p.clips.reduce((n, c) => Math.max(n, finClip(c)), m), 0);
}

/** Interpolation linéaire entre points (le premier avant, le dernier après). */
export function valeurAutomation(
  points: readonly PointAutomation[] | undefined,
  t: number,
  defaut: number,
): number {
  if (!points?.length) return defaut;
  if (t <= points[0]!.t) return points[0]!.v;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (t <= b.t) return b.t === a.t ? b.v : a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t);
  }
  return points.at(-1)!.v;
}

/** Gain sonore réel d'un clip à `t` (ms dans le clip) : piste, solo, volume, fondus, automation. */
export function gainClip(p: Piste, c: Clip, t: number, soloActif: boolean): number {
  if (p.muet || c.muet || (soloActif && !p.solo)) return 0;
  const f = c.fondus;
  const entree = f?.entree ? Math.min(1, Math.max(0, t / f.entree)) : 1;
  const sortie = f?.sortie ? Math.min(1, Math.max(0, (c.duree - t) / f.sortie)) : 1;
  return (
    p.volume * (c.volume ?? 1) * valeurAutomation(c.automations?.volume, t, 1) * entree * sortie
  );
}

/** Opacité d'un clip à `t` (ms dans le clip) : cadre × automation. */
export function opaciteClip(c: Clip, t: number): number {
  return (c.cadre?.opacite ?? 1) * valeurAutomation(c.automations?.opacite, t, 1);
}
