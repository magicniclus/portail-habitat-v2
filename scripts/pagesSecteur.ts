// Rattrapage du registre des pages de secteur (SEO local) : pnpm pages-secteur:rattraper
// À lancer une fois à la mise en service, puis seulement en cas de besoin : chaque fiche publique
// en ligne crée ses pages « métier à commune » manquantes et recompte les pages voisines.
// Projet cible : celui des identifiants Admin SDK (FIREBASE_ADMIN_* dans .env.local) ou l'émulateur.
import './env';
import { appAdmin } from '@ph/firebase/admin';
import { communesApiGouv, rattraperPagesSecteur } from '@ph/firebase/pages-secteur';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
  const ctx = { db: getFirestore(appAdmin()), horloge: Date.now, communes: communesApiGouv };
  let apres: string | undefined;
  let total = { lues: 0, creees: 0 };
  for (;;) {
    const r = await rattraperPagesSecteur(ctx, { ...(apres ? { apres } : {}), limite: 100 });
    total = { lues: total.lues + r.lues, creees: total.creees + r.creees };
    console.log(`${total.lues} fiche(s) lues, ${total.creees} page(s) créée(s)`);
    if (!r.dernier || r.lues < 100) break;
    apres = r.dernier;
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
