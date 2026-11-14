import { referenceDemande, verifierReponses, expirationDemande } from '@ph/core/demandes';
import { encoderGeohash } from '@ph/core/geo';
import { valeursParDefaut } from '@ph/core/parcours/reponses';
import {
  cleDoublon,
  controlerConsentement,
  dansZoneCouverte,
  delaiDepuisHorizon,
  qualifierPartenaire,
  rgeRequisPartenaire,
  telephonePartenaireValide,
  type MotifRejet,
} from '@ph/core/partenaires';
import { entreeDemandePartenaire, type EntreeDemandePartenaire } from '@ph/core/schemas';
import { estimer } from '@ph/core/simulateur';
import { createHash, timingSafeEqual } from 'node:crypto';
import {
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { empreinteJeton, nouveauJeton } from '../comptes/services';
import { lireReferentielPrestation } from '../demandes/creerDemande';
import { referenceUnique } from '../demandes/commun';
import type { Geocodeur } from '../demandes/geocodage';
import type { Envoi } from '../notifications/notifier';

/**
 * Webhook `importerDemandePartenaire` (IMPORT_LEADS, DATABASE §4 bis) : clé et IP de la source,
 * quota du jour, idempotence par `idExterne`, consentement prouvé, doublons sur 30 jours,
 * qualification A/B/C, puis `demandes/{id}` (`source: 'partenaire'`) : le matching démarre seul.
 * Un rejet ne laisse aucune donnée personnelle (journal seulement).
 */

export interface ServicesImport {
  db: Firestore;
  horloge: () => number;
  geocoder: Geocodeur;
  notifier: (e: Envoi) => Promise<unknown>;
  urlSite: string;
  /** SMS de confirmation quand le partenaire n'a pas vérifié le téléphone (choix du 02/10/2026). */
  smsConfirmation: boolean;
  alea?: () => number;
  jeton?: () => string;
}

export interface RequeteImport {
  sourceId: string | undefined;
  cleApi: string | undefined;
  ip: string;
  corps: unknown;
}

export interface ReponseImport {
  http: number;
  corps: Record<string, unknown>;
}

const JOUR_MS = 86_400_000;
const TREIZE_MOIS_MS = 395 * JOUR_MS;
const sha256 = (t: string) => createHash('sha256').update(t).digest('hex');

function memeEmpreinte(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Identifiant du journal : un seul document par (source, idExterne). */
const idImport = (sourceId: string, idExterne: string) =>
  sha256(`${sourceId}|${idExterne}`).slice(0, 40);

/** Valeurs numériques du simulateur : la surface fournie remplace la valeur par défaut. */
function reponsesPartenaire(
  champs: Parameters<typeof valeursParDefaut>[0],
  surfaceM2: number | undefined,
) {
  const r = valeursParDefaut(champs);
  if (surfaceM2 === undefined) return r;
  const surface = champs.find((c) => 'unite' in c && c.unite === 'm²');
  if (surface && 'min' in surface)
    r[surface.id] = Math.min(surface.max, Math.max(surface.min, Math.round(surfaceM2)));
  return r;
}

export async function importerDemandePartenaire(
  s: ServicesImport,
  req: RequeteImport,
): Promise<ReponseImport> {
  const maintenant = s.horloge();
  if (!req.sourceId || !req.cleApi) return { http: 401, corps: { erreur: 'cle_invalide' } };
  const source = await s.db.collection(collections.sourcesDemandes).doc(req.sourceId).get();
  if (
    !source.exists ||
    source.get('actif') !== true ||
    !memeEmpreinte(sha256(req.cleApi), source.get('cleApiHash') as string)
  )
    return { http: 401, corps: { erreur: 'cle_invalide' } };
  if (!(source.get('ipAutorisees') as string[]).includes(req.ip))
    return { http: 403, corps: { erreur: 'ip_non_autorisee' } };

  const brut = req.corps as { idExterne?: unknown } | null;
  const idExterne = typeof brut?.idExterne === 'string' ? brut.idExterne.slice(0, 64) : '';
  const refImport = s.db
    .collection(collections.importsDemandes)
    .doc(idImport(req.sourceId, idExterne || sha256(JSON.stringify(req.corps))));
  const deja = await refImport.get();
  if (deja.exists && deja.get('statut') !== 'rejetee') return dejaRecue(s, deja.data()!, idExterne);

  const debutJour = Timestamp.fromMillis(maintenant - (maintenant % JOUR_MS));
  const recus = await s.db
    .collection(collections.importsDemandes)
    .where('sourceId', '==', req.sourceId)
    .where('traiteLe', '>=', debutJour)
    .count()
    .get();
  if (recus.data().count >= (source.get('quotaJour') as number))
    return { http: 429, corps: { erreur: 'quota_jour' } };

  const journal = {
    schemaVersion: 1,
    sourceId: req.sourceId,
    idExterne: idExterne || 'inconnu',
    payloadHash: sha256(JSON.stringify(req.corps)),
    traiteLe: Timestamp.fromMillis(maintenant),
    expireLe: Timestamp.fromMillis(maintenant + TREIZE_MOIS_MS),
  };
  const rejeter = async (motifRejet: MotifRejet, details: string): Promise<ReponseImport> => {
    await refImport.set({
      ...journal,
      recueLe: Timestamp.fromMillis(maintenant),
      statut: 'rejetee',
      motifRejet,
      details: details.slice(0, 300),
    });
    return { http: 422, corps: { statut: 'rejetee', idExterne, motifRejet, details } };
  };

  const lu = entreeDemandePartenaire.safeParse(req.corps);
  if (!lu.success)
    return rejeter(
      'schema_invalide',
      [...new Set(lu.error.issues.map((i) => i.path.join('.') || 'corps'))].join(', '),
    );
  const e = lu.data;
  const mapping = source.get('mappingPrestations') as Record<string, string>;
  const prestationId = mapping[e.chantier.typeTravaux];
  if (!prestationId) return rejeter('schema_invalide', 'chantier.typeTravaux inconnu');
  const versionTexte = source.get('versionConsentement') as string | undefined;
  const consentement = controlerConsentement(e.consentement, {
    versionTexte: versionTexte ?? '',
    texte: source.get('texteConsentementAttendu') as string,
  });
  if (!consentement.ok) return rejeter('consentement_absent', consentement.details);
  const telephone = telephonePartenaireValide(e.contact.telephone);
  if (!telephone) return rejeter('telephone_invalide', 'contact.telephone');
  const departements = (source.get('departementsCouverts') as string[] | undefined) ?? [];
  const lieu = dansZoneCouverte(e.chantier.codePostal, departements)
    ? await s.geocoder(e.chantier.codePostal)
    : null;
  if (!lieu) return rejeter('hors_zone_couverte', 'chantier.codePostal');

  const empreinteDoublon = sha256(cleDoublon(telephone, prestationId));
  const doublon = await s.db
    .collection(collections.demandes)
    .where('partenaire.cleDoublon', '==', empreinteDoublon)
    .where('createdAt', '>=', Timestamp.fromMillis(maintenant - 30 * JOUR_MS))
    .limit(1)
    .get();
  if (!doublon.empty) {
    await refImport.set({
      ...journal,
      recueLe: Timestamp.fromDate(new Date(e.recueLe)),
      statut: 'doublon',
      motifRejet: 'doublon_30j',
    });
    return { http: 200, corps: { statut: 'doublon', idExterne } };
  }

  return creer(s, {
    e,
    prestationId,
    telephone,
    lieu,
    empreinteDoublon,
    source: { id: req.sourceId, cout: source.get('coutUnitaireCentimes') as number },
    refImport,
    journal,
    maintenant,
  });
}

async function dejaRecue(
  s: ServicesImport,
  journal: DocumentData,
  idExterne: string,
): Promise<ReponseImport> {
  if (journal.statut === 'doublon') return { http: 200, corps: { statut: 'doublon', idExterne } };
  const d = await s.db.doc(chemins.demande(journal.demandeId as string)).get();
  return {
    http: 200,
    corps: {
      statut: 'deja_recue',
      idExterne,
      reference: d.get('reference') as string,
      niveau: d.get('qualification.niveau') as string,
    },
  };
}

async function creer(
  s: ServicesImport,
  p: {
    e: EntreeDemandePartenaire;
    prestationId: string;
    telephone: string;
    lieu: { ville: string; geo: { latitude: number; longitude: number } };
    empreinteDoublon: string;
    source: { id: string; cout: number };
    refImport: DocumentReference;
    journal: Record<string, unknown>;
    maintenant: number;
  },
): Promise<ReponseImport> {
  const { e, maintenant } = p;
  const { nom, champs, referentiel } = await lireReferentielPrestation(s.db, p.prestationId);
  const verif = verifierReponses(champs, reponsesPartenaire(champs, e.chantier.surfaceM2));
  const estimation = estimer(
    {
      prestationId: p.prestationId,
      reponses: verif.reponses,
      codePostal: e.chantier.codePostal,
      acces: 'facile',
    },
    referentiel,
  );
  const qualif = qualifierPartenaire(
    { ...e.qualification, telephoneVerifie: e.contact.telephoneVerifie },
    e.aides,
  );
  const jeton =
    !e.contact.telephoneVerifie && s.smsConfirmation ? (s.jeton ?? nouveauJeton)() : null;
  const refDemande = s.db.collection(collections.demandes).doc();
  const refPreuve = s.db.collection(collections.preuvesConsentement).doc();
  const horodatage = Timestamp.fromMillis(maintenant);
  const recueLe = Timestamp.fromDate(new Date(e.recueLe));
  const alea = s.alea ?? Math.random;

  let reference = '';
  try {
    await s.db.runTransaction(async (t) => {
      const deja = await t.get(p.refImport);
      if (deja.exists && deja.get('statut') !== 'rejetee') throw new Error('deja_recue');
      reference = await referenceUnique(t, s.db.collection(collections.demandes), () =>
        referenceDemande(alea),
      );
      t.set(p.refImport, {
        ...p.journal,
        recueLe,
        statut: 'creee',
        demandeId: refDemande.id,
      });
      t.create(refPreuve, {
        schemaVersion: 1,
        sourceId: p.source.id,
        idExterne: e.idExterne,
        texteAffiche: e.consentement.texteAffiche,
        versionTexte: e.consentement.versionTexte,
        coche: true,
        horodatage: Timestamp.fromDate(new Date(e.consentement.horodatage)),
        urlPage: e.consentement.urlPage,
        ipHash: sha256(e.consentement.ip),
        userAgentHash: sha256(e.consentement.userAgent),
        finalites: e.consentement.finalites,
        recueLe,
      });
      t.create(refDemande, {
        schemaVersion: 1,
        createdAt: horodatage,
        updatedAt: horodatage,
        reference,
        source: 'partenaire',
        partenaire: {
          sourceId: p.source.id,
          idExterne: e.idExterne,
          recueLe,
          coutAchatCentimes: p.source.cout,
          cleDoublon: p.empreinteDoublon,
          ...(jeton ? { jetonTelephoneHash: empreinteJeton(jeton) } : {}),
        },
        aides: {
          eligibilite: e.aides.eligibilite,
          trancheRevenus: e.aides.trancheRevenus ?? null,
          montantEstimeCentimes: e.aides.montantEstimeCentimes ?? 0,
          dispositifs: e.aides.dispositifs ?? [],
          mention: 'indicatif',
        },
        qualification: {
          telephoneVerifie: e.contact.telephoneVerifie,
          statutOccupation: e.qualification.statutOccupation,
          horizon: e.qualification.horizon,
          score: qualif.score,
          niveau: qualif.niveau,
        },
        rgeRequis: rgeRequisPartenaire(e.aides),
        particulierUid: null,
        contact: {
          prenom: e.contact.prenom,
          nom: e.contact.nom,
          email: e.contact.email,
          telephone: p.telephone,
        },
        prestationId: p.prestationId,
        reponses: verif.reponses,
        reponsesLisibles: verif.lisibles,
        adresseChantier: {
          codePostal: e.chantier.codePostal,
          ville: p.lieu.ville,
          geo: p.lieu.geo,
          geohash: encoderGeohash(p.lieu.geo.latitude, p.lieu.geo.longitude),
        },
        acces: 'facile',
        delaiSouhaite: delaiDepuisHorizon(e.qualification.horizon),
        ...(e.chantier.description ? { precisions: e.chantier.description } : {}),
        photos: [],
        estimation: {
          minCentimes: estimation.minCentimes,
          maxCentimes: estimation.maxCentimes,
          coefRegion: estimation.coefRegion,
          coefAcces: estimation.coefAcces,
          aidesCentimes: estimation.aidesCentimes,
          postes: estimation.postes.map((x) => ({
            label: x.label,
            min: x.minCentimes,
            max: x.maxCentimes,
          })),
          versionReferentiel: estimation.versionReferentiel,
        },
        miseEnRelation: true,
        statut: 'nouvelle',
        nbAttributions: 0,
        consentementId: refPreuve.id,
        expireLe: expirationDemande(maintenant),
      });
    });
  } catch (err) {
    // Deux envois simultanés du même idExterne : le second répond comme un renvoi.
    if ((err as Error).message === 'deja_recue')
      return dejaRecue(s, (await p.refImport.get()).data()!, e.idExterne);
    throw err;
  }

  if (jeton)
    await s.notifier({
      modele: 'confirmer-telephone',
      destinataire: { telephone: p.telephone },
      refObjet: chemins.demande(refDemande.id),
      donnees: { prenom: e.contact.prenom, prestation: nom },
      secrets: { lien: `${s.urlSite}/confirmer-telephone?jeton=${jeton}` },
    });
  return {
    http: 201,
    corps: { statut: 'creee', idExterne: e.idExterne, reference, niveau: qualif.niveau },
  };
}
