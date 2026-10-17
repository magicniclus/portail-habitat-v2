import { finIban, normaliserIban } from '@ph/core/devis';
import { ErreurMetier } from '@ph/core/erreurs';
import type { entreeParametresFacturation } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { chiffrer } from './chiffrement';
import { exiger, type ContexteDevis, type ServicesDevis } from './communs';

/**
 * Paramètres de facturation (identité, décennale, médiateur, conditions) : saisis une fois, lus par
 * chaque devis, facture et article de blog (D64). Propriétaire et gérant (`factures.emettre`).
 */
export async function enregistrerParametresFacturation(
  s: ServicesDevis & { cleIban?: Buffer },
  ctx: ContexteDevis,
  e: z.output<typeof entreeParametresFacturation>,
): Promise<void> {
  const ref = s.db.doc(chemins.parametresFacturation(ctx.artisanId));
  const { iban, ...reste } = e;
  if (iban && !s.cleIban)
    throw new ErreurMetier('PRECONDITION', 'L’IBAN ne peut pas encore être enregistré.');
  await s.db.runTransaction(async (t) => {
    await exiger(s, t, ctx, 'factures.emettre');
    const avant = await t.get(ref);
    // IBAN absent de l'envoi : celui déjà enregistré est gardé ; vide : retiré.
    const banque =
      iban === undefined
        ? {
            ibanChiffre: avant.get('ibanChiffre') as string | undefined,
            ibanFin: avant.get('ibanFin') as string | undefined,
          }
        : iban === ''
          ? {}
          : { ibanChiffre: chiffrer(normaliserIban(iban), s.cleIban!), ibanFin: finIban(iban) };
    const propre = JSON.parse(JSON.stringify({ ...reste, ...banque })) as Record<string, unknown>;
    t.set(ref, { ...propre, schemaVersion: 1, updatedAt: Timestamp.fromMillis(s.horloge()) });
  });
}
