/**
 * Landing SEO « plan de maison gratuit » et ses guides (demande du propriétaire du 23/11/2026).
 * Mots-clés choisis sans outil de volume ni de difficulté (aucun export fourni) : requêtes
 * précises, une intention par page. Seulement ce que l'outil Plans fait réellement (DESSIN.md
 * §0, D84 gratuit) ; règles d'urbanisme générales, sans chiffre de marché ni avis (LANDINGS §7).
 */
export interface Partie {
  titre: string;
  paragraphes: readonly string[];
  points?: readonly string[];
}

export interface QuestionPlan {
  q: string;
  r: string;
}

export interface GuidePlan {
  slug: string;
  /** Nom court (cartes, fil d'Ariane). */
  nom: string;
  /** Balise title (moins de 60 signes avec la marque). */
  titre: string;
  description: string;
  h1: string;
  intro: string;
  parties: readonly Partie[];
  faq: readonly QuestionPlan[];
}

export const LANDING_PLAN = {
  titre: 'Plan de maison gratuit en 2D et 3D, en ligne',
  description:
    'Logiciel de plan de maison gratuit en ligne : dessinez vos pièces en 2D, visitez-les en 3D, ajoutez meubles et jardin. Sans téléchargement ni inscription.',
  h1: 'Plan de maison gratuit : dessinez en 2D, visitez en 3D',
  intro:
    'Faites le plan de votre maison directement dans votre navigateur, sur ordinateur ou téléphone. Murs, portes, fenêtres, meubles, toiture et jardin : tout se dessine en quelques minutes, les surfaces se calculent seules, et la 3D se construit pendant que vous dessinez.',
  points: [
    'Gratuit',
    'Rien à télécharger',
    'Sans inscription pour essayer',
    'Sur téléphone, tablette et ordinateur',
  ],
} as const;

/** Sections de la landing (ancres du sommaire). */
export const PARTIES_LANDING: readonly (Partie & { id: string })[] = [
  {
    id: 'logiciel',
    titre: 'Un logiciel de plan de maison gratuit, directement en ligne',
    paragraphes: [
      'Pas de logiciel à installer ni de version d’essai limitée dans le temps : l’éditeur s’ouvre dans votre navigateur. Vous pouvez commencer tout de suite, sans créer de compte ; votre brouillon reste sur votre appareil.',
      'Quand votre plan vous plaît, un compte gratuit suffit pour l’enregistrer, le retrouver sur tous vos appareils, le partager par un lien ou le joindre à une demande de devis. Votre essai est repris tel quel.',
    ],
    points: [
      'Tracé point par point ou à partir d’un rectangle, d’un L ou d’un U',
      'Surface de chaque pièce calculée automatiquement',
      'Plusieurs niveaux reliés par un escalier',
      'Plan imprimable en PDF à l’échelle',
    ],
  },
  {
    id: 'trois-d',
    titre: 'Votre plan en 3D, sans effort',
    paragraphes: [
      'Chaque mur dessiné en 2D apparaît aussitôt en 3D. Faites tourner la maison, regardez-la murs abaissés pour voir l’aménagement, ou entrez dedans pour une visite à hauteur d’yeux.',
      'Changez les sols, les peintures et les carrelages, essayez plusieurs dispositions de meubles, puis faites de belles images à envoyer à vos proches ou aux artisans.',
    ],
  },
  {
    id: 'amenagement',
    titre: 'Aménagement intérieur et extérieur',
    paragraphes: [
      'Placez cuisine, salle de bains, chambres et séjour avec des meubles qui se calent contre les murs. Dehors, ajoutez terrasse, piscine, allées, clôtures et arbres, et vérifiez les distances aux limites de votre terrain.',
    ],
    points: [
      'Portes battantes, coulissantes ou à galandage',
      'Fenêtres, baies vitrées et volets',
      'Toit deux pans, quatre pans ou plat',
      'Terrasse, piscine, clôture et végétation',
    ],
  },
  {
    id: 'travaux',
    titre: 'Du plan aux travaux',
    paragraphes: [
      'Un plan clair évite les malentendus. Avec votre compte, joignez-le à une demande de devis : les artisans qui acceptent votre demande voient les pièces, les surfaces et les menuiseries, sans jamais voir votre adresse dans le lien de partage.',
      'Vous ne savez pas encore quel budget prévoir ? Le simulateur vous donne une première estimation par type de travaux.',
    ],
  },
];

