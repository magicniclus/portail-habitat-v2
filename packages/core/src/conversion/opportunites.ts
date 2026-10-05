import { distanceKm } from '../matching/filtres';
import type { EtapeCycle } from './index';

const J = 86_400_000;
/** Valeur d'un crédit dans les emails : « Premium inclut 5 crédits (50 €) » (CONVERSION §3 S6). */
const VALEUR_CREDIT_CENTIMES = 1000;
/** Seuil du signal `prem-credits` : plus de 40 € HT d'appels d'offres sur 30 jours. */
const SEUIL_PREM_CREDITS_CENTIMES = 4000;

export interface AchatAppelOffres {
  moyen: string;
  prixHtCentimes: number;
  credits: number;
}

/** Appels d'offres payés sur 30 jours (carte et crédits achetés ; ni inclus Premium, ni offerts). */
export function depenseAppelsOffres(achats: readonly AchatAppelOffres[]) {
  let credits30j = 0;
  let montant30jCentimes = 0;
  for (const a of achats) {
    if (a.moyen === 'carte') {
      montant30jCentimes += a.prixHtCentimes;
      credits30j += Math.round(a.prixHtCentimes / VALEUR_CREDIT_CENTIMES);
    } else if (a.moyen === 'credits') {
      montant30jCentimes += a.credits * VALEUR_CREDIT_CENTIMES;
      credits30j += a.credits;
    }
  }
  return { credits30j, montant30jCentimes };
}

/** `prem-credits` : non Premium, plus de 40 € HT en 30 jours, au plus une fois par mois. */
export function signalCredits(
  etape: EtapeCycle,
  depense: { montant30jCentimes: number },
  o: { maintenant: number; dernier?: number },
): boolean {
  return (
    (etape === 'gratuit_actif' || etape === 'visibilite') &&
    depense.montant30jCentimes > SEUIL_PREM_CREDITS_CENTIMES &&
    (o.dernier === undefined || o.maintenant - o.dernier >= 30 * J)
  );
}

export interface DemandeExclusive {
  id: string;
  metier: string;
  geo: { latitude: number; longitude: number };
  /** Artisan Premium qui l'a reçue. */
  artisanId: string;
  travaux: string;
  ville: string;
  budgetCentimes: number;
}

/**
 * Demandes de la semaine confiées en exclusivité à un Premium, que l'artisan aurait pu recevoir :
 * même métier, chantier dans sa zone. Les 5 plus gros budgets, sans rien du particulier.
 */
export function demandesManquees(
  artisanId: string,
  artisan: {
    metiers: readonly string[];
    centre: { latitude: number; longitude: number };
    rayonKm: number;
  },
  demandes: readonly DemandeExclusive[],
): DemandeExclusive[] {
  return demandes
    .filter(
      (d) =>
        d.artisanId !== artisanId &&
        artisan.metiers.includes(d.metier) &&
        distanceKm(artisan.centre, d.geo) <= artisan.rayonKm,
    )
    .sort((x, y) => y.budgetCentimes - x.budgetCentimes)
    .slice(0, 5);
}

const moisParis = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(ms).slice(0, 7);

/** `garantie-tenue` (S7) : Premium, 4e demande exclusive du mois reçue ; une fois par mois. */
export function signalGarantie(
  etape: EtapeCycle,
  demandesMois: number,
  o: { maintenant: number; dernier?: number },
): boolean {
  return (
    etape === 'premium' &&
    demandesMois >= 4 &&
    (o.dernier === undefined || moisParis(o.dernier) !== moisParis(o.maintenant))
  );
}
