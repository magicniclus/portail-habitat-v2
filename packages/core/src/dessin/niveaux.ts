import { echec, succes, type Resultat } from '../resultat';
import {
  niveau as schemaNiveau,
  type Niveau,
  type Point,
  type Scene,
} from '../schemas/dessinScene';
import type { Contexte } from './commandes';
import { emprise } from './escaliers';
import { detecterPieces, synchroniserPieces } from './pieces';

/** Niveaux (DES-04, DES-05) : ajout, renommage, suppression, murs extérieurs repris, trémies. */
export type TypeNiveau = Niveau['type'];

const NOMS: Record<TypeNiveau, string> = {
  sous_sol: 'Sous-sol',
  rdc: 'Rez-de-chaussée',
  etage: 'Étage',
  combles: 'Combles',
};

const hauteurTotale = (n: Niveau) => n.hauteurSousPlafond + n.epaisseurPlancher;

/** Niveaux du plus bas au plus haut. */
export const niveauxTries = (s: Pick<Scene, 'niveaux'>) =>
  [...s.niveaux].sort((a, b) => a.altitude - b.altitude);

export function niveauInferieur(s: Scene, niveauId: string): Niveau | null {
  const tries = niveauxTries(s);
  const i = tries.findIndex((n) => n.id === niveauId);
  return i > 0 ? tries[i - 1]! : null;
}

/** Niveau juste au-dessus (pour la toiture des parties sans étage), sinon `null`. */
export function niveauSuperieur(s: Scene, niveauId: string): Niveau | null {
  const tries = niveauxTries(s);
  const i = tries.findIndex((n) => n.id === niveauId);
  return i >= 0 ? (tries[i + 1] ?? null) : null;
}

/**
 * Nouveau niveau au-dessus (étage, combles) ou au-dessous (sous-sol) des autres. Avec
 * `copierMurs`, les murs (type « mur ») du niveau voisin sont repris, les pièces recalculées.
 */
export function ajouterNiveau(
  s: Scene,
  e: { type: TypeNiveau; copierMurs: boolean },
  ctx: Contexte,
): Resultat<Scene & { niveauId: string }> {
  if (s.niveaux.length >= 10) return echec('PRECONDITION', { message: '10 niveaux au plus.' });
  const tries = niveauxTries(s);
  const dessous = e.type === 'sous_sol';
  const voisin = dessous ? tries[0]! : tries.at(-1)!;
  const memeType = s.niveaux.filter((n) => n.type === e.type).length;
  const nom =
    e.type === 'etage'
      ? `Étage ${memeType + 1}`
      : memeType
        ? `${NOMS[e.type]} ${memeType + 1}`
        : NOMS[e.type];
  const base = schemaNiveau.parse({
    id: ctx.nouvelId('n'),
    nom,
    type: e.type,
    altitude: 0,
    hauteurSousPlafond: e.type === 'combles' ? 2_200 : 2_500,
  });
  const altitude = dessous
    ? voisin.altitude - hauteurTotale(base)
    : voisin.altitude + hauteurTotale(voisin);
  const murs = e.copierMurs
    ? voisin.murs
        .filter((m) => m.type === 'mur')
        .map((m) => ({
          ...m,
          id: ctx.nouvelId('m'),
          hauteur: base.hauteurSousPlafond,
          hauteurB: undefined,
        }))
    : [];
  const niveau: Niveau = {
    ...base,
    altitude,
    murs,
    pieces: synchroniserPieces([], detecterPieces(murs), () => ctx.nouvelId('p')),
  };
  return succes({ ...s, niveaux: [...s.niveaux, niveau], niveauId: niveau.id });
}

export function renommerNiveau(s: Scene, niveauId: string, nom: string): Resultat<Scene> {
  const propre = nom.trim();
  if (!propre || propre.length > 40)
    return echec('ENTREE_INVALIDE', { message: 'Le nom doit faire de 1 à 40 caractères.' });
  if (!s.niveaux.some((n) => n.id === niveauId)) return echec('INTROUVABLE');
  return succes({
    ...s,
    niveaux: s.niveaux.map((n) => (n.id === niveauId ? { ...n, nom: propre } : n)),
  });
}

