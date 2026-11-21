import type { ProduitAbonnement, StatutAbonnement } from '@ph/core/facturation';
import type { Firestore, Timestamp } from 'firebase-admin/firestore';
import { collections } from '../../chemins';

/** Page Facturation : abonnements et factures (objets simples, dates en millisecondes). */
export interface AbonnementPro {
  id: string;
  produit: ProduitAbonnement;
  periode: 'mensuel' | 'annuel';
  statut: StatutAbonnement;
  finPeriode: number;
  annulationFinPeriode: boolean;
  sieges: number;
}

export interface FacturePro {
  id: string;
  numero: string;
  montantTtcCentimes: number;
  statut: string;
  date: number;
  lien: string | null;
}

const ENCORE_UTILES: StatutAbonnement[] = [
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
];

export async function lireFacturation(
  db: Firestore,
  artisanId: string,
): Promise<{ abonnements: AbonnementPro[]; factures: FacturePro[] }> {
  const [abos, factures] = await Promise.all([
    db
      .collection(collections.abonnements)
      .where('artisanId', '==', artisanId)
      .where('statut', 'in', ENCORE_UTILES)
      .get(),
    db
      .collection(collections.factures)
      .where('artisanId', '==', artisanId)
      .orderBy('createdAt', 'desc')
      .limit(24)
      .get(),
  ]);
  return {
    abonnements: abos.docs.map((d) => ({
      id: d.id,
      produit: d.get('produit'),
      periode: d.get('periode'),
      statut: d.get('statut'),
      finPeriode: (d.get('finPeriode') as Timestamp).toMillis(),
      annulationFinPeriode: d.get('annulationFinPeriode') === true,
      sieges: (d.get('sieges') as number | undefined) ?? 0,
    })),
    factures: factures.docs.map((d) => ({
      id: d.id,
      numero: d.get('numero') as string,
      montantTtcCentimes: d.get('montantTtcCentimes') as number,
      statut: d.get('statut') as string,
      date: ((d.get('payeeLe') ?? d.get('createdAt')) as Timestamp).toMillis(),
      lien: ((d.get('pdfUrl') ?? d.get('hostedUrl')) as string | undefined) ?? null,
    })),
  };
}
