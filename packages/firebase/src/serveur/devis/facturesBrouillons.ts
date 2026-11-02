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
    // Brouillon issu d'un devis : le lien est gardé jusqu'à l'émission (acomptes, devis facturé).
    const lien = avant?.get('devisId')
      ? { devisId: avant.get('devisId') as string, devisNumero: avant.get('devisNumero') as string }
      : {};
    t.set(ref, {
      schemaVersion: 1,
      statut: 'brouillon',
      ...contenuFacture(e, p).champs,
      ...lien,
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

/**
 * « Transformer en facture » : brouillon pré-rempli depuis un devis accepté (client, lignes,
 * remise, options), à relire et modifier dans l'éditeur avant d'émettre. Aucun numéro tant qu'il
 * n'est pas émis ; à l'émission, les acomptes sont déduits et le devis marqué facturé. Un second
 * clic rouvre le même brouillon.
 */
export async function preparerFactureDevis(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: { devisId: string },
): Promise<{ factureId: string }> {
  await exiger(s, null, ctx, 'factures.emettre');
  const p = await lireParametresTx(s, null, ctx.artisanId);
  const refDevis = s.db.doc(chemins.unDevis(ctx.artisanId, e.devisId));
  const col = s.db.collection(chemins.facturesClients(ctx.artisanId));
  return s.db.runTransaction(async (t) => {
    const d = await t.get(refDevis);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    if (d.get('factureId')) throw new ErreurMetier('CONFLIT', 'Ce devis a déjà sa facture.');
    if (d.get('statut') !== 'accepte')
      throw new ErreurMetier('PRECONDITION', 'Seul un devis accepté se transforme en facture.');
    const existant = d.get('factureBrouillonId') as string | undefined;
    if (existant) {
      const b = await t.get(col.doc(existant));
      if (b.exists && b.get('statut') === 'brouillon') return { factureId: existant };
    }
    const x = d.data()!;
    const saisie = entreeBrouillonFacture.parse({
      client: x.client,
      typeClient: x.typeClient,
      ...(x.sirenClient ? { sirenClient: x.sirenClient } : {}),
      objet: x.objet ?? '',
      lignes: x.lignes,
      remisePct: x.remisePct ?? 0,
      // Date de prestation (mention obligatoire) : le jour de la transformation, modifiable.
      datePrestationLe: new Date(s.horloge()).toISOString().slice(0, 10),
      ...Object.fromEntries(
        (
          [
            'modeSaisie',
            'tvaIntraClient',
            'champLibre',
            'clientId',
            'adresseChantier',
            'livraison',
          ] as const
        ).flatMap((k) => (x[k] === undefined || x[k] === '' ? [] : [[k, x[k]]])),
      ),
    });
    const ref = col.doc();
    const maintenant = Timestamp.fromMillis(s.horloge());
    t.set(ref, {
      schemaVersion: 1,
      statut: 'brouillon',
      ...contenuFacture(saisie, p).champs,
      devisId: e.devisId,
      devisNumero: x.numero as string,
      creePar: ctx.uid,
      createdAt: maintenant,
      updatedAt: maintenant,
    });
    t.update(refDevis, { factureBrouillonId: ref.id, updatedAt: maintenant });
    return { factureId: ref.id };
  });
}