export function supprimerNiveau(s: Scene, niveauId: string): Resultat<Scene> {
  if (!s.niveaux.some((n) => n.id === niveauId)) return echec('INTROUVABLE');
  if (s.niveaux.length === 1)
    return echec('PRECONDITION', { message: 'Un plan garde au moins un niveau.' });
  return succes(
    empiler(
      s.niveaux.filter((n) => n.id !== niveauId),
      s,
    ),
  );
}

/**
 * Recalcule les altitudes dans l'ordre donné (du plus bas au plus haut) : le rez-de-chaussée
 * (sinon le plus bas) garde la sienne, chaque niveau se pose sur celui du dessous.
 */
function empiler(ordre: readonly Niveau[], s: Scene): Scene {
  const i0 = Math.max(
    0,
    ordre.findIndex((n) => n.type === 'rdc'),
  );
  const alt: number[] = [];
  alt[i0] = ordre[i0]!.altitude;
  for (let i = i0 + 1; i < ordre.length; i++) alt[i] = alt[i - 1]! + hauteurTotale(ordre[i - 1]!);
  for (let i = i0 - 1; i >= 0; i--) alt[i] = alt[i + 1]! - hauteurTotale(ordre[i]!);
  const parId = new Map(ordre.map((n, i) => [n.id, { ...n, altitude: alt[i]! }]));
  return { ...s, niveaux: s.niveaux.filter((n) => parId.has(n.id)).map((n) => parId.get(n.id)!) };
}

/** Monte (`1`) ou descend (`-1`) un niveau d'un cran ; les altitudes suivent (DES-04). */
export function deplacerNiveau(s: Scene, niveauId: string, sens: 1 | -1): Resultat<Scene> {
  const ordre = niveauxTries(s);
  const i = ordre.findIndex((n) => n.id === niveauId);
  if (i < 0) return echec('INTROUVABLE');
  const j = i + sens;
  if (j < 0 || j >= ordre.length)
    return echec('PRECONDITION', { message: 'Ce niveau est déjà tout en haut ou tout en bas.' });
  [ordre[i], ordre[j]] = [ordre[j]!, ordre[i]!];
  return succes(empiler(ordre, s));
}

/**
 * Hauteur sous plafond et épaisseur du plancher d'un niveau (DES-04) : les murs à pleine
 * hauteur suivent, les niveaux du dessus montent ou descendent d'autant.
 */
export function reglerNiveau(
  s: Scene,
  niveauId: string,
  r: { hauteurSousPlafond?: number; epaisseurPlancher?: number },
): Resultat<Scene> {
  const n = s.niveaux.find((x) => x.id === niveauId);
  if (!n) return echec('INTROUVABLE');
  const hsp = r.hauteurSousPlafond ?? n.hauteurSousPlafond;
  const ep = r.epaisseurPlancher ?? n.epaisseurPlancher;
  if (!Number.isInteger(hsp) || hsp < 1_800 || hsp > 10_000)
    return echec('ENTREE_INVALIDE', { message: 'Hauteur sous plafond : de 1,80 m à 10 m.' });
  if (!Number.isInteger(ep) || ep < 0 || ep > 1_000)
    return echec('ENTREE_INVALIDE', { message: 'Plancher : de 0 à 100 cm.' });
  const regle: Niveau = {
    ...n,
    hauteurSousPlafond: hsp,
    epaisseurPlancher: ep,
    murs: n.murs.map((m) => (m.hauteur === n.hauteurSousPlafond ? { ...m, hauteur: hsp } : m)),
  };
  const suite = { ...s, niveaux: s.niveaux.map((x) => (x.id === niveauId ? regle : x)) };
  return succes(empiler(niveauxTries(suite), suite));
}

/** Trémies d'un niveau (DES-05) : emprise des escaliers du niveau du dessous. */
export function tremies(s: Scene, niveauId: string): Point[][] {
  const n = s.niveaux.find((x) => x.id === niveauId);
  const dessous = niveauInferieur(s, niveauId);
  return [...(n?.tremies ?? []), ...(dessous?.escaliers.map(emprise) ?? [])];
}

/** Hauteur à monter vers le niveau du dessus (pour un nouvel escalier). */
export function hauteurVersLeHaut(s: Scene, niveauId: string): number {
  const n = s.niveaux.find((x) => x.id === niveauId);
  return n ? hauteurTotale(n) : 2_700;
}
