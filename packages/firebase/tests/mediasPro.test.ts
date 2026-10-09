import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, bucketFichiers, PROJET_EMULATEUR } from '../src/admin';
import { chemins, fichiers } from '../src/chemins';
import {
  enregistrerLogo,
  enregistrerRealisation,
  lireRealisationsPro,
  supprimerRealisation,
} from '../src/serveur/pro';

let db: Firestore;
const T = Date.UTC(2026, 8, 29, 8);
const s = () => ({ db, bucket: bucketFichiers(), horloge: () => T });
const ctx = (uid: string) => ({ artisanId: 'a1', uid });
const RID = 'realisation0000000001';
const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

const image = (chemin: string, type = 'image/png') =>
  bucketFichiers().file(chemin).save(PNG, { contentType: type });

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
    db.doc(chemins.membre('a1', 'c1')).set(m('collaborateur')),
    db.doc(chemins.artisan('a1')).set({
      metiers: ['couvreur'],
      metierPrincipal: 'couvreur',
      zoneIntervention: { rayonKm: 30 },
      description: '',
      labels: [],
    }),
  ]);
});

const realisation = (nbPhotos: number) => ({
  rid: RID,
  titre: 'Toiture à Mérignac',
  ville: 'Mérignac',
  description: '',
  photos: Array.from({ length: nbPhotos }, (_, i) => ({
    nomFichier: `photo${i}.png`,
    largeur: 1200,
    hauteur: 800,
  })),
  autorisationProprietaire: true as const,
});

describe('enregistrerLogo', () => {
  it('URL publique, complétude +10 ; collaborateur refusé', async () => {
    await image(fichiers.logo('a1', 'logo.png'));
    await expect(enregistrerLogo(s(), ctx('c1'), 'logo.png')).rejects.toMatchObject({
      code: 'PERMISSION_REFUSEE',
    });
    const r = await enregistrerLogo(s(), ctx('p1'), 'logo.png');
    expect(r.logoUrl).toContain(encodeURIComponent('artisans/a1/logo/logo.png'));
    expect((await db.doc(chemins.artisan('a1')).get()).get('completude')).toBe(30);
  });

  it('fichier non image : refusé', async () => {
    await image(fichiers.logo('a1', 'logo.png'), 'text/html');
    await expect(enregistrerLogo(s(), ctx('p1'), 'logo.png')).rejects.toMatchObject({
      code: 'ENTREE_INVALIDE',
    });
  });
});

describe('réalisations', () => {
  it('3 photos publiées comptent dans la complétude ; suppression la retire', async () => {
    for (let i = 0; i < 3; i++) await image(fichiers.realisation('a1', RID, `photo${i}.png`));
    await enregistrerRealisation(s(), ctx('c1'), realisation(3));
    const [r] = await lireRealisationsPro(db, 'a1');
    expect(r).toMatchObject({ id: RID, titre: 'Toiture à Mérignac' });
    expect(r!.photos).toHaveLength(3);
    expect((await db.doc(chemins.artisan('a1')).get()).get('completude')).toBe(40);
    await supprimerRealisation(s(), ctx('c1'), RID);
    expect(await lireRealisationsPro(db, 'a1')).toEqual([]);
    expect((await db.doc(chemins.artisan('a1')).get()).get('completude')).toBe(20);
  });

  it('photo manquante : refusée', async () => {
    await expect(enregistrerRealisation(s(), ctx('p1'), realisation(1))).rejects.toMatchObject({
      code: 'INTROUVABLE',
    });
  });
});
