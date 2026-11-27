import {
  aimanter,
  deplacerMur,
  distance,
  niveauInferieur,
  niveauSuperieur,
  reperesDuGlissement,
  toleranceEnMm,
  viserGlissementMur,
  type Niveau,
  type Point,
  type Scene,
} from '@ph/core/dessin';
import { contexteNavigateur as ctx, niveauDe, surNiveau, type EtatEditeur } from './etatBase';

/** Niveaux du dessous et du dessus : leurs murs servent aussi d'accroche (étage superposé). */
export function niveauxVoisins(s: Scene, niveauId: string): Niveau[] {
  return [niveauInferieur(s, niveauId), niveauSuperieur(s, niveauId)].filter(
    (v): v is Niveau => v !== null,
  );
}

/**
 * Mur glissé à la souris : d'équerre s'il est relié, calé sur les alignements des murs du
 * niveau et des niveaux voisins (guides affichés), sans aimant avec Alt ou l'aimant coupé.
 */
export function glisserMur(
  e: EtatEditeur,
  murId: string,
  depart: { a: Point; b: Point },
  delta: Point,
  geste: string,
  libre = false,
): EtatEditeur {
  const n = niveauDe(e);
  const m = n.murs.find((x) => x.id === murId);
  if (!m) return e;
  const r = viserGlissementMur(n, murId, depart, delta, {
    tolerance: toleranceEnMm(12, e.zoom),
    reperes: reperesDuGlissement(n, murId, niveauxVoisins(e.historique.present, n.id)),
    libre: libre || !e.aimant,
  });
  const pas = { x: depart.a.x + r.delta.x - m.a.x, y: depart.a.y + r.delta.y - m.a.y };
  const suite = surNiveau(e, (x) => deplacerMur(x, murId, pas, ctx), geste);
  return { ...suite, guides: r.guides };
}

/**
 * Extrémité de mur tirée à la souris (DES-06) : aimantée comme au tracé, depuis l'autre bout
 * du mur (angles droits et à 45°, alignements, autres murs — aussi ceux des niveaux voisins —,
 * grille de 5 cm). Les murs reliés
 * à cette extrémité la suivent : ils ne servent pas de cible.
 */
export function viserExtremite(
  n: Niveau,
  murId: string,
  bout: 'a' | 'b',
  vers: Point,
  zoom: number,
  voisins: readonly Niveau[] = [],
): Point {
  const m = n.murs.find((x) => x.id === murId);
  if (!m) return vers;
  const ici = m[bout];
  const origine = bout === 'a' ? m.b : m.a;
  const autres = [
    ...n.murs.filter((x) => x.id !== murId && distance(x.a, ici) > 1 && distance(x.b, ici) > 1),
    ...voisins.flatMap((v) => v.murs),
  ];
  return aimanter(
    vers,
    {
      points: autres.flatMap((x) => [x.a, x.b]),
      segments: autres.map((x) => [x.a, x.b] as const),
    },
    { tolerance: toleranceEnMm(12, zoom), grille: 50, origine, pasAngle: 450 },
  ).point;
}
