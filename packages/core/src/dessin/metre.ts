import type {
  FamilleRevetement,
  Mur,
  Niveau,
  Ouverture,
  Piece,
  Point,
} from '../schemas/dessinScene';
import { objetDuCatalogue } from './catalogue';
import { planDeTravail } from './cuisine';
import { aire, perimetre, pointDansPolygone } from './geometrie';
import { longueurMur, surfaceFaceNette } from './murs';

/**
 * Métré d'un niveau (DES-43) : quantités entières par poste, rattachées quand elle existe
 * à une prestation de docs/data/prestations-catalogue.json (les prix restent calculés
 * par le simulateur, côté serveur).
 */
export const POSTES_METRE = [
  'sol',
  'murs',
  'plafond',
  'plinthes',
  'cloisons',
  'portes_interieures',
  'porte_entree',
  'porte_garage',
  'fenetres',
  'terrasse',
  'piscine',
  'escalier',
  'plan_de_travail',
  'equipements',
] as const;
export type PosteMetre = (typeof POSTES_METRE)[number];

export const LIBELLES_POSTE: Record<PosteMetre, string> = {
  sol: 'Revêtement de sol',
  murs: 'Revêtement des murs',
  plafond: 'Plafonds',
  plinthes: 'Plinthes',
  cloisons: 'Cloisons',
  portes_interieures: 'Portes intérieures',
  porte_entree: 'Porte d’entrée',
  porte_garage: 'Porte de garage',
  fenetres: 'Fenêtres et portes-fenêtres',
  terrasse: 'Terrasse',
  piscine: 'Piscine',
  escalier: 'Escalier',
  plan_de_travail: 'Plan de travail',
  equipements: 'Équipements',
};

/** Libellé des équipements posés, par prestation du catalogue. */
export const LIBELLES_EQUIPEMENT: Record<string, string> = {
  'cuisine-pose': 'Meubles de cuisine',
  'sdb-douche': 'Douche',
  wc: 'WC',
  dressing: 'Dressing',
  'prises-eclairage': 'Prises, interrupteurs et points lumineux',
  'tableau-electrique': 'Tableau électrique',
  'chauffage-electrique': 'Radiateurs',
  chaudiere: 'Chaudière',
  'chauffe-eau': 'Ballon d’eau chaude',
  poele: 'Poêle',
  'abri-jardin': 'Abri de jardin',
};

/** mm² pour `m2`, mm pour `ml`, nombre pour `u`. */
export type UniteMetre = 'm2' | 'ml' | 'u';

export interface LigneMetre {
  poste: PosteMetre;
  famille?: FamilleRevetement;
  quantite: number;
  unite: UniteMetre;
  prestationId: string | null;
}

/** Prestation correspondant à un revêtement, `null` si le catalogue n'en a pas. */
const PRESTATION_SOL: Partial<Record<FamilleRevetement, string>> = {
  parquet: 'parquet',
  stratifie: 'sol-souple',
  vinyle: 'sol-souple',
  moquette: 'sol-souple',
  beton_cire: 'beton-cire-sol',
};
const PRESTATION_MUR: Partial<Record<FamilleRevetement, string>> = {
  papier_peint: 'papier-peint',
  enduit: 'enduit-deco',
};
const PRESTATION_FIXE: Partial<Record<PosteMetre, string>> = {
  cloisons: 'cloison',
  portes_interieures: 'portes-interieures',
  porte_entree: 'porte-entree',
  porte_garage: 'porte-garage',
  terrasse: 'terrasse',
  piscine: 'piscine',
  escalier: 'escalier',
};

const PORTES_INTERIEURES: readonly Ouverture['type'][] = [
  'porte',
  'porte_double',
  'porte_coulissante',
  'porte_galandage',
  'porte_pivot',
  'ouverture_libre',
  'arche',
];
const FENETRES: readonly Ouverture['type'][] = [
  'fenetre',
  'fenetre_double',
  'fenetre_oscillo',
  'fenetre_fixe',
  'oeil_de_boeuf',
  'porte_fenetre',
  'baie_coulissante',
];
const MURS_REVETUS: readonly Mur['type'][] = ['mur', 'cloison', 'demi_mur'];

/** Point situé juste devant une face du mur (a : à gauche en allant de a vers b). */
function devantLaFace(m: Mur, face: 'a' | 'b'): Point {
  const l = longueurMur(m);
  const s = face === 'a' ? 1 : -1;
  const d = m.epaisseur / 2 + 50;
  return {
    x: (m.a.x + m.b.x) / 2 + (-(m.b.y - m.a.y) / l) * d * s,
    y: (m.a.y + m.b.y) / 2 + ((m.b.x - m.a.x) / l) * d * s,
  };
}

