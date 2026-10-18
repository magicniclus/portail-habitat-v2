import { ErreurMetier } from '@ph/core/erreurs';
import type { entreeSectionEnregistree } from '@ph/core/schemas';
import type { Section } from '@ph/core/sites';
import type { z } from '@ph/core/zod';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { exigerSite, type ContexteSite, type ServicesSites } from './edition';

/** 30 sections enregistrées au plus par site (DATABASE §15 bis). */
const MAX_SECTIONS = 30;

export interface SectionEnregistree {
  id: string;
  nom: string;
  section: Section;
}

/**
 * « Mes sections » : une section de l'éditeur enregistrée sous un nom réapparaît dans Ajouter ;
 * les identifiants sont régénérés à chaque insertion (côté éditeur).
 */
export async function gererSectionsEnregistrees(
  s: ServicesSites,
  ctx: ContexteSite,
  e: z.output<typeof entreeSectionEnregistree>,
): Promise<SectionEnregistree[]> {
  const col = s.db.collection(chemins.sectionsEnregistrees(ctx.artisanId));
  if (e.action !== 'lire')
    await s.db.runTransaction(async (t) => {
      await exigerSite(s, t, ctx);
      if (e.action === 'supprimer') return void t.delete(col.doc(e.id));
      const n = await t.get(col.count());
      if (n.data().count >= MAX_SECTIONS)
        throw new ErreurMetier(
          'PRECONDITION',
          `Vous avez déjà ${MAX_SECTIONS} sections enregistrées : supprimez-en une.`,
        );
      t.set(col.doc(), {
        schemaVersion: 1,
        nom: e.nom,
        section: e.section,
        createdAt: Timestamp.fromMillis(s.horloge()),
      });
    });
  const r = await col.orderBy('createdAt', 'desc').limit(MAX_SECTIONS).get();
  return r.docs.map((d) => ({
    id: d.id,
    nom: d.get('nom') as string,
    section: d.get('section') as Section,
  }));
}
