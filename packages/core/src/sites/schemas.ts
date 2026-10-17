import { z } from '../zod';

/**
 * Modèle des sites artisans (DATABASE §15 bis) : Section → Ligne → Colonne → Élément. Partagé par
 * l'éditeur, le serveur (enregistrement, publication) et le rendu public.
 */
export const APPAREILS = ['desktop', 'tablet', 'mobile'] as const;
export type Appareil = (typeof APPAREILS)[number];

export const parAppareil = <T extends z.ZodType>(t: T) =>
  z.object({ desktop: t, tablet: t, mobile: t });

export const JETONS_COULEUR = [
  'aucun',
  'auto',
  'blanc',
  'clair',
  'primaire',
  'sombre',
  'accent',
] as const;
const NOMBRE = String.raw`\d{1,3}(?:\.\d+)?%?`;
const RE_COULEUR_CSS = new RegExp(
  String.raw`^(#[0-9a-f]{6}|#[0-9a-f]{3}|rgba?\(\s*${NOMBRE}\s*,\s*${NOMBRE}\s*,\s*${NOMBRE}\s*(,\s*(0|1|0?\.\d+)\s*)?\)|hsla?\(\s*\d{1,3}\s*,\s*${NOMBRE}\s*,\s*${NOMBRE}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$`,
  'i',
);
/** Jeton de la palette du site, ou couleur CSS sûre (`#hex`, `rgb()`, `hsl()`) : rien d'autre n'entre dans le CSS. */
export const couleur = z.union([
  z.enum(JETONS_COULEUR),
  z.string().trim().max(60).regex(RE_COULEUR_CSS, 'Couleur invalide'),
]);
export type Couleur = z.output<typeof couleur>;

/** `lib:{realisationId}/{photoIndex}` (photos de la fiche), `up:{mediaId}` (import) ou vide. */
export const media = z.union([
  z.literal(''),
  z.string().regex(/^lib:[\w-]{1,128}\/\d{1,3}$/),
  z.string().regex(/^up:[\w-]{1,128}$/),
]);

export const TYPES_ACTION = [
  'page',
  'ancre',
  'url',
  'tel',
  'email',
  'sms',
  'whatsapp',
  'formulaire',
  'fichier',
  'aucun',
] as const;
export const action = z.object({
  type: z.enum(TYPES_ACTION),
  page: z.string().max(80).optional(),
  ancre: z.string().max(80).optional(),
  url: z.string().max(2000).optional(),
  onglet: z.boolean().optional(),
  nofollow: z.boolean().optional(),
  tel: z.string().max(30).optional(),
  email: z.string().max(200).optional(),
  objet: z.string().max(200).optional(),
  message: z.string().max(500).optional(),
  formulaire: z.enum(['defiler', 'popup']).optional(),
  fichierId: z.string().max(128).optional(),
});
export type Action = z.output<typeof action>;

const fond = {
  fond: couleur,
  fondType: z.enum(['couleur', 'image']),
  fondImage: media,
  voile: couleur,
  voileOpacite: z.number().int().min(0).max(95),
  fondPos: z.enum(['top', 'center', 'bottom']),
  texteCouleur: z.enum(['auto', 'clair', 'fonce']),
};
const masque = parAppareil(z.boolean());
const taille = parAppareil(z.number().int().min(8).max(160));
const commun = {
  htmlId: z
    .string()
    .max(60)
    .regex(/^[a-z0-9-]*$/),
  mb: z.number().int().min(0).max(200),
  masque,
  texteMobileOn: z.boolean().optional(),
  texteMobile: z.string().max(2000).optional(),
};
const alignement = z.enum(['left', 'center', 'right']);
const texteRiche = z.string().max(5000);
const liens = z.record(z.string().regex(/^L\d{1,4}$/), action);

const el = <T extends string, P extends z.ZodRawShape>(type: T, p: P) =>
  z.object({ id: z.string().max(40), type: z.literal(type), p: z.object({ ...commun, ...p }) });

