// Source de demandes partenaire (IMPORT_LEADS §5, en attendant l'écran admin du lot 13).
// Usage : pnpm partenaire:source docs/data/source-partenaire.exemple.json [--nouvelle-cle]
// Projet cible : celui des identifiants Admin SDK (émulateur si FIRESTORE_EMULATOR_HOST est défini).
// La clé API n'est affichée qu'une fois : à transmettre au partenaire par un canal sûr.
import { appAdmin } from '@ph/firebase/admin';
import { enregistrerSource, type ParametresSource } from '@ph/firebase/partenaires';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

async function main() {
  const fichier = process.argv[2];
  if (!fichier)
    throw new Error('Indiquez le fichier JSON de la source (voir l’exemple dans docs/data).');
  const p = JSON.parse(readFileSync(fichier, 'utf8')) as ParametresSource;
  const { cleApi } = await enregistrerSource(
    { db: getFirestore(appAdmin()), horloge: Date.now },
    p,
    { nouvelleCle: process.argv.includes('--nouvelle-cle') },
  );
  console.log(`Source « ${p.id} » enregistrée.`);
  if (cleApi) console.log(`Clé API (affichée une seule fois) : ${cleApi}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
