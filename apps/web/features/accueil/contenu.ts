import type { QuestionFaq } from '@/features/vitrine/seo';

/** Textes et listes de la maquette Accueil Particuliers (constantes de `renderVals()`). */

/** Métiers mis en avant : identifiant du référentiel, budget d'entrée en centimes. */
export const METIERS_ACCUEIL = [
  { metier: 'plombier', nom: 'Plomberie', des: 35_000 },
  { metier: 'electricien', nom: 'Électricité', des: 40_000 },
  { metier: 'peintre', nom: 'Peinture', des: 2_500, parM2: true },
  { metier: 'carreleur', nom: 'Carrelage', des: 4_500, parM2: true },
  { metier: 'chauffagiste', nom: 'Chauffage', des: 250_000 },
  { metier: 'menuisier', nom: 'Menuiserie', des: 60_000 },
  { metier: 'couvreur', nom: 'Couverture', des: 9_000, parM2: true },
] as const;

export const ETAPES = [
  {
    titre: 'Vous décrivez votre projet',
    texte:
      'Une phrase, un code postal, un délai. Le simulateur vous donne une fourchette de budget tout de suite.',
    delai: '≈ 2 minutes',
  },
  {
    titre: "Vous recevez jusqu'à 3 devis",
    texte:
      'Des artisans vérifiés de votre commune vous répondent avec un devis détaillé, poste par poste.',
    delai: 'Sous 48 h',
  },
  {
    titre: 'Vous choisissez en confiance',
    texte:
      'Avis clients, assurances, réalisations : vous comparez, puis vous suivez le chantier dans votre espace.',
    delai: 'Sans engagement',
  },
] as const;

export const VILLES = [
  'Bordeaux',
  'Paris',
  'Lyon',
  'Marseille',
  'Toulouse',
  'Nantes',
  'Lille',
  'Rennes',
  'Montpellier',
  'Nice',
  'Strasbourg',
  'Mérignac',
] as const;

export const FAQ_ACCUEIL: QuestionFaq[] = [
  {
    q: 'Le service est-il vraiment gratuit ?',
    r: "Oui. L'estimation, la mise en relation et le suivi de vos devis sont gratuits pour les particuliers : ce sont les artisans qui s'abonnent à la plateforme.",
  },
  {
    q: 'Combien de devis vais-je recevoir ?',
    r: "Jusqu'à 3 devis pour un même projet, afin de comparer sans être submergé d'appels.",
  },
  {
    q: 'Comment les artisans sont-ils vérifiés ?',
    r: 'SIRET, assurance décennale et qualifications sont contrôlés avant publication de la fiche, et les avis sont déposés après chantier uniquement.',
  },
  {
    q: "Suis-je obligé d'accepter un devis ?",
    r: 'Non. Vous pouvez refuser tous les devis reçus, sans frais ni justification.',
  },
  {
    q: 'Mes coordonnées sont-elles diffusées ?',
    r: "Elles ne sont transmises qu'aux artisans que vous sollicitez pour votre projet, jamais revendues.",
  },
];
