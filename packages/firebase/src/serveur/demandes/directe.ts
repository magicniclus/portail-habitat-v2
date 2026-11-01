import { expirationDemande, referenceDemande } from '@ph/core/demandes';
import { ErreurMetier } from '@ph/core/erreurs';
import { normaliserTel } from '@ph/core/format';
import { encoderGeohash } from '@ph/core/geo';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { ServicesComptes } from '../comptes/services';
import {
  ecrireConsentements,
  particulierDeLEnvoi,
  referenceUnique,
  type TraceEnvoi,
} from './commun';

export interface ServicesDemandeDirecte extends ServicesComptes {
  versionLegale: string;
  alea?: () => number;
}

/**
 * Demande **attribuée directement** à un artisan (formulaire de son site, coordonnées laissées sur
 * sa fiche) : `acceptee`, coordonnées visibles, hors appariement et jamais facturée (PAIEMENTS :
 * « demandes reçues depuis la fiche » gratuites ; SITE-03). Consentement de mise en relation
 * écrit dans la même transaction.
 */
export async function creerDemandeDirecte(
  s: ServicesDemandeDirecte,
  e: {
    artisanId: string;
    source: 'site_artisan' | 'fiche_artisan';
    prestationId: string;
    contact: { prenom: string; nom: string; email: string; telephone: string };
    /** Code postal du chantier ; à défaut, celui du siège de l'artisan. */
    codePostal?: string;
    reponses: Record<string, string>;
    reponsesLisibles: { question: string; reponse: string }[];
    trace: TraceEnvoi;
  },
): Promise<{ demandeId: string; reference: string }> {
  const artisan = await s.db.doc(chemins.artisan(e.artisanId)).get();
  const centre = artisan.get('zoneIntervention.centre') as
    { latitude: number; longitude: number } | undefined;
  if (!centre) throw new ErreurMetier('PRECONDITION');
  const maintenant = new Date(s.horloge());
  const uid = await particulierDeLEnvoi(s, null, e.contact.email);
  const ref = s.db.collection(collections.demandes).doc();
  let reference = '';
  await s.db.runTransaction(async (t) => {
    reference = await referenceUnique(t, s.db.collection(collections.demandes), () =>
      referenceDemande(s.alea ?? Math.random),
    );
    const consentementId = ecrireConsentements(s, t, {
      uid,
      version: s.versionLegale,
      source: e.source,
      miseEnRelation: true,
      maintenant,
      trace: e.trace,
    });
    t.create(ref, {
      schemaVersion: 1,
      createdAt: maintenant,
      updatedAt: maintenant,
      reference,
      source: e.source,
      rgeRequis: false,
      particulierUid: uid,
      contact: e.contact,
      prestationId: e.prestationId,
      reponses: e.reponses,
      reponsesLisibles: e.reponsesLisibles,
      adresseChantier: {
        codePostal: e.codePostal ?? (artisan.get('adresseSiege.codePostal') as string),
        ville: '',
        geo: centre,
        geohash: encoderGeohash(centre.latitude, centre.longitude),
      },
      acces: 'facile',
      delaiSouhaite: 'renseignement',
      photos: [],
      estimation: {
        minCentimes: 0,
        maxCentimes: 0,
        coefRegion: 1,
        coefAcces: 1,
        aidesCentimes: 0,
        postes: [],
        versionReferentiel: e.source === 'site_artisan' ? 'site' : 'fiche',
      },
      miseEnRelation: true,
      artisanCibleId: e.artisanId,
      statut: 'attribuee',
      nbAttributions: 1,
      consentementId,
      ...e.trace,
      expireLe: expirationDemande(maintenant.getTime()),
    });
    t.create(s.db.doc(chemins.attribution(ref.id, e.artisanId)), {
      schemaVersion: 1,
      artisanId: e.artisanId,
      demandeId: ref.id,
      statut: 'acceptee',
      exclusive: true,
      rang: 1,
      proposeeLe: Timestamp.fromDate(maintenant),
      reponduLe: Timestamp.fromDate(maintenant),
      coordonneesDebloquees: true,
      scoreMatching: 0,
    });
  });
  return { demandeId: ref.id, reference };
}

/**
 * « Laisser mes coordonnées à l'artisan » (fiche publique) : seulement une fiche en ligne d'une
 * entreprise active ; demande attribuée directement, gratuite pour l'artisan.
 */
export async function envoyerContactFiche(
  s: ServicesDemandeDirecte,
  e: {
    artisanId: string;
    prenom: string;
    nom: string;
    email: string;
    telephone: string;
    codePostal: string;
    description?: string;
    trace: TraceEnvoi;
  },
): Promise<{ demandeId: string; reference: string }> {
  const a = await s.db.doc(chemins.artisan(e.artisanId)).get();
  if (!a.exists || a.get('enLigne') !== true || a.get('statut') !== 'actif')
    throw new ErreurMetier('INTROUVABLE');
  const telephone = normaliserTel(e.telephone);
  if (!telephone) throw new ErreurMetier('ENTREE_INVALIDE', 'Numéro de téléphone invalide.');
  const description = e.description?.trim() ?? '';
  return creerDemandeDirecte(s, {
    artisanId: e.artisanId,
    source: 'fiche_artisan',
    prestationId: 'contact_fiche',
    contact: { prenom: e.prenom, nom: e.nom, email: e.email.toLowerCase(), telephone },
    codePostal: e.codePostal,
    reponses: { codePostal: e.codePostal, ...(description ? { description } : {}) },
    reponsesLisibles: description
      ? [{ question: 'Description du projet', reponse: description }]
      : [],
    trace: e.trace,
  });
}
