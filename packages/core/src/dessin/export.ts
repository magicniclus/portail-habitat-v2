import { formatNombre } from '../format/nombres';
import { echec, succes, type Resultat } from '../resultat';
import type { Scene } from '../schemas/dessinScene';
import { formatLongueur, formatSurface } from './format';
import { listeMenuiseries } from './listeMenuiseries';
import { LIBELLES_EQUIPEMENT, LIBELLES_POSTE, metreNiveau, type LigneMetre } from './metre';
import { niveauSuperieur, niveauxTries } from './niveaux';

/**
 * Exports du plan (DES-41, DES-43) : métré de toute la maison, CSV, mise en page à l'échelle.
 */

/** Clé stable d'une ligne de métré (cases à cocher, fusion des niveaux). */
export const cleLigneMetre = (l: LigneMetre) =>
  `${l.poste}|${l.famille ?? ''}|${l.prestationId ?? ''}`;

export const libelleLigneMetre = (l: LigneMetre) =>
  l.poste === 'equipements' && l.prestationId
    ? (LIBELLES_EQUIPEMENT[l.prestationId] ?? LIBELLES_POSTE[l.poste])
    : LIBELLES_POSTE[l.poste];

export const quantiteMetre = (l: LigneMetre) =>
  l.unite === 'm2'
    ? formatSurface(l.quantite)
    : l.unite === 'ml'
      ? formatLongueur(l.quantite)
      : formatNombre(l.quantite);

/** Métré de tous les niveaux, lignes identiques additionnées (toiture : parties sans étage). */
export function metreScene(s: Scene): LigneMetre[] {
  const lignes = new Map<string, LigneMetre>();
  for (const n of niveauxTries(s))
    for (const l of metreNiveau(n, niveauSuperieur(s, n.id))) {
      const meme = lignes.get(cleLigneMetre(l));
      if (meme) meme.quantite += l.quantite;
      else lignes.set(cleLigneMetre(l), { ...l });
    }
  return [...lignes.values()];
}

/** Menuiseries de toute la maison, par modèle identique. */
export function menuiseriesScene(s: Scene): { libelle: string; nombre: number }[] {
  const total = new Map<string, number>();
  for (const n of s.niveaux)
    for (const m of listeMenuiseries(n))
      total.set(m.libelle, (total.get(m.libelle) ?? 0) + m.nombre);
  return [...total].map(([libelle, nombre]) => ({ libelle, nombre }));
}

const cellule = (v: string) => (/[;"\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const UNITES = { m2: 'm²', ml: 'm', u: 'u' } as const;

/** CSV (séparateur « ; », décimales à la virgule, BOM pour Excel) des lignes cochées. */
export function metreCsv(
  lignes: readonly LigneMetre[],
  menuiseries: readonly { libelle: string; nombre: number }[] = [],
): string {
  const valeur = (l: LigneMetre) =>
    l.unite === 'm2'
      ? formatNombre(l.quantite / 1_000_000, 2)
      : l.unite === 'ml'
        ? formatNombre(l.quantite / 1_000, 2)
        : String(l.quantite);
  const rangs = [
    ['Poste', 'Quantité', 'Unité', 'Prestation'],
    ...lignes.map((l) => [libelleLigneMetre(l), valeur(l), UNITES[l.unite], l.prestationId ?? '']),
    ...menuiseries.map((m) => [`Menuiserie : ${m.libelle}`, String(m.nombre), 'u', '']),
  ];
  return `\uFEFF${rangs.map((r) => r.map(cellule).join(';')).join('\r\n')}\r\n`;
}

/** Papier à l'italienne (mm) et échelles proposées. */
export const FORMATS_PAPIER = { A4: { l: 297, h: 210 }, A3: { l: 420, h: 297 } } as const;
export type FormatPapier = keyof typeof FORMATS_PAPIER;
export const ECHELLES = [50, 100] as const;
export type Echelle = (typeof ECHELLES)[number];
/** Marges et cartouche (mm de papier). */
export const MARGE_PAPIER = 10;
export const HAUTEUR_CARTOUCHE = 28;

export interface MiseEnPage {
  papier: { l: number; h: number };
  /** Coin haut-gauche du dessin sur le papier (mm) et mm de papier par mm réel. */
  origine: { x: number; y: number };
  k: number;
}

/** Place le cadre du dessin (mm réels) au centre de la zone utile ; refus s'il ne tient pas. */
export function miseEnPage(
  cadre: { x: number; y: number; l: number; h: number },
  echelle: Echelle,
  format: FormatPapier,
): Resultat<MiseEnPage> {
  const papier = FORMATS_PAPIER[format];
  const zone = {
    l: papier.l - 2 * MARGE_PAPIER,
    h: papier.h - 2 * MARGE_PAPIER - HAUTEUR_CARTOUCHE,
  };
  const k = 1 / echelle;
  const [l, h] = [cadre.l * k, cadre.h * k];
  if (l > zone.l || h > zone.h)
    return echec('PRECONDITION', {
      message: `Le plan ne tient pas en ${format} au 1/${echelle} : choisissez ${format === 'A4' ? 'le A3 ou ' : ''}une échelle plus petite.`,
    });
  return succes({
    papier,
    k,
    origine: { x: MARGE_PAPIER + (zone.l - l) / 2, y: MARGE_PAPIER + (zone.h - h) / 2 },
  });
}

/** Première combinaison qui tient, de la plus détaillée à la plus réduite. */
export function echelleConseillee(cadre: { x: number; y: number; l: number; h: number }) {
  for (const echelle of ECHELLES)
    for (const format of ['A4', 'A3'] as const)
      if (miseEnPage(cadre, echelle, format).ok) return { echelle, format };
  return null;
}

/** Cadre à imprimer d'un niveau : murs et pièces, plus 1,50 m pour les cotes ; `null` si vide. */
export function cadreImpression(n: Scene['niveaux'][number]) {
  const pts = [...n.murs.flatMap((m) => [m.a, m.b]), ...n.pieces.flatMap((p) => p.contour)];
  if (!pts.length) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs) - 1_500;
  const y = Math.min(...ys) - 1_500;
  return { x, y, l: Math.max(...xs) + 1_500 - x, h: Math.max(...ys) + 1_500 - y };
}
