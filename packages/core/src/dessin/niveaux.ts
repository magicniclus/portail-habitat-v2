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
export const niveauxTries = (s: Scene) => [...s.niveaux].sort((a, b) => a.altitude - b.altitude);

export function niveauInferieur(s: Scene, niveauId: string): Niveau | null {
  const tries = niveauxTries(s);
  const i = tries.findIndex((n) => n.id === niveauId);
  return i > 0 ? tries[i - 1]! : null;
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
  return succes({ ...s, niveaux: s.niveaux.filter((n) => n.id !== niveauId) });
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
