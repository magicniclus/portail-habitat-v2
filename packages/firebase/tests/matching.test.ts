import { encoderGeohash } from '@ph/core/geo';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import type { Notification } from '../src/serveur/comptes';
import {
  attribuerDemande,
  viderCacheReferentiel,
  type ServicesMatching,
} from '../src/serveur/matching';

let db: Firestore;
let envois: Notification[];
let s: ServicesMatching;
const T = Date.UTC(2026, 9, 1, 8);
const BORDEAUX = { latitude: 44.8378, longitude: -0.5792 };
const FLOIRAC = { latitude: 44.8366, longitude: -0.5285 };
const ARCACHON = { latitude: 44.6586, longitude: -1.1689 };

beforeAll(() => {
  db = getFirestore(appAdmin());
});

async function artisan(
  id: string,
  p: { plan?: string; quota?: number; recues?: number; centre?: typeof BORDEAUX; metier?: string },
) {
  const centre = p.centre ?? BORDEAUX;
  const metier = p.metier ?? 'peintre';
  const plan = p.plan ?? 'gratuit';
  await Promise.all([
    db.doc(chemins.artisan(id)).set({
      siren: `55210055${id.length}`,
      nomCommercial: `Entreprise ${id}`,
      metierPrincipal: metier,
      metiers: [metier],
      intentions: [],
      zoneIntervention: { centre, rayonKm: 30 },
      verification: { statut: 'verifie', verifieLe: Timestamp.fromMillis(T - 100 * 86_400_000) },
      labelsVerifies: { decennale: { verifieLe: Timestamp.fromMillis(T) } },
      plan,
      optionVisibilite: plan !== 'gratuit',
      quotaDemandesMois: p.quota ?? (plan === 'premium' ? 4 : 0),
      demandesRecuesMois: p.recues ?? 0,
      noteMoyenne: 4.7,
      nbAvis: 10,
      tauxRecommandation: 0.95,
      tauxReponse: 0.9,
      tempsReponseMoyenMin: 60,
      completude: 90,
      statut: 'actif',
      proprietaireUid: `u-${id}`,
    }),
    db.doc(chemins.artisanPublic(id)).set({
      enLigne: true,
      metiers: [metier],
      geohash: encoderGeohash(centre.latitude, centre.longitude),
    }),
    db.doc(chemins.membre(id, `u-${id}`)).set({ role: 'proprietaire', statut: 'actif' }),
  ]);
}

async function demande(id: string, extra: Record<string, unknown> = {}) {
  await db.doc(chemins.demande(id)).set({
    reference: 'PH-ABC123',
    statut: 'nouvelle',
    prestationId: 'peinture',
    adresseChantier: { ville: 'Floirac', codePostal: '33270', geo: FLOIRAC },
    delaiSouhaite: '1mois',
    estimation: { minCentimes: 150_000, maxCentimes: 250_000 },
    reponsesLisibles: [{ question: 'Pièce', reponse: 'Séjour' }],
    precisions: 'Peinture du séjour, appelez-moi au 06 12 34 56 78.',
    contact: { email: 'helene@test.local', telephone: '+33612345678' },
    particulierUid: null,
    nbAttributions: 0,
    photos: [],
    ...extra,
  });
}

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  viderCacheReferentiel();
  envois = [];
  s = { db, horloge: () => T, notifier: async (n) => void envois.push(n) };
  await Promise.all([
    db
      .doc(`${chemins.metiersRecherche()}/peintre`)
      .set({ prestationDefaut: 'peinture', famille: 'deco' }),
    db.doc(`${chemins.intentions()}/repeindre`).set({ metier: 'peintre', prestation: 'peinture' }),
    db.doc(chemins.prestationItem('peinture')).set({ nom: 'Peinture intérieure' }),
  ]);
});

