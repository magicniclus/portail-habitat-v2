import { peut, type ActionEquipe, type Membre } from '../equipe/permissions';

/** Espace pro (maquette Espace Artisan Dashboard, COMPTES §4) : règles pures partagées. */

export const PAGES_PRO = [
  'tableauDeBord',
  'fiche',
  'demandes',
  'site',
  'devis',
  'appelsOffres',
  'avis',
  'statistiques',
  'dessin',
  'equipe',
  'facturation',
  'compte',
  'aide',
] as const;
export type PagePro = (typeof PAGES_PRO)[number];

type Visible = (m: Membre) => boolean;
const pas =
  (role: Membre['role']): Visible =>
  (m) =>
    m.role !== role;
const droit =
  (...actions: ActionEquipe[]): Visible =>
  (m) =>
    actions.some((a) => peut(m, a));

const SECTIONS: { titre: string; liens: { cle: PagePro; libelle: string; visible?: Visible }[] }[] =
  [
    {
      titre: "Vue d'ensemble",
      liens: [
        { cle: 'tableauDeBord', libelle: 'Tableau de bord', visible: pas('comptable') },
        { cle: 'fiche', libelle: 'Ma fiche', visible: pas('comptable') },
        { cle: 'demandes', libelle: 'Mes demandes', visible: droit('demandes.repondre') },
        {
          cle: 'devis',
          libelle: 'Devis & factures',
          visible: droit('devis.gerer', 'factures.emettre'),
        },
      ],
    },
    {
      titre: 'Gestion',
      liens: [
        { cle: 'appelsOffres', libelle: "Appels d'offres", visible: droit('demandes.repondre') },
        { cle: 'avis', libelle: 'Mes avis', visible: pas('comptable') },
        { cle: 'site', libelle: 'Mon site internet', visible: droit('site.gerer') },
        { cle: 'statistiques', libelle: 'Statistiques', visible: droit('statistiques.voir') },
        // Plans (outil Dessin) : affiché seulement quand le flag `dessin` est actif (option de menuPro).
        { cle: 'dessin', libelle: 'Plans', visible: droit('dessin.gerer') },
      ],
    },
  ];

export interface LienPro {
  cle: PagePro;
  libelle: string;
  badge?: number;
  /** Pastille incitative (« À compléter ») : action attendue sur cette page. */
  alerte?: string;
}

/**
 * Outils de la barre latérale selon le rôle (COMPTES §4.1, D63) : un lien n'apparaît que si la
 * personne peut s'en servir. Le compte, l'équipe, l'abonnement et l'aide sont dans « Mon compte ».
 */
export function menuPro(
  membre: Membre | null | undefined,
  badges: Partial<Record<PagePro, number>> = {},
  alertes: Partial<Record<PagePro, string>> = {},
  options: { dessin?: boolean } = {},
): { titre: string; liens: LienPro[] }[] {
  const actif = membre?.statut === 'actif' ? membre : null;
  return SECTIONS.map((s) => ({
    titre: s.titre,
    liens: s.liens
      .filter((l) => l.cle !== 'dessin' || options.dessin === true)
      .filter((l) => (l.visible ? actif !== null && l.visible(actif) : true))
      .map((l) => ({
        cle: l.cle,
        libelle: l.libelle,
        ...(badges[l.cle] ? { badge: badges[l.cle] } : {}),
        ...(alertes[l.cle] ? { alerte: alertes[l.cle] } : {}),
      })),
  })).filter((s) => s.liens.length > 0);
}

/** « Mon compte », épinglé en bas de la barre latérale (D63, NAV-01) : ses quatre onglets. */
export const PAGES_COMPTE = [
  'compte',
  'equipe',
  'facturation',
  'aide',
] as const satisfies readonly PagePro[];
const ONGLETS_COMPTE: { cle: (typeof PAGES_COMPTE)[number]; libelle: string; visible?: Visible }[] =
  [
    { cle: 'compte', libelle: 'Profil et sécurité' },
    { cle: 'equipe', libelle: 'Équipe', visible: pas('comptable') },
    {
      cle: 'facturation',
      libelle: 'Abonnement',
      visible: droit('factures.voir', 'abonnement.gerer'),
    },
    { cle: 'aide', libelle: 'Aide & contact' },
  ];

