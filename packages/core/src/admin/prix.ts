import { arrondir, type Bareme, type DetailCalcul } from '../leads/prix';

/** Prix manuel maximal sans `leads.prix_illimite` (ADMIN §1, rôle commercial), en centimes HT. */
export const PLAFOND_PRIX_COMMERCIAL = 3000;

export interface PrixManuel {
  prixBaseCentimes: number;
  prixPremiumCentimes: number;
  prixCredits: number;
}

const euros = (c: number) => `${c / 100} €`;

/** Retour au mode `auto` : même formule que le calcul initial, sur le détail enregistré. */
export function prixDepuisDetail(d: DetailCalcul, b: Bareme): PrixManuel {
  const brut =
    d.base *
    d.coefBudget *
    d.coefUrgence *
    d.coefQualite *
    d.coefConcurrence *
    d.coefNiveau *
    d.coefEligibilite;
  const prix = arrondir(Math.min(b.plafond, Math.max(b.plancher, brut)), b.arrondi);
  return {
    prixBaseCentimes: prix,
    prixPremiumCentimes: arrondir(prix * (1 - b.remisePremium), b.arrondi),
    prixCredits: Math.ceil(prix / b.centimesParCredit),
  };
}

/** Message d'erreur, ou `null` si le prix manuel est accepté (ADMIN §2.5). */
export function controlerPrixManuel(
  p: PrixManuel,
  bornes: { plancher: number; plafond: number },
  illimite: boolean,
): string | null {
  if (p.prixPremiumCentimes > p.prixBaseCentimes)
    return 'Le prix Premium ne peut pas dépasser le prix de base.';
  if (illimite) return null;
  const max = Math.min(bornes.plafond, PLAFOND_PRIX_COMMERCIAL);
  if (p.prixBaseCentimes < bornes.plancher)
    return `Sous le plancher de ${euros(bornes.plancher)} : permission leads.prix_illimite requise.`;
  if (p.prixBaseCentimes > max)
    return `Au-delà de ${euros(max)} HT : permission leads.prix_illimite requise.`;
  return null;
}

/** La promo se termine dans le futur et au plus tard à la clôture de l'appel d'offres. */
export function controlerPromo(
  jusquau: number,
  a: { maintenant: number; ouvertJusquau: number },
): string | null {
  if (jusquau <= a.maintenant) return 'La date de fin doit être future.';
  if (jusquau > a.ouvertJusquau) return 'La promo doit finir avant la clôture de l’appel d’offres.';
  return null;
}

export function controlerParametres(nbDeblocagesMax: number, nbDeblocages: number): string | null {
  return nbDeblocagesMax < nbDeblocages
    ? `Déjà ${nbDeblocages} déblocages : le maximum ne peut pas être inférieur.`
    : null;
}

/** Ouvert ↔ complet selon le nouveau maximum ; les autres statuts ne bougent pas. */
export function statutApresParametres(
  statut: string,
  nbDeblocagesMax: number,
  nbDeblocages: number,
): string {
  if (statut === 'ouvert' && nbDeblocages >= nbDeblocagesMax) return 'complet';
  if (statut === 'complet' && nbDeblocages < nbDeblocagesMax) return 'ouvert';
  return statut;
}
