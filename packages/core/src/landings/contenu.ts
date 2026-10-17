/**
 * Contenu des landings par outil (maquette `Landing Outil`, constante `C`), à migrer dans le CMS
 * (LANDINGS §2). Les phrases qui demandent une preuve datée (LANDINGS §7) ne sortent qu'avec
 * `preuves` (`config.marketing.preuves`, désactivé par défaut) : jamais en production sans elle.
 */
export const OUTILS_LANDING = ['chantiers', 'site', 'devis'] as const;
export type OutilLanding = (typeof OUTILS_LANDING)[number];

export type IconeLanding =
  | 'demandes'
  | 'fiche'
  | 'site'
  | 'devis'
  | 'suivi'
  | 'avis'
  | 'zone'
  | 'ia'
  | 'mobile'
  | 'check'
  | 'signe';

/** Capture réelle de l'espace (`pnpm captures`, `public/landing/captures/<image>-desktop|mobile`). */
export interface CaptureLanding {
  /** `null` tant que l'écran n'existe pas : cadre vide avec la légende. */
  image: string | null;
  url: string;
  legende: string;
}

export interface Benefice {
  icone: IconeLanding;
  titre: string;
  texte: string;
  points: string[];
  capture: CaptureLanding;
}

export interface ContenuLanding {
  surtitre: string;
  h1a: string;
  h1b: string;
  /** Gras entre `**…**` (voir `decouperGras`). */
  sousTitre: string;
  points: string[];
  badges: string[];
  titreFormulaire: string;
  cta: string;
  outilNom: string;
  beneficesTitre: string;
  beneficesIntro: string;
  benefices: Benefice[];
  vitrine: {
    surtitre: string;
    titre: string;
    texte: string;
    points: string[];
    grand: CaptureLanding;
    tel: CaptureLanding;
  };
  etapes: { titre: string; texte: string }[];
  faq: { q: string; r: string }[];
  ctaTitre: string;
  barreMobile: string;
  eco: { titre: string; texte: string };
  avis: AvisLanding[];
}

export interface AvisLanding {
  nom: string;
  metier: string;
  texte: string;
}

type Brut = Omit<ContenuLanding, 'surtitre' | 'points' | 'avis' | 'beneficesIntro'> & {
  surtitre: string;
  /** Remplace `surtitre` seulement avec une preuve chiffrée datée. */
  surtitrePreuve?: string;
  points: string[];
  pointsPreuve?: string[];
  beneficesIntro: string;
};

const capture = (image: string | null, url: string, legende: string): CaptureLanding => ({
  image,
  url,
  legende,
});

const BADGES = ['Gratuit pour commencer', 'Sans abonnement', '0 % de commission'];

