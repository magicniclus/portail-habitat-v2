import type { Action } from '@ph/core/sites';
import type { ContexteReglages } from '../proprietes/contexte';

/** Valeurs de départ quand on change de type (numéro du site, page d'accueil…). */
export function depart(t: Action['type'], c: ContexteReglages): Action {
  if (t === 'page') return { type: 'page', page: 'accueil' };
  if (t === 'tel' || t === 'sms' || t === 'whatsapp') return { type: t, tel: c.telephone ?? '' };
  if (t === 'formulaire') return { type: 'formulaire', formulaire: 'defiler' };
  if (t === 'fichier') {
    const premier = Object.keys(c.fichiers)[0];
    return premier ? { type: 'fichier', fichierId: premier } : { type: 'fichier' };
  }
  if (t === 'popup') {
    const premiere = c.pages[c.pageId]?.sections.find((s) => s.p.popup && s.p.ancre);
    return premiere ? { type: 'popup', ancre: premiere.p.ancre } : { type: 'popup' };
  }
  return { type: t };
}
