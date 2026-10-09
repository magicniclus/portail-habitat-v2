import { ErreurMetier } from '@ph/core/erreurs';
import { peut, type Membre } from '@ph/core/equipe';
import { tvaDe } from '@ph/core/facturation';
import {
  accesAppelOffres,
  choisirMoyen,
  debutMois,
  prixDeblocage,
  type AccesAppelOffres,
  type MoyenDeblocage,
} from '@ph/core/leads';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { tarificationLue } from './lecture';

/**
 * Déblocage d'un appel d'offres (MATCHING [8]) en une transaction : place libre, accès (fenêtre
 * Premium, D50), droit et plafond du membre, prix figé, débit des crédits, attribution acceptée
 * avec coordonnées. Dix artisans sur la dernière place : un seul réussit (PRO-06).
 */

export interface ServicesDeblocage {
  db: Firestore;
  horloge: () => number;
}

export type ResultatDeblocage =
  | { etat: 'debloque'; moyen: MoyenDeblocage; achatId: string }
  | { etat: 'deja_debloque' }
  | { etat: 'paiement_requis'; centimes: number; credits: number; soldeCredits: number };

const ms = (t: unknown) => (t as Timestamp).toMillis();

export async function debloquerAppelOffres(
  s: ServicesDeblocage,
  e: {
    appelOffresId: string;
    artisanId: string;
    uid: string;
    choix: 'auto' | 'carte';
    /** Paiement par carte déjà encaissé (webhook Stripe) : finalisation seulement. */
    paiementCarte?: { paymentIntentId?: string; sessionId: string; centimes: number };
    /** Demande invendue offerte par le moteur de conversion : aucun paiement. */
    offerte?: boolean;
  },
): Promise<ResultatDeblocage> {
  const maintenant = s.horloge();
  const refAo = s.db.doc(chemins.appelOffres(e.appelOffresId));
  const refDeblocage = s.db.doc(chemins.deblocage(e.appelOffresId, e.artisanId));
  const refPortefeuille = s.db.doc(chemins.portefeuille(e.artisanId));
  const refArtisan = s.db.doc(chemins.artisan(e.artisanId));
  const refMembre = s.db.doc(chemins.membre(e.artisanId, e.uid));
  const refAchat = s.db.collection(collections.achatsLeads).doc();

  return s.db.runTransaction(async (t) => {
    const [ao, deja, portefeuille, artisan, membre] = await Promise.all([
      t.get(refAo),
      t.get(refDeblocage),
      t.get(refPortefeuille),
      t.get(refArtisan),
      t.get(refMembre),
    ]);
    if (!ao.exists) throw new ErreurMetier('INTROUVABLE');
    if (deja.exists) return { etat: 'deja_debloque' as const };
    const m = membre.data() as Membre | undefined;
    if (!m || !peut(m, 'leads.debloquer')) throw new ErreurMetier('PERMISSION_REFUSEE');
    if (ao.get('statut') !== 'ouvert' || ao.get('nbDeblocages') >= ao.get('nbDeblocagesMax'))
      throw new ErreurMetier('CONFLIT', 'Complet : toutes les places ont été prises.');
    const premium = artisan.get('plan') === 'premium';
    const acces = accesAppelOffres(
      {
        acces: ao.get('acces') as AccesAppelOffres,
        fenetrePremiumMin: (ao.get('fenetrePremiumMin') as number | undefined) ?? 60,
        ouvertLe: ms(ao.get('ouvertLe')),
      },
      premium,
      maintenant,
    );
    if (acces !== 'ok')
      throw new ErreurMetier(
        'PRECONDITION',
        'Réservé aux artisans Premium pendant la première heure.',
      );
    const exigences = (ao.get('exigences') as string[] | undefined) ?? [];
    if (exigences.includes('rge') && artisan.get('rge.verifie') !== true)
      throw new ErreurMetier('PRECONDITION', 'Ce chantier demande un artisan RGE.');

    const prix = prixDeblocage(tarificationLue(ao.get('tarification')), {
      premium,
      maintenant: new Date(maintenant),
    });
    const solde = (portefeuille.get('soldeCredits') as number | undefined) ?? 0;
    const inclus = (portefeuille.get('creditsInclusRestants') as number | undefined) ?? 0;
    const choix = e.offerte
      ? ({ moyen: 'offerte_conversion' } as const)
      : e.paiementCarte
        ? ({ moyen: 'carte' } as const)
        : choisirMoyen(
            prix,
            { soldeCredits: solde, creditsInclusRestants: inclus },
            premium,
            e.choix,
          );
    if (choix.moyen === null)
      return {
        etat: 'paiement_requis' as const,
        centimes: prix.centimes,
        credits: prix.credits,
        soldeCredits: solde,
      };
    if (choix.moyen === 'carte' && !e.paiementCarte)
      return {
        etat: 'paiement_requis' as const,
        centimes: prix.centimes,
        credits: prix.credits,
        soldeCredits: solde,
      };

    // Plafond mensuel du collaborateur (COMPTES §4.6) : crédits dépensés ce mois-ci par ce membre.
    const plafond = membre.get('plafondCreditsMois') as number | undefined;
    const enCredits = choix.moyen === 'credits' || choix.moyen === 'inclus_premium';
    if (enCredits && plafond !== undefined && m.role === 'collaborateur') {
      const mois = await t.get(
        s.db
          .collection(chemins.mouvements(e.artisanId))
          .where('par', '==', e.uid)
          .where('createdAt', '>=', Timestamp.fromMillis(debutMois(maintenant))),
      );
      const depense = mois.docs.reduce((n, d) => n - Math.min(0, d.get('credits') as number), 0);
      if (depense + prix.credits > plafond)
        throw new ErreurMetier('PRECONDITION', 'Votre plafond de crédits du mois est atteint.');
    }

    const horodatage = Timestamp.fromMillis(maintenant);
    // Carte : montant réellement encaissé (fixé au Checkout), pas un prix recalculé après coup.
    const carte = choix.moyen === 'carte' ? (e.paiementCarte?.centimes ?? prix.centimes) : 0;
    const nouveauSolde = choix.moyen === 'credits' ? solde - prix.credits : solde;
    const nouveauxInclus = choix.moyen === 'inclus_premium' ? inclus - prix.credits : inclus;
    t.create(refAchat, {
      schemaVersion: 1,
      artisanId: e.artisanId,
      appelOffreId: e.appelOffresId,
      demandeId: ao.get('demandeId') as string,
      moyen: choix.moyen,
      prixHtCentimes: carte,
      tvaCentimes: tvaDe(carte),
      credits: enCredits ? prix.credits : 0,
      ...(e.paiementCarte?.paymentIntentId
        ? { stripePaymentIntentId: e.paiementCarte.paymentIntentId }
        : {}),
      statut: 'paye',
      par: e.uid,
      createdAt: horodatage,
    });
    t.create(refDeblocage, {
      schemaVersion: 1,
      achatId: refAchat.id,
      moyen: choix.moyen,
      montantCentimes: carte,
      credits: enCredits ? prix.credits : 0,
      debloqueLe: horodatage,
      statut: 'actif',
    });
    const nb = (ao.get('nbDeblocages') as number) + 1;
    t.update(refAo, {
      nbDeblocages: nb,
      ...(nb >= (ao.get('nbDeblocagesMax') as number)
        ? { statut: 'complet', completLe: horodatage }
        : {}),
      updatedAt: horodatage,
    });
    if (enCredits) {
      t.set(
        refPortefeuille,
        {
          schemaVersion: 1,
          soldeCredits: nouveauSolde,
          creditsInclusRestants: nouveauxInclus,
          creditsInclusMois: (portefeuille.get('creditsInclusMois') as number | undefined) ?? 0,
          updatedAt: horodatage,
        },
        { merge: true },
      );
      t.create(s.db.collection(chemins.mouvements(e.artisanId)).doc(), {
        schemaVersion: 1,
        type: 'debit_lead',
        credits: -prix.credits,
        soldeApres: nouveauSolde,
        refId: refAchat.id,
        par: e.uid,
        ...(choix.moyen === 'inclus_premium' ? { motif: 'crédits inclus Premium' } : {}),
        createdAt: horodatage,
      });
    }
    t.set(s.db.doc(chemins.attribution(ao.get('demandeId') as string, e.artisanId)), {
      schemaVersion: 1,
      artisanId: e.artisanId,
      demandeId: ao.get('demandeId') as string,
      assigneA: e.uid,
      statut: 'acceptee',
      exclusive: false,
      proposeeLe: horodatage,
      reponduLe: horodatage,
      coordonneesDebloquees: true,
      scoreMatching: 0,
      appelOffresId: e.appelOffresId,
    });
    t.update(refArtisan, { derniereAttributionLe: horodatage });
    return { etat: 'debloque' as const, moyen: choix.moyen, achatId: refAchat.id };
  });
}
