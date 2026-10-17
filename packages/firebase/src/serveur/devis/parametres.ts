import { finIban, normaliserIban } from '@ph/core/devis';
import { ErreurMetier } from '@ph/core/erreurs';
import type { entreeParametresFacturation, entreeTampon } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { bucketFichiers } from '../../admin';
import { chemins, fichiers } from '../../chemins';
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
    const tamponChemin = avant.get('tamponChemin') as string | undefined;
    const banque =
      iban === undefined
        ? {
            ibanChiffre: avant.get('ibanChiffre') as string | undefined,
            ibanFin: avant.get('ibanFin') as string | undefined,
          }
        : iban === ''
          ? {}
          : { ibanChiffre: chiffrer(normaliserIban(iban), s.cleIban!), ibanFin: finIban(iban) };
    const propre = JSON.parse(JSON.stringify({ ...reste, ...banque, tamponChemin })) as Record<
      string,
      unknown
    >;
    t.set(ref, { ...propre, schemaVersion: 1, updatedAt: Timestamp.fromMillis(s.horloge()) });
  });
}

/**
 * Cachet de l'entreprise (`factures.emettre`) : image de 2 Mo déjà déposée dans Storage
 * (`artisans/{id}/tampon/`), vérifiée ici ; ou retrait. Les PDF déjà produits ne changent pas.
 */
export async function enregistrerTampon(
  s: ServicesDevis & { bucket: ReturnType<typeof bucketFichiers> },
  ctx: ContexteDevis,
  e: z.output<typeof entreeTampon>,
): Promise<void> {
  const ref = s.db.doc(chemins.parametresFacturation(ctx.artisanId));
  let chemin: string | undefined;
  if (e.action === 'enregistrer') {
    chemin = fichiers.tampon(ctx.artisanId, e.nomFichier);
    const f = s.bucket.file(chemin);
    const [existe] = await f.exists();
    if (!existe) throw new ErreurMetier('INTROUVABLE', 'Image introuvable : renvoyez-la.');
    const [meta] = await f.getMetadata();
    if (!/^image\/(jpeg|png)$/.test(meta.contentType ?? '') || Number(meta.size) > 2 * 1024 * 1024)
      throw new ErreurMetier('ENTREE_INVALIDE', 'Image PNG ou JPEG de 2 Mo au plus.');
  }
  await s.db.runTransaction(async (t) => {
    await exiger(s, t, ctx, 'factures.emettre');
    const avant = await t.get(ref);
    if (!avant.exists)
      throw new ErreurMetier('PRECONDITION', 'Enregistrez d’abord vos paramètres de facturation.');
    t.update(ref, {
      tamponChemin: chemin ?? FieldValue.delete(),
      updatedAt: Timestamp.fromMillis(s.horloge()),
    });
  });
}
