'use server';

import { entreePageSecteurAdmin } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { appAdmin } from '@ph/firebase/admin';
import { modifierPageSecteurAdmin } from '@ph/firebase/pages-secteur';
import { lirePageSecteurId } from '@ph/core/pages-secteur';
import { getFirestore } from 'firebase-admin/firestore';
import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { routes } from '@/lib/routes';
import { actionAdmin } from '@/server/actionAdmin';

const modifier = actionAdmin(
  { schema: entreePageSecteurAdmin, nom: 'adminPageSecteur', permission: 'referentiels.modifier' },
  async (e, ctx) =>
    modifierPageSecteurAdmin(
      { db: getFirestore(appAdmin()), horloge: Date.now },
      { acteurUid: ctx.uid!, ...e },
    ),
);

/** Bloquer, débloquer ou faire réécrire le texte IA d'une page ; la page publique est régénérée. */
export async function modifierPageSecteur(
  e: z.input<typeof entreePageSecteurAdmin>,
): Promise<string | null> {
  const r = await modifier(e);
  const ids = lirePageSecteurId(e.id);
  if (ids) revalidatePath(routes.metierVille(ids.metier, ids.slug) as Route);
  revalidatePath('/admin/referentiels');
  if (!r.ok) return r.message;
  return r.data ? null : 'Page introuvable.';
}
