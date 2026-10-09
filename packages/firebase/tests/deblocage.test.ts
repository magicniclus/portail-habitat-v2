import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import {
  debloquerAppelOffres,
  lireAppelsOffresPro,
  viderCacheReferentiel,
  type ServicesDeblocage,
} from '../src/serveur/matching';

let db: Firestore;
let s: ServicesDeblocage;
const T = Date.UTC(2026, 9, 10, 12);

beforeAll(() => {
  db = getFirestore(appAdmin());
});

async function entreprise(
  id: string,
  p: {
    plan?: string;
    solde?: number;
    inclus?: number;
    role?: string;
    plafond?: number;
    permissions?: string[];
  } = {},
) {
  await Promise.all([
    db.doc(chemins.artisan(id)).set({ plan: p.plan ?? 'gratuit', nomCommercial: id }),
    db.doc(chemins.membre(id, `u-${id}`)).set({
      role: p.role ?? 'proprietaire',
      statut: 'actif',
      ...(p.permissions ? { permissions: p.permissions } : {}),
      ...(p.plafond !== undefined ? { plafondCreditsMois: p.plafond } : {}),
    }),
    db.doc(chemins.portefeuille(id)).set({
      soldeCredits: p.solde ?? 0,
      creditsInclusRestants: p.inclus ?? 0,
      creditsInclusMois: p.inclus ?? 0,
    }),
  ]);
}

async function appelOffres(
  id: string,
  p: { ouvertLe?: number; max?: number; nb?: number; invites?: string[]; statut?: string } = {},
) {
  await db.doc(chemins.appelOffres(id)).set({
    demandeId: `dem-${id}`,
    statut: p.statut ?? 'ouvert',
    titre: `Peinture ${id}`,
    resume: 'Séjour.',
    metier: 'peintre',
    ville: 'Floirac',
    codePostal: '33270',
    geo: { latitude: 44.8366, longitude: -0.5285 },
    budgetMinCentimes: 150_000,
    budgetMaxCentimes: 250_000,
    urgence: 'normale',
    artisansInvites: p.invites ?? [],
    acces: 'premium_prioritaire',
    fenetrePremiumMin: 60,
    ouvertLe: Timestamp.fromMillis(p.ouvertLe ?? T - 2 * 3_600_000),
    nbDeblocages: p.nb ?? 0,
    nbDeblocagesMax: p.max ?? 3,
    exigences: [],
    tarification: {
      mode: 'auto',
      prixBaseCentimes: 1900,
      prixPremiumCentimes: 1300,
      prixCredits: 2,
    },
  });
}

const debloquer = (ao: string, id: string, choix: 'auto' | 'carte' = 'auto') =>
  debloquerAppelOffres(s, { appelOffresId: ao, artisanId: id, uid: `u-${id}`, choix });

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  s = { db, horloge: () => T };
});

