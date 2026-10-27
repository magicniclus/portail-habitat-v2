import { ErreurMetier } from '@ph/core/erreurs';
import { formatDate, formatEuros } from '@ph/core/format';
import { entreeEnregistrerDevis, type entreeDevisCible } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import type { Notifier } from '../comptes/services';
import { exiger, lireParametresTx, type ContexteDevis, type ServicesDevis } from './communs';
import { enregistrerDevis } from './devis';

const JOUR_MS = 86_400_000;
type Cible = z.output<typeof entreeDevisCible>;
const jourIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : undefined);

/** Champs repris par « Dupliquer » (contenu et présentation, jamais le statut ni l'envoi). */
const REPRIS = [
  'client',
  'typeClient',
  'sirenClient',
  'horsEtablissement',
  'objet',
  'descriptionHtml',
  'lignes',
  'remisePct',
  'acomptePct',
  'dureeEstimee',
  'fraisDeplacement',
  'devisGratuit',
  'notes',
  'signatureElectronique',
  'tampon',
  'modeSaisie',
  'adresseChantier',
  'livraison',
  'tvaIntraClient',
  'intitule',
  'conditionsAcceptation',
  'champSignature',
  'champLibre',
  'clientId',
] as const;

/**
 * « Dupliquer le devis » (tout statut) : un nouveau brouillon numéroté, mêmes client, lignes et
 * options ; validité repartie d'aujourd'hui, début des travaux gardé s'il est à venir.
 */
export async function dupliquerDevis(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: Cible,
): Promise<{ devisId: string; numero: string }> {
  await exiger(s, null, ctx, 'devis.gerer');
  const d = await s.db.doc(chemins.unDevis(ctx.artisanId, e.devisId)).get();
  if (!d.exists) throw new ErreurMetier('INTROUVABLE');
  const p = await lireParametresTx(s, null, ctx.artisanId);
  const maintenant = s.horloge();
  const debut = ms(d.get('debutTravauxLe'));
  const entree = entreeEnregistrerDevis.parse({
    ...Object.fromEntries(REPRIS.flatMap((k) => (d.get(k) === undefined ? [] : [[k, d.get(k)]]))),
    validiteLe: jourIso(
      maintenant + ((p.validiteDevisJours as number | undefined) ?? 30) * JOUR_MS,
    ),
    ...(debut && debut >= maintenant - JOUR_MS ? { debutTravauxLe: jourIso(debut) } : {}),
  });
  const r = await enregistrerDevis(s, ctx, entree);
  return { devisId: r.devisId, numero: r.numero };
}

/** « Supprimer le devis » : brouillon seulement (un devis envoyé reste, il s'archive). */
export async function supprimerDevis(s: ServicesDevis, ctx: ContexteDevis, e: Cible) {
  const ref = s.db.doc(chemins.unDevis(ctx.artisanId, e.devisId));
  await s.db.runTransaction(async (t) => {
    await exiger(s, t, ctx, 'devis.gerer');
    const d = await t.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    if (d.get('statut') !== 'brouillon')
      throw new ErreurMetier(
        'CONFLIT',
        'Un devis envoyé ne se supprime pas : archivez-le pour le retirer de la liste.',
      );
    t.delete(ref);
  });
}

/** « Relancer par email » : devis envoyé, client avec email, une relance par jour au plus. */
export async function relancerDevis(
  s: ServicesDevis & { notifier: Notifier },
  ctx: ContexteDevis,
  e: Cible,
): Promise<void> {
  const ref = s.db.doc(chemins.unDevis(ctx.artisanId, e.devisId));
  const maintenant = s.horloge();
  const d = await s.db.runTransaction(async (t) => {
    await exiger(s, t, ctx, 'devis.gerer');
    const x = await t.get(ref);
    if (!x.exists) throw new ErreurMetier('INTROUVABLE');
    if (x.get('statut') !== 'envoye' || !x.get('envoiLe'))
      throw new ErreurMetier(
        'PRECONDITION',
        'Seul un devis envoyé au client, sans réponse, se relance.',
      );
    if (!x.get('client.email'))
      throw new ErreurMetier('PRECONDITION', 'Ajoutez l’email du client pour le relancer.');
    const derniere = ms(x.get('relanceLe'));
    if (derniere && maintenant - derniere < JOUR_MS)
      throw new ErreurMetier('PRECONDITION', 'Ce devis a déjà été relancé aujourd’hui.');
    t.update(ref, { relanceLe: Timestamp.fromMillis(maintenant) });
    return x;
  });
  const p = await lireParametresTx(s, null, ctx.artisanId);
  const validite = ms(d.get('validiteLe'));
  await s.notifier({
    modele: 'relance-devis',
    destinataire: { email: d.get('client.email') as string },
    refObjet: ref.path,
    donnees: {
      entreprise: p.raisonSociale,
      numero: d.get('numero'),
      objet: d.get('objet'),
      montant: formatEuros(d.get('totaux.ttcCentimes') as number, {
        decimales: 'toujours',
        suffixe: 'TTC',
      }),
      envoye: formatDate(ms(d.get('envoiLe')) ?? maintenant, 'long'),
      validite: validite ? formatDate(validite, 'long') : '',
    },
  });
}

/**
 * « Envoyer au client » (menu ⋮) d'un devis validé : email avec un lien de téléchargement neuf
 * (le PDF ne change pas, DEV-05). Renvoyable ; la relance J+7 part de la première date d'envoi.
 */
export async function envoyerDevisAuClient(
  s: ServicesDevis & {
    envoyerEmail: (artisanId: string, devisId: string) => Promise<{ jetonHash: string }>;
  },
  ctx: ContexteDevis,
  e: Cible,
): Promise<void> {
  const ref = s.db.doc(chemins.unDevis(ctx.artisanId, e.devisId));
  const d = await s.db.runTransaction(async (t) => {
    await exiger(s, t, ctx, 'devis.gerer');
    const x = await t.get(ref);
    if (!x.exists) throw new ErreurMetier('INTROUVABLE');
    if (x.get('statut') === 'brouillon')
      throw new ErreurMetier('PRECONDITION', 'Validez le devis avant de l’envoyer au client.');
    if (!x.get('client.email'))
      throw new ErreurMetier(
        'PRECONDITION',
        'Ajoutez l’email du client pour lui envoyer le devis.',
      );
    if (!x.get('pdfPath'))
      throw new ErreurMetier(
        'PRECONDITION',
        'Le PDF est en préparation : réessayez dans un instant.',
      );
    return x;
  });
  const { jetonHash } = await s.envoyerEmail(ctx.artisanId, e.devisId);
  await ref.update({
    jetonHash,
    ...(d.get('envoiLe') ? {} : { envoiLe: Timestamp.fromMillis(s.horloge()) }),
    updatedAt: Timestamp.fromMillis(s.horloge()),
  });
}
