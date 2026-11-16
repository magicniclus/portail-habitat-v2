// Ménage avant de refilmer le film « site internet » : retire les demandes de test laissées par les
// prises précédentes du formulaire du site (visiteur fictif « Claire Martin », émulateurs seulement).
// Usage : tsx scripts/vsl/site-menage.ts
import { appAdmin, estEmulateur } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
  if (!estEmulateur()) throw new Error('Ménage réservé aux émulateurs.');
  const db = getFirestore(appAdmin());
  const lot = await db.doc(chemins.demande('_')).parent.get();
  let n = 0;
  for (const d of lot.docs) {
    const brut = JSON.stringify(d.data());
    if (brut.includes('claire.martin@exemple.fr')) {
      await db.recursiveDelete(d.ref);
      n++;
    }
  }
  console.log(`✓ ${n} demande(s) de test retirée(s) sur ${lot.size}`);
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
