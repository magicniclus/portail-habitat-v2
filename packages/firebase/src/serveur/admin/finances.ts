import { bornesMois, mrrCentimes, prixPack, type PieceComptable } from '@ph/core/admin';
import { tvaDe } from '@ph/core/facturation';
import { AggregateField, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { auditerAdmin } from './audit';

/** Back-office › Finances (ADMIN §2.8, maquette « Admin Finances »). */

export interface FinancesAdmin {
  mrr: number;
  abonnes: { premium: number; visibilite: number; premiumAnnuel: number; visibiliteAnnuel: number };
  appelsOffres30j: { ht: number; deblocages: number };
  factures: {
    id: string;
    numero: string;
    client: string;
    ht: number;
    ttc: number;
    statut: string;
    le: number;
  }[];
  remboursements: { id: string; client: string; motif: string; en: string; le: number }[];
  codesPromo: {
    code: string;
    pourcentage: number;
    produits: string[];
    utilisations: number;
    max: number | null;
    actif: boolean;
  }[];
}

const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis() ?? 0;
const ACTIFS = ['active', 'trialing', 'past_due'];

async function nomsArtisans(db: Firestore, ids: string[]): Promise<Map<string, string>> {
  const uniques = [...new Set(ids)];
  if (!uniques.length) return new Map();
  const docs = await db.getAll(...uniques.map((id) => db.doc(chemins.artisan(id))));
  return new Map(docs.map((d) => [d.id, (d.get('nomCommercial') as string | undefined) ?? d.id]));
}

export async function lireFinancesAdmin(db: Firestore, maintenant: number): Promise<FinancesAdmin> {
  const depuis = Timestamp.fromMillis(maintenant - 30 * 86_400_000);
  const achats = db.collection(collections.achatsLeads).where('createdAt', '>=', depuis);
  const [abos, ao, factures, remb, promos] = await Promise.all([
    db.collection(collections.abonnements).where('statut', 'in', ACTIFS).get(),
    achats.aggregate({ ht: AggregateField.sum('prixHtCentimes'), n: AggregateField.count() }).get(),
    db.collection(collections.factures).orderBy('createdAt', 'desc').limit(30).get(),
    db
      .collection(collections.remboursementsLeads)
      .where('statut', '==', 'accepte')
      .orderBy('decisionLe', 'desc')
      .limit(20)
      .get(),
    db.collection(collections.codesPromo).limit(50).get(),
  ]);
  const lignes = abos.docs.map((a) => ({
    produit: a.get('produit') as string,
    periode: a.get('periode') as string,
    statut: a.get('statut') as string,
    sieges: (a.get('sieges') as number | undefined) ?? 0,
  }));
  const compte = (produit: string, annuel = false) =>
    lignes.filter((l) => l.produit === produit && (!annuel || l.periode === 'annuel')).length;
  const noms = await nomsArtisans(db, [
    ...factures.docs.map((f) => f.get('artisanId') as string),
    ...remb.docs.map((r) => r.get('artisanId') as string),
  ]);
  return {
    mrr: mrrCentimes(lignes),
    abonnes: {
      premium: compte('premium'),
      visibilite: compte('visibilite'),
      premiumAnnuel: compte('premium', true),
      visibiliteAnnuel: compte('visibilite', true),
    },
    appelsOffres30j: { ht: ao.data().ht ?? 0, deblocages: ao.data().n },
    factures: factures.docs.map((f) => ({
      id: f.id,
      numero: f.get('numero') as string,
      client: noms.get(f.get('artisanId') as string) ?? '',
      ht: f.get('montantHtCentimes') as number,
      ttc: f.get('montantTtcCentimes') as number,
      statut: f.get('statut') as string,
      le: ms(f.get('createdAt')),
    })),
    remboursements: remb.docs.map((r) => ({
      id: r.id,
      client: noms.get(r.get('artisanId') as string) ?? '',
      motif: (r.get('motifDecision') as string | undefined) ?? '',
      en: (r.get('rembourseEn') as string | undefined) ?? '',
      le: ms(r.get('decisionLe')),
    })),
    codesPromo: promos.docs.map((p) => ({
      code: p.id,
      pourcentage: p.get('pourcentage') as number,
      produits: (p.get('produits') as string[] | undefined) ?? [],
      utilisations: (p.get('utilisations') as number | undefined) ?? 0,
      max: (p.get('maxUtilisations') as number | undefined) ?? null,
      actif: p.get('actif') === true,
    })),
  };
}

/**
 * Pièces d'un mois (`adminExportFinances`) : factures payées, déblocages payés par carte, packs
 * de crédits (prix du catalogue D29). L'export est journalisé.
 */
export async function piecesDuMois(
  db: Firestore,
  e: { mois: string; acteurUid: string; maintenant: number },
): Promise<PieceComptable[]> {
  const [debut, fin] = bornesMois(e.mois).map((x) => Timestamp.fromMillis(x)) as [
    Timestamp,
    Timestamp,
  ];
  const [factures, achats, packs] = await Promise.all([
    db
      .collection(collections.factures)
      .where('statut', '==', 'paid')
      .where('payeeLe', '>=', debut)
      .where('payeeLe', '<', fin)
      .get(),
    db
      .collection(collections.achatsLeads)
      .where('createdAt', '>=', debut)
      .where('createdAt', '<', fin)
      .get(),
    db
      .collectionGroup('mouvements')
      .where('type', '==', 'achat_pack')
      .where('createdAt', '>=', debut)
      .where('createdAt', '<', fin)
      .get(),
  ]);
  const cartes = achats.docs.filter(
    (a) => a.get('moyen') === 'carte' && (a.get('prixHtCentimes') as number) > 0,
  );
  const artisanDePack = (p: FirebaseFirestore.QueryDocumentSnapshot) => p.ref.parent.parent!.id;
  const noms = await nomsArtisans(db, [
    ...factures.docs.map((f) => f.get('artisanId') as string),
    ...cartes.map((a) => a.get('artisanId') as string),
    ...packs.docs.map(artisanDePack),
  ]);
  const pieces: PieceComptable[] = [
    ...factures.docs.map((f) => ({
      le: ms(f.get('payeeLe')),
      piece: f.get('numero') as string,
      client: noms.get(f.get('artisanId') as string) ?? '',
      ht: f.get('montantHtCentimes') as number,
      tva: f.get('tvaCentimes') as number,
      ttc: f.get('montantTtcCentimes') as number,
      moyen: 'carte (abonnement)',
    })),
    ...cartes.map((a) => {
      const ht = a.get('prixHtCentimes') as number;
      const tva = a.get('tvaCentimes') as number;
      return {
        le: ms(a.get('createdAt')),
        piece: (a.get('stripeInvoiceId') as string | undefined) ?? `AL-${a.id}`,
        client: noms.get(a.get('artisanId') as string) ?? '',
        ht,
        tva,
        ttc: ht + tva,
        moyen: 'carte (appel d’offres)',
      };
    }),
    ...packs.docs.flatMap((p) => {
      const ht = prixPack(p.get('credits') as number);
      if (ht === null) return [];
      return [
        {
          le: ms(p.get('createdAt')),
          piece: `PK-${(p.get('refId') as string | undefined) ?? p.id}`,
          client: noms.get(artisanDePack(p)) ?? '',
          ht,
          tva: tvaDe(ht),
          ttc: ht + tvaDe(ht),
          moyen: 'carte (pack de crédits)',
        },
      ];
    }),
  ];
  await auditerAdmin(
    db,
    {
      acteurUid: e.acteurUid,
      action: 'adminExportFinances',
      cible: `finances/${e.mois}`,
      apres: { pieces: pieces.length },
    },
    e.maintenant,
  );
  return pieces;
}
