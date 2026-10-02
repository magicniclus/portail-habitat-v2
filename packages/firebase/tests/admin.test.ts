import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import {
  afficherDonneePersonnelle,
  creerSuperAdmin,
  jetonImpersonation,
  verifierSessionAdmin,
} from '../src/serveur/admin';

let db: Firestore;
let auth: Auth;

beforeAll(() => {
  db = getFirestore(appAdmin());
  auth = getAuth(appAdmin());
});

beforeEach(async () => {
  await Promise.all([
    fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
      { method: 'DELETE' },
    ),
    fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/accounts`,
      { method: 'DELETE' },
    ),
  ]);
});

describe('creerSuperAdmin (script admin:creer)', () => {
  it('crée le compte, le profil admin et le claim staff ; relançable', async () => {
    const s = { db, auth, horloge: () => Date.UTC(2026, 9, 2) };
    const r = await creerSuperAdmin(s, { email: 'Fondateur@Exemple.fr', nom: 'Nicolas C.' });
    expect(r.cree).toBe(true);
    expect(r.lienMotDePasse).toContain('oobCode');
    const a = (await db.doc(chemins.admin(r.uid)).get()).data()!;
    expect(a).toMatchObject({
      role: 'superadmin',
      actif: true,
      mfaObligatoire: true,
      email: 'fondateur@exemple.fr',
    });
    expect(a.permissionsEffectives).toContain('equipe.gerer');
    const claims = (await auth.getUser(r.uid)).customClaims as {
      staff: { r: string; s: string[] };
    };
    expect(claims.staff.r).toBe('superadmin');
    expect(claims.staff.s).toContain('fin');
    expect(
      (await creerSuperAdmin(s, { email: 'fondateur@exemple.fr', nom: 'Nicolas C.' })).cree,
    ).toBe(false);
  });
});

describe('verifierSessionAdmin (ADMIN §1)', () => {
  const T = Date.UTC(2026, 9, 2, 9);
  it('8 h au plus, 30 min d’inactivité, membre actif seulement ; activité notée', async () => {
    await db.doc(chemins.admin('a1')).set({
      nom: 'Anne',
      email: 'a@x.fr',
      role: 'lecture',
      actif: true,
      permissionsEffectives: ['artisans.lire'],
    });
    const v = (authentifieLe: number, maintenant: number, uid = 'a1') =>
      verifierSessionAdmin(db, { uid, authentifieLe, maintenant });
    expect(await v(T, T + 60_000)).toMatchObject({
      etat: 'ok',
      profil: { role: 'lecture', pii: false, permissions: ['artisans.lire'] },
    });
    expect(await v(T, T + 20 * 60_000)).toMatchObject({ etat: 'ok' });
    expect(await v(T, T + 55 * 60_000)).toEqual({ etat: 'inactivite' });
    expect(await v(T, T + 9 * 3_600_000)).toEqual({ etat: 'expiree' });
    expect(await v(T, T, 'inconnu')).toEqual({ etat: 'pas_admin' });
    await db.doc(chemins.admin('a1')).update({ actif: false });
    expect(await v(T, T + 60_000)).toEqual({ etat: 'pas_admin' });
  });
});

describe('données personnelles et impersonation (ADM-02, ADM-04)', () => {
  const s = () => ({ db, auth, horloge: () => Date.UTC(2026, 9, 2) });
  it('« Afficher » : liste fermée de champs, refus au rôle lecture, consultation journalisée', async () => {
    await db.doc(chemins.demande('d1')).set({ contact: { email: 'helene@test.local' } });
    expect(
      await afficherDonneePersonnelle(s(), {
        acteurUid: 'a1',
        pii: true,
        cible: 'demandes/d1',
        champ: 'contact.email',
      }),
    ).toBe('helene@test.local');
    const audit = await db.collection(collections.auditLog).get();
    expect(audit.docs.map((d) => [d.get('action'), d.get('cible')])).toEqual([
      ['pii.afficher', 'demandes/d1'],
    ]);
    await expect(
      afficherDonneePersonnelle(s(), {
        acteurUid: 'a1',
        pii: false,
        cible: 'demandes/d1',
        champ: 'contact.email',
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    await expect(
      afficherDonneePersonnelle(s(), {
        acteurUid: 'a1',
        pii: true,
        cible: 'demandes/d1',
        champ: 'estimation',
      }),
    ).rejects.toMatchObject({ code: 'ENTREE_INVALIDE' });
  });

  it('« Voir en tant que » : superadmin seulement, jamais un membre de l’équipe, journalisé', async () => {
    await db.doc(chemins.admin('sup')).set({ role: 'superadmin', actif: true });
    await db.doc(chemins.admin('mod')).set({ role: 'moderateur', actif: true });
    const jeton = await jetonImpersonation(s(), {
      acteurUid: 'sup',
      cibleUid: 'artisan1',
      motif: 'support',
    });
    expect(jeton.split('.')).toHaveLength(3);
    await expect(
      jetonImpersonation(s(), { acteurUid: 'mod', cibleUid: 'artisan1', motif: 'support' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    await expect(
      jetonImpersonation(s(), { acteurUid: 'sup', cibleUid: 'mod', motif: 'support' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    const audit = await db
      .collection(collections.auditLog)
      .where('action', '==', 'impersonation')
      .get();
    expect(audit.size).toBe(1);
  });
});
