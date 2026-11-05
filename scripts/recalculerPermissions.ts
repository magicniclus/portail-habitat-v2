// Recalcule les permissions et les claims de toute l'équipe admin : pnpm admin:permissions
// À lancer après l'ajout d'une permission (ex. Studio). Reconnectez-vous ensuite à l'admin.
// Projet cible : celui des identifiants Admin SDK (FIREBASE_ADMIN_* dans .env.local).
import './env';
import { appAdmin } from '@ph/firebase/admin';
import { recalculerPermissionsEquipe } from '@ph/firebase/admin-serveur';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
  const r = await recalculerPermissionsEquipe({
    db: getFirestore(appAdmin()),
    auth: getAuth(appAdmin()),
    horloge: Date.now,
  });
  console.log(
    `${r.lus} membre(s) lus, ${r.modifies.length} mis à jour. Déconnectez-vous puis reconnectez-vous à l’admin.`,
  );
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
