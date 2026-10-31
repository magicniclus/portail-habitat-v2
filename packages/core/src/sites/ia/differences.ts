import { elementsDe } from '../edition';
import type { BrouillonIa } from './operations';

/**
 * Ce que l'aperçu d'une proposition doit montrer et surligner (IA_SITE §2.3) : la page ouverte
 * (ou la page créée par la proposition), ses sections nouvelles et ses éléments modifiés.
 */
export function changementsIa(
  avant: BrouillonIa,
  apres: BrouillonIa,
  pageOuverte: string,
): { pageId: string; ids: string[] } {
  const creee = Object.keys(apres.pages).find((p) => !avant.pages[p]);
  if (creee) return { pageId: creee, ids: [] };
  const pageId = apres.pages[pageOuverte] ? pageOuverte : 'accueil';
  const a = avant.pages[pageId];
  const p = apres.pages[pageId];
  if (!a || !p) return { pageId, ids: [] };
  const sectionsAvant = new Set(a.sections.map((s) => s.id));
  const elementsAvant = new Map(elementsDe(a).map(({ el }) => [el.id, JSON.stringify(el)]));
  const nouvelles = p.sections.filter((s) => !sectionsAvant.has(s.id)).map((s) => s.id);
  const modifies = elementsDe(p)
    .filter(
      ({ section, el }) =>
        sectionsAvant.has(section.id) && elementsAvant.get(el.id) !== JSON.stringify(el),
    )
    .map(({ el }) => el.id);
  return { pageId, ids: [...nouvelles, ...modifies] };
}