const CONTENU: Record<OutilLanding, Brut> = {
  chantiers: {
    surtitre: 'Demandes de travaux près de chez vous',
    surtitrePreuve: 'Plus de 300 demandes de travaux chaque jour sur le réseau',
    h1a: 'Trouvez des chantiers',
    h1b: 'gratuitement',
    sousTitre:
      'Des **particuliers de votre secteur** décrivent leur projet : chantier, ville, budget et délai. Ces demandes sont **réservées exclusivement aux membres du réseau Portail Habitat** : rejoignez-le **gratuitement** et répondez à celles qui vous intéressent.',
    points: [],
    badges: BADGES,
    titreFormulaire: 'Créer mon espace gratuit',
    cta: 'Voir les demandes près de chez moi',
    outilNom: 'Demandes de chantiers',
    beneficesTitre: 'Des demandes qui correspondent à votre métier et à votre zone',
    beneficesIntro: 'Trois écrans de votre espace, tels que vous les utiliserez dès l’inscription.',
    benefices: [
      {
        icone: 'zone',
        titre: 'Seulement votre secteur et vos métiers',
        texte:
          'Vous choisissez vos communes, votre rayon et les chantiers que vous acceptez. Le reste ne vous arrive pas.',
        points: [
          'Rayon réglable de 10 à 100 km',
          'Plusieurs métiers sur une même fiche',
          'Modifiable à tout moment',
        ],
        capture: capture(
          'ma-fiche',
          'portailhabitat.fr/pro/fiche',
          '« Ma fiche » : métiers, zone d’intervention et réalisations.',
        ),
      },
      {
        icone: 'demandes',
        titre: 'Toutes les infos avant d’appeler',
        texte:
          'Type de travaux, ville, budget annoncé, délai et photos quand le client en ajoute : vous savez si ça vaut le déplacement.',
        points: [
          'Budget et délai affichés',
          'Demandes de votre fiche réservées à vous seul',
          'Appels d’offres limités à 3 artisans',
        ],
        capture: capture(
          'appels-d-offres',
          'portailhabitat.fr/pro/appels-offres',
          '« Appels d’offres » : les projets déposés dans votre zone.',
        ),
      },
      {
        icone: 'suivi',
        titre: 'Suivi jusqu’au chantier signé',
        texte:
          'Chaque demande devient une fiche : à rappeler, devis envoyé, signé. Rien ne se perd entre deux chantiers.',
        points: [
          'Statut de chaque client',
          'Rappels à faire du jour',
          'Devis créé depuis la demande',
        ],
        capture: capture(
          'mes-demandes',
          'portailhabitat.fr/pro/demandes',
          '« Mes demandes » : chaque contact suivi jusqu’au devis.',
        ),
      },
    ],
    vitrine: {
      surtitre: 'Sur le chantier',
      titre: 'Les demandes vous suivent sur votre téléphone',
      texte:
        'Vous voyez la demande, vous appelez le client, vous répondez : sans attendre d’être rentré au bureau.',
      points: [
        'Même espace sur ordinateur et téléphone',
        'Appel du client en un geste',
        'Rien à installer pour commencer',
      ],
      grand: capture(
        'espace-artisan-dashboard',
        'portailhabitat.fr/pro',
        'Le tableau de bord : nouvelles demandes, rappels et activité.',
      ),
      tel: capture('mes-demandes', '', '« Mes demandes » sur téléphone.'),
    },
    etapes: [
      {
        titre: 'Vous créez votre espace',
        texte: 'Métier, téléphone et code postal : votre fiche est prête en quelques minutes.',
      },
      {
        titre: 'Vous réglez votre zone',
        texte:
          'Communes, rayon et chantiers acceptés. Vous voyez les demandes proches de chez vous.',
      },
      {
        titre: 'Vous répondez',
        texte: 'Un appel ou un message au client, puis le devis, depuis votre téléphone si besoin.',
      },
    ],
    faq: [
      {
        q: 'Combien de demandes vais-je recevoir ?',
        r: 'Cela dépend de votre métier et de votre secteur : nous ne promettons pas de volume. Après l’inscription, vous voyez les demandes réellement déposées autour de vous.',
      },
      {
        q: 'Prenez-vous une commission sur mes chantiers ?',
        r: 'Non, aucune. Vous traitez directement avec le client et vous facturez comme d’habitude.',
      },
      {
        q: 'Est-ce que je partage le client avec d’autres artisans ?',
        r: 'Une demande envoyée depuis votre fiche est pour vous seul. Les appels d’offres de votre zone sont ouverts à 3 artisans au maximum.',
      },
      {
        q: 'Pourquoi vérifiez-vous mon SIREN et mon assurance ?',
        r: 'Pour que les particuliers ne croisent que des entreprises immatriculées et assurées. Ils vous font confiance plus vite.',
      },
    ],
    ctaTitre: 'Voyez les demandes près de chez vous.',
    barreMobile: 'Créer mon espace gratuit',
    eco: {
      titre: 'Votre espace gratuit inclut aussi',
      texte: 'Tous les outils au même endroit. Rien à installer, rien à payer pour commencer.',
    },
  },
  site: {
    surtitre: 'Site internet pour artisans du bâtiment',
    surtitrePreuve: 'Plus de 300 demandes de travaux chaque jour sur le réseau',
    h1a: 'Créez votre site internet d’artisan',
    h1b: 'gratuitement',
    sousTitre:
      'Vos clients vous cherchent sur Google avant d’appeler. Sans site, ils appellent celui qui en a un. Ici, l’IA vous écrit un **vrai site pro**, et il ne vous coûte rien. Pas aujourd’hui, pas dans un an.',
    points: [
      'Gratuit pour toujours, pas un essai',
      'Aucune carte bancaire demandée',
      'Textes rédigés par l’IA',
    ],
    pointsPreuve: ['Premier réseau de France'],
    badges: ['Gratuit pour commencer', 'Devis et factures inclus', '0 % de commission'],
    titreFormulaire: 'Créer mon espace gratuit',
    cta: 'Créer mon espace et mon site',
    outilNom: 'Mon site internet',
    beneficesTitre: 'Le site que vous repoussez depuis des années, fait pendant votre pause café',
    beneficesIntro:
      'Ce qu’une agence vous facturerait, vous l’avez ici sans sortir la carte bancaire.',
    benefices: [
      {
        icone: 'ia',
        titre: 'Vous répondez à 3 questions, l’IA écrit tout',
        texte:
          'Métiers, zone, réalisations, avis : elle reprend votre fiche et rédige chaque page. Pas de page blanche, pas de webmaster à payer.',
        points: [
          'Questions en un clic',
          'Textes et titres rédigés pour Google',
          'Vos photos de chantier réutilisées',
        ],
        capture: capture(
          null,
          'portailhabitat.fr/pro/site/editeur',
          'La création assistée : l’IA reprend votre fiche.',
        ),
      },
      {
        icone: 'mobile',
        titre: 'Si vous savez envoyer un SMS, vous savez le modifier',
        texte:
          'Vous cliquez sur un texte ou une photo, vous changez, c’est enregistré. Le rendu téléphone est vérifié pour vous.',
        points: [
          'Sections prêtes à ajouter',
          'Couleurs et polices du site en un clic',
          'Aperçu par appareil',
        ],
        capture: capture(
          null,
          'portailhabitat.fr/pro/site/editeur',
          'L’éditeur : structure à gauche, réglages à droite.',
        ),
      },
      {
        icone: 'demandes',
        titre: 'Votre site travaille pendant que vous êtes sur le chantier',
        texte:
          'Chaque demande de devis arrive dans « Mes demandes » avec le nom, le téléphone et l’adresse du client. Zéro commission, elle est à vous.',
        points: [
          'Nom et téléphone du prospect',
          'Adresse du chantier',
          'Détails de la demande',
          'Suivi directement depuis Portail Habitat',
        ],
        capture: capture(
          null,
          'portailhabitat.fr/pro/site',
          '« Mon site internet » : le formulaire relié à vos demandes.',
        ),
      },
    ],
    vitrine: {
      surtitre: 'Le résultat',
      titre: 'Ce que vos clients verront demain matin',
      texte:
        'Présentation, prestations, réalisations, avis, bouton d’appel et demande de devis. Le genre de site qui donne envie de vous appeler, vous plutôt qu’un autre.',
      points: [
        'Bouton d’appel et devis toujours visibles sur téléphone',
        'Pages par commune pour être trouvé localement',
        'Tout reste modifiable après publication',
      ],
      grand: capture(
        null,
        'bertrand-renovation.portailhabitat.fr',
        'Le site publié, version ordinateur.',
      ),
      tel: capture(null, '', 'Le même site sur téléphone.'),
    },
    etapes: [
      {
        titre: 'Quelques champs, 30 secondes',
        texte: 'Nom, téléphone, code postal, métier. C’est tout ce qu’on vous demande.',
      },
      {
        titre: 'L’IA construit votre site',
        texte:
          'Pages, textes, photos et formulaire de devis. Vous regardez, vous changez ce qui ne vous plaît pas.',
      },
      {
        titre: 'Vous cliquez sur « Publier »',
        texte: 'Votre site est en ligne sur nom.portailhabitat.fr. Gratuit, et il le reste.',
      },
    ],
    faq: [
      {
        q: 'Est-ce vraiment gratuit ?',
        r: 'Oui. Le site sur une adresse Portail Habitat peut rester gratuit sans limite de durée. Site Pro est uniquement nécessaire si vous souhaitez votre propre nom de domaine et certaines fonctions avancées.',
      },
      {
        q: 'Suis-je obligé de prendre Site Pro ?',
        r: 'Non. Votre site reste en ligne gratuitement sur votre adresse Portail Habitat, aussi longtemps que vous le souhaitez.',
      },
      {
        q: 'Puis-je modifier mon site moi-même ?',
        r: 'Oui. Textes, photos, couleurs, pages et référencement se modifient en cliquant dessus, à tout moment, sans code.',
      },
      {
        q: 'Puis-je utiliser mon propre nom de domaine ?',
        r: 'Oui, avec Site Pro. Le domaine est inclus et votre adresse Portail Habitat est conservée et redirigée.',
      },
      {
        q: 'Portail Habitat prend-il une commission sur les demandes reçues via mon site ?',
        r: 'Non. Les demandes envoyées depuis votre propre site arrivent gratuitement dans votre espace, sans commission.',
      },
      {
        q: 'Est-ce que je peux quitter Portail Habitat ?',
        r: 'Oui. Vous pouvez arrêter Site Pro ou supprimer votre compte à tout moment depuis votre espace.',
      },
      {
        q: 'À qui appartient mon nom de domaine ?',
        r: 'À vous. Il est enregistré au nom de votre entreprise et reste transférable.',
      },
      {
        q: 'Est-ce adapté au téléphone ?',
        r: 'Oui. Le site s’adapte automatiquement aux téléphones et tablettes, avec un bouton d’appel toujours visible.',
      },
      {
        q: 'Je n’y connais rien en informatique, est-ce que c’est pour moi ?',
        r: 'Oui. Vous ne touchez à aucun code : vous cliquez sur ce que vous voulez changer, et vous pouvez demander à l’IA de réécrire un texte.',
      },
      {
        q: 'Mon site sera-t-il visible sur Google ?',
        r: 'Chaque page a son titre et sa description, et le plan du site est envoyé à Google à chaque publication. La position dépend ensuite de votre secteur et de vos contenus.',
      },
    ],
    ctaTitre: 'Vos concurrents ont un site. Vous aussi, dès aujourd’hui.',
    barreMobile: 'Créer mon site gratuitement',
    eco: {
      titre: 'Et ce n’est que le début',
      texte:
        'Le même compte gratuit vous donne aussi vos devis, vos factures, vos avis et les demandes de travaux près de chez vous. Vous ne payez toujours rien.',
    },
  },
  devis: {
    surtitre: 'Devis et factures pour le bâtiment',
    h1a: 'Logiciel de devis et factures',
    h1b: 'gratuit pour artisans',
    sousTitre:
      'Des devis et des factures avec vos **mentions obligatoires vérifiées**, un PDF à votre logo, la signature en ligne et les relances. Depuis l’ordinateur ou le téléphone.',
    points: [],
    badges: BADGES,
    titreFormulaire: 'Créer mon espace gratuit',
    cta: 'Créer mon espace et mon premier devis',
    outilNom: 'Devis et factures',
    beneficesTitre: 'Des devis propres en quelques minutes, des factures sans oubli',
    beneficesIntro: 'Le module que vous utiliserez chaque jour, avec vos vrais documents.',
    benefices: [
      {
        icone: 'devis',
        titre: 'Modèles par métier et bibliothèque de prestations',
        texte:
          'Partez d’un modèle prêt pour votre métier, ajoutez vos lignes : le total HT, la TVA et le TTC se calculent seuls.',
        points: [
          'Prestations réutilisables',
          'TVA 5,5 %, 10 % et 20 % par ligne',
          'Logo et coordonnées sur chaque PDF',
        ],
        capture: capture(
          null,
          'portailhabitat.fr/pro/devis',
          '« Devis & factures » : vos documents et leur statut.',
        ),
      },
      {
        icone: 'check',
        titre: 'Mentions obligatoires vérifiées avant l’envoi',
        texte:
          'SIRET, assurance décennale, validité, TVA, droit de rétractation : s’il manque une mention, l’envoi est bloqué et vous savez quoi compléter.',
        points: [
          'Contrôle en direct pendant la saisie',
          'Paramètres de l’entreprise saisis une fois',
          'PDF téléchargeable à tout moment',
        ],
        capture: capture(
          null,
          'portailhabitat.fr/pro/devis/nouveau',
          'L’éditeur de devis et le contrôle des mentions.',
        ),
      },
      {
        icone: 'signe',
        titre: 'Devis signé, facture en un clic',
        texte:
          'Le client signe en ligne, vous transformez le devis en facture et les relances partent seules.',
        points: [
          'Signature en ligne du client',
          'Numérotation des factures sans trou',
          'Facture électronique : en cours de mise en conformité',
        ],
        capture: capture(
          null,
          'portailhabitat.fr/pro/devis?onglet=factures',
          'Les factures : paiements, relances et export.',
        ),
      },
    ],
    vitrine: {
      surtitre: 'Sur le chantier',
      titre: 'Un devis depuis votre téléphone',
      texte:
        'Chez le client, vous préparez le devis et vous l’envoyez avant de repartir. Il le signe depuis son téléphone.',
      points: [
        'Même module sur ordinateur et téléphone',
        'PDF envoyé par email au client',
        'Statut mis à jour à la signature',
      ],
      grand: capture(
        null,
        'portailhabitat.fr/pro/devis/nouveau',
        'Le devis en cours de rédaction.',
      ),
      tel: capture(null, '', '« Devis & factures » sur téléphone.'),
    },
    etapes: [
      {
        titre: 'Vous créez votre espace',
        texte:
          'Métier, téléphone et code postal : vos informations remplissent l’en-tête de vos documents.',
      },
      {
        titre: 'Vous faites votre premier devis',
        texte: 'À partir d’un modèle prêt pour votre métier. Vous ajustez les lignes et les prix.',
      },
      {
        titre: 'Vous l’envoyez',
        texte:
          'Le client reçoit un PDF à votre logo et le signe en ligne. Vous le transformez en facture.',
      },
    ],
    faq: [
      {
        q: 'Combien de devis et de factures puis-je faire ?',
        r: 'Autant que vous voulez. Le module Devis & factures reste gratuit, sans limite.',
      },
      {
        q: 'Est-ce conforme à la facture électronique ?',
        r: 'Le module est en cours de mise en conformité avec la facture électronique obligatoire. Un export Factur-X est prévu, et vous serez prévenu avant chaque échéance.',
      },
      {
        q: 'Puis-je récupérer mes documents si je pars ?',
        r: 'Oui. Vos devis et factures se téléchargent en PDF à tout moment, et la liste s’exporte pour votre comptable.',
      },
      {
        q: 'Les mentions obligatoires sont-elles vraiment vérifiées ?',
        r: 'Oui : identité de l’entreprise, assurance décennale, validité, TVA, droit de rétractation selon le client. Une mention manquante bloque l’envoi.',
      },
    ],
    ctaTitre: 'Votre premier devis, en quelques minutes.',
    barreMobile: 'Créer mon espace gratuit',
    eco: {
      titre: 'Votre espace gratuit inclut aussi',
      texte: 'Tous les outils au même endroit. Rien à installer, rien à payer pour commencer.',
    },
  },
};

