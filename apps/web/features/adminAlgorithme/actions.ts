'use server';

import { configDepuisSaisie } from '@ph/core/matching';
import { entreePublierConfigMatching, entreeRejouerDemande } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import {
  publierConfigMatchingAdmin,
  rejouerDemandeAdmin,
  type ComparaisonClassement,
} from '@ph/firebase/admin-serveur';
import { lireConfigMatching } from '@ph/firebase/matching';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';

type Saisie = z.input<typeof entreePublierConfigMatching>['config'];
const services = () => ({ db: getFirestore(appAdmin()), horloge: Date.now });
const versConfig = async (s: z.output<typeof entreePublierConfigMatching>['config']) =>
  configDepuisSaisie(s, await lireConfigMatching(services().db));

const rejouer = actionAdmin(
  { schema: entreeRejouerDemande, nom: 'adminRejouerDemande', permission: 'matching.config' },
  async (e) =>
    rejouerDemandeAdmin(services(), { reference: e.reference, config: await versConfig(e.config) }),
);
const publier = actionAdmin(
  {
    schema: entreePublierConfigMatching,
    nom: 'adminMajMatchingConfig',
    permission: 'matching.config',
  },
  async (e, ctx) =>
    publierConfigMatchingAdmin(services(), {
      acteurUid: ctx.uid!,
      config: await versConfig(e.config),
      motif: e.motif,
    }),
);

/** Bac à sable : classement d'une demande passée avec la configuration saisie, sans rien écrire. */
export async function rejouerDemande(
  config: Saisie,
  reference: string,
): Promise<{ comparaison: ComparaisonClassement } | { erreur: string }> {
  const r = await rejouer({ config, reference });
  return r.ok ? { comparaison: r.data } : { erreur: r.message };
}

/** Publie une nouvelle version de la configuration (motif obligatoire). */
export async function publierConfig(config: Saisie, motif: string): Promise<string | null> {
  const r = await publier({ config, motif });
  revalidatePath('/admin/matching');
  return r.ok ? null : r.message;
}
