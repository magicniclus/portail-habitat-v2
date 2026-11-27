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

/** Familles de guides : regroupent les cartes sur la landing et le maillage entre guides. */
export const FAMILLES_GUIDES = {
  maison: 'Formes et styles de maison',
  pieces: 'Pièces et intérieurs',
  exterieur: 'Terrain et extérieur',
  projet: 'Projets et documents',
} as const;
export type FamilleGuide = keyof typeof FAMILLES_GUIDES;

export interface GuidePlan {
  slug: string;
  famille: FamilleGuide;
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
    famille: 'maison',
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
    famille: 'maison',
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
    famille: 'maison',
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
    famille: 'pieces',
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
    famille: 'projet',
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
    famille: 'maison',
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
  {
    slug: 'plan-de-masse',
    famille: 'exterieur',
    nom: 'Plan de masse',
    titre: 'Plan de masse gratuit avec le cadastre',
    description:
      'Faites gratuitement le plan de masse de votre maison : parcelle du cadastre, photo aérienne, distances aux limites et nord. Pour préparer votre projet en ligne.',
    h1: 'Plan de masse gratuit, sur votre vraie parcelle',
    intro:
      'Le plan de masse montre la maison posée sur son terrain : limites de la parcelle, distances, orientation. Saisissez votre adresse, la parcelle du cadastre se place autour de votre plan.',
    parties: [
      {
        titre: 'Votre parcelle en quelques secondes',
        paragraphes: [
          'Tapez l’adresse du terrain, choisissez-la dans la liste : la parcelle cadastrale est récupérée auprès des services publics de l’IGN, avec la photo aérienne. La maison se pose au centre ; recalez-la aux flèches et tournez-la si besoin.',
          'Cette vue est disponible avec votre compte gratuit, en France métropolitaine.',
        ],
        points: [
          'Limites cadastrales et photo aérienne',
          'Distances de la maison aux limites',
          'Flèche du nord qui tourne avec la parcelle',
          'Terrasse, piscine, allées et clôtures',
        ],
      },
      {
        titre: 'À quoi sert le plan de masse',
        paragraphes: [
          'C’est l’une des pièces demandées pour un permis de construire ou une déclaration préalable : il situe la construction, ses dimensions et ses distances aux limites.',
          'Notre plan vous aide à préparer et vérifier votre implantation, mais les distances restent indicatives : la pièce officielle du dossier doit respecter les exigences de votre mairie.',
        ],
      },
      {
        titre: 'Les distances aux limites',
        paragraphes: [
          'Le plan local d’urbanisme de votre commune fixe souvent un recul minimal par rapport à la rue et aux voisins. Les cotes affichées sur votre plan de masse permettent de le vérifier avant d’aller plus loin.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment faire un plan de masse gratuitement ?',
        r: 'Dessinez votre maison, ouvrez l’implantation, saisissez l’adresse : la parcelle du cadastre et la photo aérienne se placent autour du plan.',
      },
      {
        q: 'Mon adresse est-elle enregistrée ?',
        r: 'Non. L’adresse sert seulement à trouver la parcelle ; elle n’est ni enregistrée ni montrée dans les liens de partage.',
      },
      {
        q: 'Le plan de masse suffit-il pour le permis ?',
        r: 'Il aide à préparer le dossier. Les distances sont indicatives : faites vérifier la pièce officielle par un professionnel.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, avec votre compte gratuit.',
      },
    ],
  },
  {
    slug: 'cuisine',
    famille: 'pieces',
    nom: 'Cuisine',
    titre: 'Plan de cuisine gratuit en 3D',
    description:
      'Dessinez gratuitement le plan de votre cuisine en 3D : meubles bas et hauts, îlot, électroménager, couleurs des façades et du plan de travail. En ligne.',
    h1: 'Plan de cuisine gratuit en 3D',
    intro:
      'Cuisine en L, en U, avec îlot ou ouverte sur le séjour : placez les meubles à leur taille réelle, choisissez les couleurs et voyez le résultat en 3D avant de demander des devis.',
    parties: [
      {
        titre: 'Des meubles qui se calent contre les murs',
        paragraphes: [
          'Meubles bas, meubles hauts, évier, plaque, hotte, four, lave-vaisselle, réfrigérateur et îlot : chaque élément se pose contre le mur et s’aligne sur ses voisins.',
        ],
        points: [
          'Meubles bas et hauts, colonnes',
          'Îlot et table haute',
          'Évier, plaque, hotte, électroménager',
          'Couleurs de façade, plan de travail et poignées',
        ],
      },
      {
        titre: 'Toute la cuisine aux mêmes couleurs, d’un clic',
        paragraphes: [
          'Choisissez la couleur des façades, du plan de travail et des poignées, puis appliquez-la à toute la cuisine. Les meubles ajoutés ensuite reprennent les mêmes couleurs.',
        ],
      },
      {
        titre: 'Bien organiser sa cuisine',
        paragraphes: [
          'On place souvent l’évier, la plaque et le réfrigérateur en triangle, à quelques pas les uns des autres, avec un plan de travail entre la plaque et l’évier. Vérifiez sur votre plan que les portes et tiroirs s’ouvrent sans gêner le passage.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment faire le plan de sa cuisine ?',
        r: 'Dessinez la pièce, posez portes et fenêtres, puis ajoutez les meubles de cuisine contre les murs et passez en 3D.',
      },
      {
        q: 'Peut-on dessiner un îlot ?',
        r: 'Oui, l’îlot se pose librement dans la pièce.',
      },
      {
        q: 'Peut-on changer les couleurs ?',
        r: 'Oui : façades, plan de travail et poignées, pour un meuble ou toute la cuisine.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, entièrement gratuit, sans téléchargement.',
      },
    ],
  },
  {
    slug: 'salle-de-bain',
    famille: 'pieces',
    nom: 'Salle de bains',
    titre: 'Plan de salle de bain gratuit en 3D',
    description:
      'Dessinez gratuitement le plan de votre salle de bains en 3D : douche à l’italienne, baignoire, vasque, WC suspendu, carrelage et faïence. En ligne.',
    h1: 'Plan de salle de bain gratuit en 3D',
    intro:
      'Dans une salle de bains, chaque centimètre compte. Placez douche, baignoire, vasque et WC à leur taille réelle, essayez plusieurs carrelages et vérifiez les passages en 3D.',
    parties: [
      {
        titre: 'Les équipements, à la bonne taille',
        paragraphes: [
          'Douche à l’italienne, d’angle ou en niche, baignoire, vasque, WC suspendu, sèche-serviettes : posez-les contre les murs et déplacez-les jusqu’à trouver la bonne disposition.',
        ],
        points: [
          'Douches, baignoire, vasques',
          'WC suspendu ou au sol',
          'Sèche-serviettes et rangements',
          'Porte coulissante ou à galandage pour gagner de la place',
        ],
      },
      {
        titre: 'Carrelage et faïence',
        paragraphes: [
          'Choisissez le format des carreaux, la largeur et la couleur du joint, et la pose : droite, décalée, diagonale, chevron ou point de Hongrie. Le rendu apparaît sur le plan et en 3D.',
        ],
      },
      {
        titre: 'Penser aux arrivées d’eau',
        paragraphes: [
          'Rapprocher les équipements des arrivées et évacuations existantes limite les travaux de plomberie. Notez-les sur votre plan avant de déplacer la douche ou les WC, et demandez conseil à un plombier.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment faire le plan de sa salle de bains ?',
        r: 'Dessinez la pièce, posez la porte et la fenêtre, puis ajoutez douche, baignoire, vasque et WC, et choisissez le carrelage.',
      },
      {
        q: 'Peut-on dessiner une douche à l’italienne ?',
        r: 'Oui, elle fait partie des équipements proposés.',
      },
      {
        q: 'Peut-on choisir la pose du carrelage ?',
        r: 'Oui : droite, décalée, diagonale, chevron ou point de Hongrie, avec la couleur du joint.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, entièrement gratuit.',
      },
    ],
  },
  {
    slug: 'jardin-terrasse',
    famille: 'exterieur',
    nom: 'Jardin et terrasse',
    titre: 'Plan de jardin et terrasse gratuit en 3D',
    description:
      'Dessinez gratuitement votre jardin en 3D : terrasse, piscine, pergola, clôture, allées, arbres et potager, autour de votre maison. En ligne, sans téléchargement.',
    h1: 'Plan de jardin et de terrasse gratuit',
    intro:
      'Le jardin se pense avec la maison. Tracez la terrasse, posez la piscine, la pergola et les clôtures, plantez les arbres, puis regardez l’ensemble en 3D.',
    parties: [
      {
        titre: 'Terrasse sur mesure',
        paragraphes: [
          'Tracez la terrasse en deux coins, choisissez le matériau et le sens de pose des lames, sa hauteur : les marches côté jardin et le garde-corps se placent seuls. Ajoutez une pergola si vous voulez de l’ombre.',
        ],
        points: [
          'Bois, composite, dallage',
          'Marches et garde-corps automatiques',
          'Pergola en bois, à toile ou bioclimatique',
          'Salon de jardin et bains de soleil',
        ],
      },
      {
        titre: 'Piscine, clôtures et plantations',
        paragraphes: [
          'Piscine rectangulaire, ronde, ovale, en haricot, en L, couloir de nage ou hors-sol ; clôtures en bois, grillage, muret ou haie, portail ; arbres, arbustes, potager surélevé, abri de jardin, serre et carport.',
        ],
      },
      {
        titre: 'Le soleil au bon endroit',
        paragraphes: [
          'Orientez le plan vers le nord et réglez l’heure : les ombres de la maison et des arbres se déplacent en 3D. Idéal pour placer la terrasse et la piscine au soleil.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment faire le plan de son jardin ?',
        r: 'Dessinez la maison et la parcelle, puis ajoutez terrasse, piscine, allées, clôtures et plantations.',
      },
      {
        q: 'Peut-on voir les ombres ?',
        r: 'Oui, selon l’heure et l’orientation du terrain.',
      },
      {
        q: 'Peut-on ajouter une piscine ?',
        r: 'Oui, de plusieurs formes, enterrée ou hors-sol.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, entièrement gratuit.',
      },
    ],
  },
  {
    slug: 'facades-coupes',
    famille: 'projet',
    nom: 'Façades et coupes',
    titre: 'Plan de façade et coupe gratuits',
    description:
      'Obtenez gratuitement les façades nord, sud, est et ouest de votre maison et une coupe verticale, tirées de votre plan 2D. Toiture et ouvertures comprises.',
    h1: 'Plans de façades et coupes gratuits',
    intro:
      'Les façades montrent la maison vue de l’extérieur, côté par côté ; la coupe montre l’intérieur tranché. Les deux se tirent directement de votre plan, sans rien redessiner.',
    parties: [
      {
        titre: 'Quatre façades tirées du plan',
        paragraphes: [
          'Les élévations nord, sud, est et ouest suivent l’orientation de votre plan : portes, fenêtres, baies vitrées et toiture apparaissent à leur place et à leur hauteur.',
        ],
        points: [
          'Façades nord, sud, est et ouest',
          'Ouvertures et toiture à leur hauteur',
          'Mises à jour quand le plan change',
          'Visibles aussi par lien de partage',
        ],
      },
      {
        titre: 'Une coupe en deux clics',
        paragraphes: [
          'Tracez un trait sur le plan : la coupe verticale montre les murs, les planchers et le toit tranchés, avec les repères d’altitude de chaque niveau.',
        ],
      },
      {
        titre: 'Pour quoi faire ?',
        paragraphes: [
          'Les façades aident à juger de l’aspect de la maison et à préparer les pièces d’un dossier d’urbanisme ; elles restent indicatives et ne remplacent pas les pièces officielles exigées par votre mairie.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment obtenir les façades de ma maison ?',
        r: 'Dessinez votre plan avec ses ouvertures et sa toiture, puis ouvrez la vue Façades.',
      },
      {
        q: 'Peut-on faire une coupe ?',
        r: 'Oui, tracez un trait en deux clics sur le plan.',
      },
      {
        q: 'Faut-il redessiner quand je modifie le plan ?',
        r: 'Non, façades et coupes suivent le plan.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, entièrement gratuit.',
      },
    ],
  },
  {
    slug: 'combles',
    famille: 'pieces',
    nom: 'Aménagement de combles',
    titre: 'Plan d’aménagement de combles gratuit',
    description:
      'Dessinez gratuitement l’aménagement de vos combles : niveau sous la toiture, fenêtres de toit, escalier, chambre ou bureau. En 2D et en 3D, sans téléchargement.',
    h1: 'Plan d’aménagement de combles gratuit',
    intro:
      'Aménager les combles crée une ou plusieurs pièces sans agrandir l’emprise de la maison. Dessinez le niveau sous la toiture, posez l’escalier et les fenêtres de toit, et vérifiez les volumes en 3D.',
    parties: [
      {
        titre: 'Un niveau sous la toiture',
        paragraphes: [
          'Ajoutez un niveau de combles au-dessus de la maison, réglez sa hauteur sous plafond, puis tracez les cloisons des nouvelles pièces. La toiture se pose sur l’ensemble.',
        ],
        points: [
          'Niveau de combles réglable',
          'Fenêtres de toit',
          'Escalier depuis l’étage du dessous',
          'Vue 3D niveau par niveau',
        ],
      },
      {
        titre: 'Surface habitable et hauteur',
        paragraphes: [
          'Les parties dont la hauteur sous plafond est inférieure à 1,80 m ne comptent pas dans la surface habitable. Placez les rangements sous les pentes et les pièces de vie là où l’on tient debout.',
        ],
      },
      {
        titre: 'L’escalier, la clé du projet',
        paragraphes: [
          'L’escalier doit trouver sa place à l’étage du dessous et arriver dans les combles là où la hauteur est suffisante. L’éditeur signale les escaliers peu confortables et l’échappée trop basse.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment dessiner des combles aménagés ?',
        r: 'Ajoutez un niveau de combles, réglez sa hauteur, tracez les cloisons et posez l’escalier et les fenêtres de toit.',
      },
      {
        q: 'Peut-on ajouter des fenêtres de toit ?',
        r: 'Oui, sur les pans de la toiture.',
      },
      {
        q: 'Faut-il une autorisation ?',
        r: 'Souvent oui si la surface de plancher augmente ou si l’aspect extérieur change : renseignez-vous en mairie.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, entièrement gratuit.',
      },
    ],
  },
  {
    slug: 'maison-en-u',
    famille: 'maison',
    nom: 'Maison en U',
    titre: 'Plan de maison en U gratuit, en 2D et 3D',
    description:
      'Dessinez gratuitement le plan d’une maison en U autour d’un patio : forme prête à l’emploi, trois ailes, terrasse protégée. En 2D et en 3D, sans inscription.',
    h1: 'Plan de maison en U gratuit',
    intro:
      'La maison en U entoure un patio sur trois côtés : un espace extérieur abrité, à l’écart de la rue et des voisins. Partez de la forme en U et ajustez chaque aile.',
    parties: [
      {
        titre: 'Trois ailes autour d’un patio',
        paragraphes: [
          'Les pièces de vie occupent souvent l’aile du fond, les chambres une aile latérale, le garage ou une suite parentale l’autre. Toutes profitent de la lumière du patio.',
        ],
        points: [
          'Patio abrité du vent et des regards',
          'Baies vitrées sur trois côtés',
          'Jour et nuit séparés',
          'Plain-pied ou étage sur une aile',
        ],
      },
      {
        titre: 'Dessiner une maison en U',
        paragraphes: [
          'Choisissez la forme en U, indiquez les dimensions hors tout et la largeur des ailes, puis ajoutez cloisons et ouvertures. Tracez la terrasse au cœur du patio.',
        ],
      },
      {
        titre: 'Un volume plus grand à chauffer',
        paragraphes: [
          'Une maison en U a plus de façades qu’un rectangle de même surface : soignez l’isolation et l’orientation du patio, idéalement vers le sud.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment faire le plan d’une maison en U ?',
        r: 'Choisissez la forme en U, réglez les ailes, puis ajoutez cloisons, portes et fenêtres.',
      },
      {
        q: 'Peut-on voir le patio en 3D ?',
        r: 'Oui, avec la terrasse et les baies vitrées.',
      },
      {
        q: 'Une aile peut-elle avoir un étage ?',
        r: 'Oui, ajoutez un niveau au-dessus de l’aile voulue.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, entièrement gratuit.',
      },
    ],
  },
  {
    slug: 'maison-toit-plat',
    famille: 'maison',
    nom: 'Maison à toit plat',
    titre: 'Plan de maison à toit plat gratuit en 3D',
    description:
      'Dessinez gratuitement une maison contemporaine à toit plat : volumes cubiques, grandes baies vitrées, toiture plate. Plan 2D et maison en 3D, sans téléchargement.',
    h1: 'Plan de maison à toit plat gratuit',
    intro:
      'Volumes nets, grandes baies, toit plat : la maison contemporaine se dessine simplement. Tracez les volumes, choisissez la toiture plate et regardez le résultat en 3D.',
    parties: [
      {
        titre: 'Des volumes simples',
        paragraphes: [
          'Assemblez un ou plusieurs rectangles, de plain-pied ou à étage. Chaque volume reçoit sa toiture plate, et les décrochés donnent du caractère à la façade.',
        ],
        points: [
          'Toiture plate sur chaque volume',
          'Grandes baies coulissantes',
          'Enduit ou bardage en façade',
          'Terrasse dans le prolongement du séjour',
        ],
      },
      {
        titre: 'La lumière avant tout',
        paragraphes: [
          'Les grandes baies vitrées s’ouvrent sur le jardin. Réglez l’heure et l’orientation pour voir comment le soleil entre dans le séjour.',
        ],
      },
      {
        titre: 'Les règles locales',
        paragraphes: [
          'Certains plans locaux d’urbanisme encadrent les toits plats ou imposent des pentes et des matériaux. Vérifiez le règlement de votre zone en mairie avant d’arrêter votre projet.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment dessiner une maison à toit plat ?',
        r: 'Tracez la maison, puis choisissez la toiture plate dans le menu de la toiture.',
      },
      {
        q: 'Peut-on mélanger toit plat et toit en pente ?',
        r: 'Oui, chaque volume peut avoir sa propre toiture.',
      },
      {
        q: 'Peut-on choisir l’enduit ou le bardage ?',
        r: 'Oui, dans les finitions de façade.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, entièrement gratuit.',
      },
    ],
  },
  {
    slug: 'renovation',
    famille: 'projet',
    nom: 'Rénovation',
    titre: 'Plan de rénovation de maison gratuit',
    description:
      'Préparez gratuitement la rénovation de votre maison : dessinez l’existant, testez cloisons, cuisine et salle de bains en 3D, puis demandez des devis avec votre plan.',
    h1: 'Plan de rénovation de maison gratuit',
    intro:
      'Une rénovation réussie commence par un relevé précis. Dessinez votre maison telle qu’elle est, essayez les changements en 3D, puis montrez votre plan aux artisans.',
    parties: [
      {
        titre: 'Relever l’existant',
        paragraphes: [
          'Mesurez chaque pièce et reportez les cotes : les surfaces se calculent seules. Ce plan de départ servira de base à toutes vos idées.',
        ],
        points: [
          'Cotes au centimètre',
          'Surfaces de chaque pièce',
          'Historique des versions de votre plan',
          'PDF à l’échelle pour vos rendez-vous',
        ],
      },
      {
        titre: 'Tester avant de casser',
        paragraphes: [
          'Ouvrez une cuisine, déplacez la salle de bains, changez les sols : comparez les versions de votre plan avant de décider. Un mur porteur ne se supprime jamais sans l’avis d’un professionnel.',
        ],
      },
      {
        titre: 'Des devis plus justes',
        paragraphes: [
          'Avec votre compte gratuit, joignez votre plan à une demande de devis : surfaces, menuiseries et pièces sont lisibles d’un coup d’œil, ce qui évite les allers-retours. Le simulateur donne aussi une première estimation par type de travaux.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment préparer un plan de rénovation ?',
        r: 'Dessinez l’existant avec vos mesures, puis créez une version avec les changements prévus.',
      },
      {
        q: 'Peut-on comparer avant et après ?',
        r: 'Oui, grâce à l’historique des versions de votre plan.',
      },
      {
        q: 'Peut-on envoyer le plan aux artisans ?',
        r: 'Oui, en le joignant à une demande de devis ou par un lien de partage.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, le plan et la demande de devis sont gratuits.',
      },
    ],
  },
  {
    slug: 'a-imprimer',
    famille: 'projet',
    nom: 'Plan à imprimer',
    titre: 'Plan de maison à imprimer gratuit, en PDF',
    description:
      'Imprimez gratuitement le plan de votre maison en PDF à l’échelle 1/50 ou 1/100, en A4 ou A3, avec cotes et surfaces. Dessiné en ligne, sans logiciel.',
    h1: 'Plan de maison à imprimer gratuit',
    intro:
      'Un plan papier reste pratique sur le chantier ou chez l’artisan. Dessinez votre maison en ligne, puis téléchargez un PDF à l’échelle, prêt à imprimer.',
    parties: [
      {
        titre: 'Un PDF à l’échelle',
        paragraphes: [
          'Choisissez l’échelle, 1/50 ou 1/100, et le format, A4 ou A3 : l’éditeur vous conseille la combinaison qui fait tenir votre plan sur la feuille. Les cotes et les surfaces sont imprimées avec le plan.',
        ],
        points: [
          'Échelle 1/50 ou 1/100',
          'Format A4 ou A3',
          'Cotes et surfaces des pièces',
          'Téléchargement avec votre compte gratuit',
        ],
      },
      {
        titre: 'Lire un plan à l’échelle',
        paragraphes: [
          'À l’échelle 1/100, 1 cm sur le papier vaut 1 m en réalité ; à 1/50, 2 cm valent 1 m. Imprimez sans ajuster à la page pour garder l’échelle exacte.',
        ],
      },
      {
        titre: 'Partager sans imprimer',
        paragraphes: [
          'Vous pouvez aussi envoyer un lien en lecture seule : plan, 3D et façades s’ouvrent sans compte, et le lien se révoque quand vous voulez.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment imprimer le plan de ma maison ?',
        r: 'Dessinez-le en ligne, puis téléchargez le PDF à l’échelle depuis votre compte gratuit et imprimez-le sans ajustement à la page.',
      },
      {
        q: 'Quelles échelles sont proposées ?',
        r: '1/50 et 1/100, en A4 ou A3.',
      },
      {
        q: 'Les cotes sont-elles imprimées ?',
        r: 'Oui, avec la surface des pièces.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, entièrement gratuit.',
      },
    ],
  },
  {
    slug: 'garage',
    famille: 'exterieur',
    nom: 'Garage et carport',
    titre: 'Plan de garage gratuit, en 2D et 3D',
    description:
      'Dessinez gratuitement le plan de votre garage accolé ou séparé, avec porte de garage et rangements, ou d’un carport. En 2D et en 3D, sans téléchargement.',
    h1: 'Plan de garage gratuit',
    intro:
      'Garage accolé à la maison, garage séparé ou simple carport : dessinez-le avec ses ouvertures et ses rangements, et voyez comment il s’intègre à la maison et au terrain.',
    parties: [
      {
        titre: 'Garage accolé ou séparé',
        paragraphes: [
          'Tracez le garage comme une pièce contre la maison ou comme un volume à part sur la parcelle. Posez la porte de garage, une porte de service et une fenêtre, puis la toiture.',
        ],
        points: [
          'Porte de garage',
          'Porte de communication avec la maison',
          'Étagères et rangements',
          'Carport une ou deux voitures',
        ],
      },
      {
        titre: 'Penser aux dimensions',
        paragraphes: [
          'Prévoyez assez de place pour ouvrir les portières et circuler autour de la voiture, et ajoutez la largeur des rangements. Le plan à l’échelle permet de le vérifier facilement.',
        ],
      },
      {
        titre: 'Les autorisations',
        paragraphes: [
          'Comme pour une extension, un garage de 5 à 20 m² relève en général d’une déclaration préalable, au-delà d’un permis de construire. Les règles de votre commune priment : renseignez-vous en mairie.',
        ],
      },
    ],
    faq: [
      {
        q: 'Comment dessiner un garage ?',
        r: 'Tracez-le contre la maison ou séparément, puis posez la porte de garage et la toiture.',
      },
      {
        q: 'Peut-on dessiner un carport ?',
        r: 'Oui, pour une ou deux voitures.',
      },
      {
        q: 'Faut-il un permis pour un garage ?',
        r: 'Cela dépend de la surface et de votre commune : déclaration préalable pour un petit garage, permis au-delà.',
      },
      {
        q: 'Est-ce gratuit ?',
        r: 'Oui, entièrement gratuit.',
      },
    ],
  },
];

export const guideParSlug = (slug: string) => GUIDES_PLAN.find((g) => g.slug === slug);
