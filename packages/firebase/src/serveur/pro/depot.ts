import { ErreurMetier } from '@ph/core/erreurs';
import { peut, type Membre } from '@ph/core/equipe';
import { regleDepot, typeReel } from '@ph/core/espace-pro';
import type { Firestore } from 'firebase-admin/firestore';
import type { bucketFichiers } from '../../admin';
import { chemins } from '../../chemins';

type Services = { db: Firestore; bucket: ReturnType<typeof bucketFichiers> };

/**
 * Dépôt d'un fichier par le serveur, en secours d'un envoi direct refusé par Storage : mêmes
 * chemins, types et tailles que `storage.rules`, droit du membre relu en base (`peut()`), type
 * vérifié sur le contenu. Le fichier n'est rattaché à la fiche qu'ensuite, par sa route habituelle.
 */
export async function deposerFichierServeur(
  s: Services,
  uid: string,
  e: { chemin: string; type: string; contenu: Uint8Array },
): Promise<{ chemin: string }> {
  const regle = regleDepot(e.chemin);
  if (!regle) throw new ErreurMetier('ENTREE_INVALIDE', 'Emplacement de fichier refusé.');
  const membre = (await s.db.doc(chemins.membre(regle.artisanId, uid)).get()).data() as
    Membre | undefined;
  if (!peut(membre, regle.permission)) throw new ErreurMetier('PERMISSION_REFUSEE');
  if (!regle.types.includes(e.type) || typeReel(e.contenu) !== e.type)
    throw new ErreurMetier('ENTREE_INVALIDE', 'Type de fichier refusé.');
  if (e.contenu.byteLength > regle.maxMo * 1024 * 1024)
    throw new ErreurMetier('ENTREE_INVALIDE', `${regle.maxMo} Mo au plus.`);
  const fichier = s.bucket.file(e.chemin);
  if (regle.creationSeule && (await fichier.exists())[0])
    throw new ErreurMetier('CONFLIT', 'Ce fichier existe déjà.');
  await fichier.save(Buffer.from(e.contenu), { contentType: e.type, resumable: false });
  return { chemin: e.chemin };
}