describe('attribuerDemande (MATCHING, D41)', () => {
  it('Premium avec quota : demande garantie exclusive, compteur, trace, notification', async () => {
    await artisan('prem', { plan: 'premium' });
    await artisan('grat', {});
    await demande('d1');
    expect(await attribuerDemande(s, 'd1')).toBe('attribuee');
    const att = await db.doc(chemins.attribution('d1', 'prem')).get();
    expect(att.data()).toMatchObject({ statut: 'proposee', exclusive: true, rang: 1 });
    expect(att.get('expireLe').toMillis()).toBe(T + 24 * 3_600_000);
    expect((await db.doc(chemins.demande('d1')).get()).data()).toMatchObject({
      statut: 'en_attribution',
      nbAttributions: 1,
      metierRequis: 'peintre',
    });
    expect((await db.doc(chemins.artisan('prem')).get()).get('demandesRecuesMois')).toBe(1);
    const trace = await db.collection(collections.matching).doc('d1').get();
    expect(trace.get('resultat')).toBe('attribuee');
    expect(trace.get('candidats')).toHaveLength(2);
    expect(envois.map((e) => [e.modele, e.destinataire.uid])).toEqual([
      ['nouvelle-demande', 'u-prem'],
    ]);
    // Idempotent : le déclencheur peut être rejoué.
    expect(await attribuerDemande(s, 'd1')).toBe('deja_traitee');
  });

  it('aucun Premium disponible : appel d’offres anonymisé, 60 min d’avance Premium (D50)', async () => {
    await artisan('prem', { plan: 'premium', recues: 4 });
    await artisan('grat', {});
    await demande('d2');
    expect(await attribuerDemande(s, 'd2')).toBe('appel_offres');
    const ao = (await db.doc(chemins.appelOffres('d2')).get()).data()!;
    expect(ao).toMatchObject({
      statut: 'ouvert',
      acces: 'premium_prioritaire',
      fenetrePremiumMin: 60,
      nbDeblocagesMax: 3,
      nbDeblocages: 0,
      metier: 'peintre',
      titre: 'Peinture intérieure à Floirac',
    });
    expect(ao.resume).not.toContain('06 12 34 56 78');
    expect(ao.tarification.prixBaseCentimes).toBeGreaterThan(0);
    expect(ao.tarification.prixPremiumCentimes).toBeLessThan(ao.tarification.prixBaseCentimes);
    expect((await db.doc(chemins.demande('d2')).get()).get('statut')).toBe('appel_offres');
    const invites = envois.filter((e) => e.modele === 'nouvel-appel-offres');
    expect(invites.map((e) => e.destinataire.uid).sort()).toEqual(['u-grat', 'u-prem']);
    expect(invites.find((e) => e.destinataire.uid === 'u-grat')!.envoyerLe!.getTime()).toBe(
      T + 60 * 60_000,
    );
    expect(invites.find((e) => e.destinataire.uid === 'u-prem')!.envoyerLe).toBeUndefined();
  });

  it('artisan hors zone : aucun candidat, l’appel d’offres reste publié', async () => {
    await artisan('loin', { plan: 'premium', centre: ARCACHON });
    await demande('d3');
    expect(await attribuerDemande(s, 'd3')).toBe('aucun_candidat');
    expect((await db.collection(collections.matching).doc('d3').get()).get('candidats')).toEqual([
      expect.objectContaining({ artisanId: 'loin', exclu: 'distance', retenu: false }),
    ]);
  });

  it('demande de faible qualité : modération avant tout matching', async () => {
    await artisan('prem', { plan: 'premium' });
    await demande('d4', { delaiSouhaite: 'renseignement' });
    expect(await attribuerDemande(s, 'd4')).toBe('moderation');
    expect(
      (await db.collection(collections.filesModeration).doc('fraude-d4').get()).get('type'),
    ).toBe('fraude_suspectee');
    expect((await db.doc(chemins.attribution('d4', 'prem')).get()).exists).toBe(false);
  });

  it('artisan ciblé depuis sa fiche : la demande garantie lui revient s’il est Premium', async () => {
    await artisan('prem1', { plan: 'premium' });
    await artisan('prem2', { plan: 'premium', centre: FLOIRAC });
    await demande('d5', { artisanCibleId: 'prem1' });
    expect(await attribuerDemande(s, 'd5')).toBe('attribuee');
    expect((await db.doc(chemins.attribution('d5', 'prem1')).get()).exists).toBe(true);
  });
});
