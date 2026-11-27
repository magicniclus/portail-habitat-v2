'use server';

import {
  entreeParametresAppelOffres,
  entreePrixAppelOffres,
  entreePromoAppelOffres,
} from '@ph/core/schemas';
import type { Resultat } from '@ph/core/resultat';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import {
  fixerPrixAppelOffresAdmin,
  parametresAppelOffresAdmin,
  promoAppelOffresAdmin,
} from '@ph/firebase/admin-serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { lireSessionAdmin } from '@/server/sessionAdmin';

const services = () => ({ db: getFirestore(appAdmin()), horloge: Date.now });

const fixer = actionAdmin(
  { schema: entreePrixAppelOffres, nom: 'adminFixerPrixLead', permission: 'leads.prix' },
  async (e, ctx) => {
    const r = await lireSessionAdmin();
    const illimite = r.etat === 'ok' && r.session.permissions.includes('leads.prix_illimite');
    return fixerPrixAppelOffresAdmin(services(), {
      acteurUid: ctx.uid!,
      appelOffresId: e.appelOffresId,
      mode: e.mode,
      illimite,
      motif: e.motif,
      // Saisie en euros entiers, convertie ici en centimes.
      ...(e.mode === 'manuel'
        ? {
            prix: {
              prixBaseCentimes: e.prixEuros * 100,
              prixPremiumCentimes: e.prixPremiumEuros * 100,
              prixCredits: e.credits,
            },
          }
        : {}),
    });
  },
);
const promo = actionAdmin(
  { schema: entreePromoAppelOffres, nom: 'adminPromoLead', permission: 'leads.prix' },
  async (e, ctx) =>
    promoAppelOffresAdmin(services(), {
      acteurUid: ctx.uid!,
      appelOffresId: e.appelOffresId,
      motif: e.motif,
      ...(e.pourcentage !== undefined ? { pourcentage: e.pourcentage } : {}),
      ...(e.jusquau ? { jusquau: Date.parse(`${e.jusquau}T23:59:59Z`) } : {}),
    }),
);
const parametres = actionAdmin(
  { schema: entreeParametresAppelOffres, nom: 'adminParametresLead', permission: 'leads.publier' },
  async (e, ctx) => parametresAppelOffresAdmin(services(), { acteurUid: ctx.uid!, ...e }),
);

const fin = (r: Resultat<unknown>) => {
  revalidatePath('/admin/appels-d-offres');
  return r.ok ? null : r.message;
};

/** Prix manuel, gratuit ou retour au calcul automatique (motif obligatoire, historique). */
export async function fixerPrix(e: z.input<typeof entreePrixAppelOffres>) {
  return fin(await fixer(e));
}
export async function changerPromo(e: z.input<typeof entreePromoAppelOffres>) {
  return fin(await promo(e));
}
export async function changerParametres(e: z.input<typeof entreeParametresAppelOffres>) {
  return fin(await parametres(e));
}
