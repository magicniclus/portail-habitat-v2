import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, bucketFichiers, PROJET_EMULATEUR } from '../src/admin';
import { chemins, fichiers } from '../src/chemins';
import { enregistrerDocument, lireDocumentsPro } from '../src/serveur/pro';

let db: Firestore;
const T = Date.UTC(2026, 8, 29, 8);
const s = () => ({ db, bucket: bucketFichiers(), horloge: () => T });
const ctx = (uid: string) => ({ artisanId: 'a1', uid });
let n = 0;
const nouvelId = () => `doc${Date.now()}${n++}`.padEnd(20, '0');

async function deposer(docId: string, type = 'application/pdf', contenu = '%PDF-1.4 test') {
  await bucketFichiers()
    .file(fichiers.document('a1', docId, 'attestation.pdf'))
    .save(Buffer.from(contenu), { contentType: type });
}

beforeAll(() => {
  db = getFirestore(appAdmin());
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
    db.doc(chemins.artisan('a1')).set({
      enLigne: false,
      statut: 'actif',
      origine: 'onboarding',
      verification: { statut: 'en_cours' },
    }),
  ]);
});

describe('enregistrerDocument (ONB-06b)', () => {
  it('décennale envoyée : document en attente, empreinte, fiche mise en ligne', async () => {
    const docId = nouvelId();
    await deposer(docId);
    expect(
      await enregistrerDocument(s(), ctx('p1'), {
        docId,
        type: 'decennale',
        nomFichier: 'attestation.pdf',
      }),
    ).toEqual({ enLigne: true });
    const [d] = await lireDocumentsPro(db, 'a1');
    expect(d).toMatchObject({ id: docId, type: 'decennale', statut: 'en_attente' });
    const brut = (await db.doc(`${chemins.documents('a1')}/${docId}`).get()).data()!;
    expect(brut.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect((await db.doc(chemins.artisan('a1')).get()).get('enLigne')).toBe(true);
  });

  it('RC Pro seule : reste hors ligne', async () => {
    const docId = nouvelId();
    await deposer(docId);
    expect(
      await enregistrerDocument(s(), ctx('p1'), {
        docId,
        type: 'rc_pro',
        nomFichier: 'attestation.pdf',
      }),
    ).toEqual({ enLigne: false });
  });

  it('fichier absent, type refusé, comptable, doublon : refusés', async () => {
    await expect(
      enregistrerDocument(s(), ctx('p1'), {
        docId: nouvelId(),
        type: 'kbis',
        nomFichier: 'attestation.pdf',
      }),
    ).rejects.toMatchObject({ code: 'INTROUVABLE' });
    const texte = nouvelId();
    await deposer(texte, 'text/html', '<script>');
    await expect(
      enregistrerDocument(s(), ctx('p1'), {
        docId: texte,
        type: 'kbis',
        nomFichier: 'attestation.pdf',
      }),
    ).rejects.toMatchObject({ code: 'ENTREE_INVALIDE' });
    const docId = nouvelId();
    await deposer(docId);
    await expect(
      enregistrerDocument(s(), ctx('x1'), { docId, type: 'kbis', nomFichier: 'attestation.pdf' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
    await enregistrerDocument(s(), ctx('p1'), {
      docId,
      type: 'kbis',
      nomFichier: 'attestation.pdf',
    });
    await expect(
      enregistrerDocument(s(), ctx('p1'), { docId, type: 'kbis', nomFichier: 'attestation.pdf' }),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
  });
});
