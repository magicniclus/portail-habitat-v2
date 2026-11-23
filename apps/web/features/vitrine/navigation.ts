import { routes } from '@/lib/routes';
import type { EnTetePublicProps } from './EnTetePublic';
import type { ColonnePied } from './PiedPublic';

/** En-tête du site particuliers (maquette Accueil). */
const enTeteParticuliers: EnTetePublicProps = {
  bandeau: 'Devis gratuits et sans engagement · Artisans vérifiés près de chez vous',
  accueil: routes.accueil,
  liens: [
    { libelle: 'Métiers', href: routes.metiers },
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

/** Plans ouvert au public : lien « Plan 3D » dans l'en-tête et dans le pied de page particuliers. */
export function enTeteParticuliersPour(plans: boolean): EnTetePublicProps {
  if (!plans) return enTeteParticuliers;
  return {
    ...enTeteParticuliers,
    liens: [{ libelle: 'Plan 3D', href: routes.dessin }, ...enTeteParticuliers.liens],
  };
}

export function piedParticuliersPour(plans: boolean): typeof piedParticuliers {
  if (!plans) return piedParticuliers;
  const [premiere, ...autres] = piedParticuliers.colonnes;
  return {
    ...piedParticuliers,
    colonnes: [
      {
        ...premiere!,
        liens: [
          ...premiere!.liens.slice(0, 2),
          { libelle: 'Plan de maison 2D et 3D', href: routes.dessin },
          ...premiere!.liens.slice(2),
        ],
      },
      ...autres,
    ],
  };
}
