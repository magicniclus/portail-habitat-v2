// Décor du film « visibilité sur le portail » : donne une vraie photo à la bannière de la fiche du
// compte de démonstration (émulateurs seulement). Photo libre de droits (licence Unsplash), déjà
// rangée dans `.vsl/photos/` par le décor du film du site (source : voir `decor-site.ts`).
// Usage : tsx scripts/vsl/decor-fiche.ts (émulateurs lancés, après `decor.ts` et `decor-site.ts`).
import { appAdmin, bucketFichiers, estEmulateur } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const PHOTO = resolve(__dirname, '../../.vsl/photos/1651951646668-46562cfb4518.jpg');
const ENTREPRISE = 'seed-a-00';

async function main() {
  if (!estEmulateur()) throw new Error('Décor réservé aux émulateurs.');
  const bucket = bucketFichiers();
  const hote = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199';
  const image = await sharp(readFileSync(PHOTO))
    .resize(1600, 500, { fit: 'cover' })
    .jpeg({ quality: 84 })
    .toBuffer();
  const chemin = `sites/${ENTREPRISE}/medias/vsl-banniere.jpg`;
  await bucket.file(chemin).save(image, { contentType: 'image/jpeg', resumable: false });
  const bannieres = [
    `http://${hote}/v0/b/${bucket.name}/o/${encodeURIComponent(chemin)}?alt=media`,
  ];
  const db = getFirestore(appAdmin());
  await db.doc(chemins.artisan(ENTREPRISE)).set({ bannieres }, { merge: true });
  await db.doc(chemins.artisanPublic(ENTREPRISE)).set({ bannieres }, { merge: true });
  console.log('✓ bannière de la fiche');
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
