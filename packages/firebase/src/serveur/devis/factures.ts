import {
  calculerTotaux,
  numeroDocument,
  verifierMentionsFacture,
  type LigneDevis,
} from '@ph/core/devis';
import { ErreurMetier } from '@ph/core/erreurs';
import type { entreeAvoir, entreeFacturerDevis, entreePaiementFacture } from '@ph/core/schemas';
import type { z } from '@ph/core/zod';
import { Timestamp, type DocumentSnapshot } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { chemins } from '../../chemins';
import {
  exiger,
  jourEnDate,
  lireParametresTx,
  reserverNumero,
  type ContexteDevis,
  avecReprise,
  type ServicesDevis,
} from './communs';

const JOUR_MS = 86_400_000;
/** Indemnité forfaitaire de recouvrement (art. L441-10 C. com.), en centimes. */
const INDEMNITE = 4000;

/** Identifiant stable par clé d'idempotence : un double clic ne crée qu'une facture. */
const idFacture = (cle: string, devisId: string) =>
  createHash('sha256').update(`${devisId}:${cle}`).digest('hex').slice(0, 24);

/** Lignes d'acompte : une par taux de TVA du devis, au prorata de chaque base HT. */
function lignesAcompte(d: DocumentSnapshot): LigneDevis[] {
  const pct = d.get('acomptePct') as number;
  const lignes = d.get('lignes') as LigneDevis[];
  const remise = d.get('remisePct') as number;
  const parTaux = new Map<LigneDevis['tva'], number>();
  for (const l of lignes)
    parTaux.set(l.tva, (parTaux.get(l.tva) ?? 0) + Math.round(l.quantite * l.puHtCentimes));
  return [...parTaux].map(([tva, ht]) => ({
    designation: `Acompte de ${pct} % sur le devis ${d.get('numero') as string}`,
    quantite: 1,
    unite: 'forfait',
    puHtCentimes: Math.round((Math.round(ht * (1 - remise / 100)) * pct) / 100),
    tva,
  }));
}

/**
 * Facture (ou facture d'acompte) émise depuis un devis (`factures.emettre`) : numéro F-aaaa-nnnn
 * pris dans la même transaction que la création, donc sans trou ni doublon (DEV-06). Une facture
 * émise ne se modifie plus : toute correction passe par un avoir.
 */
