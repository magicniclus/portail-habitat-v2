import { echec, succes, type Resultat } from '../resultat';
import {
  ouverture as schemaOuverture,
  type Mur,
  type Niveau,
  type Ouverture,
  type Point,
} from '../schemas/dessinScene';
import type { Contexte } from './commandes';
import { distance, projeter } from './geometrie';
import { dansUnCoulissement, placeCoulissant } from './menuiseries';
import { longueurMur } from './murs';

/** Portes, fenêtres et ouvertures (DES-13, DES-14). Dimensions par défaut en mm. */
export type TypeOuverture = Ouverture['type'];
export type FamilleOuverture = 'porte' | 'fenetre' | 'libre';

export const CATALOGUE_OUVERTURES: Record<
  TypeOuverture,
  { libelle: string; famille: FamilleOuverture; largeur: number; hauteur: number; allege: number }
> = {
  porte: { libelle: 'Porte', famille: 'porte', largeur: 830, hauteur: 2040, allege: 0 },
  porte_double: {
    libelle: 'Porte double',
    famille: 'porte',
    largeur: 1460,
    hauteur: 2040,
    allege: 0,
  },
  porte_coulissante: {
    libelle: 'Porte coulissante',
    famille: 'porte',
    largeur: 830,
    hauteur: 2040,
    allege: 0,
  },
  porte_galandage: {
    libelle: 'Porte à galandage',
    famille: 'porte',
    largeur: 830,
    hauteur: 2040,
    allege: 0,
  },
  porte_galandage_double: {
    libelle: 'Porte à galandage double',
    famille: 'porte',
    largeur: 1460,
    hauteur: 2040,
    allege: 0,
  },
  porte_pivot: {
    libelle: 'Porte pivot',
    famille: 'porte',
    largeur: 1000,
    hauteur: 2200,
    allege: 0,
  },
  porte_entree: {
    libelle: 'Porte d’entrée',
    famille: 'porte',
    largeur: 900,
    hauteur: 2150,
    allege: 0,
  },
  porte_garage: {
    libelle: 'Porte de garage',
    famille: 'porte',
    largeur: 2400,
    hauteur: 2000,
    allege: 0,
  },
  fenetre: { libelle: 'Fenêtre', famille: 'fenetre', largeur: 800, hauteur: 1250, allege: 950 },
  fenetre_double: {
    libelle: 'Fenêtre 2 vantaux',
    famille: 'fenetre',
    largeur: 1200,
    hauteur: 1250,
    allege: 950,
  },
  fenetre_oscillo: {
    libelle: 'Fenêtre oscillo-battante',
    famille: 'fenetre',
    largeur: 1000,
    hauteur: 1250,
    allege: 950,
  },
  fenetre_fixe: {
    libelle: 'Fenêtre fixe',
    famille: 'fenetre',
    largeur: 800,
    hauteur: 1000,
    allege: 1100,
  },
  oeil_de_boeuf: {
    libelle: 'Œil-de-bœuf',
    famille: 'fenetre',
    largeur: 600,
    hauteur: 600,
    allege: 1400,
  },
  porte_fenetre: {
    libelle: 'Porte-fenêtre',
    famille: 'porte',
    largeur: 1200,
    hauteur: 2150,
    allege: 0,
  },
  baie_coulissante: {
    libelle: 'Baie coulissante',
    famille: 'fenetre',
    largeur: 2400,
    hauteur: 2150,
    allege: 0,
  },
  ouverture_libre: {
    libelle: 'Ouverture libre',
    famille: 'libre',
    largeur: 900,
    hauteur: 2100,
    allege: 0,
  },
  arche: { libelle: 'Arche', famille: 'libre', largeur: 1000, hauteur: 2200, allege: 0 },
};

/** Mur le plus proche d'un point (à `tolerance` mm près) et position le long de ce mur. */
export function murSousLePoint(
  murs: readonly Mur[],
  p: Point,
  tolerance: number,
): { mur: Mur; distanceDepuisA: number } | null {
  let meilleur: { mur: Mur; distanceDepuisA: number; d: number } | null = null;
  for (const mur of murs) {
    if (mur.type === 'separation' || mur.type === 'poteau' || mur.type === 'poutre') continue;
    const { point, t } = projeter(p, mur.a, mur.b);
    const d = distance(p, point);
    if (d <= Math.max(tolerance, mur.epaisseur / 2) && (!meilleur || d < meilleur.d))
      meilleur = { mur, distanceDepuisA: t * longueurMur(mur), d };
  }
  return meilleur ? { mur: meilleur.mur, distanceDepuisA: meilleur.distanceDepuisA } : null;
}

