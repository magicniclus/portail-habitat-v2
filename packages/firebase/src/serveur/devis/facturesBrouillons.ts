import { ErreurMetier } from '@ph/core/erreurs';
import { entreeBrouillonFacture } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { exiger, lireParametresTx, type ContexteDevis, type ServicesDevis } from './communs';
import { contenuFacture } from './factures';

type Cible = { factureId: string };

/**
 * « Enregistrer le brouillon » d'une facture (`factures.emettre`) : aucun numéro tant qu'elle
 * n'est pas émise (la suite F-aaaa-nnnn reste sans trou). Modifiable jusqu'à l'émission.
 */
export async function enregistrerBrouillonFacture(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: z.output<typeof entreeBrouillonFacture>,
): Promise<{ factureId: string }> {
  await exiger(s, null, ctx, 'factures.emettre');
  const p = await lireParametresTx(s, null, ctx.artisanId);
  const col = s.db.collection(chemins.facturesClients(ctx.artisanId));
  const ref = e.factureId ? col.doc(e.factureId) : col.doc();
  const maintenant = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (t) => {
    const avant = e.factureId ? await t.get(ref) : null;
    if (avant && !avant.exists) throw new ErreurMetier('INTROUVABLE');
    if (avant && avant.get('statut') !== 'brouillon')
      throw new ErreurMetier(
        'CONFLIT',
        'Une facture émise ne se modifie plus : la correction passe par un avoir.',
      );
    t.set(ref, {
      schemaVersion: 1,
      statut: 'brouillon',
      ...contenuFacture(e, p).champs,
      creePar: avant ? (avant.get('creePar') as string) : ctx.uid,
      createdAt: avant ? avant.get('createdAt') : maintenant,
      updatedAt: maintenant,
    });
  });
  return { factureId: ref.id };
}

/** « Supprimer » : brouillon seulement. Une facture numérotée ne se supprime jamais (avoir). */
export async function supprimerFacture(s: ServicesDevis, ctx: ContexteDevis, e: Cible) {
  const ref = s.db.doc(chemins.factureClient(ctx.artisanId, e.factureId));
  await s.db.runTransaction(async (t) => {
    await exiger(s, t, ctx, 'factures.emettre');
    const d = await t.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    if (d.get('statut') !== 'brouillon')
      throw new ErreurMetier(
        'CONFLIT',
        'Une facture émise ne se supprime pas : annulez-la, un avoir sera créé.',
      );
    t.delete(ref);
  });
}

/** « Dupliquer la facture » : un brouillon avec le même client, les mêmes lignes et options. */
export async function dupliquerFacture(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: Cible,
): Promise<{ factureId: string }> {
  await exiger(s, null, ctx, 'factures.emettre');
  const d = await s.db.doc(chemins.factureClient(ctx.artisanId, e.factureId)).get();
  if (!d.exists) throw new ErreurMetier('INTROUVABLE');
  if (d.get('type') !== 'facture')
    throw new ErreurMetier(
      'PRECONDITION',
      'Seule une facture se duplique (pas un avoir ni un acompte).',
    );
  const x = d.data()!;
  const saisie = entreeBrouillonFacture.parse({
    client: x.client,
    typeClient: x.typeClient,
    ...(x.sirenClient ? { sirenClient: x.sirenClient } : {}),
    objet: x.objet ?? '',
    lignes: x.lignes,
    remisePct: x.remisePct ?? 0,
    ...Object.fromEntries(
      (['modeSaisie', 'tvaIntraClient', 'champLibre', 'clientId', 'livraison'] as const).flatMap(
        (k) => (x[k] === undefined ? [] : [[k, x[k]]]),
      ),
    ),
  });
  return enregistrerBrouillonFacture(s, ctx, saisie);
}
