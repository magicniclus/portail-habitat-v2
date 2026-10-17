// Premier super-administrateur : pnpm admin:creer <email> "<Prénom Nom>"
// Projet cible : celui des identifiants Admin SDK (émulateurs si les variables d'émulateur sont définies).
// Le lien affiché permet de choisir le mot de passe ; la double authentification est demandée ensuite.
import { appAdmin } from '@ph/firebase/admin';
import { creerSuperAdmin } from '@ph/firebase/admin-serveur';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
  const [email, nom] = process.argv.slice(2);
  if (!email?.includes('@') || !nom)
    throw new Error('Usage : pnpm admin:creer <email> "<Prénom Nom>"');
  const app = appAdmin();
  const r = await creerSuperAdmin(
    { db: getFirestore(app), auth: getAuth(app), horloge: Date.now },
    { email, nom },
  );
  console.log(`${r.cree ? 'Compte créé' : 'Compte existant'} : super-administrateur ${email}.`);
  console.log(`Choisissez le mot de passe ici : ${r.lienMotDePasse}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
