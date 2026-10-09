import { routes } from '@/lib/routes';
import type { EnTetePublicProps } from './EnTetePublic';
import type { ColonnePied } from './PiedPublic';

/** En-tête du site particuliers (maquette Accueil). */
export const enTeteParticuliers: EnTetePublicProps = {
  bandeau: 'Devis gratuits et sans engagement · Artisans vérifiés près de chez vous',
  accueil: routes.accueil,
  liens: [
    { libelle: 'Métiers', href: routes.artisans },
    { libelle: 'Artisans', href: routes.artisans },
    { libelle: 'Avis', href: routes.avis },
  ],
  secondaire: { libelle: 'Mon espace', href: routes.connexion },
  principal: { libelle: 'Simuler mon devis', href: routes.simulateur, prefetch: false },
  principalCourt: 'Simuler',
};

/** Pied de page du site particuliers (maquette Accueil). */
export const piedParticuliers: { accroche: string; colonnes: ColonnePied[] } = {
  accroche: 'La plateforme de référence pour vos projets habitat.',
  colonnes: [
    {
      titre: 'Particuliers',
      liens: [
        { libelle: 'Décrire mon projet', href: routes.accueil },
        { libelle: 'Simulateur de devis', href: routes.simulateur, prefetch: false },
        { libelle: 'Diagnostic immobilier', href: routes.diagnostic },
        { libelle: 'Laisser un avis', href: routes.avis },
        { libelle: 'Mon espace', href: routes.connexion },
      ],
    },
    {
      titre: 'Professionnels',
      liens: [
        { libelle: 'Devenir partenaire', href: routes.pro },
        { libelle: 'Connexion Pro', href: routes.connexionPro },
        { libelle: 'Tarifs', href: routes.proOffres },
      ],
    },
    {
      titre: 'Aide & légal',
      liens: [
        { libelle: 'Aide et contact', href: routes.aide },
        { libelle: 'CGU', href: routes.legal('particuliers', 'cgu') },
        { libelle: 'Mentions légales', href: routes.legal('particuliers', 'mentions') },
        { libelle: 'Confidentialité', href: routes.legal('particuliers', 'confidentialite') },
        { libelle: 'Cookies', href: routes.legal('particuliers', 'cookies') },
        { libelle: 'Sécurité', href: routes.legal('particuliers', 'securite') },
      ],
    },
  ],
};
