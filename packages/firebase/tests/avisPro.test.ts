import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { lireAvisPro, repondreAvis } from '../src/serveur/pro';

let db: Firestore;
const T = Date.UTC(2026, 8, 29, 8);
const s = () => ({ db, horloge: () => T });

beforeAll(() => {
  db = getFirestore(appAdmin());
});

const avis = (artisanId: string, statut: string, jours: number) => ({
  artisanId,
  nomAffiche: 'Camille M.',
  note: 5,
  texte: 'Très bon travail',
  typeTravaux: 'Peinture',
  statut,
  publieLe: Timestamp.fromMillis(T - jours * 86_400_000),
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  const m = (role: string) => ({ role, statut: 'actif' });
  await Promise.all([
    db.doc(chemins.membre('a1', 'p1')).set(m('proprietaire')),
    db.doc(chemins.membre('a1', 'x1')).set(m('comptable')),
    db.doc(chemins.avis('v1')).set(avis('a1', 'publie', 1)),
    db.doc(chemins.avis('v2')).set(avis('a1', 'publie', 5)),
    db.doc(chemins.avis('v3')).set(avis('a1', 'en_attente', 0)),
    db.doc(chemins.avis('v4')).set(avis('a2', 'publie', 0)),
  ]);
});

describe('lireAvisPro', () => {
  it('avis publiés de l’entreprise, plus récents d’abord', async () => {
    expect((await lireAvisPro(db, 'a1')).map((a) => a.id)).toEqual(['v1', 'v2']);
  });
});

describe('repondreAvis', () => {
  it('une réponse, visible ensuite ; une seconde est refusée', async () => {
    await repondreAvis(s(), { artisanId: 'a1', uid: 'p1' }, { avisId: 'v1', texte: 'Merci !' });
    expect((await lireAvisPro(db, 'a1'))[0]!.reponse).toEqual({ texte: 'Merci !', le: T });
    await expect(
      repondreAvis(s(), { artisanId: 'a1', uid: 'p1' }, { avisId: 'v1', texte: 'Encore' }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
  });

  it('comptable, avis d’une autre entreprise ou non publié : refusé', async () => {
    await expect(
      repondreAvis(s(), { artisanId: 'a1', uid: 'x1' }, { avisId: 'v1', texte: 'x' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    for (const avisId of ['v3', 'v4'])
      await expect(
        repondreAvis(s(), { artisanId: 'a1', uid: 'p1' }, { avisId, texte: 'x' }),
      ).rejects.toMatchObject({ code: 'INTROUVABLE' });
  });
});