/**
 * Avis du bandeau défilant de la maquette : **fictifs** (LANDINGS §7). Affichés seulement avec
 * `preuves` ; à remplacer par de vrais avis (nom, métier, ville, photo, accord écrit) avant la
 * mise en ligne.
 */
const AVIS_MAQUETTE: AvisLanding[] = [
  [
    'Julien M.',
    'Plombier · Lyon',
    'En une soirée j’avais un site propre. Mes clients me disent qu’ils m’ont trouvé dessus.',
  ],
  [
    'Sandrine L.',
    'Peintre · Lille',
    'Je repoussais depuis des années. L’IA a tout écrit, j’ai juste changé deux photos.',
  ],
  [
    'Karim B.',
    'Électricien · Nantes',
    'Gratuit, sans piège. J’ai reçu ma première demande de devis la semaine suivante.',
  ],
  [
    'Thomas R.',
    'Couvreur · Bordeaux',
    'Je ne suis pas à l’aise avec l’informatique et pourtant je modifie tout seul.',
  ],
  [
    'Nadia F.',
    'Carreleuse · Marseille',
    'Le bouton d’appel sur téléphone change tout. Les clients appellent directement.',
  ],
  [
    'Pierre D.',
    'Maçon · Toulouse',
    'Mon ancien site me coûtait cher pour rien. Celui-ci est mieux et ne coûte rien.',
  ],
  [
    'Élodie G.',
    'Menuisière · Rennes',
    'Mes réalisations sont enfin mises en valeur. Ça fait sérieux devant un client.',
  ],
  [
    'Mehdi A.',
    'Chauffagiste · Grenoble',
    'Les demandes arrivent dans mon espace avec le téléphone du client. Pratique.',
  ],
  [
    'Laurent C.',
    'Plaquiste · Dijon',
    'Cinq minutes montre en main. Je ne pensais pas que c’était possible.',
  ],
  [
    'Sophie V.',
    'Paysagiste · Angers',
    'J’ai fait mes devis au même endroit. Tout est relié, je gagne du temps.',
  ],
  [
    'Antoine P.',
    'Serrurier · Nice',
    'Simple, rapide, et les clients me trouvent sur Google avec ma ville.',
  ],
  [
    'Céline H.',
    'Architecte d’intérieur · Paris',
    'Je voulais un site élégant sans payer une agence. C’est exactement ça.',
  ],
  [
    'Yann K.',
    'Charpentier · Brest',
    'J’ai demandé à l’IA de réécrire ma présentation, le résultat est top.',
  ],
  [
    'Fatima S.',
    'Façadière · Montpellier',
    'Aucune carte bancaire demandée. J’ai testé, j’ai gardé.',
  ],
  [
    'Nicolas T.',
    'Cuisiniste · Strasbourg',
    'Les pages par commune m’ont amené des clients des villages autour.',
  ],
  [
    'Aurélie B.',
    'Peintre · Tours',
    'Je l’ai fait sur mon téléphone entre deux chantiers. Incroyable.',
  ],
  [
    'Hugo L.',
    'Plombier · Reims',
    'Plus besoin d’expliquer ce que je fais : j’envoie le lien de mon site.',
  ],
  [
    'Marine D.',
    'Décoratrice · Caen',
    'Les couleurs et les photos me ressemblent. On dirait un site sur mesure.',
  ],
  [
    'Rachid E.',
    'Électricien · Lens',
    'Je recommande à tous les collègues : ça ne coûte rien d’essayer.',
  ],
  [
    'Olivier N.',
    'Couvreur · Metz',
    'Mon site est en ligne et je n’ai rien payé. Je ne vois pas où est le piège.',
  ],
].map(([nom, metier, texte]) => ({ nom: nom!, metier: metier!, texte: texte! }));

