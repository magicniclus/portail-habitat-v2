import { z } from '../../zod';
import { MODES_IA_SITE, type ModeIaSite } from './reglages';

/**
 * Routeur (IA_SITE §1, §5) : quand l'artisan écrit sans choisir d'action, un appel court (Haiku,
 * 200 jetons) classe la demande dans un mode et une portée. Sortie illisible : textes, le moins
 * coûteux, plutôt qu'un refus.
 */
export const PROMPT_ROUTEUR_IA_SITE = `Tu classes la demande d'un artisan qui modifie son site internet.
Modes :
- textes : réécrire, raccourcir, corriger, changer le ton d'un texte existant
- seo : titres de page, méta-descriptions, textes alternatifs, référencement, ville dans le titre
- composant : ajouter, modifier ou supprimer une section ou un élément (FAQ, bouton, photo, colonnes…)
- page : créer une nouvelle page ou refaire une page entière
- theme : couleurs, polices, forme des boutons, style général
Portée : selection (l'élément sélectionné, seulement s'il y en a un), page (la page ouverte) ou site (tout le site).
Réponds uniquement avec l'objet JSON demandé.`;

export const SCHEMA_JSON_ROUTEUR: Record<string, unknown> = {
  type: 'object',
  properties: {
    mode: { type: 'string', enum: [...MODES_IA_SITE] },
    portee: { type: 'string', enum: ['selection', 'page', 'site'] },
  },
  required: ['mode', 'portee'],
  additionalProperties: false,
};

const routage = z.object({
  mode: z.enum(MODES_IA_SITE),
  portee: z.enum(['selection', 'page', 'site']),
});
export type PorteeIaSite = z.output<typeof routage>['portee'];

export function lireRoutage(
  texte: string,
  o: { selection: boolean },
): { mode: ModeIaSite; portee: PorteeIaSite } {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    brut = null;
  }
  const r = routage.safeParse(brut);
  const v = r.success
    ? r.data
    : { mode: 'textes' as const, portee: o.selection ? ('selection' as const) : ('page' as const) };
  return { ...v, portee: v.portee === 'selection' && !o.selection ? 'page' : v.portee };
}