export async function facturerDevis(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: z.output<typeof entreeFacturerDevis>,
): Promise<{ factureId: string; numero: string }> {
  const refDevis = s.db.doc(chemins.unDevis(ctx.artisanId, e.devisId));
  const ref = s.db.doc(
    chemins.factureClient(ctx.artisanId, idFacture(e.cleIdempotence, e.devisId)),
  );
  await exiger(s, null, ctx, 'factures.emettre');
  const [p, acomptes] = await Promise.all([
    lireParametresTx(s, null, ctx.artisanId),
    e.type === 'facture'
      ? s.db
          .collection(chemins.facturesClients(ctx.artisanId))
          .where('devisId', '==', e.devisId)
          .where('type', '==', 'acompte')
          .get()
      : null,
  ]);
  return avecReprise(() =>
    s.db.runTransaction(
      async (t) => {
        const [d, deja] = await Promise.all([t.get(refDevis), t.get(ref)]);
        if (deja.exists) return { factureId: ref.id, numero: deja.get('numero') as string };
        if (!d.exists) throw new ErreurMetier('INTROUVABLE');
        const statut = d.get('statut') as string;
        if (e.type === 'facture' && statut !== 'accepte')
          throw new ErreurMetier('PRECONDITION', 'Seul un devis accepté se transforme en facture.');
        if (e.type === 'acompte' && !['envoye', 'accepte'].includes(statut))
          throw new ErreurMetier('PRECONDITION', 'Envoyez le devis avant de facturer un acompte.');
        if (e.type === 'acompte' && !((d.get('acomptePct') as number) > 0))
          throw new ErreurMetier('PRECONDITION', 'Ce devis ne prévoit pas d’acompte.');
        if (e.type === 'facture' && d.get('factureId'))
          throw new ErreurMetier('CONFLIT', 'Ce devis a déjà sa facture.');
        const numero = await reserverNumero(s, t, ctx.artisanId, 'factures');

        const lignes = e.type === 'acompte' ? lignesAcompte(d) : (d.get('lignes') as LigneDevis[]);
        const remisePct = e.type === 'acompte' ? 0 : (d.get('remisePct') as number);
        const { margeHtCentimes: _m, ...totaux } = calculerTotaux(
          { lignes, remisePct, acomptePct: 0 },
          { franchiseTva: p.franchiseTva },
        );
        const deduits = (acomptes?.docs ?? [])
          .filter((a) => !a.get('avoirId'))
          .map((a) => ({
            factureId: a.id,
            numero: a.get('numero') as string,
            ttcCentimes: a.get('totaux.ttcCentimes') as number,
          }));
        const maintenant = s.horloge();
        const client = d.get('client') as { nom: string; adresse: string };
        // Adresse du chantier saisie dans les options du devis, sinon celle du client.
        const lieuExecution = (d.get('adresseChantier') as string | undefined) || client.adresse;
        const facture = {
          typeClient: d.get('typeClient') as 'particulier' | 'pro',
          sirenClient: d.get('sirenClient') as string | undefined,
          client,
          lieuExecution,
          emiseLe: new Date(maintenant),
          datePrestationLe: new Date(maintenant),
          echeanceLe: new Date(maintenant + (p.delaiPaiementJours as number) * JOUR_MS),
          lignes,
        };
        const mentions = verifierMentionsFacture(facture, p);
        if (!mentions.ok)
          throw new ErreurMetier(
            'PRECONDITION',
            `Mentions obligatoires manquantes : ${mentions.liste
              .filter((x) => !x.ok)
              .map((x) => x.libelle)
              .join(', ')}.`,
          );
        const num = numeroDocument('facture', numero.annee, numero.n);
        const ttc = totaux.ttcCentimes;
        const dejaFacture = deduits.reduce((a, x) => a + x.ttcCentimes, 0);
        numero.ecrire();
        t.set(ref, {
          schemaVersion: 1,
          numero: num,
          devisId: e.devisId,
          devisNumero: d.get('numero'),
          type: e.type,
          statut: 'emise',
          client,
          typeClient: facture.typeClient,
          ...(facture.sirenClient ? { sirenClient: facture.sirenClient } : {}),
          lieuExecution,
          // Options de l'éditeur A4 reprises du devis (présentation du PDF).
          ...Object.fromEntries(
            (['modeSaisie', 'tvaIntraClient', 'champLibre'] as const)
              .map((k) => [k, d.get(k) as unknown])
              .filter(([, v]) => v !== undefined),
          ),
          objet: d.get('objet'),
          lignes,
          remisePct,
          totaux,
          ...(deduits.length ? { acomptesDeduits: deduits } : {}),
          datePrestationLe: Timestamp.fromMillis(maintenant),
          echeanceLe: Timestamp.fromDate(facture.echeanceLe),
          paiements: [],
          resteCentimes: Math.max(0, ttc - dejaFacture),
          penalites: {
            tauxAnnuel: (p.tauxPenalitesAnnuel as number | undefined) ?? 12.15,
            indemnite: INDEMNITE,
          },
          relances: [],
          emiseLe: Timestamp.fromMillis(maintenant),
          creePar: ctx.uid,
          createdAt: Timestamp.fromMillis(maintenant),
          updatedAt: Timestamp.fromMillis(maintenant),
        });
        if (e.type === 'facture')
          t.update(refDevis, { factureId: ref.id, updatedAt: Timestamp.fromMillis(maintenant) });
        return { factureId: ref.id, numero: num };
      },
      { maxAttempts: 30 },
    ),
  );
}

