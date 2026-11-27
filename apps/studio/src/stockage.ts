import { bucketFichiers } from '@ph/firebase/admin';
import { join } from 'node:path';

/** Fichiers du Studio dans Storage (Admin SDK : les règles ne s'appliquent pas au robot). */
export async function telecharger(chemin: string, dossier: string, nom: string): Promise<string> {
  const local = join(dossier, nom);
  await bucketFichiers().file(chemin).download({ destination: local });
  return local;
}

export async function deposer(local: string, chemin: string, type: string): Promise<string> {
  await bucketFichiers().upload(local, {
    destination: chemin,
    contentType: type,
    resumable: false,
  });
  return chemin;
}
