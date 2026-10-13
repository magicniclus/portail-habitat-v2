import { CATALOGUE_STRIPE } from '../facturation/abonnements';
import { debutMois } from '../leads/deblocage';

/** Back-office › Finances (ADMIN §2.8) : MRR et export comptable mensuel. */

const ACTIFS = ['active', 'trialing', 'past_due'];
const prix = (cle: string) => CATALOGUE_STRIPE.find((p) => p.cle === cle)?.montantHt ?? 0;

/** Revenu mensuel récurrent HT : formules mensuelles (PAIEMENTS §2), sièges supplémentaires compris. */
export function mrrCentimes(
  abonnements: readonly { produit: string; statut: string; sieges: number }[],
): number {
  return abonnements
    .filter((a) => ACTIFS.includes(a.statut))
    .reduce((total, a) => total + prix(a.produit) + a.sieges * prix('siege'), 0);
}

/** Prix HT d'un pack de crédits du catalogue (D59), `null` s'il n'existe pas. */
export const prixPack = (credits: number): number | null =>
  CATALOGUE_STRIPE.find((p) => p.produit === 'credits' && p.credits === credits)?.montantHt ?? null;

/** Bornes [début, fin[ d'un mois civil « AAAA-MM » à l'heure de Paris, en ms. */
export function bornesMois(mois: string): [number, number] {
  const [a, m] = mois.split('-').map(Number) as [number, number];
  const debut = debutMois(Date.UTC(a, m - 1, 15));
  return [debut, debutMois(debut + 32 * 86_400_000)];
}

export interface PieceComptable {
  le: number;
  piece: string;
  client: string;
  ht: number;
  tva: number;
  ttc: number;
  moyen: string;
}

const decimal = (c: number) =>
  `${c < 0 ? '-' : ''}${Math.floor(Math.abs(c) / 100)},${String(Math.abs(c) % 100).padStart(2, '0')}`;
const champ = (v: string) => (/[;"\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const jour = (ms: number) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short' }).format(ms);

/** CSV pour la comptabilité : date, n° de pièce, client, HT, TVA, TTC, moyen de paiement. */
export function exportComptable(pieces: readonly PieceComptable[]): string {
  const lignes = [...pieces]
    .sort((x, y) => x.le - y.le)
    .map((p) =>
      [
        jour(p.le),
        champ(p.piece),
        champ(p.client),
        decimal(p.ht),
        decimal(p.tva),
        decimal(p.ttc),
        champ(p.moyen),
      ].join(';'),
    );
  return [...['date;piece;client;ht;tva;ttc;moyen'], ...lignes, ''].join('\r\n');
}