/** Paiement reçu (virement, chèque, espèces, carte) : reste dû et statut recalculés. */
export async function enregistrerPaiement(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: z.output<typeof entreePaiementFacture>,
): Promise<{ resteCentimes: number; statut: string }> {
  const ref = s.db.doc(chemins.factureClient(ctx.artisanId, e.factureId));
  return s.db.runTransaction(async (t) => {
    await exiger(s, t, ctx, 'factures.emettre');
    const f = await t.get(ref);
    if (!f.exists) throw new ErreurMetier('INTROUVABLE');
    if (f.get('type') === 'avoir' || f.get('avoirId'))
      throw new ErreurMetier('PRECONDITION', 'Cette facture a été annulée par un avoir.');
    const reste = f.get('resteCentimes') as number;
    if (e.montantCentimes > reste)
      throw new ErreurMetier('ENTREE_INVALIDE', 'Le montant dépasse le reste à payer.');
    const nouveauReste = reste - e.montantCentimes;
    const statut = nouveauReste === 0 ? 'payee' : 'partiellement_payee';
    const paiement = {
      montantCentimes: e.montantCentimes,
      moyen: e.moyen,
      le: jourEnDate(e.le)!,
      ...(e.ref ? { ref: e.ref } : {}),
    };
    t.update(ref, {
      paiements: [...(f.get('paiements') as unknown[]), paiement],
      resteCentimes: nouveauReste,
      statut,
      updatedAt: Timestamp.fromMillis(s.horloge()),
    });
    return { resteCentimes: nouveauReste, statut };
  });
}

/**
 * Avoir : annule une facture émise (seule correction possible). Nouveau numéro F- de la même
 * suite, mêmes lignes ; la facture d'origine reste intacte, liée à son avoir.
 */
export async function creerAvoir(
  s: ServicesDevis,
  ctx: ContexteDevis,
  e: z.output<typeof entreeAvoir>,
): Promise<{ factureId: string; numero: string }> {
  const refOrigine = s.db.doc(chemins.factureClient(ctx.artisanId, e.factureId));
  const ref = s.db.doc(
    chemins.factureClient(ctx.artisanId, idFacture(e.cleIdempotence, e.factureId)),
  );
  await exiger(s, null, ctx, 'factures.emettre');
  return avecReprise(() =>
    s.db.runTransaction(
      async (t) => {
        const [o, deja] = await Promise.all([t.get(refOrigine), t.get(ref)]);
        if (deja.exists) return { factureId: ref.id, numero: deja.get('numero') as string };
        if (!o.exists) throw new ErreurMetier('INTROUVABLE');
        if (o.get('type') === 'avoir')
          throw new ErreurMetier('PRECONDITION', 'Un avoir ne s’annule pas.');
        if (o.get('avoirId')) throw new ErreurMetier('CONFLIT', 'Cette facture a déjà son avoir.');
        const numero = await reserverNumero(s, t, ctx.artisanId, 'factures');
        const num = numeroDocument('facture', numero.annee, numero.n);
        const maintenant = Timestamp.fromMillis(s.horloge());
        const champs = [
          'client',
          'typeClient',
          'sirenClient',
          'lieuExecution',
          'objet',
          'lignes',
          'remisePct',
          'totaux',
          'devisId',
          'devisNumero',
          'penalites',
        ] as const;
        const copie = Object.fromEntries(
          champs.map((c) => [c, o.get(c)]).filter(([, v]) => v !== undefined),
        );
        numero.ecrire();
        t.set(ref, {
          schemaVersion: 1,
          ...copie,
          numero: num,
          type: 'avoir',
          statut: 'emise',
          factureOrigineId: o.id,
          motifAvoir: e.motif,
          datePrestationLe: o.get('datePrestationLe'),
          paiements: [],
          resteCentimes: 0,
          relances: [],
          emiseLe: maintenant,
          creePar: ctx.uid,
          createdAt: maintenant,
          updatedAt: maintenant,
        });
        t.update(refOrigine, { avoirId: ref.id, updatedAt: maintenant });
        return { factureId: ref.id, numero: num };
      },
      { maxAttempts: 30 },
    ),
  );
}
