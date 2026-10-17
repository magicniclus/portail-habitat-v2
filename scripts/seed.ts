// Jeu de données de test (COMPTES §6.4). Usage : pnpm seed (émulateurs lancés, SEED_MOT_DE_PASSE défini).
// Refuse de tourner hors émulateur (demo-… / -local) ou préproduction (-staging), et avec NODE_ENV=production.
import { appAdmin } from '@ph/firebase/admin';
import {
  ecrireJeu,
  genererJeu,
  lireFichiersSeed,
  validerDocuments,
  verifierCibleSeed,
} from '@ph/firebase/seed';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
  const cible = verifierCibleSeed(process.env);
  const jeu = genererJeu(
    lireFichiersSeed(pathToFileURL(resolve(__dirname, '../docs/data/') + '/')),
    Number(process.env.SEED_GRAINE ?? 42),
    new Date(),
  );
  const erreurs = validerDocuments(jeu.documents);
  if (erreurs.length) {
    console.error(`Jeu invalide (${erreurs.length} erreurs) :\n${erreurs.slice(0, 20).join('\n')}`);
    process.exitCode = 1;
    return;
  }
  const app = appAdmin();
  const r = await ecrireJeu(getFirestore(app), getAuth(app), jeu, cible.motDePasse);
  console.log(`Seed terminé sur ${cible.projet} : ${r.comptes} comptes, ${r.documents} documents.`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
