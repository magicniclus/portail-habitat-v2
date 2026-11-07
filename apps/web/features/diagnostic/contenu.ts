import type { QuestionFaq } from '@/features/vitrine/seo';

/** Contenus de la maquette Diagnostic Immobilier (prix constatés en centimes). */

export const ICONES = {
  energie:
    'M12 3.5c3.5 3 5.5 5.5 5.5 8.5A5.5 5.5 0 0 1 12 17.5 5.5 5.5 0 0 1 6.5 12c0-3 2-5.5 5.5-8.5ZM12 20.5v-3',
  bouclier:
    'M12 3.2 19.5 6v6c0 4.6-3.1 7.6-7.5 8.9C7.6 19.6 4.5 16.6 4.5 12V6L12 3.2ZM9 12l2 2 4-4',
  goutte: 'M12 3.5c3 3.4 5 6 5 8.5a5 5 0 0 1-10 0c0-2.5 2-5.1 5-8.5Z',
  termite: 'M12 5v14M8 8.5 5 6.5M8 12H4.5M8 15.5 5 17.5M16 8.5l3-2M16 12h3.5M16 15.5l3 2',
  eclair: 'M13 2 4 14h7l-1 8 9-12h-7z',
  repere:
    'M12 21s6.5-6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21ZM12 12.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z',
} as const;

export const CARTES = [
  {
    nom: 'DPE et audit',
    icone: 'energie',
    texte:
      "Étiquette énergie et climat, obligatoire à la vente comme à la location. Un classement E, F ou G déclenche l'audit énergétique.",
    validite: 'Validité 10 ans',
    prix: [11_000, 19_000],
  },
  {
    nom: 'Amiante',
    icone: 'bouclier',
    texte:
      'Repérage des matériaux amiantés dans tout bien dont le permis de construire est antérieur au 1er juillet 1997.',
    validite: 'Illimité si postérieur à 2013',
    prix: [9_000, 16_000],
  },
  {
    nom: 'Plomb (CREP)',
    icone: 'goutte',
    texte:
      "Constat de risque d'exposition au plomb, pour les logements construits avant le 1er janvier 1949.",
    validite: '1 an à la vente',
    prix: [11_000, 19_000],
  },
  {
    nom: 'Termites',
    icone: 'termite',
    texte:
      'Obligatoire pour toute vente en Gironde : le département entier est en zone de surveillance et de lutte depuis 2001.',
    validite: 'Validité 6 mois',
    prix: [9_000, 15_000],
  },
  {
    nom: 'Gaz et électricité',
    icone: 'eclair',
    texte: "Deux états distincts, exigés dès que l'installation concernée a plus de quinze ans.",
    validite: '3 ans à la vente',
    prix: [9_500, 15_500],
    suffixe: ' chacun',
  },
  {
    nom: 'État des risques',
    icone: 'repere',
    texte:
      "Inondation, retrait-gonflement des argiles, termites, radon : l'ERP doit être remis dès la première visite.",
    validite: 'Validité 6 mois',
    prix: [2_500, 5_500],
  },
] as const;

