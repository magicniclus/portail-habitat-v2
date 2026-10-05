import {
  controlerPression,
  creneauEnvoi,
  dansGroupeTemoin,
  etapeCycle,
  offreCible,
  preparerDonnees,
  prochainPas,
  scoreCycle,
  signauxDeclenches,
  depenseAppelsOffres,
  signalCredits,
  signalGarantie,
  signalPassageAnnuel,
  signalRenouvellement,
  type AchatAppelOffres,
  classerSecteurs,
  type PositionSecteur,
  SEQUENCES_DEFAUT,
  sequencePourEtape,
  variante,
  attribuerConversion,
  decisionRemise,
  libelleExpiration,
  modeleAvecCode,
  type EtapeCycle,
  type EtapeSequence,
} from '@ph/core/conversion';
import { prixAbonnement, type Facturation, type ProduitAbonnement } from '@ph/core/facturation';
import { formatDate } from '@ph/core/format';
import { definition, type NomModele } from '@ph/core/notifications';
import { randomUUID } from 'node:crypto';
import {
  FieldValue,
  Timestamp,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { Notifier } from '../comptes/services';
import { lireStatsJours } from '../pro/statistiques';
import { lireCodeActif, reserverCode } from './codes';
import { gererTachesCycle } from './taches';

/**
 * Moteur de conversion (CONVERSION §9) : `cycleEtat/{artisanId}` est mis à jour chaque jour
 * (étape, score, offre cible, séquence) puis les séquences avancent aux créneaux d'envoi.
 * Chaque décision, y compris un non-envoi, laisse une trace.
 */

export interface ServicesCycle {
  db: Firestore;
  horloge: () => number;
  notifier: Notifier;
  /** Adresse du site pour les liens des emails. */
  urlSite?: string;
}

const J = 86_400_000;
export const URL_SITE_DEFAUT = 'https://portailhabitat.fr';
const SIX_MOIS = 183 * J;

export interface ConfigCycleLue {
  actif: boolean;
  tailleTemoin: number;
  seuilPremium: number;
  /** Score à partir duquel une tâche d'appel commercial est créée. */
  seuilAppel: number;
  maxOffresProSemaine: number;
  maxNonTransacJour: number;
  veilleApres: number;
  signataire: { nom: string; email: string };
}

export const CONFIG_CYCLE_DEFAUT: ConfigCycleLue = {
  actif: true,
  tailleTemoin: 0.1,
  seuilPremium: 50,
  seuilAppel: 70,
  maxOffresProSemaine: 2,
  maxNonTransacJour: 1,
  veilleApres: 5,
  signataire: { nom: 'Julie', email: 'julie@portailhabitat.fr' },
};

export async function lireConfigCycle(db: Firestore): Promise<ConfigCycleLue> {
  const d = (await db.doc(chemins.configCycle()).get()).data() ?? {};
  return {
    ...CONFIG_CYCLE_DEFAUT,
    ...Object.fromEntries(
      Object.keys(CONFIG_CYCLE_DEFAUT)
        .filter((k) => d[k] !== undefined)
        .map((k) => [k, d[k]]),
    ),
  } as ConfigCycleLue;
}

/** Trace d'une décision du moteur (TTL 6 mois), sans donnée personnelle. */
export function tracer(
  db: Firestore,
  maintenant: number,
  t: {
    artisanId: string;
    type: string;
    fonction: string;
    raison?: string;
    sequenceId?: string;
    modele?: string;
    variante?: string;
    details?: Record<string, unknown>;
  },
) {
  return db.collection(collections.cycleTraces).add({
    schemaVersion: 1,
    artisanId: t.artisanId,
    type: t.type,
    ...(t.raison ? { raison: t.raison } : {}),
    ...(t.sequenceId ? { sequenceId: t.sequenceId } : {}),
    ...(t.modele ? { modele: t.modele } : {}),
    ...(t.variante ? { variante: t.variante } : {}),
    details: t.details ?? {},
    function: t.fonction,
    traceId: randomUUID(),
    createdAt: Timestamp.fromMillis(maintenant),
    expireLe: Timestamp.fromMillis(maintenant + SIX_MOIS),
  });
}

async function etatAbonnement(db: Firestore, artisanId: string) {
  const r = await db.collection(collections.abonnements).where('artisanId', '==', artisanId).get();
  const actifs = r.docs.filter((a) =>
    ['active', 'trialing', 'past_due'].includes(a.get('statut') as string),
  );
  return {
    resiliationDemandee: actifs.some((a) => a.get('annulationFinPeriode') === true),
    ancienAbonne: !actifs.length && r.docs.some((a) => a.get('statut') === 'canceled'),
    abonnements: r.docs.map((a) => ({
      produit: a.get('produit') as 'premium' | 'visibilite',
      periode: a.get('periode') as 'mensuel' | 'annuel',
      statut: a.get('statut') as string,
      creeLe: (a.get('createdAt') as Timestamp | undefined)?.toMillis() ?? 0,
      debutPeriode: (a.get('debutPeriode') as Timestamp | undefined)?.toMillis() ?? 0,
      finPeriode: (a.get('finPeriode') as Timestamp | undefined)?.toMillis() ?? 0,
      annulationFinPeriode: a.get('annulationFinPeriode') === true,
    })),
  };
}

const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis();

/** Étape, score, offre cible et séquence d'une entreprise (`cycleCalculer`, chaque jour). */
export async function synchroniserCycle(
  s: Pick<ServicesCycle, 'db' | 'horloge'>,
  artisan: DocumentSnapshot,
  config: ConfigCycleLue,
  mesures: Partial<
    {
      vues7j: number;
      vues30j: number;
      creditsAchetes30j: number;
      montantAchete30j: number;
    } & PositionSecteur
  > = {},
): Promise<{ etape: EtapeCycle; changee: boolean }> {
  const maintenant = s.horloge();
  const a = artisan.data()!;
  const ref = s.db.collection(collections.cycleEtat).doc(artisan.id);
  const [etat, abo] = await Promise.all([ref.get(), etatAbonnement(s.db, artisan.id)]);
  const plan =
    (a.plan as 'gratuit' | 'visibilite' | 'premium') === 'gratuit' && a.optionVisibilite === true
      ? 'visibilite'
      : a.plan;
  const { abonnements, ...etatAbo } = abo;
  const etape = etapeCycle({ compte: true, enLigne: a.enLigne === true, plan, ...etatAbo });
  const derniere = ms(etat.get('signaux.derniereConnexion'));
  const score = scoreCycle({
    nbMetiers: (a.metiers as string[] | undefined)?.length ?? 0,
    rayonKm: a.zoneIntervention?.rayonKm,
    ...(typeof a.tempsReponseMoyenMin === 'number'
      ? { tempsReponseMin: a.tempsReponseMoyenMin }
      : {}),
    demandes30j: a.demandesRecuesMois ?? 0,
    completude: a.completude ?? 0,
    ...(derniere !== undefined
      ? { joursSansConnexion: Math.floor((maintenant - derniere) / J) }
      : {}),
  });
  const offre = offreCible({
    score,
    maintenant,
    seuil: config.seuilPremium,
    ...(etat.exists
      ? {
          actuelle: etat.get('offreCible') as 'visibilite' | 'premium',
          ...(ms(etat.get('offreChangeeLe')) !== undefined
            ? { changeeLe: ms(etat.get('offreChangeeLe'))! }
            : {}),
        }
      : {}),
  });
  const t0 = Timestamp.fromMillis(maintenant);
  const ancienne = etat.get('etape') as EtapeCycle | undefined;
  const changee = ancienne !== etape;
  const seqId = sequencePourEtape(etape, offre);
  const precedents = (etat.get('signaux') as Record<string, number> | undefined) ?? {};
  const derniers = Object.fromEntries(
    Object.entries(
      (etat.get('derniersSignaux') as Record<string, Timestamp> | undefined) ?? {},
    ).map(([k, v]) => [k, v.toMillis()]),
  );
  const concurrent =
    mesures.position !== undefined && mesures.misesEnAvant !== undefined
      ? signauxDeclenches(
          etape,
          {
            ...(precedents.position !== undefined ? { position: precedents.position } : {}),
            ...(precedents.misesEnAvant !== undefined
              ? { misesEnAvant: precedents.misesEnAvant }
              : {}),
          },
          { position: mesures.position, misesEnAvant: mesures.misesEnAvant },
          { maintenant, dernier: derniers },
        )[0]
      : undefined;
  const renouvellement = signalRenouvellement(abonnements, {
    maintenant,
    ...(derniers['prem-renouvellement'] !== undefined
      ? { dernier: derniers['prem-renouvellement'] }
      : {}),
  });
  const passageAnnuel = signalPassageAnnuel(abonnements, {
    dejaEnvoye: derniers['passage-annuel'] !== undefined,
  });
  const depense = {
    credits30j: mesures.creditsAchetes30j ?? 0,
    montant30jCentimes: mesures.montantAchete30j ?? 0,
  };
  const signal = concurrent
    ? { modele: concurrent.modele, extra: { recul: concurrent.recul } }
    : signalCredits(etape, depense, {
          maintenant,
          ...(derniers['prem-credits'] !== undefined ? { dernier: derniers['prem-credits'] } : {}),
        })
      ? { modele: 'prem-credits', extra: depense }
      : signalGarantie(etape, (a.demandesRecuesMois as number | undefined) ?? 0, {
            maintenant,
            ...(derniers['garantie-tenue'] !== undefined
              ? { dernier: derniers['garantie-tenue'] }
              : {}),
          })
        ? {
            modele: 'garantie-tenue',
            extra: { demandesMois: a.demandesRecuesMois as number, lien: '/pro/demandes' },
          }
        : renouvellement
          ? {
              modele: 'prem-renouvellement',
              extra: {
                date: formatDate(renouvellement, 'long'),
                lien: '/pro/abonnement/premium?facturation=annuel',
              },
            }
          : passageAnnuel
            ? {
                modele: 'passage-annuel',
                // Changement de formule dans le portail client Stripe (page Facturation).
                extra: { produit: passageAnnuel, lien: '/pro/facturation' },
              }
            : undefined;
  const commun = {
    schemaVersion: 1,
    score,
    offreCible: offre,
    signaux: {
      ...precedents,
      ...mesures,
      ...(precedents.position !== undefined ? { positionPrec: precedents.position } : {}),
    },
    ...(signal
      ? {
          signal: {
            modele: signal.modele,
            du: Timestamp.fromMillis(creneauEnvoi(maintenant, 'signal')),
            extra: signal.extra,
          },
          derniersSignaux: { [signal.modele]: t0 },
        }
      : {}),
    ...(etat.get('offreCible') !== offre ? { offreChangeeLe: t0 } : {}),
    updatedAt: t0,
  };
  if (!etat.exists || changee) {
    await ref.set(
      {
        ...commun,
        etape,
        depuis: t0,
        sequence: seqId ? { id: seqId, etape: 0, prochainEnvoi: t0 } : null,
        ...(!etat.exists
          ? {
              groupeTemoin: dansGroupeTemoin(artisan.id, config.tailleTemoin),
              derniereRemise: null,
              derniereOffreRetention: null,
              emailsNonOuvertsConsecutifs: 0,
              enVeille: false,
              exclu: false,
            }
          : {}),
      },
      { merge: true },
    );
    await tracer(s.db, maintenant, {
      artisanId: artisan.id,
      type: 'etape_changee',
      fonction: 'cycleCalculer',
      ...(seqId ? { sequenceId: seqId } : {}),
      details: { avant: ancienne ?? null, apres: etape, score, offreCible: offre },
    });
  } else await ref.set(commun, { merge: true });
  await gererTachesCycle(s, artisan, config.seuilAppel);
  return { etape, changee };
}

/**
 * `cycleOnAbonnement` (appelé par le webhook Stripe) : étape recalculée tout de suite, pour que
 * plus aucune offre ne parte après un paiement ; un passage à un abonnement payant est tracé.
 */
export async function synchroniserArtisan(
  s: Pick<ServicesCycle, 'db' | 'horloge'>,
  artisanId: string,
): Promise<EtapeCycle | null> {
  const artisan = await s.db.doc(chemins.artisan(artisanId)).get();
  if (!artisan.exists || artisan.get('statut') !== 'actif') return null;
  const { etape, changee } = await synchroniserCycle(s, artisan, await lireConfigCycle(s.db));
  if (changee && (etape === 'visibilite' || etape === 'premium')) {
    const maintenant = s.horloge();
    const [emails, abos, etat] = await Promise.all([
      s.db
        .collection(collections.cycleTraces)
        .where('artisanId', '==', artisanId)
        .where('createdAt', '>=', Timestamp.fromMillis(maintenant - 7 * J))
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get(),
      s.db.collection(collections.abonnements).where('artisanId', '==', artisanId).get(),
      s.db.collection(collections.cycleEtat).doc(artisanId).get(),
    ]);
    // Revenu : l'abonnement actif le plus récent, au prix du catalogue (HT).
    const abo = abos.docs
      .filter((a) => ['active', 'trialing'].includes(a.get('statut') as string))
      .sort((a, b) => (ms(b.get('debutPeriode')) ?? 0) - (ms(a.get('debutPeriode')) ?? 0))[0];
    const catalogue = abo
      ? prixAbonnement(abo.get('produit') as ProduitAbonnement, abo.get('periode') as Facturation)
          .montantHt
      : 0;
    // Code personnel utilisé pour ce produit : le montant payé est remisé.
    const code = lireCodeActif(etat);
    const montantHtCentimes =
      code?.utilise && abo && code.produit === abo.get('produit')
        ? Math.round((catalogue * (100 - code.pourcentage)) / 100)
        : catalogue;
    const modele = attribuerConversion(
      emails.docs
        .filter((d) => d.get('type') === 'email_planifie')
        .map((d) => ({ modele: d.get('modele') as string, le: ms(d.get('createdAt'))! })),
      maintenant,
    );
    await tracer(s.db, maintenant, {
      artisanId,
      type: 'conversion',
      fonction: 'cycleOnAbonnement',
      ...(modele ? { modele } : {}),
      details: { etape, montantHtCentimes, temoin: etat.get('groupeTemoin') === true },
    });
  }
  return etape;
}

/** Séquence lue dans `sequences/{id}`, ou la séquence par défaut tant qu'elle n'y est pas. */
async function lireSequence(
  db: Firestore,
  id: string,
  cache: Map<string, { etapes: EtapeSequence[]; actif: boolean } | null>,
) {
  if (!cache.has(id)) {
    const d = await db.collection(collections.sequences).doc(id).get();
    cache.set(
      id,
      d.exists && d.get('supprimee') !== true
        ? { etapes: d.get('etapes') as EtapeSequence[], actif: d.get('actif') === true }
        : SEQUENCES_DEFAUT[id]
          ? { etapes: SEQUENCES_DEFAUT[id].etapes, actif: true }
          : null,
    );
  }
  return cache.get(id)!;
}

export interface BilanPlanification {
  examines: number;
  planifies: number;
  bloques: number;
  termines: number;
}

type IssueEnvoi = 'planifie' | 'pression' | 'bloque' | 'annule';

/**
 * Un email de conversion pour une entreprise : interrupteur, témoin, veille et pression, puis
 * chiffres réels obligatoires, puis `notifier()` au prochain créneau. Chaque issue est tracée.
 */
export async function tenterEnvoi(
  s: ServicesCycle,
  config: ConfigCycleLue,
  etat: DocumentSnapshot,
  e: {
    modele: string;
    refObjet: string;
    type: 'calendrier' | 'signal';
    sequenceId?: string;
    ab?: string[];
    extra?: Record<string, unknown>;
    /** Remplace les valeurs de l'entreprise (ville du chantier, lien de l'offre). */
    surcharge?: Record<string, unknown>;
  },
): Promise<IssueEnvoi> {
  const maintenant = s.horloge();
  const base = {
    artisanId: etat.id,
    fonction: 'cyclePlanifier',
    modele: e.modele,
    ...(e.sequenceId ? { sequenceId: e.sequenceId } : {}),
  };
  const artisan = await s.db.doc(chemins.artisan(etat.id)).get();
  const uid = artisan.get('proprietaireUid') as string | undefined;
  const envois = uid
    ? (
        await s.db
          .collection(collections.emails)
          .where('uid', '==', uid)
          .where('createdAt', '>', Timestamp.fromMillis(maintenant - 7 * J))
          .get()
      ).docs.map((x) => ({
        le: ms(x.get('envoyerLe')) ?? 0,
        categorie: x.get('categorie') as string,
      }))
    : [];
  const decision = !config.actif
    ? ({ ok: false, raison: 'interrupteur' } as const)
    : !uid
      ? ({ ok: false, raison: 'preferences' } as const)
      : controlerPression({
          categorie: definition(e.modele as NomModele).categorie,
          maintenant,
          envois,
          emailsNonOuverts: (etat.get('emailsNonOuvertsConsecutifs') as number | undefined) ?? 0,
          groupeTemoin: etat.get('groupeTemoin') === true,
          maxSemaine: config.maxOffresProSemaine,
          maxJour: config.maxNonTransacJour,
          veilleApres: config.veilleApres,
        });
  if (!decision.ok) {
    await tracer(s.db, maintenant, { ...base, type: 'email_bloque', raison: decision.raison });
    return decision.raison === 'pression' ? 'pression' : 'bloque';
  }
  // Remise : une au plus tous les 90 jours ; le rappel reprend le code encore valable.
  const remise = modeleAvecCode(e.modele)
    ? decisionRemise(e.modele, {
        maintenant,
        ...(ms(etat.get('derniereRemise')) !== undefined
          ? { derniereRemise: ms(etat.get('derniereRemise'))! }
          : {}),
        ...(lireCodeActif(etat) ? { codeActif: lireCodeActif(etat)! } : {}),
        produit: etat.get('offreCible') === 'premium' ? 'premium' : 'visibilite',
      })
    : ({ type: 'aucune' } as const);
  if (e.modele === 'vis-offre-rappel' && !(await offreLue(s.db, uid!, maintenant))) {
    await tracer(s.db, maintenant, { ...base, type: 'email_annule', raison: 'offre_non_ouverte' });
    return 'annule';
  }
  if (remise.type === 'refus') {
    await tracer(s.db, maintenant, { ...base, type: 'email_annule', raison: 'remise_refusee' });
    return 'annule';
  }
  const urlSite = s.urlSite ?? URL_SITE_DEFAUT;
  const lienCode = (produit: string, code: string) =>
    `${urlSite}/pro/abonnement/${produit}?facturation=annuel&code=${code}`;
  const offre =
    remise.type === 'aucune'
      ? {}
      : {
          code: remise.type === 'reprise' ? remise.code : 'RESERVE',
          pourcentage: remise.pourcentage,
          expire: libelleExpiration(remise.expire),
        };
  // Chiffres réels de l'entreprise : sans eux, pas d'envoi (CONVERSION §1.2).
  const proprietaire = await s.db.doc(chemins.user(uid!)).get();
  const signaux = (etat.get('signaux') as Record<string, unknown> | undefined) ?? {};
  const contexte = {
    ...signaux,
    recherches30j: signaux.recherchesSecteur30j,
    ...e.extra,
    prenom:
      ((proprietaire.get('nomAffiche') as string | undefined) ?? '').split(' ')[0] || undefined,
    nomCommercial: (artisan.get('nomCommercial') as string | undefined) ?? '',
    metier: (artisan.get('metierPrincipal') as string | undefined) ?? '',
    ville: (artisan.get('adresseSiege.ville') as string | undefined) ?? '',
    nbAvis: (artisan.get('nbAvis') as number | undefined) ?? 0,
    offre: etat.get('offreCible') as string,
    signataire: config.signataire.nom,
    lien:
      remise.type === 'reprise'
        ? lienCode(remise.produit, remise.code)
        : `${urlSite}/pro/abonnement`,
    ...offre,
    ...e.surcharge,
  };
  if (e.modele === 'resiliation-alternative') {
    // Abonnement résilié en fin de période : produit et date de fin réels (S8).
    const abo = (
      await s.db.collection(collections.abonnements).where('artisanId', '==', etat.id).get()
    ).docs.find((d) => d.get('annulationFinPeriode') === true && d.get('statut') === 'active');
    if (abo)
      Object.assign(contexte, {
        produit: abo.get('produit') as string,
        finLe: formatDate((abo.get('finPeriode') as Timestamp).toMillis(), 'long'),
        lien: `${urlSite}/pro/facturation`,
      });
  }
  const preparees = preparerDonnees(e.modele, contexte);
  if (!preparees.ok) {
    await tracer(s.db, maintenant, {
      ...base,
      type: 'email_annule',
      raison: 'plus_valable',
      details: { manque: preparees.manque },
    });
    return 'annule';
  }
  if (remise.type === 'nouveau') {
    // Le code n'est réservé qu'une fois toutes les autres conditions remplies.
    const code = await reserverCode(s.db, maintenant, {
      artisanId: etat.id,
      nom: contexte.nomCommercial,
      modele: e.modele,
      pourcentage: remise.pourcentage,
      dureeMois: remise.dureeMois,
      produit: remise.produit,
      expire: remise.expire,
    });
    preparees.donnees.code = code;
    preparees.donnees.lien = lienCode(remise.produit, code);
  }
  const v = variante(etat.id, e.modele, e.ab);
  const envoyerLe = new Date(creneauEnvoi(maintenant, e.type));
  await s.notifier({
    modele: e.modele as NomModele,
    destinataire: { uid: uid!, artisanId: etat.id },
    refObjet: e.refObjet,
    ...(v ? { variante: v } : {}),
    envoyerLe,
    donnees: preparees.donnees,
  });
  await tracer(s.db, maintenant, {
    ...base,
    type: 'email_planifie',
    ...(v ? { variante: v } : {}),
    details: { envoyerLe: envoyerLe.toISOString(), declencheur: e.type },
  });
  return 'planifie';
}

/** Le rappel ne part que si l'offre de lancement a été ouverte ou cliquée (CONVERSION S4). */
async function offreLue(db: Firestore, uid: string, maintenant: number): Promise<boolean> {
  const r = await db
    .collection(collections.emails)
    .where('uid', '==', uid)
    .where('modele', '==', 'vis-offre-lancement')
    .get();
  return r.docs.some(
    (d) =>
      (ms(d.get('createdAt')) ?? 0) > maintenant - 14 * J &&
      (d.get('ouvertLe') || d.get('cliqueLe') || ['ouvert', 'clic'].includes(d.get('statut'))),
  );
}

/**
 * `cyclePlanifier` (7 h 00 et 18 h 15) : signaux en attente, puis étapes dues des séquences.
 */
export async function planifierCycle(s: ServicesCycle, limite = 200): Promise<BilanPlanification> {
  const maintenant = s.horloge();
  const config = await lireConfigCycle(s.db);
  const bilan: BilanPlanification = { examines: 0, planifies: 0, bloques: 0, termines: 0 };
  const compter = (issue: IssueEnvoi) => {
    if (issue === 'planifie') bilan.planifies++;
    else if (issue !== 'annule') bilan.bloques++;
  };

  // Signaux (« T ») : prioritaires sur le calendrier, envoyés une seule fois.
  const signaux = await s.db
    .collection(collections.cycleEtat)
    .where('signal.du', '<=', Timestamp.fromMillis(maintenant))
    .limit(limite)
    .get();
  for (const etat of signaux.docs) {
    bilan.examines++;
    const sig = etat.get('signal') as { modele: string; extra?: Record<string, unknown> };
    const lien = sig.extra?.lien as string | undefined;
    if (etat.get('pause') || etat.get('exclu') === true) continue;
    compter(
      await tenterEnvoi(s, config, etat, {
        modele: sig.modele,
        refObjet: `cycle/${etat.id}/signal/${sig.modele}/${(etat.get('signal.du') as Timestamp).toMillis()}`,
        type: 'signal',
        ...(sig.extra ? { extra: sig.extra } : {}),
        ...(lien ? { surcharge: { lien: `${s.urlSite ?? URL_SITE_DEFAUT}${lien}` } } : {}),
      }),
    );
    await etat.ref.update({ signal: FieldValue.delete() });
  }

  const dus = await s.db
    .collection(collections.cycleEtat)
    .where('sequence.prochainEnvoi', '<=', Timestamp.fromMillis(maintenant))
    .limit(limite)
    .get();
  const cache = new Map<string, { etapes: EtapeSequence[]; actif: boolean } | null>();
  for (const etat of dus.docs) {
    bilan.examines++;
    const seq = etat.get('sequence') as { id: string; etape: number };
    const sequence = await lireSequence(s.db, seq.id, cache);
    const ref = etat.ref;
    if (!sequence || !sequence.actif || etat.get('pause') || etat.get('exclu') === true) {
      // Séquence en pause, supprimée, ou entreprise exclue : on repasse demain.
      await ref.update({ 'sequence.prochainEnvoi': Timestamp.fromMillis(maintenant + J) });
      continue;
    }
    const pas = prochainPas(sequence, seq.etape, ms(etat.get('depuis')) ?? maintenant, maintenant);
    if (pas.type === 'fin') {
      await ref.update({ 'sequence.prochainEnvoi': null });
      bilan.termines++;
      continue;
    }
    if (pas.type === 'attendre') {
      await ref.update({ 'sequence.prochainEnvoi': Timestamp.fromMillis(pas.le) });
      continue;
    }
    const ab = sequence.etapes[pas.index]?.ab;
    const issue = await tenterEnvoi(s, config, etat, {
      modele: pas.modele,
      refObjet: `cycle/${etat.id}/${seq.id}/${pas.index}`,
      type: 'calendrier',
      sequenceId: seq.id,
      ...(ab ? { ab } : {}),
    });
    compter(issue);
    // Pression : nouvel essai demain ; sinon l'étape est passée (envoyée, bloquée ou sans chiffres).
    await ref.update(
      issue === 'pression'
        ? { 'sequence.prochainEnvoi': Timestamp.fromMillis(maintenant + J) }
        : {
            'sequence.etape': pas.index + 1,
            'sequence.prochainEnvoi': Timestamp.fromMillis(maintenant),
          },
    );
  }
  return bilan;
}

/**
 * `cycleCalculer` (5 h) : vues des 7 et 30 derniers jours, position dans le secteur (métier +
 * commune), puis étape, score, offre cible, séquence et signaux de chaque entreprise active.
 */
export async function calculerCycles(
  s: ServicesCycle,
  lot = 200,
): Promise<{ entreprises: number; changements: number }> {
  const config = await lireConfigCycle(s.db);
  const maintenant = s.horloge();
  const jour = (j: number) => new Date(maintenant - j * J).toISOString().slice(0, 10);
  const artisans: DocumentSnapshot[] = [];
  let dernier: DocumentSnapshot | undefined;
  for (;;) {
    let q = s.db
      .collection(collections.artisans)
      .where('statut', '==', 'actif')
      .orderBy('__name__')
      .limit(lot);
    if (dernier) q = q.startAfter(dernier);
    const r = await q.get();
    artisans.push(...r.docs);
    if (r.size < lot) break;
    dernier = r.docs[r.size - 1];
  }
  const vues = new Map<string, { vues7j: number; vues30j: number }>();
  const scores = new Map<string, number>();
  for (let i = 0; i < artisans.length; i += lot) {
    const tranche = artisans.slice(i, i + lot);
    const publics = await s.db.getAll(...tranche.map((a) => s.db.doc(chemins.artisanPublic(a.id))));
    publics.forEach((p) => scores.set(p.id, (p.get('scoreClassement') as number | undefined) ?? 0));
    await Promise.all(
      tranche.map(async (a) => {
        const jours = await lireStatsJours(s.db, a.id, jour(30));
        const depuis7 = jour(7);
        vues.set(a.id, {
          vues30j: jours.reduce((n, j) => n + j.vuesFiche, 0),
          vues7j: jours.filter((j) => j.jour >= depuis7).reduce((n, j) => n + j.vuesFiche, 0),
        });
      }),
    );
  }
  const achats = new Map<string, AchatAppelOffres[]>();
  const payes = await s.db
    .collection(collections.achatsLeads)
    .where('statut', '==', 'paye')
    .where('createdAt', '>', Timestamp.fromMillis(maintenant - 30 * J))
    .get();
  for (const d of payes.docs) {
    const id = d.get('artisanId') as string;
    achats.set(id, [
      ...(achats.get(id) ?? []),
      {
        moyen: d.get('moyen') as string,
        prixHtCentimes: (d.get('prixHtCentimes') as number | undefined) ?? 0,
        credits: (d.get('credits') as number | undefined) ?? 0,
      },
    ]);
  }
  const secteurs = classerSecteurs(
    artisans
      .filter((a) => a.get('enLigne') === true)
      .map((a) => ({
        id: a.id,
        metier: (a.get('metierPrincipal') as string | undefined) ?? '',
        ville: (a.get('adresseSiege.ville') as string | undefined) ?? '',
        misEnAvant: a.get('plan') === 'premium' || a.get('optionVisibilite') === true,
        score: scores.get(a.id) ?? 0,
        vues7j: vues.get(a.id)?.vues7j ?? 0,
      })),
  );
  let changements = 0;
  for (const a of artisans) {
    const { changee } = await synchroniserCycle(s, a, config, {
      ...vues.get(a.id),
      ...secteurs.get(a.id),
      ...(({ credits30j, montant30jCentimes }) => ({
        creditsAchetes30j: credits30j,
        montantAchete30j: montant30jCentimes,
      }))(depenseAppelsOffres(achats.get(a.id) ?? [])),
    });
    if (changee) changements++;
  }
  return { entreprises: artisans.length, changements };
}
