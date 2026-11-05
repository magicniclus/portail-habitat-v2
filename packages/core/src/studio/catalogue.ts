/**
 * Ce que le Studio sait faire (STUDIO.md §4-5) : les écrans que le robot sait filmer avec un
 * artisan fictif, les placements de la caméra et les styles de texte. Claude choisit dans ces
 * listes ; rien d'autre n'est accepté.
 */

export const SCENES_CAPTURE = {
  annuaire_recherche: {
    libelle: 'Un particulier cherche un artisan dans sa ville',
    description:
      'Page d’accueil, saisie du métier et de la ville, liste des artisans avec la carte.',
  },
  fiche_publique: {
    libelle: 'La fiche de l’artisan, vue par un particulier',
    description: 'Bannière, logo, avis, réalisations, carte de la zone et bouton de demande.',
  },
  formulaire_demande: {
    libelle: 'Le particulier envoie une demande depuis la fiche',
    description: 'Formulaire rempli et envoyé, message de confirmation.',
  },
  demandes_recues: {
    libelle: 'Les demandes reçues dans l’espace pro',
    description: 'Liste « Mes demandes » avec les nouvelles demandes du mois.',
  },
  demande_detail: {
    libelle: 'Le détail d’une demande',
    description: 'Projet, ville, coordonnées du particulier et bouton pour répondre.',
  },
  tableau_de_bord: {
    libelle: 'Le tableau de bord de l’artisan',
    description: 'Chiffres du mois : demandes, vues de la fiche, devis envoyés.',
  },
  devis_creation: {
    libelle: 'Création d’un devis',
    description: 'Client, lignes, totaux calculés, mentions vérifiées, devis validé.',
  },
  facture: {
    libelle: 'Le devis transformé en facture',
    description: 'Facture préremplie depuis le devis accepté, puis émise.',
  },
  site_editeur: {
    libelle: 'Modification du site internet',
    description: 'Clic sur un texte, réécriture, couleurs, aperçu mobile.',
  },
  site_publie: {
    libelle: 'Le site internet publié',
    description: 'Le site en ligne, défilé de haut en bas, bouton d’appel.',
  },
} as const;
export type SceneCapture = keyof typeof SCENES_CAPTURE;
export const NOMS_SCENES = Object.keys(SCENES_CAPTURE) as SceneCapture[];

/** Ce qui occupe l'image principale d'un plan. */
export const VISUELS = ['ecran', 'camera', 'capture', 'carton'] as const;
export type Visuel = (typeof VISUELS)[number];

/** Place de la caméra par-dessus le visuel (« cachee » : pas de caméra sur ce plan). */
export const PLACEMENTS_CAMERA = ['cachee', 'bas', 'coin', 'plein'] as const;
export type PlacementCamera = (typeof PLACEMENTS_CAMERA)[number];

export const STYLES_TEXTE = ['accroche', 'titre', 'chiffre', 'note'] as const;
export const POSITIONS = ['haut', 'centre', 'bas'] as const;

/** Animations 2D proposées (dessinées image par image, identiques dans l'aperçu et le rendu). */
export const ANIMATIONS = {
  texte: 'Texte animé (accroche, titre, chiffre ou note)',
  compteur: 'Chiffre qui défile jusqu’à sa valeur',
  notification: 'Notification qui glisse depuis le haut (« Nouvelle demande »)',
  liste: 'Liste qui se coche ligne par ligne',
  barre: 'Barre de progression qui se remplit',
  fleche: 'Flèche qui pointe un endroit de l’écran',
  surlignage: 'Cadre qui entoure une zone de l’écran',
} as const;
export type TypeCalque = keyof typeof ANIMATIONS;

export const LIBELLES_VISUEL: Readonly<Record<Visuel, string>> = {
  ecran: 'Mon écran',
  camera: 'Ma caméra',
  capture: 'Capture Portail Travaux',
  carton: 'Carton (fond uni + texte)',
};

export const LIBELLES_CAMERA: Readonly<Record<PlacementCamera, string>> = {
  cachee: 'Sans caméra',
  bas: 'En bas',
  coin: 'Dans le coin',
  plein: 'Plein écran',
};