const PIEGE = {
  q: 'Où est le piège ?',
  r: 'Il n’y en a pas : la fiche, le site, les devis, les factures, le suivi clients, les avis et l’accès aux demandes restent gratuits, sans limite de durée. Nous gagnons notre vie avec des options facultatives : certains appels d’offres achetés à l’unité, une mise en avant de votre fiche, ou Site Pro (votre propre nom de domaine, l’IA complète). Vous ne payez que si vous choisissez une option, et jamais pour commencer.',
};

/** Contenu d'une landing ; `preuves` = `config.marketing.preuves` (LANDINGS §7). */
export function contenuLanding(outil: OutilLanding, o: { preuves: boolean }): ContenuLanding {
  const { surtitrePreuve, pointsPreuve, ...c } = CONTENU[outil];
  return {
    ...c,
    surtitre: o.preuves && surtitrePreuve ? surtitrePreuve : c.surtitre,
    points: o.preuves && pointsPreuve ? [...c.points, ...pointsPreuve] : c.points,
    faq: outil === 'site' ? c.faq : [PIEGE, ...c.faq],
    avis: o.preuves ? AVIS_MAQUETTE : [],
  };
}

/** `Des **particuliers**` → segments, le gras rendu par l'interface. */
export function decouperGras(texte: string): { texte: string; gras: boolean }[] {
  return texte
    .split('**')
    .map((t, i) => ({ texte: t, gras: i % 2 === 1 }))
    .filter((s) => s.texte !== '');
}

/** Outils inclus dans l'espace gratuit (cartes → formulaire, jamais vers une autre landing). */
export const OUTILS_INCLUS: { id: string; titre: string; icone: IconeLanding; texte: string }[] = [
  {
    id: 'chantiers',
    titre: 'Demandes de chantiers',
    icone: 'demandes',
    texte: 'Les projets des particuliers de votre secteur.',
  },
  {
    id: 'fiche',
    titre: 'Fiche pro',
    icone: 'fiche',
    texte: 'Vos métiers, votre zone, vos réalisations et vos garanties.',
  },
  {
    id: 'site',
    titre: 'Site internet',
    icone: 'site',
    texte: 'Créé avec l’IA, sur une adresse gratuite.',
  },
  {
    id: 'devis',
    titre: 'Devis et factures',
    icone: 'devis',
    texte: 'Mentions vérifiées, PDF à votre logo, signature en ligne.',
  },
  {
    id: 'suivi',
    titre: 'Suivi clients',
    icone: 'suivi',
    texte: 'Chaque demande suivie jusqu’au chantier signé.',
  },
  {
    id: 'avis',
    titre: 'Avis clients',
    icone: 'avis',
    texte: 'Demandés en fin de chantier, affichés sur votre fiche.',
  },
];
