// Décor du film « site internet » : donne de vraies photos de salles de bain aux trois réalisations
// du compte de démonstration (émulateurs seulement), pour que le site d'artisan filmé ait l'allure
// d'un vrai site. Photos libres de droits (licence Unsplash, usage commercial autorisé), rangées
// dans `.vsl/photos/{id}.jpg` ; sources : https://unsplash.com/photos/{code} — voir PHOTOS.
// Usage : tsx scripts/vsl/decor-site.ts (émulateurs lancés, après `decor.ts`).
import { bucketFichiers, appAdmin, estEmulateur } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const DOSSIER = resolve(__dirname, '../../.vsl/photos');
const ENTREPRISE = 'seed-a-00';

/** Par réalisation : titre, description, photos (identifiant Unsplash du fichier, code de la page). */
const PHOTOS = [
  {
    titre: 'Salle de bain complète, douche à l’italienne',
    description: 'Douche vitrée, carrelage grand format, meuble suspendu et éclairage intégré.',
    photos: [
      ['1651951646668-46562cfb4518', 'yH1k2Qp86Tk'],
      ['1696987007764-7f8b85dd3033', 'ckdoA-tv9uw'],
      ['1638799869566-b17fa794c4de', 'Dk_o7KQyGkI'],
    ],
  },
  {
    titre: 'Baignoire îlot et double vasque',
    description: 'Baignoire en îlot, plan vasque sur mesure, robinetterie murale.',
    photos: [
      ['1620626011761-996317b8d101', 'Aac7IlKnYX8'],
      ['1629079447777-1e605162dc8d', '1AF5hP6F4tI'],
      ['1507652313519-d4e9174996dd', 'PibraWHb4h8'],
    ],
  },
  {
    titre: 'Meuble vasque en chêne et rangements',
    description: 'Meuble sur mesure, deux vasques à poser, miroirs et rangements intégrés.',
    photos: [
      ['1600488999585-e4364713b90a', 'kSoe7EoxHIE'],
      ['1631048499052-e6d9f305d2c0', '2X9H1lD_k2Q'],
      ['1584622650111-993a426fbf0a', 'g51F6-WYzyU'],
    ],
  },
] as const;

async function main() {
  if (!estEmulateur()) throw new Error('Décor réservé aux émulateurs.');
  const db = getFirestore(appAdmin());
  const bucket = bucketFichiers();
  const hote = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199';
  for (const [i, r] of PHOTOS.entries()) {
    const photos = [];
    for (const [k, [fichier]] of r.photos.entries()) {
      const image = await sharp(readFileSync(join(DOSSIER, `${fichier}.jpg`)))
        .resize(1600, 1067, { fit: 'cover' })
        .jpeg({ quality: 84 })
        .toBuffer();
      const chemin = `sites/${ENTREPRISE}/medias/vsl-${i}-${k}.jpg`;
      await bucket.file(chemin).save(image, { contentType: 'image/jpeg', resumable: false });
      photos.push({
        url: `http://${hote}/v0/b/${bucket.name}/o/${encodeURIComponent(chemin)}?alt=media`,
        storagePath: chemin,
        largeur: 1600,
        hauteur: 1067,
      });
    }
    await db
      .doc(`${chemins.realisations(ENTREPRISE)}/vsl-${i}`)
      .set({ titre: r.titre, description: r.description, photos }, { merge: true });
    console.log(`✓ ${r.titre} (${photos.length} photos)`);
  }
  // Avis du jeu de test (fictifs, émulateur) : le texte tiède jure avec ses cinq étoiles.
  const avis = await db.doc(chemins.avis('_')).parent.where('artisanId', '==', ENTREPRISE).get();
  for (const d of avis.docs)
    if (String(d.get('texte') ?? '').includes('améliorer'))
      await d.ref.update({
        texte: 'Salle de bain refaite en une semaine, chantier propre et finitions soignées.',
      });
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