export const TABLEAU = [
  {
    nom: 'DPE (performance énergétique)',
    quand: 'Toute vente et toute mise en location',
    validite: '10 ans',
    prix: [11_000, 19_000],
  },
  {
    nom: 'Audit énergétique réglementaire',
    quand: "Vente d'une maison ou d'un immeuble en monopropriété classé E, F ou G",
    validite: '5 ans',
    prix: [50_000, 95_000],
  },
  {
    nom: "État d'amiante",
    quand: 'Permis de construire délivré avant le 1er juillet 1997',
    validite: 'Illimitée si rapport postérieur à 2013',
    prix: [9_000, 16_000],
  },
  {
    nom: 'CREP (plomb)',
    quand: 'Logement construit avant le 1er janvier 1949',
    validite: '1 an à la vente si présence, 6 ans en location',
    prix: [11_000, 19_000],
  },
  {
    nom: 'État relatif aux termites',
    quand: 'Toute vente en Gironde (arrêté du 12 février 2001)',
    validite: '6 mois',
    prix: [9_000, 15_000],
  },
  {
    nom: "État de l'installation de gaz",
    quand: 'Installation de gaz de plus de 15 ans',
    validite: '3 ans à la vente, 6 ans en location',
    prix: [9_500, 14_500],
  },
  {
    nom: "État de l'installation électrique",
    quand: 'Installation électrique de plus de 15 ans',
    validite: '3 ans à la vente, 6 ans en location',
    prix: [9_500, 15_500],
  },
  {
    nom: 'État des risques et pollutions (ERP)',
    quand: 'Vente et location',
    validite: '6 mois',
    prix: [2_500, 5_500],
  },
  {
    nom: 'Mesurage loi Carrez',
    quand: "Vente d'un lot en copropriété",
    validite: 'Illimitée sauf travaux',
    prix: [7_000, 14_000],
  },
  {
    nom: 'Mesurage loi Boutin',
    quand: "Mise en location d'un logement vide",
    validite: 'Illimitée sauf travaux',
    prix: [7_000, 13_000],
  },
  {
    nom: 'Assainissement non collectif',
    quand: "Vente d'un bien non raccordé au tout-à-l'égout",
    validite: '3 ans',
    prix: [13_000, 23_000],
  },
] as const;

export const REPERES = [
  {
    date: '1949',
    titre: 'Plomb',
    icone: 'goutte',
    texte:
      'Avant le 1er janvier 1949, le CREP est obligatoire à la vente comme à la location. Très fréquent dans les échoppes et maisons de pierre du XIXe siècle.',
  },
  {
    date: '1997',
    titre: 'Amiante',
    icone: 'bouclier',
    texte:
      "Permis de construire délivré avant le 1er juillet 1997 : état d'amiante obligatoire à la vente. Cela couvre tous les logements des années 1960 à 1990.",
  },
  {
    date: '15 ans',
    titre: 'Gaz et électricité',
    icone: 'eclair',
    texte:
      "Dès que l'installation a plus de quinze ans, les deux états sont exigés : 3 ans de validité à la vente, 6 ans en location.",
  },
  {
    date: '2021',
    titre: 'DPE nouvelle méthode',
    icone: 'energie',
    texte:
      "Les DPE antérieurs au 1er juillet 2021 ne sont plus valables. Un DPE E, F ou G déclenche en plus l'audit énergétique pour une maison ou un immeuble entier.",
  },
] as const;

export const ETAPES_DIAG = [
  {
    titre: 'Vous décrivez le bien',
    texte:
      'Adresse, type, année de construction, motif. Le moteur applique les règles en vigueur et vos rapports déjà valides.',
    delai: '≈ 2 minutes',
  },
  {
    titre: 'Vous recevez 3 devis',
    texte:
      'Des diagnostiqueurs certifiés COFRAC de votre secteur vous proposent un pack au prix ferme, avec créneaux de visite.',
    delai: 'Sous 48 h',
  },
  {
    titre: 'Visite puis rapports',
    texte:
      'Une seule visite pour tous les diagnostics, 1 à 3 h selon la surface. Rapports PDF prêts à joindre au compromis.',
    delai: '24 à 48 h après la visite',
  },
] as const;

export const PACKS = [
  {
    titre: 'Appartement récent',
    prix: [28_000, 43_000],
    contenu:
      'DPE, ERP, mesurage Carrez, plus gaz et électricité si les installations ont plus de 15 ans. Une seule visite.',
  },
  {
    titre: 'Maison ancienne (avant 1997)',
    prix: [43_000, 78_000],
    contenu:
      'DPE, ERP, termites, amiante, gaz, électricité, plus le plomb si le bien est antérieur à 1949.',
  },
  {
    titre: 'Mise en location',
    prix: [22_000, 38_000],
    contenu:
      'DPE, ERP, surface habitable loi Boutin, états gaz et électricité, plomb si construction avant 1949.',
  },
] as const;

