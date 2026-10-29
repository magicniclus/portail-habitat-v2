/** Statut d'une page du site (tableau de bord, éditeur). */
export const STATUTS_PAGE = {
  brouillon: { libelle: 'Brouillon', tone: 'neutre' },
  publiee: { libelle: 'En ligne', tone: 'succes' },
} as const;

/** Libellé du score SEO d'une page (sur 100). */
export function libelleScoreSeo(score: number): {
  libelle: string;
  tone: 'succes' | 'attention' | 'danger';
} {
  if (score >= 80) return { libelle: 'Bon', tone: 'succes' };
  if (score >= 50) return { libelle: 'À améliorer', tone: 'attention' };
  return { libelle: 'Faible', tone: 'danger' };
}

/** État de publication du site, affiché sous son adresse. */
export function etatPublication(e: { versionPubliee?: number; modifie: boolean }): {
  libelle: string;
  tone: 'neutre' | 'succes' | 'attention';
} {
  if (!e.versionPubliee) return { libelle: 'Pas encore publié', tone: 'neutre' };
  if (e.modifie) return { libelle: 'En ligne · modifications non publiées', tone: 'attention' };
  return { libelle: 'En ligne', tone: 'succes' };
}

/** Nom des 16 éléments (Ajouter, Calques). */
/** Noms des animations d'apparition (panneau Avancé). */
export const LIBELLES_ANIMATION = {
  fondu: 'Fondu',
  monter: 'Monter',
  descendre: 'Descendre',
  gauche: 'Depuis la gauche',
  droite: 'Depuis la droite',
  zoom: 'Zoom',
} as const;

export const LIBELLES_ELEMENT = {
  titre: 'Titre',
  surtitre: 'Surtitre',
  texte: 'Texte',
  bouton: 'Bouton',
  image: 'Image',
  liste: 'Liste',
  avis: 'Avis',
  chiffre: 'Chiffre clé',
  formulaire: 'Formulaire',
  video: 'Vidéo',
  carte: 'Carte',
  espace: 'Espace',
  separateur: 'Séparateur',
  logo: 'Logo',
  menu: 'Menu',
  blog: 'Articles du blog',
} as const;

/** Tuiles « Action » de l'éditeur, dans l'ordre de la maquette (nom court). */
export const TUILES_ACTION = {
  page: 'Page',
  ancre: 'Zone',
  url: 'Lien web',
  tel: 'Appel',
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  formulaire: 'Formulaire',
  fichier: 'Fichier',
  aucun: 'Aucune',
} as const;

/** Types d'action proposés dans l'éditeur. */
export const LIBELLES_ACTION = {
  aucun: 'Aucune action',
  page: 'Aller à une page',
  ancre: 'Aller à une section de la page',
  url: 'Ouvrir un site (https)',
  tel: 'Appeler',
  sms: 'Envoyer un SMS',
  whatsapp: 'WhatsApp',
  email: 'Envoyer un email',
  formulaire: 'Aller au formulaire',
  fichier: 'Télécharger un fichier',
} as const;