/** Onglets de Mon compte selon le rôle : identiques sur les quatre pages du compte. */
export function ongletsCompte(membre: Membre | null | undefined): LienPro[] {
  const actif = membre?.statut === 'actif' ? membre : null;
  return ONGLETS_COMPTE.filter((o) => (o.visible ? actif !== null && o.visible(actif) : true)).map(
    ({ cle, libelle }) => ({ cle, libelle }),
  );
}

/** Première page de l'espace : le premier outil ; sinon l'abonnement (comptable), sinon le compte. */
export const accueilPro = (membre: Membre | null | undefined): PagePro =>
  menuPro(membre)[0]?.liens[0]?.cle ??
  (ongletsCompte(membre).some((o) => o.cle === 'facturation') ? 'facturation' : 'compte');

const DESCRIPTION_MIN = 20;

/** Ce qui rend la fiche « complète » (décision du propriétaire, 01/11/2026). */
export interface ContenuFiche {
  description: string;
  logo: boolean;
  banniere: boolean;
}

/**
 * Complétude de la fiche (DATABASE `completude`, 0–100) : logo, description et bannière. À
 * 100 %, la barre de progression disparaît et la fiche peut être mise en ligne.
 */
export function completudeFiche(f: ContenuFiche) {
  const criteres = [
    {
      cle: 'description',
      libelle: 'Présenter votre entreprise',
      poids: 35,
      fait: f.description.trim().length >= DESCRIPTION_MIN,
    },
    { cle: 'logo', libelle: 'Ajouter votre logo', poids: 30, fait: f.logo },
    { cle: 'banniere', libelle: 'Ajouter une bannière', poids: 35, fait: f.banniere },
  ] as const;
  const pourcent = criteres.reduce((t, c) => t + (c.fait ? c.poids : 0), 0);
  return { pourcent, criteres: criteres.map(({ cle, libelle, fait }) => ({ cle, libelle, fait })) };
}

/** Données d'une fiche (document `artisans/{id}`) → éléments comptés dans la complétude. */
export const contenuFiche = (a: {
  description?: string;
  logoUrl?: string;
  bannieres?: readonly string[];
}): ContenuFiche => ({
  description: a.description ?? '',
  logo: Boolean(a.logoUrl),
  banniere: (a.bannieres?.length ?? 0) > 0,
});

export type EtatDecennale = 'absente' | 'envoyee' | 'validee' | 'refusee';

/**
 * Assurance affichée à l'artisan (« Assurance non vérifiée » tant que la décennale n'est pas
 * validée, comme sur la fiche publique et dans l'annuaire).
 */
export function etatAssurance(
  d: EtatDecennale,
): 'verifiee' | 'en_verification' | 'a_envoyer' | 'a_renvoyer' {
  if (d === 'validee') return 'verifiee';
  if (d === 'envoyee') return 'en_verification';
  return d === 'refusee' ? 'a_renvoyer' : 'a_envoyer';
}

/**
 * Espace tout neuf (décision du propriétaire, 15/11/2026) : ni présentation, ni demande, ni avis.
 * Le premier écran remplace alors les indicateurs à zéro par l'accueil « votre espace est prêt ».
 */
export function espaceNeuf(e: { description: string; nbDemandes: number; nbAvis: number }) {
  return e.description.trim() === '' && e.nbDemandes === 0 && e.nbAvis === 0;
}

const PRIORITE_ONGLETS: readonly PagePro[] = [
  'tableauDeBord',
  'demandes',
  'appelsOffres',
  'fiche',
  'facturation',
  'compte',
  'aide',
];

/**
 * Mobile (MOBILE.md §6) : barre du bas de 5 entrées au plus ; au-delà, 4 onglets prioritaires et
 * « Plus » (feuille) avec le reste, dans l'ordre du menu.
 */
export function ongletsMobiles(menu: readonly { liens: readonly LienPro[] }[]) {
  const liens = menu.flatMap((s) => s.liens);
  if (liens.length <= 5) return { onglets: liens, plus: [] as LienPro[] };
  const rang = (l: LienPro) => {
    const i = PRIORITE_ONGLETS.indexOf(l.cle);
    return i < 0 ? PRIORITE_ONGLETS.length : i;
  };
  const onglets = [...liens].sort((a, b) => rang(a) - rang(b)).slice(0, 4);
  return { onglets, plus: liens.filter((l) => !onglets.includes(l)) };
}
export * from './demandes';
export * from './statistiques';
export * from './avis';
export * from './miseEnLigne';
export * from './assurance';
export * from './rapportHebdo';
export * from './compte';
export * from './depotFichier';
export * from './suivi';
