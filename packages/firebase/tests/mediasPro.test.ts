import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  appAdmin,
  bucketFichiers,
  cheminDepuisUrlPublique,
  PROJET_EMULATEUR,
  urlPubliqueFichier,
} from '../src/admin';
import { chemins, fichiers } from '../src/chemins';
import {
  enregistrerBanniere,
  enregistrerVideo,
  enregistrerLogo,
  enregistrerRealisation,
  lireRealisationsPro,
  publierRealisation,
  retirerBanniere,
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

describe('publierRealisation', () => {
  it('« Public » : masque ou republie un projet, complétude ajustée ; collaborateur sans droit refusé', async () => {
    for (let i = 0; i < 2; i++) await image(fichiers.realisation('a1', RID, `photo${i}.png`));
    await enregistrerRealisation(s(), ctx('p1'), realisation(2));
    const avant = (await db.doc(chemins.artisan('a1')).get()).get('completude');
    await publierRealisation(s(), ctx('p1'), { rid: RID, publie: false });
    const ref = db.doc(`${chemins.realisations('a1')}/${RID}`);
    expect((await ref.get()).get('publie')).toBe(false);
    expect((await db.doc(chemins.artisan('a1')).get()).get('completude')).toBeLessThanOrEqual(
      avant,
    );
    expect((await lireRealisationsPro(db, 'a1'))[0]).toMatchObject({
      publie: false,
      ville: 'Mérignac',
    });
    await publierRealisation(s(), ctx('p1'), { rid: RID, publie: true });
    expect((await ref.get()).get('publie')).toBe(true);
    expect((await db.doc(chemins.artisan('a1')).get()).get('completude')).toBe(avant);
    await expect(
      publierRealisation(s(), ctx('x1'), { rid: RID, publie: false }),
    ).rejects.toMatchObject({ code: 'PERMISSION_REFUSEE' });
  });
});

describe('enregistrerBanniere', () => {
  const lire = async () => (await db.doc(chemins.artisan('a1')).get()).get('bannieres');
  const existe = async (nom: string) =>
    (await bucketFichiers().file(fichiers.banniere('a1', nom)).exists())[0];

  it('URL publique enregistrée ; collaborateur refusé ; non image refusée', async () => {
    await image(fichiers.banniere('a1', 'b.png'));
    await expect(enregistrerBanniere(s(), ctx('c1'), 'b.png')).rejects.toMatchObject({
      code: 'PERMISSION_REFUSEE',
    });
    const r = await enregistrerBanniere(s(), ctx('p1'), 'b.png');
    expect(r.bannieres[0]).toContain(encodeURIComponent('artisans/a1/banniere/b.png'));
    expect(await lire()).toEqual(r.bannieres);
    await image(fichiers.banniere('a1', 'x.png'), 'text/html');
    await expect(enregistrerBanniere(s(), ctx('p1'), 'x.png')).rejects.toMatchObject({
      code: 'ENTREE_INVALIDE',
    });
  });

  it('sans visibilité payante : une seule bannière, l’ancienne est remplacée et supprimée', async () => {
    await image(fichiers.banniere('a1', 'b1.png'));
    await image(fichiers.banniere('a1', 'b2.png'));
    await enregistrerBanniere(s(), ctx('p1'), 'b1.png');
    const r = await enregistrerBanniere(s(), ctx('p1'), 'b2.png');
    expect(r.bannieres).toEqual([urlPubliqueFichier(fichiers.banniere('a1', 'b2.png'))]);
    expect(await existe('b1.png')).toBe(false);
  });

  it('visibilité payante : jusqu’à 5 bannières, la 6e est refusée', async () => {
    await db.doc(chemins.artisan('a1')).update({ 'droits.ficheMiseEnAvant': true });
    for (let i = 1; i <= 6; i++) await image(fichiers.banniere('a1', `b${i}.png`));
    for (let i = 1; i <= 5; i++) await enregistrerBanniere(s(), ctx('p1'), `b${i}.png`);
    expect(await lire()).toHaveLength(5);
    await expect(enregistrerBanniere(s(), ctx('p1'), 'b6.png')).rejects.toMatchObject({
      code: 'PRECONDITION',
    });
  });

  it('retrait : bannière ôtée de la liste et fichier supprimé ; inconnue ou collaborateur refusés', async () => {
    await image(fichiers.banniere('a1', 'b.png'));
    const { bannieres } = await enregistrerBanniere(s(), ctx('p1'), 'b.png');
    await expect(retirerBanniere(s(), ctx('c1'), bannieres[0]!)).rejects.toMatchObject({
      code: 'PERMISSION_REFUSEE',
    });
    await expect(
      retirerBanniere(s(), ctx('p1'), 'https://ailleurs.test/x.png'),
    ).rejects.toMatchObject({ code: 'INTROUVABLE' });
    expect((await retirerBanniere(s(), ctx('p1'), bannieres[0]!)).bannieres).toEqual([]);
    expect(await lire()).toEqual([]);
    expect(await existe('b.png')).toBe(false);
  });
});

describe('enregistrerVideo', () => {
  it('URL publique enregistrée ; collaborateur refusé ; image refusée', async () => {
    await image(fichiers.video('a1', 'v.mp4'), 'video/mp4');
    await expect(enregistrerVideo(s(), ctx('c1'), 'v.mp4')).rejects.toMatchObject({
      code: 'PERMISSION_REFUSEE',
    });
    const r = await enregistrerVideo(s(), ctx('p1'), 'v.mp4');
    expect(r.videoUrl).toContain(encodeURIComponent('artisans/a1/video/v.mp4'));
    expect((await db.doc(chemins.artisan('a1')).get()).get('videoUrl')).toBe(r.videoUrl);
    await image(fichiers.video('a1', 'x.png'));
    await expect(enregistrerVideo(s(), ctx('p1'), 'x.png')).rejects.toMatchObject({
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

describe('logo repris sur les PDF', () => {
  it('chemin Storage relu depuis l’URL publique ; une autre URL est ignorée', () => {
    const chemin = 'artisans/a1/logo/logo été.png';
    expect(cheminDepuisUrlPublique(urlPubliqueFichier(chemin))).toBe(chemin);
    expect(cheminDepuisUrlPublique('https://exemple.fr/logo.png')).toBeNull();
    expect(cheminDepuisUrlPublique('https://x/o/%E0%A4%A?alt=media')).toBeNull();
  });
});
