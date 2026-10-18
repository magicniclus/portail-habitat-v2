import { expirationDemande, referenceDemande } from '@ph/core/demandes';
import { ErreurMetier } from '@ph/core/erreurs';
import { normaliserTel } from '@ph/core/format';
import { encoderGeohash } from '@ph/core/geo';
import { FORMULAIRE_GRATUIT, validerEnvoi, type ChampFormulaire } from '@ph/core/sites';
import { Timestamp } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { ServicesComptes } from '../comptes/services';
import {
  ecrireConsentements,
  particulierDeLEnvoi,
  referenceUnique,
  type TraceEnvoi,
} from '../demandes/commun';

export interface ServicesFormulaireSite extends ServicesComptes {
  versionLegale: string;
  alea?: () => number;
}

/** Libellés des champs standard, pour « Mes demandes ». */
const LIBELLES = new Map(FORMULAIRE_GRATUIT.map((c) => [c.id, c.libelle]));

/**
 * Envoi du formulaire d'un site artisan : anti-robot vérifié avant tout (SITE-12, aucune demande
 * sinon) ; site gratuit limité à ses 4 champs (SITE-13) ; demande créée **attribuée directement**
 * à l'artisan (`acceptee`, coordonnées visibles), hors matching et jamais facturée (SITE-03).
 */
export async function envoyerFormulaireSite(
  s: ServicesFormulaireSite,
  e: {
    siteId: string;
    valeurs: Record<string, unknown>;
    turnstileOk: boolean;
    page: string;
    trace: TraceEnvoi;
  },
): Promise<{ demandeId: string; reference: string }> {
  if (!e.turnstileOk)
    throw new ErreurMetier('PERMISSION_REFUSEE', 'Vérification anti-robot échouée.');
  const site = await s.db.doc(chemins.site(e.siteId)).get();
  if (!site.exists || !site.get('versionPubliee')) throw new ErreurMetier('INTROUVABLE');
  const offre = site.get('offre') as 'gratuit' | 'site_pro';
  const champs = (site.get('formulaire.champs') as ChampFormulaire[] | undefined) ?? [
    ...FORMULAIRE_GRATUIT,
  ];
  const v = validerEnvoi(champs, offre, e.valeurs);
  if (!v.ok) throw new ErreurMetier('ENTREE_INVALIDE', 'Vérifiez les champs du formulaire.');
  const telephone = normaliserTel(v.valeurs.telephone ?? '');
  if (!telephone) throw new ErreurMetier('ENTREE_INVALIDE', 'Numéro de téléphone invalide.');
  const email = (v.valeurs.email ?? '').toLowerCase();
  const [prenom, ...reste] = (v.valeurs.nom ?? '').split(/\s+/);
  const artisan = await s.db.doc(chemins.artisan(e.siteId)).get();
  const centre = artisan.get('zoneIntervention.centre') as
    { latitude: number; longitude: number } | undefined;
  if (!centre) throw new ErreurMetier('PRECONDITION');
  const maintenant = new Date(s.horloge());
  const uid = await particulierDeLEnvoi(s, null, email);
  const ref = s.db.collection(collections.demandes).doc();
  const libelle = (id: string) =>
    LIBELLES.get(id) ?? champs.find((c) => c.id === id)?.libelle ?? id;
  let reference = '';
  await s.db.runTransaction(async (t) => {
    reference = await referenceUnique(t, s.db.collection(collections.demandes), () =>
      referenceDemande(s.alea ?? Math.random),
    );
    const consentementId = ecrireConsentements(s, t, {
      uid,
      version: s.versionLegale,
      source: 'site_artisan',
      miseEnRelation: true,
      maintenant,
      trace: e.trace,
    });
    t.create(ref, {
      schemaVersion: 1,
      createdAt: maintenant,
      updatedAt: maintenant,
      reference,
      source: 'site_artisan',
      rgeRequis: false,
      particulierUid: uid,
      contact: { prenom: prenom || 'Client', nom: reste.join(' '), email, telephone },
      prestationId: 'contact_site',
      reponses: v.valeurs,
      reponsesLisibles: Object.entries(v.valeurs)
        .filter(([k]) => !['nom', 'telephone', 'email'].includes(k))
        .map(([k, x]) => ({ question: libelle(k), reponse: x })),
      adresseChantier: {
        codePostal: v.valeurs.codePostal ?? (artisan.get('adresseSiege.codePostal') as string),
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
        versionReferentiel: 'site',
      },
      miseEnRelation: true,
      artisanCibleId: e.siteId,
      statut: 'attribuee',
      nbAttributions: 1,
      consentementId,
      ...e.trace,
      expireLe: expirationDemande(maintenant.getTime()),
    });
    t.create(s.db.doc(chemins.attribution(ref.id, e.siteId)), {
      schemaVersion: 1,
      artisanId: e.siteId,
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
