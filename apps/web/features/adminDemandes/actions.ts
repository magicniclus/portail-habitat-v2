'use server';

import { entreeAjoutArtisanAdmin, entreeDemandeAdmin } from '@ph/core/schemas';
import {
  ajouterArtisanDemandeAdmin,
  rejeterDemandeAdmin,
  relancerMatchingAdmin,
} from '@ph/firebase/admin-serveur';
import { lireConfigMatching } from '@ph/firebase/matching';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { servicesComptes } from '@/server/espace';

const services = async () => {
  const { db, horloge, notifier } = servicesComptes();
  return { db, horloge, notifier, config: await lireConfigMatching(db) };
};

const rejeter = actionAdmin(
  { schema: entreeDemandeAdmin, nom: 'adminRejeterDemande', permission: 'demandes.annuler' },
  async (e, ctx) =>
    rejeterDemandeAdmin(await services(), {
      acteurUid: ctx.uid!,
      demandeId: e.demandeId,
      statut: e.action === 'spam' ? 'spam' : 'annulee',
      motif: e.motif,
    }),
);
const relancer = actionAdmin(
  { schema: entreeDemandeAdmin, nom: 'adminRelancerMatching', permission: 'matching.forcer' },
  async (e, ctx) =>
    relancerMatchingAdmin(await services(), {
      acteurUid: ctx.uid!,
      demandeId: e.demandeId,
      motif: e.motif,
    }),
);
const ajouter = actionAdmin(
  { schema: entreeAjoutArtisanAdmin, nom: 'adminReattribuer', permission: 'demandes.reattribuer' },
  async (e, ctx) => ajouterArtisanDemandeAdmin(await services(), { acteurUid: ctx.uid!, ...e }),
);

/** Spam, annulation ou relance de l'algorithme (motif obligatoire, audit). */
export async function agirSurDemande(
  demandeId: string,
  action: 'spam' | 'annuler' | 'relancer',
  motif: string,
): Promise<string | null> {
  const r = await (action === 'relancer' ? relancer : rejeter)({ demandeId, action, motif });
  revalidatePath('/admin/demandes');
  return r.ok ? null : r.message;
}

/** Proposer la demande à un artisan choisi (identifiant de l'entreprise). */
export async function ajouterArtisan(
  demandeId: string,
  artisanId: string,
  motif: string,
): Promise<string | null> {
  const r = await ajouter({ demandeId, artisanId, motif });
  revalidatePath('/admin/demandes');
  return r.ok ? null : r.message;
}
