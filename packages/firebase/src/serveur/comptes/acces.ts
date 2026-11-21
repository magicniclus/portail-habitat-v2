import { ErreurMetier } from '@ph/core/erreurs';
import { peut, type ActionEquipe, type Membre, type RoleMembre } from '@ph/core/equipe';
import type { Transaction } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import type { ServicesComptes } from './services';

export interface EntrepriseLue {
  nomCommercial: string;
  adresseSiege?: { ville?: string };
  siegesMax: number;
  nbMembres: number;
  proprietaireUid: string;
  statut: string;
}

/** Lit l'entreprise dans la transaction ; introuvable ou fermée → erreur. */
export async function lireEntreprise(
  s: ServicesComptes,
  tx: Transaction,
  artisanId: string,
): Promise<EntrepriseLue> {
  const doc = await tx.get(s.db.doc(chemins.artisan(artisanId)));
  const a = doc.data() as EntrepriseLue | undefined;
  if (!a || a.statut === 'supprime') throw new ErreurMetier('INTROUVABLE');
  return a;
}

/**
 * Vérifie `peut()` sur le document `membres` relu dans la transaction : une révocation est
 * prise en compte immédiatement, même si le jeton de l'appelant n'a pas expiré.
 */
export async function exigerPermission(
  s: ServicesComptes,
  tx: Transaction,
  artisanId: string,
  uid: string,
  action: ActionEquipe,
  roleCible?: RoleMembre,
): Promise<Membre> {
  const m = (await tx.get(s.db.doc(chemins.membre(artisanId, uid)))).data() as Membre | undefined;
  if (!peut(m, action, { uid, roleCible })) throw new ErreurMetier('PERMISSION_REFUSEE');
  return m!;
}
