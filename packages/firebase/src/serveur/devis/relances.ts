import {
  devisAExpirer,
  LIBELLES_TYPE_FACTURE,
  passeImpayee,
  relanceDevisDue,
  relanceFactureDue,
  relanceManuellePossible,
  type FactureARelancer,
  type TypeRelanceFacture,
} from '@ph/core/devis';
import { ErreurMetier } from '@ph/core/erreurs';
import { formatDate, formatEuros } from '@ph/core/format';
import type { entreeExpirerDevis, entreeRelancerFacture } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp, type DocumentReference, type DocumentSnapshot } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import { empreinteJeton, nouveauJeton, type Notifier } from '../comptes/services';
import { exiger, lireParametresTx, type ContexteDevis, type ServicesDevis } from './communs';

export interface ServicesRelances extends ServicesDevis {
  notifier: Notifier;
  /** Jeton du lien de téléchargement (tests : valeur fixe). */
  jeton?: () => string;
}

const JOUR_MS = 86_400_000;
const LOT = 400;
const GROUPE_DEVIS = 'devis';
const GROUPE_FACTURES = 'facturesClients';
/** Fenêtre lue chaque jour : de J−3 à J+20 autour de l'échéance (la dernière relance part à J+15). */
const FENETRE_FACTURES = { avant: 3, apres: 20 };

const date = (v: unknown) => (v instanceof Timestamp ? v.toDate() : undefined);
const artisanDe = (d: DocumentSnapshot) => d.ref.parent.parent!.id;
const euros = (c: number) => formatEuros(c, { decimales: 'toujours' });

function lireFacture(d: DocumentSnapshot): FactureARelancer {
  return {
    type: d.get('type') as string,
    statut: d.get('statut') as string,
    resteCentimes: d.get('resteCentimes') as number,
    echeanceLe: date(d.get('echeanceLe')),
    avoirId: d.get('avoirId') as string | undefined,
    relances: ((d.get('relances') as { le: Timestamp; type: string }[] | undefined) ?? []).map(
      (r) => ({ le: r.le.toDate(), type: r.type }),
    ),
  };
}

/**
 * Relance écrite dans la transaction (le document relu décide), puis email au client avec un lien
 * de téléchargement neuf : seule son empreinte est gardée, les liens précédents cessent de marcher.
 */
async function relancer(
  s: ServicesRelances,
  ref: DocumentReference,
  choisir: (f: FactureARelancer, maintenant: number) => TypeRelanceFacture | null,
): Promise<TypeRelanceFacture | null> {
  const maintenant = s.horloge();
  const jeton = (s.jeton ?? nouveauJeton)();
  const r = await s.db.runTransaction(async (t) => {
    const d = await t.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE');
    const f = lireFacture(d);
    const type = choisir(f, maintenant);
    const email = d.get('client.email') as string | undefined;
    if (!type || !email || !d.get('pdfPath')) return null;
    t.update(ref, {
      relances: [...f.relances, { le: new Date(maintenant), type }],
      jetonHash: empreinteJeton(jeton),
      ...(passeImpayee(f, maintenant) ? { statut: 'impayee' } : {}),
      updatedAt: Timestamp.fromMillis(maintenant),
    });
    return { type, d, f, email };
  });
  if (!r) return null;
  const artisanId = artisanDe(r.d);
  const p = await lireParametresTx(s, null, artisanId);
  const echeance = r.f.echeanceLe!;
  const taux = (r.d.get('penalites.tauxAnnuel') as number | undefined) ?? 0;
  await s.notifier({
    modele: 'facture-relance',
    destinataire: { email: r.email },
    refObjet: ref.path,
    variante: r.type === 'manuelle' ? `manuelle:${maintenant}` : r.type,
    donnees: {
      entreprise: p.raisonSociale,
      numero: r.d.get('numero'),
      objet: r.d.get('objet'),
      reste: euros(r.f.resteCentimes),
      echeance: formatDate(echeance, 'long'),
      echue: maintenant >= echeance.getTime(),
      dernier: r.type === 'j+15',
      penalites: `${String(taux).replace('.', ',')} %`,
      pro: r.d.get('typeClient') === 'pro',
    },
    secrets: { lien: `/api/facture-client/${artisanId}.${ref.id}.${jeton}` },
  });
  return r.type;
}

