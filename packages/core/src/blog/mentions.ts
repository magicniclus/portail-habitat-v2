import type { ParametresFacturation } from '../devis/mentions';

/** Hébergement des sites des artisans (BLOG §4, SITE_INTERNET). */
export const HEBERGEUR_SITES =
  'Portail Travaux (sites hébergés chez Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis)';

/** Mentions obligatoires, nommées pour l'artisan quand elles manquent. */
export const LIBELLES_MENTIONS_BLOG: Record<string, string> = {
  editeur: 'raison sociale et adresse du siège',
  siret: 'SIRET',
  decennale: 'assurance décennale (assureur, contrat, zone)',
  mediateur: 'médiateur de la consommation',
};

export interface LigneMention {
  cle: string;
  libelle: string;
  texte: string;
}

const rempli = (s: string | undefined) => Boolean(s?.trim());

/**
 * Mentions légales sous chaque article (BLOG §4) : lues en direct dans les paramètres de Devis &
 * factures, jamais copiées (BLOG-05). Une mention obligatoire manquante bloque la publication.
 */
export function mentionsBlog(
  p: Partial<ParametresFacturation> | null,
  o: { directeur?: string } = {},
): { lignes: LigneMention[]; manquantes: string[]; complet: boolean } {
  const q = p ?? {};
  const d = q.assuranceDecennale;
  const editeur = [
    q.raisonSociale,
    q.formeJuridique,
    rempli(q.capitalSocial) ? `capital ${q.capitalSocial}` : '',
    q.adresseSiege,
  ]
    .filter(rempli)
    .join(' · ');
  const obligatoires: [boolean, LigneMention][] = [
    [
      rempli(q.raisonSociale) && rempli(q.adresseSiege),
      { cle: 'editeur', libelle: 'Éditeur', texte: editeur },
    ],
    [rempli(q.siret), { cle: 'siret', libelle: 'SIRET', texte: q.siret ?? '' }],
    [
      Boolean(d && rempli(d.assureur) && rempli(d.contrat) && rempli(d.zone)),
      {
        cle: 'decennale',
        libelle: 'Assurance décennale',
        texte: d ? `${d.assureur}, contrat ${d.contrat}, ${d.zone}` : '',
      },
    ],
    [
      Boolean(q.mediateur && rempli(q.mediateur.nom)),
      {
        cle: 'mediateur',
        libelle: 'Médiateur de la consommation',
        texte: q.mediateur
          ? [q.mediateur.nom, q.mediateur.adresse, q.mediateur.site].filter(rempli).join(' · ')
          : '',
      },
    ],
  ];
  const facultatives: LigneMention[] = [
    ...(rempli(q.rne) ? [{ cle: 'rne', libelle: 'RNE', texte: q.rne! }] : []),
    ...(rempli(q.tvaIntra)
      ? [{ cle: 'tva', libelle: 'TVA intracommunautaire', texte: q.tvaIntra! }]
      : []),
    {
      cle: 'directeur',
      libelle: 'Directeur de la publication',
      texte: o.directeur?.trim() || q.raisonSociale || '',
    },
    { cle: 'hebergement', libelle: 'Hébergement', texte: HEBERGEUR_SITES },
  ];
  const manquantes = obligatoires.filter(([ok]) => !ok).map(([, l]) => l.cle);
  return {
    lignes: [...obligatoires.filter(([ok]) => ok).map(([, l]) => l), ...facultatives],
    manquantes,
    complet: manquantes.length === 0,
  };
}
