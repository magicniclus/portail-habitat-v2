// Lancé par le robot dans la copie de démonstration (variables des émulateurs uniquement) :
// donne au compte de démonstration le nom et les chiffres de l'artisan d'exemple, renvoie son slug.
import { artisanFictif } from '@ph/core/studio';
import { appAdmin, estEmulateur } from '@ph/firebase/admin';
import { chemins } from '@ph/firebase/chemins';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
  if (!estEmulateur()) throw new Error('préparation refusée hors émulateur');
  const a = artisanFictif.parse(JSON.parse(process.argv[2] ?? '{}'));
  const db = getFirestore(appAdmin());
  const user = (await db.doc(chemins.user('seed-proprio')).get()).data() as
    { entrepriseActive?: string; entreprises?: string[] } | undefined;
  const id = user?.entrepriseActive ?? user?.entreprises?.[0];
  if (!id) throw new Error('compte de démonstration introuvable');
  const champs = {
    nomCommercial: a.nom,
    ...(a.noteMoyenne !== undefined ? { noteMoyenne: a.noteMoyenne } : {}),
    ...(a.nombreAvis !== undefined ? { nbAvis: a.nombreAvis } : {}),
  };
  await db.doc(chemins.artisan(id)).set(champs, { merge: true });
  await db.doc(chemins.artisanPublic(id)).set(champs, { merge: true });
  const slug = (await db.doc(chemins.artisanPublic(id)).get()).get('slug') as string;
  process.stdout.write(JSON.stringify({ id, slug }));
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
