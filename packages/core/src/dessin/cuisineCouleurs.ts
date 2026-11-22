import { echec, succes, type Resultat } from '../resultat';
import type { Niveau } from '../schemas/dessinScene';
import { objetDuCatalogue } from './catalogue';

/** Couleurs personnalisables d'un meuble de cuisine : façades, plan de travail, poignées. */
export const EMPLACEMENTS_CUISINE = ['facade', 'plan', 'poignee'] as const;

const deCuisine = (catalogueId: string) => Boolean(objetDuCatalogue(catalogueId)?.cuisine);

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