describe('debloquerAppelOffres (MATCHING [8])', () => {
  it('crédits inclus Premium : débit, achat, déblocage, attribution acceptée avec coordonnées', async () => {
    await entreprise('a1', { plan: 'premium', inclus: 5, solde: 10 });
    await appelOffres('ao1');
    expect(await debloquer('ao1', 'a1')).toMatchObject({
      etat: 'debloque',
      moyen: 'inclus_premium',
    });
    expect((await db.doc(chemins.portefeuille('a1')).get()).data()).toMatchObject({
      creditsInclusRestants: 3,
      soldeCredits: 10,
    });
    expect((await db.doc(chemins.appelOffres('ao1')).get()).get('nbDeblocages')).toBe(1);
    expect((await db.doc(chemins.attribution('dem-ao1', 'a1')).get()).data()).toMatchObject({
      statut: 'acceptee',
      coordonneesDebloquees: true,
      assigneA: 'u-a1',
    });
    expect((await db.collection(chemins.mouvements('a1')).get()).docs[0]!.get('credits')).toBe(-2);
    expect(await debloquer('ao1', 'a1')).toEqual({ etat: 'deja_debloque' });
  });

  it('PRO-05 : crédits insuffisants, rien n’est débité, carte ou pack proposés', async () => {
    await entreprise('a2', { solde: 1 });
    await appelOffres('ao2');
    expect(await debloquer('ao2', 'a2')).toEqual({
      etat: 'paiement_requis',
      centimes: 1900,
      credits: 2,
      soldeCredits: 1,
    });
    expect((await db.doc(chemins.appelOffres('ao2')).get()).get('nbDeblocages')).toBe(0);
    expect((await db.collection(collections.achatsLeads).get()).size).toBe(0);
  });

  it('D50 : un compte gratuit attend 60 minutes', async () => {
    await entreprise('a3', { solde: 10 });
    await appelOffres('ao3', { ouvertLe: T - 30 * 60_000 });
    await expect(debloquer('ao3', 'a3')).rejects.toMatchObject({ code: 'PRECONDITION' });
  });

  it('PRO-04 : un collaborateur sans droit de dépense ne peut pas débloquer ; avec, son plafond compte', async () => {
    await entreprise('a4', { role: 'collaborateur', solde: 10 });
    await appelOffres('ao4');
    await expect(debloquer('ao4', 'a4')).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    await entreprise('a5', {
      role: 'collaborateur',
      solde: 10,
      permissions: ['leads.debloquer'],
      plafond: 3,
    });
    await appelOffres('ao5');
    await appelOffres('ao6');
    expect((await debloquer('ao5', 'a5')).etat).toBe('debloque');
    await expect(debloquer('ao6', 'a5')).rejects.toMatchObject({ code: 'PRECONDITION' });
  });

  it('PRO-06 : dix artisans sur la dernière place, un seul réussit, aucun débit en trop', async () => {
    const ids = Array.from({ length: 10 }, (_, i) => `c${i}`);
    await Promise.all(ids.map((id) => entreprise(id, { plan: 'premium', solde: 10 })));
    await appelOffres('ao7', { nb: 2, max: 3 });
    const r = await Promise.allSettled(ids.map((id) => debloquer('ao7', id)));
    const ok = r.filter((x) => x.status === 'fulfilled' && x.value.etat === 'debloque');
    expect(ok).toHaveLength(1);
    expect(r.filter((x) => x.status === 'rejected')).toHaveLength(9);
    const ao = (await db.doc(chemins.appelOffres('ao7')).get()).data()!;
    expect(ao).toMatchObject({ nbDeblocages: 3, statut: 'complet' });
    const soldes = await Promise.all(
      ids.map(async (id) => (await db.doc(chemins.portefeuille(id)).get()).get('soldeCredits')),
    );
    expect(soldes.filter((x) => x === 10)).toHaveLength(9);
    expect((await db.collection(collections.achatsLeads).get()).size).toBe(1);
    // Dix transactions en concurrence : l'émulateur les sérialise par attentes de verrou, ce qui
    // peut dépasser les 5 s par défaut sur une machine d'intégration chargée.
  }, 20_000);
});

describe('lireAppelsOffresPro', () => {
  it('appels d’offres où l’entreprise est invitée : réservés, débloqués, complets ; clos masqués', async () => {
    viderCacheReferentiel();
    await entreprise('g1', { solde: 4 });
    await db.doc(chemins.artisan('g1')).update({
      zoneIntervention: { centre: { latitude: 44.8378, longitude: -0.5792 }, rayonKm: 30 },
      adresseSiege: { ville: 'Bordeaux' },
    });
    await db.doc(`${chemins.metiersRecherche()}/peintre`).set({ nom: 'Peintre' });
    await appelOffres('r1', { invites: ['g1'], ouvertLe: T - 10 * 60_000 });
    await appelOffres('o1', { invites: ['g1'] });
    await appelOffres('c1', { invites: ['g1'], statut: 'complet', nb: 3 });
    await appelOffres('x1', { invites: ['g1'], statut: 'clos' });
    await appelOffres('autre', { invites: ['h1'] });
    expect((await debloquer('o1', 'g1')).etat).toBe('debloque');
    const v = await lireAppelsOffresPro(db, 'g1', () => T);
    expect(v.cartes.map((c) => [c.id, c.etat])).toEqual([
      ['r1', 'reserve'],
      ['o1', 'debloque'],
      ['c1', 'complet'],
    ]);
    expect(v).toMatchObject({
      premium: false,
      zone: 'Bordeaux · 30 km',
      nbReserves: 1,
      soldeCredits: 2,
      filtres: [
        { id: 'tous', label: 'Tous' },
        { id: 'peintre', label: 'Peintre' },
      ],
    });
  });
});
