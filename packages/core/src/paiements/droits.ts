/**
 * Formules et droits (PAIEMENTS.md §2 et §5, DECISIONS D54 à D60). `droits` est la seule source
 * de vérité de ce qu'une entreprise peut faire : écrit par le webhook Stripe uniquement, revérifié
 * par chaque Function ; le client ne le lit que pour l'affichage.
 */

export const FORMULES = [
  'gratuit',
  'fiche_pro',
  'site_pro',
  'pack_fiche_site',
  'tout_inclus',
] as const;
export type Formule = (typeof FORMULES)[number];
export type FormulePayante = Exclude<Formule, 'gratuit'>;
export const FORMULES_PAYANTES = FORMULES.filter(
  (f): f is FormulePayante => f !== 'gratuit',
);

/** Prix mensuels HT en centimes (sans engagement, TVA 20 % en sus). Stripe fait foi. */
export const PRIX_FORMULES_HT: Record<FormulePayante, number> = {
  fiche_pro: 2900,
  site_pro: 990,
  pack_fiche_site: 3490,
  tout_inclus: 4900,
};

export const NOMS_FORMULE: Record<Formule, string> = {
  gratuit: 'Gratuit',
  fiche_pro: 'Fiche Pro',
  site_pro: 'Site Pro',
  pack_fiche_site: 'Fiche + Site',
  tout_inclus: 'Tout inclus',
};

/** Paramètre `?offre=` de `/pro/abonnement` (PAIEMENTS §4). */
export const OFFRES_URL = {
  fiche: 'fiche_pro',
  site: 'site_pro',
  pack: 'pack_fiche_site',
  tout: 'tout_inclus',
} as const satisfies Record<string, FormulePayante>;
export type OffreUrl = keyof typeof OFFRES_URL;

export const offreUrlDe = (f: FormulePayante): OffreUrl =>
  (Object.keys(OFFRES_URL) as OffreUrl[]).find((k) => OFFRES_URL[k] === f)!;

export function formuleDeOffre(offre: string | null | undefined): FormulePayante | null {
  return offre && Object.hasOwn(OFFRES_URL, offre) ? OFFRES_URL[offre as OffreUrl] : null;
}

export interface DroitsFormule {
  formule: Formule;
  ficheMiseEnAvant: boolean;
  badgeRecommande: boolean;
  photosIllimitees: boolean;
  coordonneesVisibles: boolean;
  statsDetaillees: boolean;
  sitePro: boolean;
  iaSite: 'essai' | 'complet';
  iaMultiplicateur: 1 | 2;
  remiseAppelsOffres: 0 | 0.15;
  avanceAppelsOffresH: 0 | 12;
  supportPrioritaire: boolean;
}

const avecFiche = (f: Formule) =>
  f === 'fiche_pro' || f === 'pack_fiche_site' || f === 'tout_inclus';
const avecSite = (f: Formule) =>
  f === 'site_pro' || f === 'pack_fiche_site' || f === 'tout_inclus';

export function droitsDe(formule: Formule): DroitsFormule {
  const fiche = avecFiche(formule);
  const site = avecSite(formule);
  const tout = formule === 'tout_inclus';
  return {
    formule,
    ficheMiseEnAvant: fiche,
    badgeRecommande: fiche,
    photosIllimitees: fiche,
    coordonneesVisibles: fiche,
    statsDetaillees: fiche,
    sitePro: site,
    iaSite: site ? 'complet' : 'essai',
    iaMultiplicateur: tout ? 2 : 1,
    remiseAppelsOffres: tout ? 0.15 : 0,
    avanceAppelsOffresH: tout ? 12 : 0,
    supportPrioritaire: tout,
  };
}

/** `formule` couvre-t-elle déjà tout ce qu'apporte `voulue` ? */
export function inclut(formule: Formule, voulue: FormulePayante): boolean {
  if (formule === voulue || formule === 'tout_inclus') return true;
  if (voulue === 'tout_inclus') return false;
  const fiche = avecFiche(voulue) && !avecFiche(formule);
  const site = avecSite(voulue) && !avecSite(formule);
  return !fiche && !site;
}

/**
 * Offre à proposer quand l'artisan clique sur une fonction de `voulue` (PAIEMENTS §2 et §4) :
 * une seule formule active, donc Fiche Pro + Site Pro = Fiche + Site ; `null` si déjà incluse.
 */
export function offreProposee(actuelle: Formule, voulue: FormulePayante): FormulePayante | null {
  if (inclut(actuelle, voulue)) return null;
  const fiche = avecFiche(actuelle) || avecFiche(voulue);
  const site = avecSite(actuelle) || avecSite(voulue);
  if (voulue === 'tout_inclus') return 'tout_inclus';
  return fiche && site ? 'pack_fiche_site' : voulue;
}

/** Abonnés des anciennes formules (D60) : Visibilité → Fiche Pro, Premium → Tout inclus. */
export function formuleMigree(ancien: { plan: string; optionVisibilite: boolean }): Formule {
  if (ancien.plan === 'premium') return 'tout_inclus';
  return ancien.optionVisibilite ? 'fiche_pro' : 'gratuit';
}

/** Prix d'un appel d'offres après la remise de la formule (centimes entiers). */
export const remiseAppelOffres = (prixHt: number, d: Pick<DroitsFormule, 'remiseAppelsOffres'>) =>
  Math.round(prixHt * (1 - d.remiseAppelsOffres));

/** Sièges inclus (COMPTES §4.3, D26 ⏳ : les 3 sièges Premium passent à Tout inclus). */
export const siegesInclus = (f: Formule) => (f === 'tout_inclus' ? 3 : 1);

/** Document `droits` complet tel que l'écrit le serveur (création du compte, webhook). */
export const droitsInitiaux = (formule: Formule, majLe: Date) => ({
  ...droitsDe(formule),
  statut: 'actif' as const,
  majLe,
});

/**
 * Étape du moteur de conversion (CONVERSION.md, toujours écrit en Visibilité / Premium) :
 * Tout inclus tient le rôle de Premium, les autres formules payantes celui de Visibilité (D60).
 */
export const niveauConversion = (f: string | undefined): 'gratuit' | 'visibilite' | 'premium' =>
  f === 'tout_inclus' ? 'premium' : f && f !== 'gratuit' ? 'visibilite' : 'gratuit';