export const ETAPES_LANDING: readonly { titre: string; texte: string }[] = [
  {
    titre: 'Mesurez',
    texte:
      'Relevez les dimensions intérieures de chaque pièce, mur par mur, ainsi que la position des portes et fenêtres.',
  },
  {
    titre: 'Tracez les murs',
    texte:
      'Partez d’une forme simple (rectangle, L, U) ou tracez point par point. Saisissez les longueurs au clavier pour être précis.',
  },
  {
    titre: 'Ajoutez les ouvertures',
    texte:
      'Posez portes, fenêtres et baies vitrées d’un clic sur les murs, puis réglez leur taille.',
  },
  {
    titre: 'Aménagez',
    texte: 'Placez les meubles, choisissez sols et couleurs, ajoutez le jardin et la toiture.',
  },
  {
    titre: 'Vérifiez en 3D',
    texte: 'Passez en 3D, visitez chaque pièce et corrigez ce qui ne vous convient pas.',
  },
  {
    titre: 'Partagez',
    texte:
      'Enregistrez avec votre compte gratuit, téléchargez le PDF ou demandez des devis avec votre plan.',
  },
];

export const FAQ_LANDING: readonly QuestionPlan[] = [
  {
    q: 'Comment faire un plan de maison gratuitement ?',
    r: 'Ouvrez l’éditeur en ligne, tracez vos murs à partir d’une forme ou point par point, ajoutez portes et fenêtres, puis passez en 3D pour vérifier. Tout est gratuit, sans téléchargement.',
  },
  {
    q: 'Quel est le meilleur logiciel gratuit pour faire un plan de maison ?',
    r: 'Celui qui vous fait gagner du temps : rien à installer, surfaces calculées automatiquement, 3D immédiate et plan utilisable pour vos devis. C’est ce que propose notre éditeur en ligne.',
  },
  {
    q: 'Faut-il télécharger un logiciel ?',
    r: 'Non. L’éditeur fonctionne dans votre navigateur, sur ordinateur, tablette ou téléphone.',
  },
  {
    q: 'Faut-il créer un compte ?',
    r: 'Non pour essayer : votre plan reste sur votre appareil. Un compte gratuit est nécessaire pour l’enregistrer, le partager ou le joindre à une demande de devis.',
  },
  {
    q: 'Puis-je faire un plan de maison en 3D gratuit ?',
    r: 'Oui. La 3D se construit à partir de votre plan 2D, sans étape en plus. Vous pouvez tourner autour de la maison ou la visiter de l’intérieur.',
  },
  {
    q: 'Puis-je dessiner une maison à étage ?',
    r: 'Oui. Ajoutez des niveaux, reliez-les par un escalier et passez de l’un à l’autre.',
  },
  {
    q: 'Puis-je imprimer mon plan ?',
    r: 'Oui. Téléchargez votre plan en PDF à l’échelle depuis votre compte gratuit.',
  },
  {
    q: 'Mon plan peut-il servir pour un permis de construire ?',
    r: 'Il vous aide à préparer votre projet et à le présenter, mais il reste indicatif. Les pièces d’un permis de construire ont leurs propres exigences : faites-vous accompagner par un professionnel.',
  },
  {
    q: 'Les mesures sont-elles exactes ?',
    r: 'Le plan est à l’échelle des dimensions que vous saisissez. Faites toujours vérifier les cotes sur place avant les travaux.',
  },
  {
    q: 'Mon plan est-il privé ?',
    r: 'Oui. Il n’est visible que par vous, sauf si vous créez un lien de partage ou le joignez à une demande de devis. Le lien ne montre jamais votre adresse.',
  },
];

