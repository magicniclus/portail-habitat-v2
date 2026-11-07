import { finIban, normaliserIban } from '@ph/core/devis';
import { ErreurMetier } from '@ph/core/erreurs';
import type {
  entreeImageFacturation,
  entreeParametresFacturation,
  entreeRegimeTva,
} from '@ph/core/schemas';
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
    const images = {
      tamponChemin: avant.get('tamponChemin') as string | undefined,
      logoChemin: avant.get('logoChemin') as string | undefined,
    };
    const banque =
      iban === undefined
        ? {
            ibanChiffre: avant.get('ibanChiffre') as string | undefined,
            ibanFin: avant.get('ibanFin') as string | undefined,
          }
        : iban === ''
          ? {}
          : { ibanChiffre: chiffrer(normaliserIban(iban), s.cleIban!), ibanFin: finIban(iban) };
    const propre = JSON.parse(JSON.stringify({ ...reste, ...banque, ...images })) as Record<
      string,
      unknown
    >;
    t.set(ref, { ...propre, schemaVersion: 1, updatedAt: Timestamp.fromMillis(s.horloge()) });
  });
}

/**
 * Régime de TVA changé depuis la feuille du devis : seul `franchiseTva` est écrit. Les paramètres
 * doivent exister (les autres mentions viennent de là).
 */
export async function changerRegimeTva(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: z.output<typeof entreeRegimeTva>,
): Promise<void> {
  const ref = s.db.doc(chemins.parametresFacturation(ctx.artisanId));
  await s.db.runTransaction(async (t) => {
    await exiger(s, t, ctx, 'factures.emettre');
    if (!(await t.get(ref)).exists)
      throw new ErreurMetier('PRECONDITION', 'Complétez d’abord vos paramètres de facturation.');
    t.update(ref, { franchiseTva: e.franchiseTva, updatedAt: Timestamp.fromMillis(s.horloge()) });
  });
}

const IMAGES = {
  tampon: { champ: 'tamponChemin', chemin: fichiers.tampon },
  logo: { champ: 'logoChemin', chemin: fichiers.logo },
} as const;

/**
 * Cachet ou logo des devis et factures (`factures.emettre`) : image PNG ou JPEG de 2 Mo déjà
 * déposée dans Storage (`artisans/{id}/tampon/` ou `/logo/`), vérifiée ici ; ou retrait. Les PDF
 * déjà produits ne changent pas.
 */
export async function enregistrerImageFacturation(
  s: ServicesDevis & { bucket: ReturnType<typeof bucketFichiers> },
  ctx: ContexteDevis,
  e: z.output<typeof entreeImageFacturation>,
): Promise<void> {
  const ref = s.db.doc(chemins.parametresFacturation(ctx.artisanId));
  const image = IMAGES[e.quoi];
  let chemin: string | undefined;
  if (e.action === 'enregistrer') {
    chemin = image.chemin(ctx.artisanId, e.nomFichier);
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
      [image.champ]: chemin ?? FieldValue.delete(),
      updatedAt: Timestamp.fromMillis(s.horloge()),
    });
  });
}
