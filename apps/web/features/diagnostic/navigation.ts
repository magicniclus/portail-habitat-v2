import type { Route } from 'next';
import type { EnTetePublicProps } from '@/features/vitrine/EnTetePublic';
import type { ColonnePied } from '@/features/vitrine/PiedPublic';
import { routes } from '@/lib/routes';

const ancre = (id: string) => `${routes.diagnostic}#${id}` as Route;

export const enTeteDiag: EnTetePublicProps = {
  bandeau: 'Diagnostiqueurs certifiés et assurés · Rapports PDF sous 48 h · Toute la Gironde',
  accueil: routes.diagnostic,
  variantLogo: 'diag',
  liens: [
    { libelle: 'Les diagnostics', href: ancre('diagnostics') },
    { libelle: "Selon l'âge du bien", href: ancre('age') },
    { libelle: 'Comment ça marche', href: ancre('deroule') },
    { libelle: 'Tarifs', href: ancre('tarifs') },
    { libelle: 'Questions', href: ancre('faq') },
  ],
  secondaire: { libelle: 'Travaux', href: routes.accueil },
  principal: { libelle: 'Mon devis en 2 min', href: routes.diagnosticEstimation },
  principalCourt: 'Mon devis',
};

export const piedDiag: { accroche: string; colonnes: ColonnePied[] } = {
  accroche: 'Diagnostics immobiliers en Gironde, par des diagnostiqueurs certifiés et assurés.',
  colonnes: [
    {
      titre: 'Diagnostics',
      liens: [
        { libelle: 'DPE et audit énergétique', href: ancre('diagnostics') },
        { libelle: 'Amiante et plomb', href: ancre('diagnostics') },
        { libelle: 'Termites Gironde', href: ancre('diagnostics') },
        { libelle: 'Gaz et électricité', href: ancre('diagnostics') },
      ],
    },
    {
      titre: 'Mon dossier',
      liens: [
        { libelle: 'Estimer mes diagnostics', href: routes.diagnosticEstimation },
        { libelle: 'Suivre ma demande', href: routes.monEspace },
        { libelle: 'Aide et contact', href: routes.aideSujet('diagnostic') },
      ],
    },
    {
      titre: 'Portail Habitat',
      liens: [
        { libelle: 'Trouver un artisan', href: routes.accueil },
        { libelle: 'Simulateur de travaux', href: routes.simulateur },
        { libelle: 'Espace professionnel', href: routes.pro },
      ],
    },
  ],
};
