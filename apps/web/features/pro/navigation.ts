import type { Route } from 'next';
import type { EnTetePublicProps } from '@/features/vitrine/EnTetePublic';
import type { ColonnePied } from '@/features/vitrine/PiedPublic';
import { routes } from '@/lib/routes';

const ancre = (id: string) => `${routes.pro}#${id}` as Route;

export const enTetePro: EnTetePublicProps = {
  bandeau:
    'Des particuliers vous contactent gratuitement dans votre zone · Inscription gratuite · 0 % de commission',
  accueil: routes.pro,
  variantLogo: 'pro',
  liens: [
    { libelle: 'Tarifs', href: ancre('offres') },
    { libelle: 'Questions fréquentes', href: ancre('faq') },
    { libelle: 'Je suis un particulier', href: routes.accueil },
  ],
  secondaire: { libelle: 'Espace pro', href: routes.connexionPro },
  principal: { libelle: 'Inscription gratuite', href: ancre('inscription') },
  principalCourt: "S'inscrire",
};

export const piedPro: { accroche: string; colonnes: ColonnePied[] } = {
  accroche: 'La plateforme des artisans du bâtiment et de leurs clients.',
  colonnes: [
    {
      titre: 'Portail Habitat Pro',
      liens: [
        { libelle: 'Inscription gratuite', href: ancre('inscription') },
        { libelle: 'Tarifs', href: ancre('offres') },
        { libelle: 'Votre espace', href: ancre('espace') },
      ],
    },
    {
      titre: 'Mon compte',
      liens: [
        { libelle: 'Connexion Pro', href: routes.connexionPro },
        { libelle: 'Aide', href: routes.aideSujet('pro') },
      ],
    },
    {
      titre: 'Légal',
      liens: [
        { libelle: 'CGV professionnels', href: routes.legal('pro', 'cgv') },
        { libelle: 'Charte de bonne conduite', href: routes.legal('pro', 'charte') },
        { libelle: 'Mentions légales', href: routes.legal('pro', 'mentions') },
        { libelle: 'Confidentialité', href: routes.legal('pro', 'confidentialite') },
        { libelle: 'Sécurité du compte', href: routes.legal('pro', 'securite') },
      ],
    },
  ],
};
