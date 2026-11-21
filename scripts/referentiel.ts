// Catalogue réel des prestations (prix compris), recherche et communes, dans le projet Firebase
// des identifiants Admin SDK. Sans compte ni donnée de test (contrairement à `pnpm seed`).
// Usage : pnpm referentiel:importer <id-du-projet> [--ecraser]
//   - l'identifiant du projet est redemandé pour éviter d'écrire dans le mauvais projet ;
//   - sans --ecraser, ce qui existe déjà (prix modifiés dans l'admin) n'est jamais touché.
import './env';
import { appAdmin } from '@ph/firebase/admin';
import { documentsReferentiel, importerReferentiel, lireFichiersSeed } from '@ph/firebase/seed';
import { getFirestore } from 'firebase-admin/firestore';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
  const args = process.argv.slice(2);
  const demande = args.find((a) => !a.startsWith('--'));
  const ecraser = args.includes('--ecraser');
  const app = appAdmin();
  const projet =
    app.options.projectId ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    '';
  if (!demande || demande !== projet)
    throw new Error(
      `Projet ciblé par vos identifiants : « ${projet || 'inconnu'} ». Relancez avec : pnpm referentiel:importer ${projet || '<id-du-projet>'}`,
    );
  const fichiers = lireFichiersSeed(pathToFileURL(resolve(__dirname, '../docs/data/') + '/'));
  const r = await importerReferentiel(
    getFirestore(app),
    documentsReferentiel(fichiers, new Date()),
    {
      ecraser,
    },
  );
  console.log(
    `Référentiel importé dans ${projet} : ${r.crees} créés, ${r.gardes} déjà présents laissés tels quels${ecraser ? `, ${r.ecrases} remplacés` : ''}.`,
  );
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