const faceDansUnePiece = (m: Mur, face: 'a' | 'b', pieces: readonly Piece[]) =>
  pieces.some((p) => pointDansPolygone(devantLaFace(m, face), p.contour));

export function metreNiveau(n: Niveau): LigneMetre[] {
  const lignes: LigneMetre[] = [];
  const ajouter = (l: LigneMetre) => {
    if (l.quantite <= 0) return;
    const meme = lignes.find(
      (x) => x.poste === l.poste && x.famille === l.famille && x.prestationId === l.prestationId,
    );
    if (meme) meme.quantite += l.quantite;
    else lignes.push({ ...l });
  };

  for (const p of n.pieces) {
    const s = Math.round(aire(p.contour));
    ajouter({
      poste: 'sol',
      famille: p.sol.famille,
      quantite: s,
      unite: 'm2',
      prestationId: PRESTATION_SOL[p.sol.famille] ?? null,
    });
    ajouter({
      poste: 'plafond',
      famille: p.plafond.famille,
      quantite: s,
      unite: 'm2',
      prestationId: null,
    });
  }

  let plinthes = n.pieces.reduce((s, p) => s + perimetre(p.contour), 0);
  for (const m of n.murs.filter((x) => MURS_REVETUS.includes(x.type))) {
    for (const face of ['a', 'b'] as const) {
      if (!faceDansUnePiece(m, face, n.pieces)) continue;
      const rev = face === 'a' ? m.faceA : m.faceB;
      ajouter({
        poste: 'murs',
        famille: rev.famille,
        quantite: surfaceFaceNette(m, n.ouvertures),
        unite: 'm2',
        prestationId: PRESTATION_MUR[rev.famille] ?? null,
      });
      for (const o of n.ouvertures) if (o.murId === m.id && o.allege === 0) plinthes -= o.largeur;
    }
  }
  ajouter({ poste: 'plinthes', quantite: Math.round(plinthes), unite: 'ml', prestationId: null });

  const cloisons = n.murs
    .filter((m) => m.type === 'cloison')
    .reduce((s, m) => s + longueurMur(m), 0);
  const fixe = (poste: PosteMetre, quantite: number, unite: UniteMetre) =>
    ajouter({ poste, quantite, unite, prestationId: PRESTATION_FIXE[poste] ?? null });
  fixe('cloisons', Math.round(cloisons), 'ml');

  const compter = (types: readonly Ouverture['type'][]) =>
    n.ouvertures.filter((o) => types.includes(o.type)).length;
  fixe('portes_interieures', compter(PORTES_INTERIEURES), 'u');
  fixe('porte_entree', compter(['porte_entree']), 'u');
  fixe('porte_garage', compter(['porte_garage']), 'u');
  fixe('fenetres', compter(FENETRES), 'u');
  fixe(
    'terrasse',
    Math.round(n.exterieur.terrasses.reduce((s, t) => s + aire(t.contour), 0)),
    'm2',
  );
  fixe('piscine', n.exterieur.piscines.length, 'u');
  fixe('escalier', n.escaliers.length, 'u');

  // Cuisine et équipements posés (DES-23, DES-43) : rattachés à leur prestation.
  ajouter({
    poste: 'plan_de_travail',
    quantite: planDeTravail(n).longueur,
    unite: 'ml',
    prestationId: 'cuisine-plan',
  });
  for (const o of n.objets) {
    const prestationId = objetDuCatalogue(o.catalogueId)?.prestationId;
    if (prestationId) ajouter({ poste: 'equipements', quantite: 1, unite: 'u', prestationId });
  }
  return lignes;
}

/**
 * Volume d'eau en litres pour les formes définies par leurs seules dimensions ;
 * `null` pour les formes libres (haricot, L), calculées depuis leur contour au lot 15h.
 */
export function volumePiscine(p: {
  forme: string;
  longueur: number;
  largeur: number;
  profondeurMin: number;
  profondeurMax: number;
}): number | null {
  const profondeur = (p.profondeurMin + p.profondeurMax) / 2;
  const surface =
    p.forme === 'rectangle' || p.forme === 'couloir' || p.forme === 'hors_sol'
      ? p.longueur * p.largeur
      : p.forme === 'ronde'
        ? Math.PI * (p.largeur / 2) ** 2
        : p.forme === 'ovale'
          ? Math.PI * (p.longueur / 2) * (p.largeur / 2)
          : null;
  return surface === null ? null : Math.round((surface * profondeur) / 1_000_000);
}