/**
 * Chaque matin : factures dont l'échéance est dans la fenêtre J−3 à J+20. Échéance passée avec un
 * reste dû → « impayée » ; relance J−3, J+1 ou J+15 au client si elle est due.
 */
export async function traiterFacturesEcheances(
  s: ServicesRelances,
): Promise<{ impayees: number; relances: number }> {
  const maintenant = s.horloge();
  const r = await s.db
    .collectionGroup(GROUPE_FACTURES)
    .where('statut', 'in', ['emise', 'partiellement_payee', 'impayee'])
    .where('echeanceLe', '>=', Timestamp.fromMillis(maintenant - FENETRE_FACTURES.apres * JOUR_MS))
    .where('echeanceLe', '<=', Timestamp.fromMillis(maintenant + FENETRE_FACTURES.avant * JOUR_MS))
    .limit(LOT)
    .get();
  let impayees = 0;
  let relances = 0;
  for (const d of r.docs) {
    const f = lireFacture(d);
    if (relanceFactureDue(f, maintenant) && (await relancer(s, d.ref, relanceFactureDue))) {
      relances++;
      if (passeImpayee(f, maintenant)) impayees++;
    } else if (passeImpayee(f, maintenant)) {
      await d.ref.update({ statut: 'impayee', updatedAt: Timestamp.fromMillis(maintenant) });
      impayees++;
    }
  }
  return { impayees, relances };
}

/** Bouton « Relancer » d'une facture en attente de paiement (une relance par jour au plus). */
export async function relancerFacture(
  s: ServicesRelances,
  ctx: ContexteDevis,
  e: z.output<typeof entreeRelancerFacture>,
): Promise<void> {
  await exiger(s, null, ctx, 'factures.emettre');
  const ref = s.db.doc(chemins.factureClient(ctx.artisanId, e.factureId));
  const d = await ref.get();
  if (!d.exists) throw new ErreurMetier('INTROUVABLE');
  if (!d.get('client.email'))
    throw new ErreurMetier('PRECONDITION', 'Ajoutez l’email du client pour le relancer.');
  const type = await relancer(s, ref, (f, m) =>
    relanceManuellePossible(f, m) ? 'manuelle' : null,
  );
  if (!type)
    throw new ErreurMetier(
      'PRECONDITION',
      'Cette facture ne peut pas être relancée (réglée, annulée ou déjà relancée aujourd’hui).',
    );
}

/**
 * « Envoyer par email » une facture, un acompte ou un avoir émis : PDF prêt, client avec email ;
 * lien de téléchargement neuf (les précédents cessent de marcher), date d'envoi gardée.
 */
export async function envoyerFactureEmail(
  s: ServicesRelances,
  ctx: ContexteDevis,
  e: z.output<typeof entreeRelancerFacture>,
): Promise<void> {
  const ref = s.db.doc(chemins.factureClient(ctx.artisanId, e.factureId));
  const maintenant = s.horloge();
  const jeton = (s.jeton ?? nouveauJeton)();
  const d = await s.db.runTransaction(async (t) => {
    await exiger(s, t, ctx, 'factures.emettre');
    const x = await t.get(ref);
    if (!x.exists) throw new ErreurMetier('INTROUVABLE');
    if (x.get('statut') === 'brouillon')
      throw new ErreurMetier('PRECONDITION', 'Émettez la facture avant de l’envoyer.');
    if (!x.get('client.email'))
      throw new ErreurMetier('PRECONDITION', 'Ajoutez l’email du client pour lui envoyer.');
    if (!x.get('pdfPath'))
      throw new ErreurMetier(
        'PRECONDITION',
        'Le PDF est en préparation : réessayez dans un instant.',
      );
    t.update(ref, {
      jetonHash: empreinteJeton(jeton),
      envoyeeLe: Timestamp.fromMillis(maintenant),
      updatedAt: Timestamp.fromMillis(maintenant),
    });
    return x;
  });
  const p = await lireParametresTx(s, null, ctx.artisanId);
  const type = d.get('type') as keyof typeof LIBELLES_TYPE_FACTURE;
  const echeance = date(d.get('echeanceLe'));
  await s.notifier({
    modele: 'facture-envoi',
    destinataire: { email: d.get('client.email') as string },
    refObjet: ref.path,
    variante: `envoi:${maintenant}`,
    donnees: {
      entreprise: p.raisonSociale,
      libelle: LIBELLES_TYPE_FACTURE[type] ?? 'Facture',
      numero: d.get('numero'),
      objet: d.get('objet') ?? '',
      montant: `${type === 'avoir' ? '− ' : ''}${euros(d.get('totaux.ttcCentimes') as number)} TTC`,
      echeance: type !== 'avoir' && echeance ? formatDate(echeance, 'long') : '',
    },
    secrets: { lien: `/api/facture-client/${ctx.artisanId}.${ref.id}.${jeton}` },
  });
}

