'use server';

import { entreeInvitationEquipe, entreeModifierEquipe } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { inviterMembreEquipeAdmin, modifierMembreEquipeAdmin } from '@ph/firebase/admin-serveur';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { servicesComptes } from '@/server/espace';

const services = () => {
  const { db, auth, horloge, notifier } = servicesComptes();
  return { db, auth, horloge, notifier };
};

const inviter = actionAdmin(
  { schema: entreeInvitationEquipe, nom: 'adminInviterEquipe', permission: 'equipe.gerer' },
  async (e, ctx) => inviterMembreEquipeAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);
const modifier = actionAdmin(
  { schema: entreeModifierEquipe, nom: 'adminModifierEquipe', permission: 'equipe.gerer' },
  async (e, ctx) => modifierMembreEquipeAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);

/** Invite un membre de l'équipe : il reçoit un lien pour choisir son mot de passe. */
export async function inviterMembre(
  e: z.input<typeof entreeInvitationEquipe>,
): Promise<string | null> {
  const r = await inviter(e);
  revalidatePath('/admin/equipe');
  return r.ok ? null : r.message;
}

/** Change le rôle d'un membre, ou le désactive (sessions coupées aussitôt). */
export async function modifierMembre(
  e: z.input<typeof entreeModifierEquipe>,
): Promise<string | null> {
  const r = await modifier(e);
  revalidatePath('/admin/equipe');
  return r.ok ? null : r.message;
}
