import { ErreurMetier } from '@ph/core/erreurs';
import { creditsARembourser, leadDouteux, MOTIFS_CONTESTATION } from '@ph/core/leads';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { Notifier } from '../comptes/services';
import { lireBaremeActif } from '../matching/bareme';
import { auditerAdmin } from './audit';

/** Back-office › Appels d'offres › Contestations (ADMIN §2.5, maquette « Admin Appels d offres »). */

export interface ContestationAdmin {
  id: string;
  appelOffres: string;
  artisan: string;
  motif: string;
  details: string;
  moyen: string;
  prixHtCentimes: number;
  credits: number;
  /** Contestations de cet artisan, et acceptées sur la même demande. */
  parArtisan: number;
  memeDemande: number;
  creeLe: number;
}

export async function listerContestationsAdmin(db: Firestore): Promise<ContestationAdmin[]> {
  const col = db.collection(collections.remboursementsLeads);
  const r = await col.where('statut', '==', 'ouvert').orderBy('createdAt', 'asc').limit(50).get();
  return Promise.all(
    r.docs.map(async (c) => {
      const [ao, artisan, achat, parArtisan, memeDemande] = await Promise.all([
        db.doc(chemins.appelOffres(c.get('appelOffresId') as string)).get(),
        db.doc(chemins.artisan(c.get('artisanId') as string)).get(),
        db.doc(`${collections.achatsLeads}/${c.get('achatId') as string}`).get(),
        col.where('artisanId', '==', c.get('artisanId')).count().get(),
        col.where('demandeId', '==', c.get('demandeId')).count().get(),
      ]);
      const motif = c.get('motif') as keyof typeof MOTIFS_CONTESTATION;
      return {
        id: c.id,
        appelOffres: (ao.get('titre') as string | undefined) ?? c.get('appelOffresId'),
        artisan: (artisan.get('nomCommercial') as string | undefined) ?? c.get('artisanId'),
        motif: MOTIFS_CONTESTATION[motif] ?? motif,
        details: c.get('details') as string,
        moyen: achat.get('moyen') as string,
        prixHtCentimes: (achat.get('prixHtCentimes') as number | undefined) ?? 0,
        credits: (achat.get('credits') as number | undefined) ?? 0,
        parArtisan: parArtisan.data().count,
        memeDemande: memeDemande.data().count,
        creeLe: (c.get('createdAt') as Timestamp).toMillis(),
      };
    }),
  );
}

export interface ServicesContestation {
  db: Firestore;
  horloge: () => number;
  notifier: Notifier;
  /** Remboursement Stripe du paiement (clé d'idempotence = contestation) ; absent sans Stripe. */
  rembourserCarte?: (paymentIntentId: string, cle: string) => Promise<string>;
}

/**
 * `adminTraiterRemboursementLead` : crédits rendus, paiement remboursé sur la carte, ou refus ;
 * achat, déblocage, tâche et contestation mis à jour ensemble, avec l'audit.
 */
