import type { PrixDeblocage } from './prix';

/**
 * Déblocage d'un appel d'offres (MATCHING [8]) : fenêtre Premium (D50) et choix du moyen de
 * paiement. Fonctions pures ; la transaction qui débite est côté serveur.
 */

export type AccesAppelOffres = 'tous' | 'premium_seul' | 'premium_prioritaire';

export function accesAppelOffres(
  ao: { acces: AccesAppelOffres; fenetrePremiumMin: number; ouvertLe: number },
  premium: boolean,
  maintenant: number,
): 'ok' | 'reserve_premium' {
  if (premium || ao.acces === 'tous') return 'ok';
  if (ao.acces === 'premium_seul') return 'reserve_premium';
  return maintenant >= ao.ouvertLe + ao.fenetrePremiumMin * 60_000 ? 'ok' : 'reserve_premium';
}

/** `offerte_conversion` : demande invendue offerte à l'activation de Visibilité (CONVERSION §3 bis). */
export type MoyenDeblocage =
  'carte' | 'credits' | 'inclus_premium' | 'offert_admin' | 'offerte_conversion';

/**
 * `auto` : gratuit → offert ; crédits inclus Premium, puis crédits achetés ; sinon rien n'est
 * débité et l'écran propose la carte ou un pack (PRO-05). `carte` : paiement Stripe demandé.
 */
export function choisirMoyen(
  prix: PrixDeblocage,
  portefeuille: { soldeCredits: number; creditsInclusRestants: number },
  premium: boolean,
  choix: 'auto' | 'carte',
): { moyen: MoyenDeblocage } | { moyen: null; raison: 'credits_insuffisants' } {
  if (prix.centimes === 0 && prix.credits === 0) return { moyen: 'offert_admin' };
  if (choix === 'carte') return { moyen: 'carte' };
  if (premium && portefeuille.creditsInclusRestants >= prix.credits)
    return { moyen: 'inclus_premium' };
  if (portefeuille.soldeCredits >= prix.credits) return { moyen: 'credits' };
  return { moyen: null, raison: 'credits_insuffisants' };
}

/** Début du mois civil (Europe/Paris) : fenêtre du plafond de crédits par collaborateur. */
export function debutMois(maintenant: number): number {
  const parties = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(maintenant));
  const annee = Number(parties.find((p) => p.type === 'year')!.value);
  const mois = Number(parties.find((p) => p.type === 'month')!.value);
  // Minuit à Paris = minuit UTC moins le décalage de Paris à cet instant (1 h, ou 2 h en été).
  const minuitUtc = Date.UTC(annee, mois - 1, 1);
  const heureParis = Number.parseInt(
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(minuitUtc)),
    10,
  );
  return minuitUtc - heureParis * 3_600_000;
}
