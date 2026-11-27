import { echec, succes, type Resultat } from '../resultat';
import type { Niveau } from '../schemas/dessinScene';
import { objetDuCatalogue } from './catalogue';

/** Couleurs personnalisables d'un meuble de cuisine : façades, plan de travail, poignées. */
export const EMPLACEMENTS_CUISINE = ['facade', 'plan', 'poignee'] as const;

export type CouleursCuisine = Partial<Record<(typeof EMPLACEMENTS_CUISINE)[number], string>>;

export const deCuisine = (catalogueId: string) => Boolean(objetDuCatalogue(catalogueId)?.cuisine);

/** Couleurs actuelles de la cuisine du niveau : celles du premier meuble de cuisine. */
export function couleursCuisine(n: Niveau): CouleursCuisine {
  const o = n.objets.find((x) => deCuisine(x.catalogueId));
  return Object.fromEntries(
    EMPLACEMENTS_CUISINE.flatMap((e) => (o?.materiaux[e] ? [[e, o.materiaux[e]]] : [])),
  );
}

/**
 * Colore toute la cuisine du niveau (façades, plan de travail ou poignées), sauf les meubles
 * verrouillés. Les meubles posés ensuite reprennent ces couleurs (objetAPoser).
 */
export function colorerCuisine(n: Niveau, couleurs: CouleursCuisine): Resultat<Niveau> {
  if (!n.objets.some((o) => deCuisine(o.catalogueId)))
    return echec('PRECONDITION', { message: 'Posez d’abord un meuble de cuisine.' });
  return succes({
    ...n,
    objets: n.objets.map((o) =>
      !o.verrouille && deCuisine(o.catalogueId)
        ? { ...o, materiaux: { ...o.materiaux, ...couleurs } }
        : o,
    ),
  });
}

/**
 * Applique à toute la cuisine du niveau (meubles du catalogue « cuisine », sauf verrouillés)
 * les couleurs de façade, de plan de travail et de poignées du meuble `depuisId`.
 */
export function harmoniserCuisine(n: Niveau, depuisId: string): Resultat<Niveau> {
  const source = n.objets.find((o) => o.id === depuisId);
  if (!source) return echec('INTROUVABLE');
  if (!deCuisine(source.catalogueId))
    return echec('PRECONDITION', { message: 'Ce meuble ne fait pas partie de la cuisine.' });
  const couleurs = Object.fromEntries(
    EMPLACEMENTS_CUISINE.flatMap((e) => (source.materiaux[e] ? [[e, source.materiaux[e]]] : [])),
  );
  return succes({
    ...n,
    objets: n.objets.map((o) =>
      o.id !== depuisId && !o.verrouille && deCuisine(o.catalogueId)
        ? { ...o, materiaux: { ...o.materiaux, ...couleurs } }
        : o,
    ),
  });
}
