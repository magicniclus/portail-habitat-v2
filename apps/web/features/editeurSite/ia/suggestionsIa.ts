import { SECTIONS_PRETES, type PageSite } from '@ph/core/sites';

export interface SuggestionIa {
  label: string;
  faire: () => void;
}

const nomZone = (cle: string) => SECTIONS_PRETES.find((s) => s.cle === cle)?.section.p?.nom;

/**
 * Suggestions du panneau IA (maquette) : seulement celles qui manquent à la page. Ajouter une
 * zone prête ne consomme rien ; une page locale passe par l'IA.
 */
export function suggestionsIa(
  page: PageSite,
  o: {
    ville?: string;
    ajouterZone: (cle: string, apres: 'debut' | 'fin') => void;
    pageLocale: (ville: string) => void;
    referencement: () => void;
  },
): SuggestionIa[] {
  const a = (cle: string) => page.sections.some((s) => s.p.nom === nomZone(cle));
  return [
    ...(a('faq')
      ? []
      : [{ label: 'Ajouter une FAQ à cette page', faire: () => o.ajouterZone('faq', 'fin') }]),
    ...(a('chiffres')
      ? []
      : [
          {
            label: 'Ajouter les chiffres clés sous le bandeau',
            faire: () => o.ajouterZone('chiffres', 'debut'),
          },
        ]),
    ...(o.ville
      ? [{ label: `Créer une page locale « ${o.ville} »`, faire: () => o.pageLocale(o.ville!) }]
      : []),
    { label: 'Vérifier le référencement de la page', faire: o.referencement },
  ];
}
