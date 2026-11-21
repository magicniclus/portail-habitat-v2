'use server';

import { minuitParis } from '@ph/core/admin';
import { entreeDemandeRgpd, entreeTraiterRgpd } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { bucketFichiers } from '@ph/firebase/admin';
import { enregistrerDemandeRgpdAdmin, traiterRgpdAdmin } from '@ph/firebase/admin-serveur';
import { revalidatePath } from 'next/cache';
import { actionAdmin } from '@/server/actionAdmin';
import { servicesComptes } from '@/server/espace';

const enregistrer = actionAdmin(
  { schema: entreeDemandeRgpd, nom: 'adminEnregistrerRgpd', permission: 'rgpd.traiter' },
  async (e, ctx) =>
    enregistrerDemandeRgpdAdmin(servicesComptes(), {
      acteurUid: ctx.uid!,
      type: e.type,
      email: e.email,
      recueLe: minuitParis(e.recueLe),
    }),
);
const traiter = actionAdmin(
  { schema: entreeTraiterRgpd, nom: 'adminTraiterRgpd', permission: 'rgpd.traiter' },
  async (e, ctx) =>
    traiterRgpdAdmin(
      {
        ...servicesComptes(),
        ecrire: async (chemin, contenu) => {
          await bucketFichiers()
            .file(chemin)
            .save(contenu, { contentType: 'application/json', resumable: false });
        },
      },
      { acteurUid: ctx.uid!, ...e },
    ),
);

export async function enregistrerDemandeRgpd(
  e: z.input<typeof entreeDemandeRgpd>,
): Promise<string | null> {
  const r = await enregistrer(e);
  revalidatePath('/admin/rgpd');
  return r.ok ? null : r.message;
}
export async function traiterDemandeRgpd(id: string, motif: string): Promise<string | null> {
  const r = await traiter({ id, motif });
  revalidatePath('/admin/rgpd');
  return r.ok ? null : r.message;
}
