import {
  filtresAppelsOffres,
  vueAppelOffres,
  type AppelOffresLu,
  type CarteAppelOffres,
} from '@ph/core/leads';
import type { DocumentData, Firestore, Timestamp } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { lireReferentielMetiers, tarificationLue } from './lecture';

/**
 * Écran Appels d'offres (`/pro/appels-d-offres`) : les appels d'offres auxquels l'entreprise a été
 * invitée par le matching (zone, métier, conformité déjà vérifiés), du plus récent au plus ancien.
 */

export interface AppelsOffresPro {
  cartes: CarteAppelOffres[];
  filtres: { id: string; label: string }[];
  premium: boolean;
  zone: string | null;
  nbReserves: number;
  soldeCredits: number;
  creditsInclusRestants: number;
}

const ms = (t: unknown) => (t as Timestamp).toMillis();
const LIMITE = 50;

function lu(id: string, d: DocumentData): AppelOffresLu {
  return {
    id,
    titre: d.titre,
    resume: d.resume,
    metier: d.metier,
    ville: d.ville,
    codePostal: d.codePostal,
    geo: d.geo,
    budgetMinCentimes: d.budgetMinCentimes,
    budgetMaxCentimes: d.budgetMaxCentimes,
    urgence: d.urgence ?? 'normale',
    exigences: d.exigences ?? [],
    nbDeblocages: d.nbDeblocages,
    nbDeblocagesMax: d.nbDeblocagesMax,
    statut: d.statut,
    acces: d.acces,
    fenetrePremiumMin: d.fenetrePremiumMin ?? 60,
    ouvertLe: ms(d.ouvertLe),
    tarification: tarificationLue(d.tarification),
  };
}

export async function lireAppelsOffresPro(
  db: Firestore,
  artisanId: string,
  maintenant: number,
): Promise<AppelsOffresPro> {
  const [artisan, portefeuille, appels, ref] = await Promise.all([
    db.doc(chemins.artisan(artisanId)).get(),
    db.doc(chemins.portefeuille(artisanId)).get(),
    db
      .collection(collections.appelsOffres)
      .where('artisansInvites', 'array-contains', artisanId)
      .where('statut', 'in', ['ouvert', 'complet'])
      .orderBy('ouvertLe', 'desc')
      .limit(LIMITE)
      .get(),
    lireReferentielMetiers(db, maintenant),
  ]);
  const deblocages = appels.empty
    ? []
    : await db.getAll(...appels.docs.map((a) => db.doc(chemins.deblocage(a.id, artisanId))));
  const noms = new Map(ref.metiers.map((m) => [m.id, m.nom ?? m.id]));
  const nomMetier = (id: string) => noms.get(id) ?? id;
  const premium = artisan.get('plan') === 'premium';
  const zone = artisan.get('zoneIntervention') as
    { centre: { latitude: number; longitude: number }; rayonKm: number } | undefined;
  const ville = artisan.get('adresseSiege.ville') as string | undefined;
  const cartes = appels.docs.map((a, i) =>
    vueAppelOffres(lu(a.id, a.data()), {
      premium,
      maintenant,
      ...(zone ? { centre: zone.centre } : {}),
      debloque: deblocages[i]?.exists === true,
      nomMetier,
    }),
  );
  return {
    cartes,
    filtres: filtresAppelsOffres(cartes, nomMetier),
    premium,
    zone: zone && ville ? `${ville} · ${zone.rayonKm} km` : null,
    nbReserves: cartes.filter((c) => c.etat === 'reserve').length,
    soldeCredits: (portefeuille.get('soldeCredits') as number | undefined) ?? 0,
    creditsInclusRestants: (portefeuille.get('creditsInclusRestants') as number | undefined) ?? 0,
  };
}
