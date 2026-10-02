import { masquerCoordonnees } from '@ph/core/espace';
import {
  BAREME_DEFAUT,
  calculerPrixLead,
  GRILLE_DEFAUT,
  trancheBudget,
  type CaracteristiquesLead,
  type NiveauLead,
} from '@ph/core/leads';

type EligibiliteAides = NonNullable<CaracteristiquesLead['eligibiliteAides']>;
/** Demandes partenaires : exclusive non vue sous 2 h → réattribuée (MATCHING « Demandes partenaires »). */
const DELAI_NON_VUE_PARTENAIRE_MS = 2 * 3_600_000;
import {
  aiguiller,
  aModerer,
  artisanPourMatching,
  CONFIG_MATCHING_DEFAUT,
  delaiEnJours,
  demandePourMatching,
  estUrgente,
  evaluer,
  expirationProposition,
  metierDeDemande,
  qualiteLead,
  type Candidat,
  type ConfigMatchingComplete,
  type DocDemande,
} from '@ph/core/matching';
import { encoderGeohash } from '@ph/core/geo';
import { LIBELLES_NIVEAU, texteAides, type NiveauPartenaire } from '@ph/core/partenaires';
import { FieldValue, Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { Notifier } from '../comptes/services';
import { chercherCandidats, lireReferentielMetiers, versDocArtisan } from './lecture';

/**
 * Attribution d'une nouvelle demande (MATCHING [1] à [8], D41) : demande garantie au meilleur
 * Premium qui a encore du quota, sinon appel d'offres (3 réponses, 60 min d'avance Premium, D50).
 * Idempotente : une demande qui n'est plus `nouvelle` n'est pas retraitée.
 */

export interface ServicesMatching {
  db: Firestore;
  horloge: () => number;
  notifier: Notifier;
  config?: ConfigMatchingComplete;
}

export type ResultatAttribution =
  'attribuee' | 'appel_offres' | 'aucun_candidat' | 'moderation' | 'deja_traitee';

const FENETRE_PREMIUM_MIN = 60;
const DUREE_APPEL_OFFRES_MS = 7 * 86_400_000;

function signauxLead(d: DocumentData, emailVerifie: boolean) {
  const delai = delaiEnJours(d.delaiSouhaite);
  return {
    emailVerifie,
    telephoneVerifie: d.qualification?.telephoneVerifie === true,
    tauxReponses: 1,
    photos: (d.photos?.length ?? 0) > 0,
    longueurPrecisions: (d.precisions ?? '').length,
    delaiSouhaiteJours: delai,
    budgetCoherent: true,
    dejaVus7j: 0,
    emailJetable: false,
    horsZone: false,
  };
}

/** Résumé anonymisé de l'appel d'offres : réponses du simulateur et précisions sans coordonnées. */
function resumeAnonyme(d: DocumentData): string {
  const reponses = ((d.reponsesLisibles ?? []) as { question: string; reponse: string }[])
    .map((r) => `${r.question} : ${r.reponse}`)
    .join('. ');
  const precisions = d.precisions ? masquerCoordonnees(d.precisions as string).texte : '';
  return [reponses, precisions].filter(Boolean).join('. ').slice(0, 1000);
}

/** Texte de l'email « nouvelle demande » : niveau et aides estimées si demande partenaire (IMP-06). */
function messageNouvelleDemande(d: DocumentData): string {
  const base = `Demande ${d.reference as string} à ${(d.adresseChantier?.ville as string) ?? ''}.`;
  const niveau = d.qualification?.niveau as NiveauPartenaire | undefined;
  const aides = d.aides ? texteAides(d.aides as Parameters<typeof texteAides>[0]) : null;
  return [
    base,
    niveau ? `${LIBELLES_NIVEAU[niveau]}.` : '',
    aides ? `Aides estimées du client : ${aides}.` : '',
    'Acceptez-la pour voir les coordonnées du particulier.',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Membres prévenus d'une nouvelle demande (COMPTES §4.6) : actifs, `notifs.demandes`, métier. */
async function destinatairesDemandes(db: Firestore, artisanId: string, metier: string) {
  const membres = await db.collection(chemins.membres(artisanId)).get();
  return membres.docs
    .filter(
      (m) =>
        m.get('statut') === 'actif' &&
        m.get('role') !== 'comptable' &&
        m.get('notifs.demandes') !== false &&
        (!(m.get('metiers') as string[] | undefined)?.length ||
          (m.get('metiers') as string[]).includes(metier)),
    )
    .map((m) => m.id);
}

/** Candidats, score, aiguillage et trace d'une demande (commun à l'attribution et aux relances). */
async function analyser(
  s: ServicesMatching,
  demandeId: string,
  d: DocumentData,
  qualite: number,
  maintenant: number,
  dejaVus: ReadonlySet<string> = new Set(),
) {
  const config = s.config ?? CONFIG_MATCHING_DEFAUT;
  const debut = Date.now();
  const ref = await lireReferentielMetiers(s.db, maintenant);
  const metier = metierDeDemande(
    { ...(d.intention ? { intention: d.intention } : {}), prestationId: d.prestationId },
    ref,
  );
  const demande = demandePourMatching(demandeId, d as DocDemande, metier ?? '', maintenant);
  const docs = metier ? await chercherCandidats(s.db, demande.geo, metier, config.rayonMaxKm) : [];
  const artisans = docs.map((x) =>
    artisanPourMatching(x.id, versDocArtisan(x.data), {
      maintenant,
      empreintes: [x.data.emailContact, x.data.telephonePublic]
        .filter(Boolean)
        .map((v: string) => (v.includes('@') ? `email:${v.toLowerCase()}` : `tel:${v}`)),
      attributions7j: (x.data.attributions7j as number | undefined) ?? 0,
      tauxRefus30j: (x.data.tauxRefus30j as number | undefined) ?? 0,
      ...(d.rgeRequis
        ? { domaineRge: { metier: metier ?? '', prestationId: d.prestationId } }
        : {}),
    }),
  );
  const candidats = evaluer(artisans, demande, config, dejaVus);
  const aiguillage = aiguiller(candidats, demande.artisanCibleId);
  // Appel d'offres : le quota de demandes garanties ne compte pas (ouvert à toutes les formules).
  const eligiblesAppel = evaluer(
    artisans.map((a) => ({ ...a, quotaDemandesMois: Number.MAX_SAFE_INTEGER })),
    demande,
    config,
    dejaVus,
  ).filter((c) => !c.raisonExclusion);

  const trace = (resultat: string, retenus: Candidat[]) => ({
    schemaVersion: 1,
    demandeId,
    versionConfig: config.version,
    resultat,
    candidats: candidats.map((c) => ({
      artisanId: c.artisanId,
      score: c.score,
      distance: c.distance,
      ...(c.raisonExclusion ? { exclu: c.raisonExclusion } : {}),
      retenu: retenus.some((r) => r.artisanId === c.artisanId),
    })),
    nbCandidats: candidats.length,
    nbExclus: candidats.filter((c) => c.raisonExclusion).length,
    dureeMs: Date.now() - debut,
    createdAt: Timestamp.fromMillis(maintenant),
  });
  const communDemande = {
    metierRequis: metier ?? '',
    qualiteLead: qualite,
    matchingVersion: config.version,
    matchingLe: Timestamp.fromMillis(maintenant),
    updatedAt: Timestamp.fromMillis(maintenant),
  };

  return { ref, metier, demande, candidats, aiguillage, eligiblesAppel, trace, communDemande };
}

export async function attribuerDemande(
  s: ServicesMatching,
  demandeId: string,
): Promise<ResultatAttribution> {
  const config = s.config ?? CONFIG_MATCHING_DEFAUT;
  const maintenant = s.horloge();
  const refDemande = s.db.doc(chemins.demande(demandeId));
  const snap = await refDemande.get();
  if (!snap.exists || snap.get('statut') !== 'nouvelle') return 'deja_traitee';
  const d = snap.data()!;

  const partenaire = d.source === 'partenaire';
  const emailVerifie = d.particulierUid
    ? (await s.db.doc(chemins.user(d.particulierUid as string)).get()).get('emailVerifie') === true
    : false;
  // Demande partenaire : consentement prouvé et qualification A/B/C faite à l'import.
  const qualite = partenaire
    ? (d.qualification.score as number)
    : qualiteLead(signauxLead(d, emailVerifie));
  if (!partenaire && aModerer(qualite)) {
    await s.db.runTransaction(async (t) => {
      if ((await t.get(refDemande)).get('statut') !== 'nouvelle') return;
      t.update(refDemande, {
        qualiteLead: qualite,
        moderation: true,
        updatedAt: Timestamp.fromMillis(maintenant),
      });
      t.create(s.db.collection(collections.filesModeration).doc(`fraude-${demandeId}`), {
        schemaVersion: 1,
        createdAt: Timestamp.fromMillis(maintenant),
        type: 'fraude_suspectee',
        refs: { demandeId },
        priorite: 2,
        statut: 'a_traiter',
        permissionRequise: 'demandes.moderer',
      });
    });
    return 'moderation';
  }

  const { ref, metier, aiguillage, eligiblesAppel, trace, communDemande } = await analyser(
    s,
    demandeId,
    d,
    qualite,
    maintenant,
  );
  // Niveau C : jamais en demande exclusive, appel d'offres à prix réduit seulement (IMP-05).
  const exclusivePossible = !partenaire || d.qualification.niveau !== 'C';
  if (aiguillage.canal === 'garantie' && exclusivePossible) {
    const choisi = aiguillage.artisan;
    const refArtisan = s.db.doc(chemins.artisan(choisi.artisanId));
    const expire = expirationProposition(config, estUrgente(d.delaiSouhaite), maintenant);
    // Partenaire : réattribuée si l'artisan ne l'a pas vue sous 2 h ; vue, le délai normal s'applique.
    const expireNonVue = partenaire
      ? Math.min(expire, maintenant + DELAI_NON_VUE_PARTENAIRE_MS)
      : expire;
    const ok = await s.db.runTransaction(async (t) => {
      const [dem, art] = await Promise.all([t.get(refDemande), t.get(refArtisan)]);
      if (dem.get('statut') !== 'nouvelle') return false;
      // Quota revérifié dans la transaction : deux demandes simultanées ne le dépassent pas.
      if ((art.get('demandesRecuesMois') ?? 0) >= (art.get('quotaDemandesMois') ?? 0)) return false;
      t.create(s.db.doc(chemins.attribution(demandeId, choisi.artisanId)), {
        schemaVersion: 1,
        artisanId: choisi.artisanId,
        demandeId,
        statut: 'proposee',
        exclusive: true,
        rang: 1,
        proposeeLe: Timestamp.fromMillis(maintenant),
        expireLe: Timestamp.fromMillis(expireNonVue),
        ...(expireNonVue !== expire ? { expireLeSiVue: Timestamp.fromMillis(expire) } : {}),
        coordonneesDebloquees: false,
        scoreMatching: Math.round(choisi.score),
      });
      t.update(refArtisan, {
        demandesRecuesMois: FieldValue.increment(1),
        derniereAttributionLe: Timestamp.fromMillis(maintenant),
      });
      t.update(refDemande, { ...communDemande, statut: 'en_attribution', nbAttributions: 1 });
      t.set(s.db.collection(collections.matching).doc(demandeId), trace('attribuee', [choisi]));
      return true;
    });
    if (ok) {
      for (const uid of await destinatairesDemandes(s.db, choisi.artisanId, metier ?? ''))
        await s.notifier({
          modele: 'nouvelle-demande',
          destinataire: { uid, artisanId: choisi.artisanId },
          refObjet: `demandes/${demandeId}`,
          donnees: {
            ville: d.adresseChantier?.ville ?? '',
            reference: d.reference,
            message: messageNouvelleDemande(d),
            resumeInApp: `Demande ${d.reference} à ${d.adresseChantier?.ville ?? ''}`,
            lienInApp: '/pro/demandes',
            lien: '/pro/demandes',
          },
          titreInApp: 'Nouvelle demande pour vous',
        });
      return 'attribuee';
    }
    // Quota épuisé entre-temps : la demande part en appel d'offres.
  }

  if (!eligiblesAppel.length && !config.convertirEnAppelOffres) {
    await refDemande.update({ ...communDemande });
    await s.db.collection(collections.matching).doc(demandeId).set(trace('aucun_candidat', []));
    return 'aucun_candidat';
  }
  await publierAppelOffres(s, {
    demandeId,
    demande: d,
    metier: metier ?? '',
    famille: ref.metiers.find((m) => m.id === metier)?.famille,
    qualite,
    eligibles: eligiblesAppel,
    communDemande,
    trace: trace(eligiblesAppel.length ? 'appel_offres' : 'aucun_candidat', []),
  });
  return eligiblesAppel.length ? 'appel_offres' : 'aucun_candidat';
}

/**
 * Appel d'offres (DATABASE §5) : résumé anonymisé, prix du barème, 3 déblocages, Premium seuls
 * pendant 60 minutes (D50) ; les Premium éligibles sont prévenus tout de suite, les autres à la
 * fin de la fenêtre. Identifiant = celui de la demande (un seul appel d'offres par demande).
 */
export async function publierAppelOffres(
  s: ServicesMatching,
  p: {
    demandeId: string;
    demande: DocumentData;
    metier: string;
    famille?: string;
    qualite: number;
    eligibles: Candidat[];
    communDemande: Record<string, unknown>;
    trace: Record<string, unknown>;
  },
): Promise<boolean> {
  const maintenant = s.horloge();
  const d = p.demande;
  const refDemande = s.db.doc(chemins.demande(p.demandeId));
  const refAppel = s.db.doc(chemins.appelOffres(p.demandeId));
  const tranche = trancheBudget(d.estimation.minCentimes, d.estimation.maxCentimes);
  const urgence = estUrgente(d.delaiSouhaite) ? 'urgente' : 'normale';
  const prix = calculerPrixLead(
    {
      metier: p.metier,
      ...(p.famille ? { famille: p.famille } : {}),
      trancheBudget: tranche,
      urgence,
      qualiteLead: p.qualite,
      nbEligibles: p.eligibles.length,
      ...(d.qualification?.niveau ? { niveau: d.qualification.niveau as NiveauLead } : {}),
      ...(d.aides?.eligibilite
        ? { eligibiliteAides: d.aides.eligibilite as EligibiliteAides }
        : {}),
    },
    BAREME_DEFAUT,
  );
  const nomPrestation =
    ((await s.db.doc(chemins.prestationItem(d.prestationId)).get()).get('nom') as
      string | undefined) ?? 'Travaux';
  const cree = await s.db.runTransaction(async (t) => {
    const [dem, existant] = await Promise.all([t.get(refDemande), t.get(refAppel)]);
    if (existant.exists || !['nouvelle', 'en_attribution'].includes(dem.get('statut')))
      return false;
    const geo = d.adresseChantier.geo;
    t.create(refAppel, {
      schemaVersion: 1,
      createdAt: Timestamp.fromMillis(maintenant),
      updatedAt: Timestamp.fromMillis(maintenant),
      demandeId: p.demandeId,
      titre: `${nomPrestation} à ${d.adresseChantier.ville}`,
      resume: resumeAnonyme(d),
      metier: p.metier,
      metiersSecondaires: [],
      ville: d.adresseChantier.ville,
      codePostal: d.adresseChantier.codePostal,
      geo,
      geohash: encoderGeohash(geo.latitude, geo.longitude, 6),
      budgetMinCentimes: d.estimation.minCentimes,
      budgetMaxCentimes: d.estimation.maxCentimes,
      trancheBudget: tranche,
      urgence,
      exigences: d.rgeRequis ? ['rge'] : [],
      qualiteLead: p.qualite,
      tarification: {
        mode: 'auto',
        prixBaseCentimes: prix.prixBaseCentimes,
        prixPremiumCentimes: prix.prixPremiumCentimes,
        prixCredits: prix.prixCredits,
        grilleId: GRILLE_DEFAUT,
        detailCalcul: { ...prix.detailCalcul },
        fixeLe: Timestamp.fromMillis(maintenant),
        prixPlancherCentimes: BAREME_DEFAUT.plancher,
        prixPlafondCentimes: BAREME_DEFAUT.plafond,
        historique: [],
      },
      nbDeblocagesMax: 3,
      nbDeblocages: 0,
      acces: 'premium_prioritaire',
      fenetrePremiumMin: FENETRE_PREMIUM_MIN,
      ouvertLe: Timestamp.fromMillis(maintenant),
      ouvertJusquau: Timestamp.fromMillis(maintenant + DUREE_APPEL_OFFRES_MS),
      statut: 'ouvert',
      publiePar: 'algo',
      artisansInvites: p.eligibles.map((e) => e.artisanId).slice(0, 50),
    });
    t.update(refDemande, {
      ...p.communDemande,
      statut: 'appel_offres',
      appelOffresId: p.demandeId,
    });
    t.set(s.db.collection(collections.matching).doc(p.demandeId), p.trace);
    return true;
  });
  if (!cree) return false;
  const finFenetre = new Date(maintenant + FENETRE_PREMIUM_MIN * 60_000);
  for (const e of p.eligibles.slice(0, 50)) {
    const proprietaire = (await s.db.doc(chemins.artisan(e.artisanId)).get()).get(
      'proprietaireUid',
    ) as string | undefined;
    if (!proprietaire) continue;
    await s.notifier({
      modele: 'nouvel-appel-offres',
      destinataire: { uid: proprietaire, artisanId: e.artisanId },
      refObjet: `appelsOffres/${p.demandeId}`,
      ...(e.premium ? {} : { envoyerLe: finFenetre }),
      donnees: {
        ville: d.adresseChantier.ville,
        resumeInApp: `${nomPrestation} à ${d.adresseChantier.ville}`,
        lienInApp: '/pro/appels-d-offres',
        lien: '/pro/appels-d-offres',
      },
      titreInApp: 'Nouvel appel d’offres dans votre zone',
    });
  }
  return true;
}

/**
 * Demande garantie non acceptée dans le délai, ou refusée (D41, MATCHING [7]) : elle devient un
 * appel d'offres ; les artisans déjà sollicités ne sont pas réinvités.
 */
export async function convertirEnAppelOffres(
  s: ServicesMatching,
  demandeId: string,
): Promise<boolean> {
  const maintenant = s.horloge();
  const snap = await s.db.doc(chemins.demande(demandeId)).get();
  if (!snap.exists || snap.get('statut') !== 'en_attribution') return false;
  const d = snap.data()!;
  const vus = await s.db.collection(chemins.attributions(demandeId)).get();
  if (vus.docs.some((a) => ['acceptee', 'vue', 'proposee'].includes(a.get('statut') as string)))
    return false;
  const a = await analyser(
    s,
    demandeId,
    d,
    (d.qualiteLead as number | undefined) ?? 50,
    maintenant,
    new Set(vus.docs.map((x) => x.id)),
  );
  return publierAppelOffres(s, {
    demandeId,
    demande: d,
    metier: a.metier ?? '',
    famille: a.ref.metiers.find((m) => m.id === a.metier)?.famille,
    qualite: (d.qualiteLead as number | undefined) ?? 50,
    eligibles: a.eligiblesAppel,
    communDemande: { updatedAt: Timestamp.fromMillis(maintenant) },
    trace: a.trace('appel_offres', []),
  });
}
