import * as appelsOffres from './appelsOffres';
import * as artisans from './artisans';
import * as avis from './avis';
import * as comportement from './comportement';
import * as comptes from './comptes';
import * as conversion from './conversion';
import * as demandes from './demandes';
import * as facturation from './facturation';
import * as ia from './ia';
import * as parcours from './parcours';
import * as partenaires from './partenaires';
import * as referentiels from './referentiels';
import * as support from './support';

export * from './commun';
export * from './appelsOffres';
export * from './artisans';
export * from './avis';
export * from './comportement';
export * from './comptes';
export * from './conversion';
export * from './demandes';
export * from './facturation';
export * from './ia';
export * from './parcours';
export * from './partenaires';
export * from './referentiels';
export * from './support';
export * from './entreesComptes';
export * from './entreesNotifications';
export * from './entreesDemandes';

/**
 * Schéma de chaque collection (motif du chemin → schéma), liste de contrôle de DATABASE §16.
 * `{}` désigne un identifiant de document.
 */
export const SCHEMAS = {
  'users/{}': comptes.utilisateur,
  'users/{}/consentements/{}': comptes.consentement,
  'users/{}/notifications/{}': comptes.notification,
  'admins/{}': comptes.admin,
  'rolesAdmin/{}': comptes.roleAdmin,
  'invitations/{}': comptes.invitation,
  'revendications/{}': comptes.revendication,
  'demandesAcces/{}': comptes.demandeAcces,
  'sirenIndex/{}': comptes.sirenIndex,

  'artisans/{}': artisans.artisan,
  'artisans/{}/prive/facturation': artisans.facturationPrivee,
  'artisans/{}/membres/{}': artisans.membre,
  'artisans/{}/etablissements/{}': artisans.etablissement,
  'artisans/{}/documents/{}': artisans.documentArtisan,
  'artisans/{}/realisations/{}': artisans.realisation,
  'artisans/{}/disponibilites/{}': artisans.disponibilite,
  'artisans/{}/statsJour/{}': artisans.statsJour,
  'artisansPublic/{}': artisans.artisanPublic,
  'artisanScores/{}': artisans.artisanScore,
  'sanctions/{}': artisans.sanction,
  'notesInternes/{}': artisans.noteInterne,

  'demandes/{}': demandes.demande,
  'demandes/{}/attributions/{}': demandes.attribution,
  'demandes/{}/messages/{}': demandes.message,
  'dossiersDiag/{}': demandes.dossierDiag,
  'dossiersDiag/{}/attributions/{}': demandes.attribution,
  'matching/{}': demandes.traceMatching,
  'matchingConfig/actif': demandes.configMatching,
  'matchingConfig/actif/versions/{}': demandes.configMatching,

  'sourcesDemandes/{}': partenaires.sourceDemandes,
  'importsDemandes/{}': partenaires.importDemande,
  'preuvesConsentement/{}': partenaires.preuveConsentement,

  'appelsOffres/{}': appelsOffres.appelOffres,
  'appelsOffres/{}/deblocages/{}': appelsOffres.deblocage,
  'appelsOffres/{}/reponses/{}': appelsOffres.reponseAppelOffres,
  'appelsOffres/{}/historiquePrix/{}': appelsOffres.historiquePrix,
  'grillesTarifaires/{}': appelsOffres.grilleTarifaire,
  'achatsLeads/{}': appelsOffres.achatLead,
  'portefeuilles/{}': appelsOffres.portefeuille,
  'portefeuilles/{}/mouvements/{}': appelsOffres.mouvementCredits,
  'packsCredits/{}': appelsOffres.packCredits,
  'remboursementsLeads/{}': appelsOffres.remboursementLead,

  'avis/{}': avis.avis,
  'avis/{}/prive/auteur': avis.auteurAvis,
  'avis/{}/signalements/{}': avis.signalement,

  'abonnements/{}': facturation.abonnement,
  'factures/{}': facturation.facture,
  'paiements/{}': facturation.paiement,
  'codesPromo/{}': facturation.codePromo,
  'stripeEvents/{}': facturation.evenementStripe,

  'referentiel/prestations/items/{}': referentiels.prestationItem,
  'referentiel/prestations/prix/{}': referentiels.prestationPrix,
  'referentiel/diagnostics/items/{}': referentiels.diagnosticItem,
  'referentiel/diagnostics/prix/{}': referentiels.prestationPrix,
  'referentiel/metiers/items/{}': referentiels.metierOuLabel,
  'referentiel/labels/items/{}': referentiels.metierOuLabel,
  'referentiel/recherche/intentions/{}': referentiels.intentionRecherche,
  'referentiel/recherche/metiers/{}': referentiels.metierRecherche,
  'referentiel/recherche/synonymes/global': referentiels.synonymesRecherche,
  'communes/{}': referentiels.commune,
  'stats/public': referentiels.statsPublic,
  'config/app': referentiels.configApp,
  'config/flags': referentiels.configFlags,
  'config/flags/artisans/{}': referentiels.configFlags,
  'annonces/{}': referentiels.annonce,

  'contacts/{}': support.contact,
  'litiges/{}': support.litige,
  'emails/{}': support.envoi,
  'suppressions/{}': support.suppression,
  'evenements/{}': support.evenement,
  'auditLog/{}': support.entreeAudit,
  'rateLimits/{}': support.limiteDebit,
  'idempotence/{}': support.idempotence,
  'rgpdDemandes/{}': support.demandeRgpd,
  'filesModeration/{}': support.tacheModeration,
  'migrations/{}': support.migration,

  'prospects/{}': conversion.prospect,
  'cycleEtat/{}': conversion.cycleEtat,
  'cycleTraces/{}': conversion.traceCycle,
  'cycleStats/{}': conversion.statsCycle,
  'sequences/{}': conversion.sequence,
  'sequences/{}/versions/{}': conversion.sequence,
  'config/cycle': conversion.configCycle,

  'pagesSuivies/{}': comportement.pageSuivie,
  'comportementSessions/{}': comportement.sessionComportement,
  'comportementAgregats/{}': comportement.agregatComportement,
  'comportementAlertes/{}': comportement.alerteComportement,
  'abTests/{}': comportement.testAB,
  'config/comportement': comportement.configComportement,

  'iaContexte/{}': ia.contexteIa,
  'iaAnalyses/{}': ia.analyseIa,
  'iaRecommandations/{}': ia.recommandationIa,
  'iaQuotas/{}': ia.quotaIa,
  'iaRedactions/{}': ia.redactionIa,
  'config/ia': ia.configIa,

  'brouillons/{}': parcours.brouillon,
  'brouillonsOnboarding/{}': parcours.brouillonOnboarding,
  'simulations/{}': parcours.simulation,
  'cacheSirene/{}': parcours.cacheSirene,
} as const;

export type MotifCollection = keyof typeof SCHEMAS;
export * from './entreesSupport';
export * from './entreesAvis';
export * from './entreesEspace';
