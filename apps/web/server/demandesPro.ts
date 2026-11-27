import 'server-only';
import { ErreurMetier } from '@ph/core/erreurs';
import { peut, type ActionEquipe } from '@ph/core/equipe';
import { lireEspacePro } from '@ph/firebase/comptes';
import type { ServicesDemandesPro } from '@ph/firebase/pro';
import { servicesEspace } from './espace';

export const servicesDemandesPro = (): ServicesDemandesPro => ({
  ...servicesEspace(),
  horloge: Date.now,
});

/** Entreprise active de la personne, si elle a le droit demandé (COMPTES §4.1). */
export async function entrepriseAutorisee(uid: string, action: ActionEquipe): Promise<string> {
  const e = await lireEspacePro(servicesEspace().db, uid);
  if (!e.active || !peut(e.active.membre, action)) throw new ErreurMetier('PERMISSION_REFUSEE');
  return e.active.artisanId;
}

export const entrepriseRepondante = (uid: string) => entrepriseAutorisee(uid, 'demandes.repondre');
