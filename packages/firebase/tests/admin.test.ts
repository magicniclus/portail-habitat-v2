import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { creerSuperAdmin, verifierSessionAdmin } from '../src/serveur/admin';

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
