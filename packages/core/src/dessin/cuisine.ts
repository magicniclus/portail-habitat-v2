import type { Niveau, Objet, Point } from '../schemas/dessinScene';
import { objetDuCatalogue, type ModuleCuisine } from './catalogue';
import { distance } from './geometrie';
import { contourObjet } from './objets';

/** Cuisine (DES-23) : plan de travail continu sur les meubles bas, triangle d'activité. */

const SOUS_PLAN: readonly ModuleCuisine[] = ['bas', 'evier', 'plaque'];
/** Débord du plan de travail devant les façades, en mm. */
const DEBORD = 30;

const moduleDe = (o: Objet) => objetDuCatalogue(o.catalogueId)?.cuisine;

/**
 * Plan de travail : un rectangle par meuble bas, un peu plus profond que lui ; posés côte à
 * côte, ils forment un plan continu. `longueur` en mm, pour le métré.
 */
export function planDeTravail(n: Pick<Niveau, 'objets'>): {
  contours: Point[][];
  longueur: number;
} {
  const bas = n.objets.filter((o) => SOUS_PLAN.includes(moduleDe(o)!));
  return {
    contours: bas.map((o) =>
      contourObjet({
        ...o,
        // Le débord est devant : on avance le centre de la moitié du débord.
        position: {
          x: o.position.x - Math.sin((o.rotation / 1800) * Math.PI) * (DEBORD / 2),
          y: o.position.y + Math.cos((o.rotation / 1800) * Math.PI) * (DEBORD / 2),
        },
        dimensions: { ...o.dimensions, p: o.dimensions.p + DEBORD },
      }),
    ),
    longueur: bas.reduce((s, o) => s + o.dimensions.l, 0),
  };
}

/**
 * Triangle d'activité évier - plaque - réfrigérateur (indicatif) : périmètre conseillé entre
 * 3,60 m et 7,90 m. `null` tant qu'il manque un des trois.
 */
export function triangleActivite(
  n: Pick<Niveau, 'objets'>,
): { perimetre: number; conseil: 'trop_petit' | 'bon' | 'trop_grand' } | null {
  const centre = (m: ModuleCuisine) => n.objets.find((o) => moduleDe(o) === m)?.position;
  const [e, p, f] = [centre('evier'), centre('plaque'), centre('frigo')];
  if (!e || !p || !f) return null;
  const perimetre = Math.round(distance(e, p) + distance(p, f) + distance(f, e));
  return {
    perimetre,
    conseil: perimetre < 3_600 ? 'trop_petit' : perimetre > 7_900 ? 'trop_grand' : 'bon',
  };
}
