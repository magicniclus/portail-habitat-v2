// Migrations de données (EXPLOITATION §2).
// Usage : pnpm migrer <id> --dry-run   (obligatoire d'abord : compte et montre des exemples)
//         pnpm migrer <id> --executer  (après une sauvegarde manuelle de Firestore)
// Sans argument : liste des migrations et de leur état.
import { appAdmin } from '@ph/firebase/admin';
import { etatMigration, executerMigration } from '@ph/firebase/migrations';
import { getFirestore } from 'firebase-admin/firestore';
import { MIGRATIONS } from './migrations';

async function main() {
  const [id, mode] = process.argv.slice(2);
  const db = getFirestore(appAdmin());
  if (!id) {
    for (const m of MIGRATIONS)
      console.log(`${m.id} · ${m.description} · ${await etatMigration(db, m.id)}`);
    if (!MIGRATIONS.length) console.log('Aucune migration enregistrée.');
    return;
  }
  const m = MIGRATIONS.find((x) => x.id === id);
  if (!m) throw new Error(`Migration inconnue : ${id}`);
  if (mode !== '--dry-run' && mode !== '--executer')
    throw new Error('Précisez --dry-run (d’abord) ou --executer.');
  const dryRun = mode === '--dry-run';
  const bilan = await executerMigration(db, m, { dryRun, horloge: Date.now });
  console.log(JSON.stringify({ migration: m.id, dryRun, ...bilan }, null, 2));
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exitCode = 1;
});
