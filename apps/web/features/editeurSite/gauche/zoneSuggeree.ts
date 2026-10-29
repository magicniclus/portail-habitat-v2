import { insererSectionPrete, type PageSite } from '@ph/core/sites';
import { nouvelId } from '../ids';

/** Zone proposée par l'assistant : en haut de page, ou en fin de page avant le pied de page. */
export function insererZoneSuggeree(page: PageSite, cle: string, ou: 'debut' | 'fin') {
  const pied = page.sections.findIndex((x) => x.p.nom === 'Pied de page');
  const apres =
    ou === 'debut' ? (page.sections[0]?.id ?? null) : pied > 0 ? page.sections[pied - 1]!.id : null;
  return insererSectionPrete(page, cle, apres, nouvelId);
}