/** Tableau « Prix des diagnostics à {commune} ». */
export const PACKS_COMMUNE = [
  {
    cas: 'Appartement postérieur à 1997',
    inclus: 'DPE, ERP, Carrez, termites',
    prix: [28_000, 43_000],
  },
  {
    cas: 'Appartement 1950-1996',
    inclus: 'DPE, ERP, Carrez, termites, amiante, gaz, électricité',
    prix: [43_000, 68_000],
  },
  {
    cas: 'Maison antérieure à 1949',
    inclus: 'DPE, ERP, termites, amiante, plomb, gaz, électricité',
    prix: [52_000, 81_000],
  },
  {
    cas: 'Mise en location',
    inclus: 'DPE, ERP, loi Boutin, gaz, électricité, plomb si avant 1949',
    prix: [22_000, 38_000],
  },
] as const;

/** Sélecteurs du hero, mêmes valeurs que le parcours (DIA-01). */
export const MOTIFS = [
  { valeur: 'vente', libelle: 'Vendre' },
  { valeur: 'location', libelle: 'Louer' },
  { valeur: 'travaux', libelle: 'Faire des travaux' },
] as const;
export const TYPES = [
  { valeur: 'appartement', libelle: 'Appartement' },
  { valeur: 'maison', libelle: 'Maison' },
  { valeur: 'immeuble', libelle: 'Immeuble' },
] as const;
export const PERIODES = [
  { valeur: 'av1949', libelle: 'Avant 1949' },
  { valeur: '1949-1976', libelle: '1949 – 1976' },
  { valeur: '1977-1996', libelle: '1977 – 1996' },
  { valeur: '1997-2010', libelle: '1997 – 2010' },
  { valeur: 'ap2011', libelle: '2011 et après' },
] as const;

export const FAQ_DIAG: QuestionFaq[] = [
  {
    q: 'Quels diagnostics sont obligatoires pour vendre en Gironde ?',
    r: "DPE, état des risques et pollutions et diagnostic termites pour toute vente. S'y ajoutent l'amiante si le permis de construire est antérieur au 1er juillet 1997, le plomb avant 1949, les états gaz et électricité pour des installations de plus de 15 ans, le mesurage Carrez en copropriété, et le contrôle d'assainissement si le bien n'est pas raccordé au réseau collectif.",
  },
  {
    q: 'Le diagnostic termites est-il vraiment obligatoire ici ?',
    r: "Oui. L'arrêté préfectoral du 12 février 2001 a institué une zone de surveillance et de lutte contre les termites sur l'ensemble du département de la Gironde. Le rapport n'est valable que 6 mois : il se réalise juste avant la signature.",
  },
  {
    q: 'Combien de temps mon DPE reste-t-il valable ?',
    r: 'Dix ans, mais les DPE établis avant le 1er juillet 2021 ne sont plus valables : ils doivent être refaits selon la méthode 3CL-2021.',
  },
  {
    q: "Quand l'audit énergétique est-il obligatoire ?",
    r: "Pour la vente d'une maison individuelle ou d'un immeuble en monopropriété classé F ou G depuis avril 2023, et classé E depuis janvier 2025. Il ne remplace pas le DPE, il s'y ajoute.",
  },
  {
    q: 'Y a-t-il un diagnostic mérule obligatoire en Gironde ?',
    r: 'Non, aucun arrêté préfectoral mérule ne délimite de zone dans le département. Le contrôle reste conseillé sur le bâti ancien humide, notamment près de la Garonne.',
  },
  {
    q: 'Combien de temps faut-il pour obtenir les rapports ?',
    r: 'La visite dure de 1 à 3 heures selon la surface et le nombre de diagnostics. Les rapports sont transmis sous 24 à 48 h, en PDF, prêts à joindre au compromis.',
  },
];
