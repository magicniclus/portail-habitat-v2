'use server';

import { entreeDecisionContestation } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { deciderContestationAdmin } from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { servicesComptes } from '@/server/espace';
import { lireSessionAdmin } from '@/server/sessionAdmin';
import { clientStripe } from '@/server/stripe';

const decider = actionAdmin(
  {
    schema: entreeDecisionContestation,
    nom: 'adminTraiterRemboursementLead',
    permission: 'leads.rembourser',
  },
  async (e, ctx) => {
    const r = await lireSessionAdmin();
    const peutCarte =
      r.etat === 'ok' && r.session.permissions.includes('finances.rembourser_carte');
    const stripe = clientStripe();
    return deciderContestationAdmin(
      {
        db: getFirestore(appAdmin()),
        horloge: Date.now,
        notifier: servicesComptes().notifier,
        ...(stripe
          ? {
              rembourserCarte: async (pi: string, cle: string) =>
                (
                  await stripe.refunds.create(
                    { payment_intent: pi, metadata: { contestation: cle } },
                    { idempotencyKey: cle },
                  )
                ).id,
            }
          : {}),
      },
      { acteurUid: ctx.uid!, peutCarte, ...e },
    );
  },
);

/** Rembourser en crédits, sur la carte, ou refuser une contestation (motif obligatoire). */
export async function deciderContestation(
  id: string,
  decision: 'credits' | 'carte' | 'refuser',
  motif: string,
): Promise<string | null> {
  const r = await decider({ id, decision, motif });
  revalidatePath('/admin/appels-d-offres/contestations');
  return r.ok ? null : r.message;
}
