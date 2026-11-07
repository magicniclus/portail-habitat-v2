import {
  champDepuisDocument,
  expirationDemande,
  referenceDemande,
  referentielDepuisDocuments,
  verifierReponses,
  type ChampDocument,
  type DemandeCreee,
} from '@ph/core/demandes';
import { ErreurMetier } from '@ph/core/erreurs';
import { encoderGeohash } from '@ph/core/geo';
import { demande, type EntreeDemande } from '@ph/core/schemas';
import { estimer } from '@ph/core/simulateur';
import type { Firestore } from 'firebase-admin/firestore';
import { collections, chemins } from '../../chemins';
import type { ServicesComptes } from '../comptes/services';
import { depot } from '../depot';
import { ecrireConsentements, lienDeSuivi, particulierDeLEnvoi, referenceUnique } from './commun';
import type { Geocodeur } from './geocodage';

export interface ServicesDemandes extends ServicesComptes {
  urlSite: string;
  geocoder: Geocodeur;
  /** Version des documents légaux acceptés (documents-legaux.json). */
  versionLegale: string;
  alea?: () => number;
}

export interface ContexteDemande {
  /** Particulier connecté : la demande lui est rattachée quel que soit l'email saisi. */
  uid?: string | null;
  ipHash?: string;
  userAgent?: string;
}

/** Champs publiés et prix privés d'une prestation (une lecture par prestation, COUTS). */
export async function lireReferentielPrestation(db: Firestore, prestationId: string) {
  const [item, prix, coefs] = await db.getAll(
    db.doc(chemins.prestationItem(prestationId)),
    db.doc(chemins.prestationPrix(prestationId)),
    db.doc(chemins.prestationPrix('_coefficients')),
  );
  if (!item?.exists || item.get('actif') !== true) throw new ErreurMetier('INTROUVABLE');
  if (!prix?.exists || !coefs?.exists)
    throw new Error(`Prix absents du référentiel pour « ${prestationId} ».`);
  const champs = (item.get('champs') as ChampDocument[]).map(champDepuisDocument);
  const referentiel = referentielDepuisDocuments({
    prestationId,
    formule: String(item.get('formule')),
    parametres: prix.get('parametres') as Record<string, unknown>,
    coefficients: coefs.get('parametres') as Record<string, unknown>,
    version: String(prix.get('version')),
  });
  return { nom: String(item.get('nom')), champs, referentiel };
}

/**
 * `creerDemande` (COMPTES §2 et §6.1) : réponses revérifiées, estimation **recalculée avec les prix
 * privés** (règle n° 3), compte particulier créé ou rattaché sans ouvrir de session, demande et
 * consentements écrits en transaction, puis email de confirmation via `notifier()`.
 */
export async function creerDemande(
  s: ServicesDemandes,
  e: EntreeDemande,
  ctx: ContexteDemande = {},
): Promise<DemandeCreee> {
  const maintenant = new Date(s.horloge());
  const { nom, champs, referentiel } = await lireReferentielPrestation(s.db, e.prestationId);
  const verif = verifierReponses(champs, e.reponses);
  if (verif.invalides.length)
    throw new ErreurMetier(
      'ENTREE_INVALIDE',
      'Certaines réponses ne sont plus valides. Vérifiez votre projet puis renvoyez-le.',
    );
  const estimation = estimer(
    {
      prestationId: e.prestationId,
      reponses: verif.reponses,
      codePostal: e.codePostal,
      acces: e.acces,
    },
    referentiel,
  );
  const lieu = await s.geocoder(e.codePostal);
  if (!lieu) throw new ErreurMetier('ENTREE_INVALIDE', 'Ce code postal est inconnu.');

  const uid = await particulierDeLEnvoi(s, ctx.uid, e.contact.email);
  const demandes = depot(s.db, collections.demandes, demande);
  const ref = demandes.reference.doc();
  const alea = s.alea ?? Math.random;
  const trace = {
    ...(ctx.ipHash ? { ipHash: ctx.ipHash } : {}),
    ...(ctx.userAgent ? { userAgent: ctx.userAgent.slice(0, 400) } : {}),
  };

  let reference = '';
  await s.db.runTransaction(async (t) => {
    reference = await referenceUnique(t, s.db.collection(collections.demandes), () =>
      referenceDemande(alea),
    );
    const idConsentement = ecrireConsentements(s, t, {
      uid,
      version: s.versionLegale,
      source: e.source === 'fiche_artisan' ? 'fiche_artisan' : 'simulateur',
      miseEnRelation: e.miseEnRelation,
      maintenant,
      trace,
    });
    // Brouillon serveur du lien de reprise : supprimé avec l'envoi (REPRISE_PARCOURS §4).
    if (e.brouillonId) t.delete(s.db.collection(collections.brouillons).doc(e.brouillonId));
    // Personne connectée : son brouillon « compte » disparaît aussi (§5, niveau 2).
    if (ctx.uid) t.delete(s.db.collection(collections.brouillons).doc(`${ctx.uid}_simulateur`));
    t.create(ref, {
      schemaVersion: 1,
      createdAt: maintenant,
      updatedAt: maintenant,
      reference,
      source: e.source,
      rgeRequis: false,
      particulierUid: uid,
      contact: e.contact,
      ...(e.intention ? { intention: e.intention } : {}),
      prestationId: e.prestationId,
      reponses: verif.reponses,
      reponsesLisibles: verif.lisibles,
      adresseChantier: {
        codePostal: e.codePostal,
        ville: lieu.ville,
        geo: lieu.geo,
        geohash: encoderGeohash(lieu.geo.latitude, lieu.geo.longitude),
      },
      acces: e.acces,
      delaiSouhaite: e.delaiSouhaite,
      ...(e.precisions ? { precisions: e.precisions } : {}),
      photos: [],
      estimation: {
        minCentimes: estimation.minCentimes,
        maxCentimes: estimation.maxCentimes,
        coefRegion: estimation.coefRegion,
        coefAcces: estimation.coefAcces,
        aidesCentimes: estimation.aidesCentimes,
        postes: estimation.postes.map((p) => ({
          label: p.label,
          min: p.minCentimes,
          max: p.maxCentimes,
        })),
        versionReferentiel: estimation.versionReferentiel,
      },
      miseEnRelation: e.miseEnRelation,
      ...(e.artisanCibleId ? { artisanCibleId: e.artisanCibleId } : {}),
      statut: 'nouvelle',
      nbAttributions: 0,
      consentementId: idConsentement,
      ...trace,
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
    modele: 'demande-confirmee',
    destinataire: { uid, email: e.contact.email },
    refObjet: chemins.demande(ref.id),
    donnees: {
      prenom: e.contact.prenom,
      reference,
      prestation: nom,
      ville: lieu.ville,
      minCentimes: estimation.minCentimes,
      maxCentimes: estimation.maxCentimes,
      miseEnRelation: e.miseEnRelation,
      nouveauCompte,
    },
    secrets: { lien },
  });

  return {
    demandeId: ref.id,
    reference,
    prestation: { id: e.prestationId, nom },
    estimation: {
      minCentimes: estimation.minCentimes,
      maxCentimes: estimation.maxCentimes,
      aidesCentimes: estimation.aidesCentimes,
      tvaPourcent: estimation.tvaPourcent,
      noteRegion: estimation.noteRegion,
      postes: estimation.postes,
    },
    reponsesLisibles: verif.lisibles,
    ville: lieu.ville,
  };
}
