import type { QuestionFaq } from '@/features/vitrine/seo';

/** Exemples de demandes (illustration, budgets en centimes). */
export const EXEMPLES_DEMANDES = [
  {
    client: 'Claire M.',
    etiquette: 'Nouveau · il y a 2 h',
    vif: true,
    titre: 'Rénovation complète salle de bain',
    ville: 'Bordeaux (33200)',
    budget: [600_000, 800_000],
    delai: 'Démarrage sous 1 mois',
  },
  {
    client: 'Thomas L.',
    etiquette: 'Il y a 6 h',
    vif: false,
    titre: 'Isolation des combles perdus',
    ville: 'Mérignac (33700)',
    budget: [400_000, 650_000],
    delai: 'Sous 2 mois',
  },
  {
    client: 'Nadia B.',
    etiquette: 'Urgent',
    vif: true,
    titre: 'Réfection de toiture après fuite',
    ville: 'Pessac (33600)',
    budget: [900_000, 1_400_000],
    delai: 'Dès que possible',
  },
  {
    client: 'Marc D.',
    etiquette: 'Hier',
    vif: false,
    titre: "Pose d'une cuisine complète",
    ville: 'Talence (33400)',
    budget: [700_000, 1_000_000],
    delai: '1 à 3 mois',
  },
] as const;

export const ETAPES_PRO = [
  {
    titre: 'Vous créez votre fiche',
    ecran: 'etape-inscription',
    texte:
      'Métiers, communes, photos de réalisations, certifications : environ 3 minutes. Gratuit, sans carte bancaire.',
  },
  {
    titre: 'Vous recevez les demandes',
    ecran: 'mes-demandes',
    texte:
      'Dès le premier jour, les particuliers de votre secteur vous écrivent depuis votre fiche : jusqu’à 10 demandes gratuites et exclusives par mois.',
  },
  {
    titre: 'Vous répondez et vous signez',
    ecran: 'devis-liste',
    texte:
      "Notification sur l'appli, vous appelez le client directement, et le devis part, depuis le chantier s'il le faut.",
  },
] as const;

export const ATOUTS_ESPACE = [
  {
    titre: 'Vos demandes suivies',
    texte: 'Chaque demande devient une fiche à suivre : à rappeler, devis envoyé, chantier signé.',
    icone: 'M4 5h16v14H4zM4 10h16M9 5v14',
  },
  {
    titre: 'Vos secteurs et vos métiers',
    texte: 'Vous ne recevez que ce qui correspond à vos communes et à vos spécialités.',
    icone:
      'M12 21s6.5-6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21ZM12 12.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z',
  },
  {
    titre: 'Vos devis et factures',
    texte:
      'Modèles par métier et mentions obligatoires vérifiées : le devis part en quelques minutes.',
    icone: 'M6 4h9l3 3v13H6zM9 11h6M9 15h6',
  },
  {
    titre: 'Vos avis clients',
    texte: 'Demandez un avis en fin de chantier, répondez publiquement, affichez votre note.',
    icone: 'm12 4 2.4 5 5.4.7-4 3.7 1 5.4L12 16.3 7.2 18.8l1-5.4-4-3.7 5.4-.7z',
  },
] as const;

export const FAQ_PRO: QuestionFaq[] = [
  {
    q: "L'inscription est-elle vraiment gratuite ?",
    r: 'Oui. Créer votre fiche, apparaître dans votre zone et recevoir les demandes des particuliers ne coûte rien, sans carte bancaire et sans durée minimum.',
  },
  {
    q: 'Prenez-vous une commission sur mes chantiers ?',
    r: 'Aucune. Vous traitez directement avec le client et vous facturez comme d’habitude.',
  },
  {
    q: 'Vais-je recevoir des demandes hors de mon secteur ?',
    r: 'Non. Vous choisissez vos communes et vos métiers à l’inscription, et vous pouvez les modifier à tout moment.',
  },
  {
    q: 'Est-ce que je partage le client avec d’autres artisans ?',
    r: 'Non. Une demande envoyée depuis votre fiche est pour vous seul : le client vous a choisi, vous.',
  },
  {
    q: 'Pourquoi vérifiez-vous mon SIREN et mon assurance ?',
    r: 'Pour que les particuliers ne croisent que des entreprises immatriculées et assurées. Vous n’êtes pas en concurrence avec des travailleurs non déclarés, et les clients vous font confiance plus vite.',
  },
  {
    q: 'Combien de temps pour être visible ?',
    r: 'Dès votre première connexion, si vous avez envoyé votre Kbis et votre attestation décennale. Les demandes de votre zone apparaissent aussitôt dans votre espace ; nous vérifions vos documents dans les 48 h ouvrées.',
  },
];
