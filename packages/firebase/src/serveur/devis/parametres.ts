import type { entreeParametresFacturation } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { exiger, type ContexteDevis, type ServicesDevis } from './communs';

/**
 * Paramètres de facturation (identité, décennale, médiateur, conditions) : saisis une fois, lus par
 * chaque devis, facture et article de blog (D64). Propriétaire et gérant (`factures.emettre`).
 */
export async function enregistrerParametresFacturation(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: z.output<typeof entreeParametresFacturation>,
): Promise<void> {
  const ref = s.db.doc(chemins.parametresFacturation(ctx.artisanId));
  await s.db.runTransaction(async (t) => {
    await exiger(s, t, ctx, 'factures.emettre');
    const propre = JSON.parse(JSON.stringify(e)) as Record<string, unknown>;
    t.set(ref, { ...propre, schemaVersion: 1, updatedAt: Timestamp.fromMillis(s.horloge()) });
  });
}
