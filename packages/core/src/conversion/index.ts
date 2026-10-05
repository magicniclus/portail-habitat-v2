/**
 * Moteur de conversion (CONVERSION.md) : logique pure, sans Firestore. Les Functions lisent les
 * signaux, appellent ces fonctions, et écrivent `cycleEtat` / `cycleTraces`.
 */
import type { ETAPES_CYCLE } from '../schemas/conversion';

export type EtapeCycle = (typeof ETAPES_CYCLE)[number];
const J = 86_400_000;

export interface SignauxScore {
  effectif?: number;
  nbMetiers?: number;
  rayonKm?: number;
  tempsReponseMin?: number;
  demandes30j?: number;
  deblocages30j?: number;
  joursConnexion7j?: number;
  completude?: number;
  joursSansConnexion?: number;
}

/** Score 0–100 (CONVERSION §4). */
export function scoreCycle(s: SignauxScore): number {
  const points =
    ((s.effectif ?? 0) >= 3 ? 20 : 0) +
    ((s.nbMetiers ?? 0) >= 3 || (s.rayonKm ?? 0) >= 30 ? 10 : 0) +
    (s.tempsReponseMin !== undefined && s.tempsReponseMin < 120 ? 15 : 0) +
    ((s.demandes30j ?? 0) >= 5 ? 15 : 0) +
    ((s.deblocages30j ?? 0) >= 2 ? 20 : 0) +
    ((s.joursConnexion7j ?? 0) >= 3 ? 10 : 0) +
    ((s.completude ?? 0) >= 100 ? 10 : 0) -
    ((s.joursSansConnexion ?? 0) >= 14 ? 20 : 0);
  return Math.max(0, Math.min(100, points));
}

export const SEUIL_PREMIUM = 50;
export const SEUIL_APPEL = 70;

/** Offre cible ; elle ne change qu'une fois par 30 jours au plus. */
export function offreCible(e: {
  score: number;
  actuelle?: 'visibilite' | 'premium';
  changeeLe?: number;
  maintenant: number;
  seuil?: number;
}): 'visibilite' | 'premium' {
  const calculee = e.score >= (e.seuil ?? SEUIL_PREMIUM) ? 'premium' : 'visibilite';
  if (e.actuelle && e.changeeLe !== undefined && e.maintenant - e.changeeLe < 30 * J)
    return e.actuelle;
  return calculee;
}

/** Étape du cycle de vie d'après l'état du compte (CONVERSION §2). */
export function etapeCycle(e: {
  compte: boolean;
  brouillon?: boolean;
  enLigne?: boolean;
  plan?: 'gratuit' | 'visibilite' | 'premium';
  resiliationDemandee?: boolean;
  ancienAbonne?: boolean;
}): EtapeCycle {
  if (!e.compte) return e.brouillon ? 'inscription_commencee' : 'prospect';
  if (!e.enLigne) return 'compte_cree';
  if (e.plan === 'visibilite' || e.plan === 'premium')
    return e.resiliationDemandee ? 'resiliation_demandee' : e.plan;
  return e.ancienAbonne ? 'ancien_client' : 'gratuit_actif';
}

/** Tirage stable du groupe témoin (hachage de l'identifiant), fait une fois à l'inscription. */
export function dansGroupeTemoin(artisanId: string, taille: number): boolean {
  let h = 2166136261;
  for (const c of artisanId) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h / 2 ** 32 < taille;
}

export type CategorieEnvoi =
  'securite' | 'transactionnel' | 'activite' | 'relance' | 'offres_pro' | 'marketing' | 'interne';
const NON_LIMITEES: readonly CategorieEnvoi[] = ['securite', 'transactionnel', 'interne'];

export type DecisionPression =
  { ok: true } | { ok: false; raison: 'pression' | 'veille' | 'temoin' };

/**
 * Pression (CONVERSION §5) : 2 offres pro par semaine, 1 email non transactionnel par jour,
 * veille après 5 offres non ouvertes, groupe témoin sans offre.
 */
