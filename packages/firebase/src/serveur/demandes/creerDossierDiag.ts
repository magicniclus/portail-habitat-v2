import {
  analyser,
  lignesPubliques,
  referenceDossier,
  resumeDossier,
  type ReferentielDiagnostic,
  type StatutDiagnostic,
  type TexteDiagnostic,
} from '@ph/core/diagnostic';
import { expirationDemande } from '@ph/core/demandes';
import { ErreurMetier } from '@ph/core/erreurs';
import { dossierDiag, type EntreeDossierDiag } from '@ph/core/schemas';
import { chemins, collections } from '../../chemins';
import type { ServicesComptes } from '../comptes/services';
import { depot } from '../depot';
import {
  ecrireConsentements,
  lienDeSuivi,
  particulierDeLEnvoi,
  referenceUnique,
  type TraceEnvoi,
} from './commun';

export interface ServicesDiagnostic extends ServicesComptes {
  urlSite: string;
  versionLegale: string;
  /** Référentiel AVEC les prix : lu côté serveur uniquement (règle n° 3, DIA-06). */
  referentiel: ReferentielDiagnostic;
  textes: Readonly<Record<string, TexteDiagnostic>>;
  /**
   * Commune du parcours : nom, appartenance à la Presqu'île (mérule conseillée) et code postal, qui
   * remplace celui du navigateur ; « autre commune » n'en a pas (code postal saisi).
   */
  commune: (slug: string) => { nom: string; presquile: boolean; codePostal?: string } | null;
  alea?: () => number;
}

/** Ce que l'écran de résultat affiche : budget et prix par diagnostic, calculés ici (DIA-06). */
export interface DossierCree {
  dossierId: string;
  reference: string;
  resultat: {
    diagId: string;
    nom: string;
    statut: StatutDiagnostic;
    raison: string;
    prixMinCentimes: number;
    prixMaxCentimes: number;
  }[];
  estimation: { minCentimes: number; maxCentimes: number; remisePack: boolean };
  aRealiser: number;
  reutilises: number;
  communeNom: string;
}

/**
 * `creerDossierDiag` (COMPTES §2 et §6.1) : dossier réglementaire et budget **recalculés avec les
 * prix privés**, compte particulier créé ou rattaché sans session, dossier et consentements en
 * transaction, puis email de confirmation via `notifier()`.
 */
export async function creerDossierDiag(
  s: ServicesDiagnostic,
  e: EntreeDossierDiag,
  ctx: { uid?: string | null } & TraceEnvoi = {},
): Promise<DossierCree> {
  const maintenant = new Date(s.horloge());
  const commune = s.commune(e.bien.communeSlug);
  if (!commune) throw new ErreurMetier('ENTREE_INVALIDE', 'Cette commune n’est pas desservie.');
  const b = e.bien;
  const analyse = analyser(
    {
      motif: b.motif,
      type: b.type,
      periode: b.periode,
      gaz: b.gaz,
      elec: b.elec,
      assainissement: b.assainissement,
      classe: b.classe,
      presquile: commune.presquile,
    },
    e.existants,
    s.referentiel,
  );
  const publiques = lignesPubliques(analyse.resultat, s.textes, e.existants);
  const resultat = analyse.resultat.map((l, i) => ({
    ...publiques[i]!,
    prixMinCentimes: l.prixMinCentimes,
    prixMaxCentimes: l.prixMaxCentimes,
  }));
  const { aRealiser, reutilises } = resumeDossier(analyse.resultat);

  const uid = await particulierDeLEnvoi(s, ctx.uid, e.contact.email);
  const dossiers = depot(s.db, collections.dossiersDiag, dossierDiag);
  const ref = dossiers.reference.doc();
  const alea = s.alea ?? Math.random;
  const trace: TraceEnvoi = {
    ...(ctx.ipHash ? { ipHash: ctx.ipHash } : {}),
    ...(ctx.userAgent ? { userAgent: ctx.userAgent } : {}),
  };

  let reference = '';
  await s.db.runTransaction(async (t) => {
    reference = await referenceUnique(t, s.db.collection(collections.dossiersDiag), () =>
      referenceDossier(alea),
    );
    const consentementId = ecrireConsentements(s, t, {
      uid,
      version: s.versionLegale,
      source: 'diagnostic',
      miseEnRelation: true,
      maintenant,
      trace,
    });
    t.create(ref, {
      schemaVersion: 1,
      createdAt: maintenant,
      updatedAt: maintenant,
      reference,
      bien: {
        adresse: b.adresse,
        communeSlug: b.communeSlug,
        codePostal: commune.codePostal ?? b.codePostal,
        type: b.type,
        periode: b.periode,
        surface: b.surface,
        motif: b.motif,
        gaz: b.gaz === 'oui',
        electricite: b.elec === 'ancienne',
        assainissement: b.assainissement,
        ...(b.classe === 'inconnu' ? {} : { classeDpe: b.classe }),
      },
      existants: e.existants,
      resultat: resultat.map((l) => ({
        diagId: l.diagId,
        nom: l.nom,
        statut: l.statut,
        prixMin: l.prixMinCentimes,
        prixMax: l.prixMaxCentimes,
        raison: l.raison,
      })),
      estimation: {
        minCentimes: analyse.minCentimes,
        maxCentimes: analyse.maxCentimes,
        remisePack: analyse.remisePack,
        versionRegles: analyse.versionRegles,
      },
      contact: { ...e.contact, visiteSouhaitee: e.visiteSouhaitee },
      particulierUid: uid,
      statut: 'nouvelle',
      nbAttributions: 0,
      consentementId,
      expireLe: expirationDemande(maintenant.getTime()),
    });
  });

  const { lien, nouveauCompte } = await lienDeSuivi(
    s,
    uid,
    e.contact.email,
    `/mon-espace/demandes/${ref.id}`,
  );
  await s.notifier({
    modele: 'dossier-diag-confirme',
    destinataire: { uid, email: e.contact.email },
    refObjet: chemins.dossierDiag(ref.id),
    donnees: {
      prenom: e.contact.nom.split(' ')[0],
      reference,
      commune: commune.nom,
      aRealiser,
      reutilises,
      minCentimes: analyse.minCentimes,
      maxCentimes: analyse.maxCentimes,
      remisePack: analyse.remisePack,
      nouveauCompte,
    },
    secrets: { lien },
  });

  return {
    dossierId: ref.id,
    reference,
    resultat,
    estimation: {
      minCentimes: analyse.minCentimes,
      maxCentimes: analyse.maxCentimes,
      remisePack: analyse.remisePack,
    },
    aRealiser,
    reutilises,
    communeNom: commune.nom,
  };
}
