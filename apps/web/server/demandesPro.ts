import 'server-only';
import { ErreurMetier } from '@ph/core/erreurs';
import { peut } from '@ph/core/equipe';
import { lireEspacePro } from '@ph/firebase/comptes';
import type { ServicesDemandesPro } from '@ph/firebase/pro';
import { servicesEspace } from './espace';

export const servicesDemandesPro = (): ServicesDemandesPro => ({
  ...servicesEspace(),
  horloge: Date.now,
});

/** Entreprise active de la personne, si elle peut répondre aux demandes (COMPTES §4.1). */
export async function entrepriseRepondante(uid: string): Promise<string> {
  const e = await lireEspacePro(servicesEspace().db, uid);
  if (!e.active || !peut(e.active.membre, 'demandes.repondre'))
    throw new ErreurMetier('PERMISSION_REFUSEE');
  return e.active.artisanId;
}