export const GUIDES_PLAN: readonly GuidePlan[] = [
  {
    slug: 'plain-pied',
    nom: 'Maison de plain-pied',
    titre: 'Plan de maison plain-pied gratuit, en 2D et 3D',
    description:
      'Dessinez gratuitement le plan de votre maison de plain-pied : 2, 3 ou 4 chambres, séjour, cuisine ouverte. 2D, 3D et surfaces calculées, sans inscription.',
    h1: 'Plan de maison plain-pied gratuit',
    intro:
      'Une maison de plain-pied tient sur un seul niveau : pas d’escalier, des pièces de vie et des chambres de plain-pied, une circulation simple. Dessinez la vôtre en quelques minutes et vérifiez l’agencement en 3D.',
    parties: [
      {
        titre: 'Bien organiser une maison de plain-pied',
        paragraphes: [
          'On sépare souvent la partie jour (entrée, séjour, cuisine) de la partie nuit (chambres, salle de bains). Un couloir court ou un dégagement central limite les mètres carrés perdus.',
          'Sur votre plan, tracez d’abord la forme générale de la maison, puis les cloisons : la surface de chaque pièce s’affiche aussitôt, ce qui permet d’ajuster rapidement.',
        ],
        points: [
          'Partie jour et partie nuit bien séparées',
          'Séjour orienté vers le jardin et la terrasse',
          'Salle de bains proche des chambres',
          'Rangements et cellier près de l’entrée ou de la cuisine',
        ],
      },
      {
        titre: 'Plain-pied en rectangle, en L ou en U',
        paragraphes: [
          'Le rectangle est la forme la plus simple et la plus compacte. Le L crée un angle abrité pour la terrasse ; le U entoure un patio. Partez de l’une de ces formes dans l’éditeur, puis modifiez les longueurs.',
        ],
      },
      {
        titre: 'Les règles à connaître',
        paragraphes: [
          'Au-delà de 150 m² de surface de plancher, le recours à un architecte est obligatoire pour déposer un permis de construire. Pour un logement loué, chaque pièce principale doit faire au moins 9 m² avec 2,20 m de hauteur sous plafond (ou un volume de 20 m³).',
          'Ces repères généraux ne remplacent pas le plan local d’urbanisme de votre commune : renseignez-vous en mairie avant de déposer votre demande.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment dessiner un plan de maison plain-pied 3 chambres ?',
        r: 'Tracez la forme de la maison, placez les cloisons des trois chambres côté nuit, puis la salle de bains et le séjour. Les surfaces s’affichent pendant que vous dessinez.',
      },
      {
        q: 'Peut-on voir une maison de plain-pied en 3D ?',
        r: 'Oui, la 3D se construit à partir de votre plan. Abaissez les murs pour voir l’aménagement de toutes les pièces d’un coup d’œil.',
      },
      {
        q: 'Peut-on ajouter un garage ?',
        r: 'Oui, dessinez-le comme une pièce accolée à la maison et ajoutez sa porte.',
      },
      {
        q: 'Le plan est-il gratuit ?',
        r: 'Oui, dessiner, voir en 3D et télécharger le PDF sont gratuits.',
      },
    ],
  },
  {
    slug: 'etage',
    nom: 'Maison à étage',
    titre: 'Plan de maison à étage gratuit, en 2D et 3D',
    description:
      'Faites le plan gratuit de votre maison à étage : rez-de-chaussée, étage, escalier et combles. Chaque niveau en 2D, toute la maison en 3D. Sans téléchargement.',
    h1: 'Plan de maison à étage gratuit',
    intro:
      'Une maison à étage occupe moins de terrain à surface égale. Dessinez chaque niveau, reliez-les par un escalier et voyez toute la maison en 3D, toiture comprise.',
    parties: [
      {
        titre: 'Dessiner niveau par niveau',
        paragraphes: [
          'Commencez par le rez-de-chaussée, puis ajoutez l’étage : vous passez d’un niveau à l’autre d’un clic. Les murs porteurs du bas servent de repère pour aligner ceux du haut.',
        ],
        points: [
          'Rez-de-chaussée, étage et combles',
          'Escalier droit, quart tournant ou à palier',
          'Hauteur de chaque niveau réglable',
          'Toiture posée sur la maison entière',
        ],
      },
      {
        titre: 'Bien placer l’escalier',
        paragraphes: [
          'L’escalier relie les deux niveaux : il doit arriver dans un dégagement à l’étage, pas au milieu d’une chambre. Pour un escalier confortable, on vise souvent la formule de Blondel : deux hauteurs de marche plus une profondeur entre 60 et 64 cm. L’éditeur vous signale les escaliers peu confortables.',
        ],
      },
      {
        titre: 'Jour en bas, nuit en haut',
        paragraphes: [
          'L’organisation la plus courante place séjour, cuisine et WC au rez-de-chaussée, chambres et salle de bains à l’étage. Une chambre au rez-de-chaussée reste utile pour recevoir ou pour plus tard.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment dessiner l’étage d’une maison ?',
        r: 'Ajoutez un niveau au-dessus du rez-de-chaussée, tracez ses murs, puis posez l’escalier qui relie les deux niveaux.',
      },
      {
        q: 'Peut-on voir les deux niveaux en 3D ?',
        r: 'Oui : toute la maison en vue extérieure, ou un niveau à la fois pour regarder dedans.',
      },
      {
        q: 'Peut-on dessiner des combles ?',
        r: 'Oui, ajoutez un niveau sous la toiture et réglez sa hauteur.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, les niveaux, l’escalier et la 3D sont gratuits.',
      },
    ],
  },
  {
    slug: 'maison-en-l',
    nom: 'Maison en L',
    titre: 'Plan de maison en L gratuit, en 2D et 3D',
    description:
      'Dessinez gratuitement le plan d’une maison en L : forme prête à l’emploi, terrasse abritée dans l’angle, 2D et 3D. Plain-pied ou à étage, sans inscription.',
    h1: 'Plan de maison en L gratuit',
    intro:
      'La maison en L sépare naturellement deux ailes et crée un angle abrité, idéal pour une terrasse ou un jardin protégé du vent et des regards. Partez de la forme en L de l’éditeur et ajustez chaque aile.',
    parties: [
      {
        titre: 'Les atouts de la forme en L',
        paragraphes: [
          'Une aile peut accueillir les pièces de vie, l’autre les chambres : la séparation jour et nuit se fait toute seule. L’angle intérieur forme un espace extérieur protégé, souvent orienté au sud ou à l’ouest.',
        ],
        points: [
          'Deux ailes : jour et nuit',
          'Terrasse abritée dans l’angle',
          'Grandes baies vitrées sur le jardin',
          'Plain-pied ou étage sur une aile',
        ],
      },
      {
        titre: 'Dessiner une maison en L en quelques clics',
        paragraphes: [
          'Choisissez la forme en L, saisissez la largeur et la profondeur hors tout, puis la largeur de chaque aile. Les cloisons, portes et fenêtres s’ajoutent ensuite, et la terrasse se trace dans l’angle.',
        ],
      },
      {
        titre: 'Voir l’ensemble en 3D',
        paragraphes: [
          'La 3D montre comment les deux ailes encadrent la terrasse et comment la lumière entre selon l’heure et l’orientation du terrain. Ajoutez une toiture deux pans sur chaque aile pour juger du volume.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment faire le plan d’une maison en L ?',
        r: 'Choisissez la forme en L dans l’éditeur, indiquez les dimensions des deux ailes, puis ajoutez cloisons, portes et fenêtres.',
      },
      {
        q: 'Une maison en L peut-elle avoir un étage ?',
        r: 'Oui, ajoutez un niveau au-dessus de tout ou partie de la maison.',
      },
      {
        q: 'Où placer la terrasse ?',
        r: 'Dans l’angle intérieur du L : elle est abritée et donne sur les deux ailes.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, la forme en L, la 3D et l’export PDF sont gratuits.',
      },
    ],
  },
  {
    slug: 'appartement',
    nom: 'Appartement',
    titre: 'Plan d’appartement gratuit en 2D et 3D',
    description:
      'Faites gratuitement le plan de votre appartement : relevé des pièces, cloisons à abattre, cuisine ouverte, meubles. 2D, 3D et surfaces calculées, en ligne.',
    h1: 'Plan d’appartement gratuit en ligne',
    intro:
      'Avant de rénover ou de meubler un appartement, un plan à l’échelle évite les mauvaises surprises. Dessinez l’existant, essayez une cuisine ouverte ou une nouvelle salle de bains, et voyez le résultat en 3D.',
    parties: [
      {
        titre: 'Relever l’existant',
        paragraphes: [
          'Mesurez chaque pièce mur par mur, notez l’épaisseur des cloisons, la position des portes, des fenêtres, des arrivées d’eau et des radiateurs. Reportez ces mesures dans l’éditeur : les surfaces se calculent seules.',
        ],
        points: [
          'Longueurs saisies au clavier, au centimètre',
          'Murs et cloisons distingués',
          'Surface de chaque pièce affichée',
          'Plan PDF à l’échelle pour vos rendez-vous',
        ],
      },
      {
        titre: 'Tester un réaménagement',
        paragraphes: [
          'Supprimez une cloison pour ouvrir la cuisine, déplacez une porte, agrandissez la salle de bains : comparez les versions de votre plan avant de décider.',
          'Attention : abattre un mur porteur demande l’avis d’un professionnel et, en copropriété, l’accord de l’assemblée générale.',
        ],
      },
      {
        titre: 'Meubler et décorer',
        paragraphes: [
          'Placez canapé, lit, table et rangements à leur taille réelle pour vérifier les passages. Changez sols et peintures, puis visitez l’appartement en 3D.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment faire le plan de son appartement ?',
        r: 'Mesurez chaque pièce, tracez les murs dans l’éditeur avec ces longueurs, puis ajoutez portes, fenêtres et meubles.',
      },
      {
        q: 'Peut-on tester une cuisine ouverte ?',
        r: 'Oui : supprimez la cloison sur votre plan et regardez le résultat en 3D. Faites vérifier par un professionnel s’il s’agit d’un mur porteur.',
      },
      {
        q: 'Le plan est-il à l’échelle ?',
        r: 'Oui, à l’échelle des mesures que vous saisissez, et imprimable en PDF.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, entièrement gratuit, sans téléchargement.',
      },
    ],
  },
  {
    slug: 'extension',
    nom: 'Extension de maison',
    titre: 'Plan d’extension de maison gratuit, en 2D et 3D',
    description:
      'Dessinez gratuitement le plan de votre extension de maison : agrandissement, véranda, pièce en plus. Voyez-la en 3D accolée à l’existant et demandez des devis.',
    h1: 'Plan d’extension de maison gratuit',
    intro:
      'Une extension ajoute une pièce sans déménager. Dessinez votre maison actuelle, accolez-lui l’agrandissement et voyez en 3D comment il s’intègre, avant de demander des devis.',
    parties: [
      {
        titre: 'Dessiner l’existant puis l’agrandissement',
        paragraphes: [
          'Tracez d’abord la maison telle qu’elle est, puis l’extension contre un mur extérieur. Ouvrez une baie ou une porte dans le mur commun pour relier les deux espaces.',
        ],
        points: [
          'Extension de plain-pied ou surélévation',
          'Baie vitrée sur le jardin',
          'Toit plat ou en pente',
          'Surface ajoutée calculée automatiquement',
        ],
      },
      {
        titre: 'Les autorisations à prévoir',
        paragraphes: [
          'En règle générale, une extension de 5 à 20 m² demande une déclaration préalable ; ce seuil passe à 40 m² en zone urbaine couverte par un plan local d’urbanisme. Au-delà, il faut un permis de construire, et un architecte si la surface totale de la maison dépasse alors 150 m².',
          'Vérifiez toujours les règles de votre commune en mairie : elles peuvent être plus strictes.',
        ],
      },
      {
        titre: 'Du plan aux devis',
        paragraphes: [
          'Avec votre compte gratuit, joignez votre plan à une demande de devis : maçons, charpentiers et menuisiers comprennent le projet du premier coup d’œil.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment dessiner une extension de maison ?',
        r: 'Dessinez la maison existante, puis tracez l’extension contre un mur extérieur et ouvrez un passage dans le mur commun.',
      },
      {
        q: 'Faut-il un permis pour une extension ?',
        r: 'Cela dépend de la surface et de votre commune : déclaration préalable pour une petite extension, permis de construire au-delà. Renseignez-vous en mairie.',
      },
      {
        q: 'Peut-on voir l’extension en 3D ?',
        r: 'Oui, accolée à la maison existante, avec sa toiture.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, le plan, la 3D et la demande de devis sont gratuits.',
      },
    ],
  },
  {
    slug: 'plan-3d',
    nom: 'Plan de maison 3D',
    titre: 'Plan de maison 3D gratuit en ligne',
    description:
      'Créez gratuitement un plan de maison en 3D en ligne : dessinez en 2D, la 3D se construit seule. Visite intérieure, matériaux, lumière du jour. Sans téléchargement.',
    h1: 'Plan de maison 3D gratuit en ligne',
    intro:
      'Pas besoin de savoir modéliser : dessinez votre plan en 2D, la maison apparaît en 3D avec ses murs, ses ouvertures, ses meubles et sa toiture. Tournez autour, entrez dedans, changez les matériaux.',
    parties: [
      {
        titre: 'De la 2D à la 3D, automatiquement',
        paragraphes: [
          'Chaque mur, porte ou fenêtre dessiné en 2D est construit en 3D aussitôt. Vous travaillez toujours sur le plan, qui reste simple et précis, et la 3D vous montre le résultat.',
        ],
        points: [
          'Vue extérieure, toit compris',
          'Murs abaissés pour voir l’aménagement',
          'Visite à hauteur d’yeux',
          'Lumière selon l’heure et l’orientation',
        ],
      },
      {
        titre: 'Matériaux et ambiance',
        paragraphes: [
          'Parquet, carrelage, béton ciré, peintures, couleurs des menuiseries : essayez plusieurs ambiances et comparez-les en 3D avant de choisir.',
        ],
      },
      {
        titre: 'Partager votre maison en 3D',
        paragraphes: [
          'Créez un lien de partage en lecture seule : vos proches ou vos artisans voient le plan, la 3D et la visite sans créer de compte. Le lien ne montre jamais votre adresse et se révoque à tout moment.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment faire un plan de maison en 3D gratuitement ?',
        r: 'Dessinez votre plan en 2D dans l’éditeur en ligne : la 3D se construit automatiquement.',
      },
      {
        q: 'Faut-il un ordinateur puissant ?',
        r: 'Non, la 3D fonctionne dans un navigateur récent, sur ordinateur comme sur téléphone.',
      },
      {
        q: 'Peut-on visiter la maison en 3D ?',
        r: 'Oui, entrez dans la maison et déplacez-vous de pièce en pièce.',
      },
      {
        q: 'Peut-on partager la 3D ?',
        r: 'Oui, par un lien en lecture seule, sans compte pour la personne qui l’ouvre.',
      },
    ],
  },
];

export const guideParSlug = (slug: string) => GUIDES_PLAN.find((g) => g.slug === slug);