export async function deciderContestationAdmin(
  s: ServicesContestation,
  e: {
    acteurUid: string;
    id: string;
    decision: 'credits' | 'carte' | 'refuser';
    motif: string;
    peutCarte: boolean;
  },
): Promise<void> {
  const ref = s.db.doc(`${collections.remboursementsLeads}/${e.id}`);
  const c0 = await ref.get();
  if (!c0.exists) throw new ErreurMetier('INTROUVABLE');
  const refAchat = s.db.doc(`${collections.achatsLeads}/${c0.get('achatId') as string}`);
  let remboursementStripe: string | undefined;
  if (e.decision === 'carte') {
    if (!e.peutCarte) throw new ErreurMetier('PERMISSION_REFUSEE');
    const achat = await refAchat.get();
    const pi = achat.get('stripePaymentIntentId') as string | undefined;
    if (achat.get('moyen') !== 'carte' || !pi)
      throw new ErreurMetier('PRECONDITION', 'Ce déblocage n’a pas été payé par carte.');
    if (!s.rembourserCarte) throw new ErreurMetier('INDISPONIBLE');
    if (c0.get('statut') !== 'ouvert') throw new ErreurMetier('CONFLIT', 'Déjà traitée.');
    remboursementStripe = await s.rembourserCarte(pi, `contestation-${e.id}`);
  }
  const { bareme } = await lireBaremeActif(s.db);
  const t0 = Timestamp.fromMillis(s.horloge());
  const artisanId = c0.get('artisanId') as string;
  const refDemande = s.db.doc(chemins.demande(c0.get('demandeId') as string));
  const refPortefeuille = s.db.doc(chemins.portefeuille(artisanId));
  const refTache = s.db
    .collection(collections.filesModeration)
    .doc(`contestation-${c0.get('achatId') as string}`);
  await s.db.runTransaction(async (t) => {
    const [c, achat, demande, portefeuille, tache] = await Promise.all([
      t.get(ref),
      t.get(refAchat),
      t.get(refDemande),
      t.get(refPortefeuille),
      t.get(refTache),
    ]);
    if (c.get('statut') !== 'ouvert') throw new ErreurMetier('CONFLIT', 'Déjà traitée.');
    const accepte = e.decision !== 'refuser';
    t.update(ref, {
      statut: accepte ? 'accepte' : 'refuse',
      decisionPar: e.acteurUid,
      decisionLe: t0,
      motifDecision: e.motif,
      updatedAt: t0,
      ...(accepte ? { rembourseEn: e.decision } : {}),
    });
    if (tache.exists)
      t.update(refTache, {
        statut: 'traitee',
        resolution: e.motif,
        traiteePar: e.acteurUid,
        traiteeLe: t0,
      });
    let credits = 0;
    if (accepte) {
      t.update(refAchat, { statut: e.decision === 'carte' ? 'rembourse' : 'rembourse_credits' });
      t.update(s.db.doc(chemins.deblocage(c.get('appelOffresId') as string, artisanId)), {
        statut: 'rembourse',
      });
      const acceptees = ((demande.get('contestationsAcceptees') as number | undefined) ?? 0) + 1;
      t.update(refDemande, {
        contestationsAcceptees: acceptees,
        ...(leadDouteux(acceptees) ? { douteux: true } : {}),
      });
    }
    if (e.decision === 'credits') {
      credits = creditsARembourser(
        {
          moyen: achat.get('moyen') as string,
          credits: (achat.get('credits') as number | undefined) ?? 0,
          prixHtCentimes: (achat.get('prixHtCentimes') as number | undefined) ?? 0,
        },
        bareme.centimesParCredit,
      );
      const solde = ((portefeuille.get('soldeCredits') as number | undefined) ?? 0) + credits;
      if (credits > 0) {
        t.set(
          refPortefeuille,
          { schemaVersion: 1, soldeCredits: solde, updatedAt: t0 },
          { merge: true },
        );
        t.create(s.db.collection(chemins.mouvements(artisanId)).doc(), {
          schemaVersion: 1,
          type: 'remboursement',
          credits,
          soldeApres: solde,
          refId: achat.id,
          par: e.acteurUid,
          motif: e.motif,
          createdAt: t0,
        });
      }
    }
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminTraiterRemboursementLead',
        cible: ref.path,
        avant: { statut: 'ouvert' },
        apres: {
          decision: e.decision,
          ...(credits ? { credits } : {}),
          ...(remboursementStripe ? { remboursementStripe } : {}),
        },
        motif: e.motif,
      },
      s.horloge(),
      t,
    );
  });
  const proprietaire = (await s.db.doc(chemins.artisan(artisanId)).get()).get('proprietaireUid') as
    string | undefined;
  if (proprietaire)
    await s.notifier({
      modele: 'remboursement-lead',
      destinataire: { uid: proprietaire, artisanId },
      refObjet: ref.path,
      donnees: {
        message:
          e.decision === 'refuser'
            ? `Votre contestation n’a pas été acceptée : ${e.motif}`
            : e.decision === 'carte'
              ? 'Votre contestation est acceptée : le paiement est remboursé sur votre carte.'
              : 'Votre contestation est acceptée : les crédits ont été rendus à votre portefeuille.',
        lien: '/pro/demandes',
        lienInApp: '/pro/demandes',
        resumeInApp: e.decision === 'refuser' ? 'Contestation refusée' : 'Contestation acceptée',
      },
      titreInApp: 'Décision sur votre contestation',
    });
}
