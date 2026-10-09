import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { attribuerDemandeOfferte, offrirDemandesInvendues } from '../src/serveur/cycle';

/** CONV-07 : demandes invendues offertes contre l'activation de Visibilité. */
let db: Firestore;
const H = 3_600_000;
// Mardi 6 octobre 2026, 10 h à Paris.
const T = Date.UTC(2026, 9, 6, 8);
const envois: {
  modele: string;
  destinataire: { artisanId: string };
  donnees: Record<string, unknown>;
}[] = [];
const s = (t: number) => ({
  db,
  horloge: () => t,
  notifier: async (e: unknown) => void envois.push(e as (typeof envois)[number]),
});
const bordeaux = { latitude: 44.84, longitude: -0.58 };

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  envois.length = 0;
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await db.doc(chemins.prestationItem('tableau')).set({ nom: 'Tableau électrique' });
  await db.doc(chemins.demande('d1')).set({
    prestationId: 'tableau',
    metierRequis: 'electricien',
    adresseChantier: { ville: 'Talence', geo: { latitude: 44.8, longitude: -0.59 } },
    estimation: { minCentimes: 240_000, maxCentimes: 320_000 },
    delaiSouhaite: '1mois',
    createdAt: Timestamp.fromMillis(T - 30 * H),
  });
  await db.doc(chemins.appelOffres('ao1')).set({
    demandeId: 'd1',
    statut: 'ouvert',
    acces: 'premium_prioritaire',
    fenetrePremiumMin: 60,
    ouvertLe: Timestamp.fromMillis(T - 25 * H),
    nbDeblocages: 0,
    nbDeblocagesMax: 3,
    exigences: [],
    tarification: {
      mode: 'auto',
      prixBaseCentimes: 1900,
      prixPremiumCentimes: 1300,
      prixCredits: 2,
    },
  });
  const artisan = async (id: string, score: number, p: Record<string, unknown> = {}, e = {}) => {
    await db.doc(chemins.artisan(id)).set({
      nomCommercial: `Entreprise ${id}`,
      statut: 'actif',
      enLigne: true,
      plan: 'gratuit',
      optionVisibilite: false,
      metiers: ['electricien'],
      metierPrincipal: 'electricien',
      adresseSiege: { ville: 'Bordeaux' },
      zoneIntervention: { centre: bordeaux, geohash: 'ezzz', rayonKm: 20 },
      proprietaireUid: `u-${id}`,
      ...p,
    });
    await db.doc(chemins.membre(id, `u-${id}`)).set({ role: 'proprietaire', statut: 'actif' });
    await db
      .collection(collections.cycleEtat)
      .doc(id)
      .set({
        etape: 'gratuit_actif',
        offreCible: 'visibilite',
        score,
        groupeTemoin: false,
        exclu: false,
        emailsNonOuvertsConsecutifs: 0,
        signaux: {},
        ...e,
      });
  };
  for (const [id, score] of [
    ['a', 90],
    ['b', 80],
    ['c', 70],
    ['d', 60],
    ['e', 50],
    ['f', 40],
  ] as const)
    await artisan(id, score);
  await artisan('deja', 99, {}, { demandeOfferteRecue: true });
  await artisan('temoin', 99, {}, { groupeTemoin: true });
  await artisan('vis', 99, { optionVisibilite: true });
  await artisan('loin', 99, {
    zoneIntervention: {
      centre: { latitude: 45.76, longitude: 4.83 },
      geohash: 'u05k',
      rayonKm: 30,
    },
  });
});

const traces = async (type: string) =>
  (await db.collection(collections.cycleTraces).where('type', '==', type).get()).docs.map((d) =>
    d.data(),
  );

describe('demandes invendues offertes (CONVERSION §3 bis)', () => {
  it('offerte aux 5 meilleurs Gratuit du secteur, une seule fois, sans rien du particulier', async () => {
    expect(await offrirDemandesInvendues(s(T - 2 * H))).toEqual({ demandes: 0, offres: 0 });
    expect(await offrirDemandesInvendues(s(T))).toEqual({ demandes: 1, offres: 5 });
    expect(envois.map((e) => e.destinataire.artisanId).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(envois[0]!.modele).toBe('vis-demande-offerte');
    expect(envois[0]!.donnees).toMatchObject({
      travaux: 'Tableau électrique',
      ville: 'Talence',
      budgetMinCentimes: 240_000,
      budgetMaxCentimes: 320_000,
      distanceKm: 5,
      delai: 'Sous 1 mois',
      lien: 'https://portailhabitat.fr/pro/abonnement/visibilite?facturation=annuel',
    });
    expect(JSON.stringify(envois)).not.toMatch(/telephone|email|nom":/);
    expect((await db.doc(chemins.appelOffres('ao1')).get()).get('offerteA')).toHaveLength(5);
    expect(await offrirDemandesInvendues(s(T + H))).toEqual({ demandes: 0, offres: 0 });
    expect(await traces('demande_offerte')).toHaveLength(5);
  });

  it('les 3 premiers qui activent Visibilité la reçoivent débloquée ; une seule fois', async () => {
    await offrirDemandesInvendues(s(T));
    expect(await attribuerDemandeOfferte(s(T + H), 'a')).toBeNull(); // pas encore Visibilité
    for (const id of ['a', 'b', 'c', 'd'])
      await db.doc(chemins.artisan(id)).update({ optionVisibilite: true });
    expect(await attribuerDemandeOfferte(s(T + H), 'a')).toBe('debloquee');
    expect(await attribuerDemandeOfferte(s(T + H), 'a')).toBeNull();
    expect(await attribuerDemandeOfferte(s(T + H), 'b')).toBe('debloquee');
    expect(await attribuerDemandeOfferte(s(T + H), 'c')).toBe('debloquee');
    expect(await attribuerDemandeOfferte(s(T + H), 'd')).toBe('complet');
    const ao = (await db.doc(chemins.appelOffres('ao1')).get()).data()!;
    expect(ao).toMatchObject({ nbDeblocages: 3, statut: 'complet' });
    const achats = await db.collection(collections.achatsLeads).get();
    expect(achats.docs.map((d) => [d.get('moyen'), d.get('prixHtCentimes')])).toEqual([
      ['offerte_conversion', 0],
      ['offerte_conversion', 0],
      ['offerte_conversion', 0],
    ]);
    expect((await db.collection(collections.cycleEtat).doc('a').get()).data()).toMatchObject({
      demandeOfferteRecue: true,
    });
    expect(
      (await db.collection(collections.cycleEtat).doc('d').get()).get('demandeOfferte'),
    ).toBeUndefined();
    expect(await traces('demande_offerte_convertie')).toHaveLength(3);
  });

  it('offre expirée après 48 h : rien n’est débloqué', async () => {
    await offrirDemandesInvendues(s(T));
    await db.doc(chemins.artisan('e')).update({ optionVisibilite: true });
    expect(await attribuerDemandeOfferte(s(T + 49 * H), 'e')).toBeNull();
  });
});