export const element = z.discriminatedUnion('type', [
  el('titre', {
    texte: texteRiche,
    liens: liens.optional(),
    niveau: z.enum(['h1', 'h2', 'h3']),
    taille,
    couleur,
    align: alignement,
  }),
  el('surtitre', { texte: z.string().max(200), taille, couleur, align: alignement }),
  el('texte', { texte: texteRiche, liens: liens.optional(), taille, couleur, align: alignement }),
  el('bouton', {
    texte: z.string().max(80),
    action,
    variante: z.enum(['plein', 'contour']),
    couleur,
    largeur: z.enum(['auto', 'plein']),
    enLigne: z.boolean(),
    align: alignement,
  }),
  el('image', {
    src: media,
    legende: z.string().max(300),
    ratio: z.string().max(12),
    ajuste: z.enum(['cover', 'contain']),
    pos: z.string().max(20),
    arrondi: z.number().int().min(0).max(999),
    voile: couleur,
    voileOpacite: z.number().int().min(0).max(95),
    action,
  }),
  el('liste', {
    items: z.array(z.string().max(300)).max(30),
    icone: z.string().max(4),
    couleur,
    align: alignement,
  }),
  el('avis', {
    nom: z.string().max(120),
    texte: z.string().max(1000),
    note: z.number().int().min(1).max(5),
    align: alignement,
  }),
  el('chiffre', {
    valeur: z.string().max(40),
    label: z.string().max(120),
    taille,
    couleur,
    align: alignement,
  }),
  el('formulaire', { bouton: z.string().max(60) }),
  el('video', { url: z.string().max(500).optional(), legende: z.string().max(200) }),
  el('carte', { adresse: z.string().max(300).optional(), legende: z.string().max(200) }),
  el('espace', { hauteur: taille }),
  el('separateur', { largeur: z.enum(['plein', 'court']), align: alignement }),
  el('logo', { texte: z.string().max(120) }),
  el('menu', { align: alignement }),
  el('blog', {
    affichage: z.enum(['grille', 'liste', 'une']),
    nb: z.number().int().min(1).max(12),
    cat: z.string().max(80),
    extrait: z.boolean(),
  }),
]);
export type Element = z.output<typeof element>;
export type TypeElement = Element['type'];

export const colonne = z.object({
  id: z.string().max(40),
  w: z.number().int().min(1).max(12),
  p: z.object({
    htmlId: z
      .string()
      .max(60)
      .regex(/^[a-z0-9-]*$/)
      .optional(),
    pad: z.number().int().min(0).max(120),
    arrondi: z.number().int().min(0).max(999),
    ombre: z.boolean(),
    valign: z.enum(['start', 'center', 'end', 'stretch']),
    masque,
    ...fond,
  }),
  els: z.array(element).max(40),
});
export const ligne = z.object({
  id: z.string().max(40),
  p: z.object({
    htmlId: z
      .string()
      .max(60)
      .regex(/^[a-z0-9-]*$/)
      .optional(),
    gap: z.number().int().min(0).max(120),
    valign: z.enum(['start', 'center', 'end', 'stretch']),
    fond: couleur,
    empile: z.boolean(),
    inverse: z.boolean(),
    masque,
  }),
  cols: z.array(colonne).min(1).max(6),
});
export const section = z.object({
  id: z.string().max(40),
  p: z.object({
    nom: z.string().max(80),
    ancre: z
      .string()
      .max(60)
      .regex(/^[a-z0-9-]*$/),
    largeur: z.enum(['boite', 'plein']),
    padY: parAppareil(z.number().int().min(0).max(300)),
    masque,
    ...fond,
  }),
  rows: z.array(ligne).max(20),
});
export type Section = z.output<typeof section>;

export const TYPES_PAGE = [
  'accueil',
  'prestations',
  'realisations',
  'avis',
  'contact',
  'locale',
  'libre',
  'mentions',
] as const;
export const pageSite = z.object({
  nom: z.string().trim().min(1).max(80),
  court: z.string().trim().max(40),
  slug: z
    .string()
    .max(80)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/),
  type: z.enum(TYPES_PAGE),
  communeSlug: z.string().max(80).optional(),
  statut: z.enum(['brouillon', 'publiee']),
  ordre: z.number().int().min(0).max(500),
  sansNavigation: z.boolean(),
  menu: z.boolean(),
  seo: z.object({
    title: z.string().max(120),
    meta: z.string().max(320),
    motCle: z.string().max(80),
  }),
  sections: z.array(section).max(40),
});
export type PageSite = z.output<typeof pageSite>;

export const navigation = z.object({
  logo: z.object({
    mode: z.enum(['logo-nom', 'logo', 'nom']),
    image: media,
    initiales: z.string().max(4),
  }),
  nom: z.string().max(120),
  liens: z.array(z.object({ id: z.string().max(40), label: z.string().max(40), action })).max(12),
  cta: z.object({ visible: z.boolean(), texte: z.string().max(40), couleur, action }),
  tel: z.object({ visible: z.boolean(), numero: z.string().max(30) }),
  fond: couleur,
  fixe: z.boolean(),
  ombre: z.boolean(),
  transparente: z.boolean(),
  mobile: z.object({ sens: z.enum(['droite', 'gauche']) }),
});
export type Navigation = z.output<typeof navigation>;

export const theme = z.object({
  palette: z.object({ primaire: couleur, accent: couleur, clair: couleur, sombre: couleur }),
  polices: z.enum(['archivo', 'dmserif', 'barlow']),
  rayonBoutons: z.union([z.literal(2), z.literal(8), z.literal(999)]),
  ton: z.enum(['pro', 'chaleureux', 'direct']),
});
export type Theme = z.output<typeof theme>;
