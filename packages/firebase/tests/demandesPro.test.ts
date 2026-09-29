import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { lireDemandesPro, prendreEnCharge, repondreDemande } from '../src/serveur/pro';

let db: Firestore;
const T = Date.UTC(2026, 8, 29, 8);
const s = () => ({ db, horloge: () => T, nomPrestation: (id: string) => `Nom ${id}` });

beforeAll(() => {
  db = getFirestore(appAdmin());
});

const membre = (role: string, statut = 'actif') => ({
  schemaVersion: 1,
  role,
  statut,
  notifs: { demandes: true, avis: true, factures: true },
  ajouteLe: Timestamp.fromMillis(T),
  ajoutePar: 'p1',
});

async function demande(id: string, minutes: number, statut = 'proposee') {
  await db.doc(chemins.demande(id)).set({
    reference: `PH-${id.toUpperCase().padEnd(6, 'X')}`,
    prestationId: 'toiture',
    contact: {
      prenom: 'Hélène',
      nom: 'Marty',
      email: 'helene@test.local',
      telephone: '+33612345678',
    },
    adresseChantier: { ville: 'Floirac', codePostal: '33270' },
    precisions: 'Appelez-moi au 06 12 34 56 78, toiture de 90 m²',
    estimation: { minCentimes: 900_000, maxCentimes: 1_400_000 },
  });
  await db.doc(chemins.attribution(id, 'a1')).set({
    schemaVersion: 1,
    artisanId: 'a1',
    demandeId: id,
    statut,
    exclusive: false,
    proposeeLe: Timestamp.fromMillis(T - minutes * 60_000),
    coordonneesDebloquees: false,
    scoreMatching: 80,
  });
}

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await Promise.all([
    db.doc(chemins.membre('a1', 'p1')).set(membre('proprietaire')),
    db.doc(chemins.membre('a1', 'c1')).set(membre('collaborateur')),
    db.doc(chemins.membre('a1', 'c2')).set(membre('collaborateur')),
    db.doc(chemins.membre('a1', 'x1')).set(membre('comptable')),
    db.doc(chemins.membre('a1', 'r1')).set(membre('collaborateur', 'suspendu')),
    db.doc(chemins.user('c1')).set({ nomAffiche: 'Camille Dubois' }),
  ]);
});

describe('lireDemandesPro', () => {
  it('plus récentes d’abord ; coordonnées masquées avant acceptation (PRO-02)', async () => {
    await demande('d1', 60);
    await demande('d2', 5, 'acceptee');
    const [d2, d1] = await lireDemandesPro(s(), 'a1');
    expect(d2).toMatchObject({
      demandeId: 'd2',
      particulier: 'Hélène Marty',
      contact: { email: 'helene@test.local', telephone: '+33612345678' },
      etat: 'contacte',
    });
    expect(d1).toMatchObject({ demandeId: 'd1', particulier: 'Hélène M.', etat: 'nouveau' });
    expect(d1!.contact).toBeUndefined();
    expect(d1!.precisions).toContain('[numéro masqué]');
    expect(JSON.stringify(d1)).not.toContain('helene@test.local');
  });

  it('seulement les demandes de l’entreprise', async () => {
    await demande('d1', 1);
    expect(await lireDemandesPro(s(), 'autre')).toEqual([]);
  });
});

describe('repondreDemande', () => {
  it('accepter débloque les coordonnées', async () => {
    await demande('d1', 1);
    expect(
      await repondreDemande(
        s(),
        { artisanId: 'a1', uid: 'c1' },
        { demandeId: 'd1', action: 'accepter' },
      ),
    ).toEqual({ statut: 'acceptee' });
    const a = await db.doc(chemins.attribution('d1', 'a1')).get();
    expect(a.get('coordonneesDebloquees')).toBe(true);
    expect((await lireDemandesPro(s(), 'a1'))[0]!.contact).toBeDefined();
  });

  it('ouvrir marque vue ; répondre deux fois est refusé', async () => {
    await demande('d1', 1);
    await repondreDemande(s(), { artisanId: 'a1', uid: 'p1' }, { demandeId: 'd1', action: 'voir' });
    expect((await db.doc(chemins.attribution('d1', 'a1')).get()).get('statut')).toBe('vue');
    await repondreDemande(
      s(),
      { artisanId: 'a1', uid: 'p1' },
      { demandeId: 'd1', action: 'refuser', motif: 'Trop loin' },
    );
    await expect(
      repondreDemande(s(), { artisanId: 'a1', uid: 'p1' }, { demandeId: 'd1', action: 'accepter' }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
  });

  it('comptable, membre suspendu ou étranger : refusé', async () => {
    await demande('d1', 1);
    for (const uid of ['x1', 'r1', 'inconnu'])
      await expect(
        repondreDemande(s(), { artisanId: 'a1', uid }, { demandeId: 'd1', action: 'accepter' }),
      ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
  });
});

describe('prendreEnCharge (PRO-03)', () => {
  it('assigne la demande ; les autres voient qui la traite', async () => {
    await demande('d1', 1);
    await prendreEnCharge(s(), { artisanId: 'a1', uid: 'c1' }, 'd1');
    expect((await lireDemandesPro(s(), 'a1'))[0]!.assigneA).toEqual({
      uid: 'c1',
      nom: 'Camille Dubois',
    });
  });

  it('un autre collaborateur ne peut pas la reprendre ; le propriétaire si', async () => {
    await demande('d1', 1);
    await prendreEnCharge(s(), { artisanId: 'a1', uid: 'c1' }, 'd1');
    await expect(prendreEnCharge(s(), { artisanId: 'a1', uid: 'c2' }, 'd1')).rejects.toMatchObject({
      code: 'CONFLIT',
    });
    await prendreEnCharge(s(), { artisanId: 'a1', uid: 'p1' }, 'd1');
    expect((await db.doc(chemins.attribution('d1', 'a1')).get()).get('assigneA')).toBe('p1');
  });
});