/**
 * Chaque matin : devis envoyés dont la validité est passée → « expiré » ; devis envoyés il y a
 * 7 jours sans réponse → une relance du client.
 */
export async function traiterDevisEnvoyes(
  s: ServicesRelances,
): Promise<{ expires: number; relances: number }> {
  const maintenant = s.horloge();
  const groupe = s.db.collectionGroup(GROUPE_DEVIS).where('statut', '==', 'envoye');
  const [aExpirer, aRelancer] = await Promise.all([
    groupe.where('validiteLe', '<', Timestamp.fromMillis(maintenant)).limit(LOT).get(),
    groupe
      .where('envoiLe', '<=', Timestamp.fromMillis(maintenant - 7 * JOUR_MS))
      .limit(LOT)
      .get(),
  ]);
  let expires = 0;
  for (const d of aExpirer.docs) {
    if (!devisAExpirer({ statut: 'envoye', validiteLe: date(d.get('validiteLe')) }, maintenant))
      continue;
    await d.ref.update({ statut: 'expire', updatedAt: Timestamp.fromMillis(maintenant) });
    expires++;
  }
  let relances = 0;
  for (const d of aRelancer.docs) {
    const envoye = await s.db.runTransaction(async (t) => {
      const x = await t.get(d.ref);
      const due = relanceDevisDue(
        {
          statut: x.get('statut') as string,
          envoiLe: date(x.get('envoiLe')),
          validiteLe: date(x.get('validiteLe')),
          relanceLe: date(x.get('relanceLe')),
        },
        maintenant,
      );
      if (!due || !x.get('client.email')) return null;
      t.update(d.ref, { relanceLe: Timestamp.fromMillis(maintenant) });
      return x;
    });
    if (!envoye) continue;
    const p = await lireParametresTx(s, null, artisanDe(envoye));
    const validite = date(envoye.get('validiteLe'));
    await s.notifier({
      modele: 'relance-devis',
      destinataire: { email: envoye.get('client.email') as string },
      refObjet: envoye.ref.path,
      donnees: {
        entreprise: p.raisonSociale,
        numero: envoye.get('numero'),
        objet: envoye.get('objet'),
        montant: formatEuros(envoye.get('totaux.ttcCentimes') as number, {
          decimales: 'toujours',
          suffixe: 'TTC',
        }),
        envoye: formatDate(date(envoye.get('envoiLe'))!, 'long'),
        validite: validite ? formatDate(validite, 'long') : '',
      },
    });
    relances++;
  }
  return { expires, relances };
}

/** « Marquer expirés » : devis envoyés de la sélection passés à « expiré », sans attendre la nuit. */
export async function marquerDevisExpires(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: z.output<typeof entreeExpirerDevis>,
): Promise<{ faits: string[] }> {
  await exiger(s, null, ctx, 'devis.gerer');
  const faits: string[] = [];
  for (const id of e.ids) {
    const ref = s.db.doc(chemins.unDevis(ctx.artisanId, id));
    const ok = await s.db.runTransaction(async (t) => {
      const d = await t.get(ref);
      if (d.get('statut') !== 'envoye') return false;
      t.update(ref, { statut: 'expire', updatedAt: Timestamp.fromMillis(s.horloge()) });
      return true;
    });
    if (ok) faits.push(id);
  }
  return { faits };
}
