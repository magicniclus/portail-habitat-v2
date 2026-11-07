import { minuitParis } from '../admin/annonces';
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

/**
 * `passage-annuel` (S7) : abonnement mensuel actif dont la 3e échéance est payée (date de création
 * et début de la période en cours) ; une seule fois par entreprise. Produit visé : le plus élevé.
 */
export function signalPassageAnnuel(
  abonnements: readonly {
    produit: 'premium' | 'visibilite';
    periode: 'mensuel' | 'annuel';
    statut: string;
    creeLe: number;
    debutPeriode: number;
  }[],
  o: { dejaEnvoye: boolean },
): 'premium' | 'visibilite' | null {
  if (o.dejaEnvoye) return null;
  const eligibles = abonnements.filter(
    (a) =>
      a.periode === 'mensuel' &&
      a.statut === 'active' &&
      Math.round((a.debutPeriode - a.creeLe) / (30 * J)) + 1 >= 3,
  );
  if (!eligibles.length) return null;
  return eligibles.some((a) => a.produit === 'premium') ? 'premium' : 'visibilite';
}

/**
 * `prem-renouvellement` (S6) : Visibilité annuelle qui se renouvelle dans 30 jours au plus (et pas
 * résiliée) ; une fois par période. Renvoie la date de renouvellement.
 */
export function signalRenouvellement(
  abonnements: readonly {
    produit: string;
    periode: string;
    statut: string;
    finPeriode: number;
    annulationFinPeriode: boolean;
  }[],
  o: { maintenant: number; dernier?: number },
): number | null {
  const a = abonnements.find(
    (x) =>
      x.produit === 'visibilite' &&
      x.periode === 'annuel' &&
      x.statut === 'active' &&
      !x.annulationFinPeriode &&
      x.finPeriode > o.maintenant &&
      x.finPeriode - o.maintenant <= 30 * J,
  );
  if (!a || (o.dernier !== undefined && a.finPeriode - o.dernier <= 60 * J)) return null;
  return a.finPeriode;
}

/**
 * `prem-appel-offres-complet` (S6) : appel d'offres publié après le résumé d'hier (7 h, Paris) et
 * complet avant celui d'aujourd'hui ; l'abonné Visibilité ne l'a donc jamais vu ouvert.
 */
export function completAvantResume(
  ao: { ouvertLe: number; completLe: number },
  maintenant: number,
): boolean {
  const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(maintenant);
  const resume = minuitParis(jour) + 7 * 3_600_000;
  const fin = maintenant >= resume ? resume : resume - J;
  const debut = fin - J;
  return ao.ouvertLe >= debut && ao.completLe < fin && ao.completLe >= debut;
}
