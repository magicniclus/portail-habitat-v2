import type { Element, Section, TypeElement } from './schemas';

/**
 * Catalogue des éléments et des blocs (SITE_INTERNET §4.1) : réglages par défaut de chaque type.
 * L'éditeur (« Ajouter ») et l'IA (IA_SITE §2.1) partent de ces valeurs ; seuls les réglages
 * fournis sont remplacés, puis le schéma revalide le tout.
 */
const v3 = <T>(v: T) => ({ desktop: v, tablet: v, mobile: v });
const t3 = (d: number, t: number, m: number) => ({ desktop: d, tablet: t, mobile: m });
const commun = { htmlId: '', mb: 16, masque: v3(false) };
const aucune = { type: 'aucun' } as const;

export const DEFAUTS_ELEMENT: { [T in TypeElement]: Extract<Element, { type: T }>['p'] } = {
  titre: {
    ...commun,
    texte: 'Titre',
    niveau: 'h2',
    taille: t3(34, 30, 26),
    couleur: 'auto',
    align: 'left',
  },
  surtitre: {
    ...commun,
    texte: 'Surtitre',
    taille: t3(14, 14, 13),
    couleur: 'accent',
    align: 'left',
  },
  texte: {
    ...commun,
    texte: 'Votre texte.',
    taille: t3(18, 17, 16),
    couleur: 'auto',
    align: 'left',
  },
  bouton: {
    ...commun,
    texte: 'Demander un devis',
    action: aucune,
    variante: 'plein',
    couleur: 'primaire',
    largeur: 'auto',
    enLigne: true,
    align: 'left',
  },
  image: {
    ...commun,
    src: '',
    legende: '',
    ratio: '4/3',
    ajuste: 'cover',
    pos: 'center',
    arrondi: 12,
    voile: 'aucun',
    voileOpacite: 0,
    action: aucune,
  },
  liste: {
    ...commun,
    items: ['Premier point', 'Deuxième point'],
    icone: '✓',
    couleur: 'auto',
    align: 'left',
  },
  avis: { ...commun, nom: '', texte: '', note: 5, align: 'left' },
  chiffre: {
    ...commun,
    valeur: '',
    label: '',
    taille: t3(40, 36, 32),
    couleur: 'primaire',
    align: 'left',
  },
  formulaire: { ...commun, bouton: 'Envoyer ma demande' },
  video: { ...commun, legende: '' },
  carte: { ...commun, legende: '' },
  espace: { ...commun, hauteur: t3(48, 40, 32) },
  separateur: { ...commun, largeur: 'plein', align: 'center' },
  logo: { ...commun, texte: '' },
  menu: { ...commun, align: 'left' },
  blog: { ...commun, affichage: 'grille', nb: 3, cat: '', extrait: true },
};

const FOND = {
  fond: 'aucun',
  fondType: 'couleur',
  fondImage: '',
  voile: 'sombre',
  voileOpacite: 0,
  fondPos: 'center',
  texteCouleur: 'auto',
} as const;

export const DEFAUTS_SECTION: Section['p'] = {
  nom: 'Section',
  ancre: '',
  largeur: 'boite',
  padY: t3(80, 64, 48),
  masque: v3(false),
  ...FOND,
};
export const DEFAUTS_LIGNE: Section['rows'][number]['p'] = {
  htmlId: '',
  gap: 24,
  valign: 'start',
  fond: 'aucun',
  empile: true,
  inverse: false,
  masque: v3(false),
};
export const DEFAUTS_COLONNE: Section['rows'][number]['cols'][number]['p'] = {
  htmlId: '',
  pad: 0,
  arrondi: 0,
  ombre: false,
  valign: 'start',
  masque: v3(false),
  ...FOND,
};

/** Élément d'un type avec ses réglages par défaut, complétés par `p`. */
export function elementDuCatalogue(type: TypeElement, id: string, p: object = {}): Element {
  return { id, type, p: { ...DEFAUTS_ELEMENT[type], ...p } } as Element;
}