const chevauche = (
  a: Pick<Ouverture, 'position' | 'largeur'>,
  b: Pick<Ouverture, 'position' | 'largeur'>,
) => a.position < b.position + b.largeur && b.position < a.position + a.largeur;

/** Ouverture valide sur son mur : dans la longueur, sans chevaucher une autre ouverture. */
function verifier(n: Niveau, o: Ouverture): Resultat<Ouverture> {
  const mur = n.murs.find((m) => m.id === o.murId);
  if (!mur) return echec('INTROUVABLE');
  if (o.largeur > Math.round(longueurMur(mur)))
    return echec('PRECONDITION', { message: 'Le mur est trop court pour cette ouverture.' });
  if (o.position < 0 || o.position + o.largeur > Math.round(longueurMur(mur)))
    return echec('PRECONDITION', { message: 'L’ouverture doit rester dans le mur.' });
  if (o.allege + o.hauteur > (mur.hauteurB ? Math.min(mur.hauteur, mur.hauteurB) : mur.hauteur))
    return echec('PRECONDITION', { message: 'L’ouverture dépasse la hauteur du mur.' });
  if (n.ouvertures.some((x) => x.id !== o.id && x.murId === o.murId && chevauche(x, o)))
    return echec('PRECONDITION', { message: 'Elle chevaucherait une autre porte ou fenêtre.' });
  if (dansUnCoulissement(n, o))
    return echec('PRECONDITION', {
      message: 'Elle serait dans la place d’une porte coulissante (poche ou rail).',
    });
  const coulissant = placeCoulissant(n, o, mur);
  if (coulissant) return echec('PRECONDITION', { message: coulissant });
  return succes(o);
}

/**
 * Pose une ouverture centrée sur `centre` (mm depuis l'extrémité a du mur), recalée pour
 * tenir dans le mur (DES-14).
 */
export function poserOuverture(
  n: Niveau,
  e: { murId: string; type: TypeOuverture; centre: number },
  ctx: Contexte,
): Resultat<Niveau> {
  const mur = n.murs.find((m) => m.id === e.murId);
  if (!mur) return echec('INTROUVABLE');
  const d = CATALOGUE_OUVERTURES[e.type];
  const l = Math.round(longueurMur(mur));
  // Recalée dans le mur ; un mur trop court est refusé ensuite par `verifier`.
  const position = Math.max(0, Math.round(Math.min(e.centre - d.largeur / 2, l - d.largeur)));
  const brut = schemaOuverture.parse({
    id: ctx.nouvelId('o'),
    murId: mur.id,
    position,
    largeur: d.largeur,
    hauteur: d.hauteur,
    allege: d.allege,
    type: e.type,
  });
  // Porte coulissante sans place à gauche : on essaie de la ranger à droite.
  let r = verifier(n, brut);
  if (
    !r.ok &&
    placeCoulissant(n, brut, mur) &&
    !placeCoulissant(n, { ...brut, sens: 'droite' }, mur)
  )
    r = verifier(n, { ...brut, sens: 'droite' });
  return r.ok ? succes({ ...n, ouvertures: [...n.ouvertures, r.data] }) : r;
}

export type ModificationOuverture = Partial<
  Pick<
    Ouverture,
    | 'position'
    | 'largeur'
    | 'hauteur'
    | 'allege'
    | 'sens'
    | 'cote'
    | 'volet'
    | 'remplissage'
    | 'petitsBois'
    | 'materiau'
    | 'couleur'
    | 'imposte'
  >
>;

export function modifierOuverture(
  n: Niveau,
  id: string,
  modif: ModificationOuverture,
): Resultat<Niveau> {
  const o = n.ouvertures.find((x) => x.id === id);
  if (!o) return echec('INTROUVABLE');
  const p = schemaOuverture.safeParse({ ...o, ...modif });
  if (!p.success) return echec('ENTREE_INVALIDE', { message: p.error.issues[0]!.message });
  const r = verifier(n, p.data);
  return r.ok
    ? succes({ ...n, ouvertures: n.ouvertures.map((x) => (x.id === id ? r.data : x)) })
    : r;
}

export function supprimerOuverture(n: Niveau, id: string): Resultat<Niveau> {
  if (!n.ouvertures.some((x) => x.id === id)) return echec('INTROUVABLE');
  return succes({ ...n, ouvertures: n.ouvertures.filter((x) => x.id !== id) });
}

/** Point du mur à `distanceDepuisA` mm de son extrémité a (rendu des ouvertures). */
export function pointSurMur(m: Pick<Mur, 'a' | 'b'>, distanceDepuisA: number): Point {
  const l = longueurMur(m);
  return {
    x: m.a.x + ((m.b.x - m.a.x) / l) * distanceDepuisA,
    y: m.a.y + ((m.b.y - m.a.y) / l) * distanceDepuisA,
  };
}