export function controlerPression(e: {
  categorie: CategorieEnvoi;
  maintenant: number;
  envois: readonly { le: number; categorie: string }[];
  emailsNonOuverts: number;
  groupeTemoin: boolean;
  maxSemaine?: number;
  maxJour?: number;
  veilleApres?: number;
}): DecisionPression {
  if (NON_LIMITEES.includes(e.categorie)) return { ok: true };
  if (e.categorie === 'offres_pro') {
    if (e.groupeTemoin) return { ok: false, raison: 'temoin' };
    if (e.emailsNonOuverts >= (e.veilleApres ?? 5)) return { ok: false, raison: 'veille' };
    const semaine = e.envois.filter(
      (x) => x.categorie === 'offres_pro' && e.maintenant - x.le < 7 * J,
    );
    if (semaine.length >= (e.maxSemaine ?? 2)) return { ok: false, raison: 'pression' };
  }
  const jour = e.envois.filter(
    (x) => !NON_LIMITEES.includes(x.categorie as CategorieEnvoi) && e.maintenant - x.le < J,
  );
  if (jour.length >= (e.maxJour ?? 1)) return { ok: false, raison: 'pression' };
  return { ok: true };
}

/** Jour (1 = lundi … 7 = dimanche), heure et minute à Paris. */
function paris(ms: number) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ms);
  const v = (t: string) => p.find((x) => x.type === t)!.value;
  const jours = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return {
    jour: jours.indexOf(v('weekday')) + 1,
    minutes: Number(v('hour')) * 60 + Number(v('minute')),
  };
}

/**
 * Prochain créneau d'envoi (CONVERSION §5) : calendrier du mardi au jeudi à 7 h 15 ; signal à
 * 7 h 15 ou 18 h 30, du lundi au vendredi. Recherche par pas d'un quart d'heure (heure d'été).
 */
export function creneauEnvoi(maintenant: number, type: 'signal' | 'calendrier'): number {
  const PAS = 15 * 60_000;
  let t = Math.ceil((maintenant + 1) / PAS) * PAS;
  for (let i = 0; i < 4 * 24 * 10; i++, t += PAS) {
    const { jour, minutes } = paris(t);
    const jourOk = type === 'calendrier' ? jour >= 2 && jour <= 4 : jour <= 5;
    const heureOk = minutes === 7 * 60 + 15 || (type === 'signal' && minutes === 18 * 60 + 30);
    if (jourOk && heureOk) return t;
  }
  throw new Error('Aucun créneau trouvé');
}

/** Remise commerciale (D32c) : −30 % au plus tous les 90 jours ; −50 % en rétention, 1 fois par an. */
export function remisePossible(e: {
  pourcentage: number;
  retention?: boolean;
  derniereRemise?: number;
  derniereOffreRetention?: number;
  maintenant: number;
}): boolean {
  if (e.retention)
    return (
      e.pourcentage <= 50 &&
      (e.derniereOffreRetention === undefined || e.maintenant - e.derniereOffreRetention >= 365 * J)
    );
  return (
    e.pourcentage <= 30 &&
    (e.derniereRemise === undefined || e.maintenant - e.derniereRemise >= 90 * J)
  );
}

/** Priorités d'envoi (CONVERSION §5) : un email plus prioritaire le même jour reporte l'offre. */
export const PRIORITES_ENVOI = [
  'securite',
  'transactionnel',
  'paiement_echoue',
  'activation',
  'retention',
  'signal',
  'calendrier',
  'rapport',
] as const;

export {
  prochainPas,
  SEQUENCES_DEFAUT,
  sequencePourEtape,
  variante,
  type EtapeSequence,
  type PasSequence,
} from './sequences';
export { preparerDonnees, type DonneesPreparees } from './donnees';
export {
  classerSecteurs,
  signauxDeclenches,
  type EntreeSecteur,
  type PositionSecteur,
} from './secteur';
export {
  completAvantResume,
  demandesManquees,
  depenseAppelsOffres,
  signalCredits,
  signalGarantie,
  signalPassageAnnuel,
  signalRenouvellement,
  type AchatAppelOffres,
  type DemandeExclusive,
} from './opportunites';
export {
  codePersonnel,
  decisionRemise,
  finValidite,
  libelleExpiration,
  modeleAvecCode,
  type CodeActif,
  type DecisionRemise,
} from './remises';
export {
  DEMANDE_OFFERTE,
  demandeOffrable,
  destinatairesDemandeOfferte,
  type CandidatOffre,
} from './offertes';
export {
  DECLENCHEURS_SEQUENCE,
  LIBELLES_ETAPE_CYCLE,
  RAISONS_NON_ENVOI,
  TYPES_TACHE_CONVERSION,
  libelleTrace,
} from './libelles';
export { tachesACreer, type TacheConversion } from './taches';
export { agregerJourCycle, attribuerConversion } from './attribution';
export { emailsProspect } from './prospects';
export { adresseExpediteur } from './reponses';
export { LIEN_FACEBOOK, textePublicationFacebook } from './facebook';
