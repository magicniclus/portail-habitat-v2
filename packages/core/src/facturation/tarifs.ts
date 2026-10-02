/** Prix affichés par défaut (DECISIONS D24, D25), en centimes HT. Stripe fait foi ; `config/app` les surcharge. */
export const PRIX_AFFICHES = {
  premiumMensuelHt: 9990,
  premiumAnnuelHtMois: 7990,
  visibiliteAnnuelHt: 7990,
  visibiliteMensuelHt: 1290,
} as const;

/** Mises en relation exclusives garanties chaque mois en Premium (D26b). */
export const GARANTIES_PREMIUM_MOIS = 4;

export type PrixAffiches = { [K in keyof typeof PRIX_AFFICHES]: number };
export type Facturation = 'annuel' | 'mensuel';

export interface LigneTarif {
  /** Prix mensuel affiché (équivalent mensuel en annuel, arrondi au centime). */
  parMois: number;
  /** Prix mensuel sans engagement, barré en annuel. */
  barre: number | null;
  totalAnnuel: number | null;
  economie: number | null;
}

/** Grille de la section Tarifs (maquette Acquisition Artisans v2), en centimes entiers. */
export function grilleTarifs(p: PrixAffiches, f: Facturation) {
  const annuel = f === 'annuel';
  const visibilite: LigneTarif = annuel
    ? {
        parMois: Math.round(p.visibiliteAnnuelHt / 12),
        barre: p.visibiliteMensuelHt,
        totalAnnuel: p.visibiliteAnnuelHt,
        economie: p.visibiliteMensuelHt * 12 - p.visibiliteAnnuelHt,
      }
    : { parMois: p.visibiliteMensuelHt, barre: null, totalAnnuel: null, economie: null };
  const premium: LigneTarif = annuel
    ? {
        parMois: p.premiumAnnuelHtMois,
        barre: p.premiumMensuelHt,
        totalAnnuel: p.premiumAnnuelHtMois * 12,
        economie: (p.premiumMensuelHt - p.premiumAnnuelHtMois) * 12,
      }
    : { parMois: p.premiumMensuelHt, barre: null, totalAnnuel: null, economie: null };
  const remise = (annuelTotal: number, mensuel: number) => 1 - annuelTotal / (mensuel * 12);
  const remiseMaxPourcent = Math.floor(
    100 *
      Math.max(
        remise(p.visibiliteAnnuelHt, p.visibiliteMensuelHt),
        remise(p.premiumAnnuelHtMois * 12, p.premiumMensuelHt),
      ),
  );
  return { visibilite, premium, remiseMaxPourcent };
}
