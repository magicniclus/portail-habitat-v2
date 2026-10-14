/** Taux de TVA du bâtiment (DATABASE §8 bis) ; 5,5 et 10 % demandent l'attestation du client. */
export const TAUX_TVA = [5.5, 10, 20] as const;
export type TauxTva = (typeof TAUX_TVA)[number];

export interface LigneDevis {
  designation: string;
  quantite: number;
  unite: string;
  puHtCentimes: number;
  tva: TauxTva;
  /** Coût d'achat, privé : sert à la marge, jamais dans le PDF. */
  coutHtCentimes?: number;
}

export interface Totaux {
  htBrutCentimes: number;
  remiseCentimes: number;
  /** HT après remise. */
  htCentimes: number;
  /** TVA par taux (`'5.5'`, `'10'`, `'20'`), en centimes. */
  tva: Partial<Record<`${TauxTva}`, number>>;
  ttcCentimes: number;
  acompteCentimes: number;
  margeHtCentimes: number;
}

const totalLigne = (l: Pick<LigneDevis, 'quantite' | 'puHtCentimes'>) =>
  Math.round(l.quantite * l.puHtCentimes);

/**
 * Totaux d'un devis ou d'une facture, en centimes entiers (règle 1) : HT par ligne arrondi au
 * centime, remise appliquée avant TVA sur chaque taux, TVA arrondie par taux. Recalculés côté
 * serveur à chaque enregistrement ; la valeur du navigateur n'est jamais reprise.
 */
export function calculerTotaux(
  d: { lignes: readonly LigneDevis[]; remisePct: number; acomptePct: number },
  o: { franchiseTva?: boolean } = {},
): Totaux {
  const coef = 1 - Math.min(100, Math.max(0, d.remisePct)) / 100;
  const parTaux = new Map<TauxTva, number>();
  let htBrut = 0;
  let cout = 0;
  for (const l of d.lignes) {
    const t = totalLigne(l);
    htBrut += t;
    cout += Math.round(l.quantite * (l.coutHtCentimes ?? 0));
    parTaux.set(l.tva, (parTaux.get(l.tva) ?? 0) + t);
  }
  let ht = 0;
  let totalTva = 0;
  const tva: Totaux['tva'] = {};
  for (const taux of TAUX_TVA) {
    const brut = parTaux.get(taux);
    if (brut === undefined) continue;
    const base = Math.round(brut * coef);
    ht += base;
    if (o.franchiseTva) continue;
    const montant = Math.round((base * taux) / 100);
    tva[`${taux}`] = montant;
    totalTva += montant;
  }
  const ttc = ht + totalTva;
  return {
    htBrutCentimes: htBrut,
    remiseCentimes: htBrut - ht,
    htCentimes: ht,
    tva,
    ttcCentimes: ttc,
    acompteCentimes: Math.round((ttc * Math.min(100, Math.max(0, d.acomptePct))) / 100),
    margeHtCentimes: ht - cout,
  };
}

/** `D-2026-0152`, `F-2026-0007` : numéro chronologique, compteur par année. */
export function numeroDocument(type: 'devis' | 'facture', annee: number, n: number): string {
  return `${type === 'devis' ? 'D' : 'F'}-${annee}-${String(n).padStart(4, '0')}`;
}
