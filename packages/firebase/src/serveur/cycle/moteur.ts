import {
  controlerPression,
  creneauEnvoi,
  dansGroupeTemoin,
  etapeCycle,
  offreCible,
  preparerDonnees,
  prochainPas,
  scoreCycle,
  SEQUENCES_DEFAUT,
  sequencePourEtape,
  variante,
  type EtapeCycle,
  type EtapeSequence,
} from '@ph/core/conversion';
import { definition, type NomModele } from '@ph/core/notifications';
import { randomUUID } from 'node:crypto';
import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { Notifier } from '../comptes/services';

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
const URL_SITE_DEFAUT = 'https://portailhabitat.fr';
const SIX_MOIS = 183 * J;

export interface ConfigCycleLue {
  actif: boolean;
  tailleTemoin: number;
  seuilPremium: number;
  maxOffresProSemaine: number;
  maxNonTransacJour: number;
  veilleApres: number;
  signataire: { nom: string; email: string };
}

export const CONFIG_CYCLE_DEFAUT: ConfigCycleLue = {
  actif: true,
  tailleTemoin: 0.1,
  seuilPremium: 50,
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
  };
}

const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis();

/** Étape, score, offre cible et séquence d'une entreprise (`cycleCalculer`, chaque jour). */
export async function synchroniserCycle(
  s: Pick<ServicesCycle, 'db' | 'horloge'>,
  artisan: DocumentSnapshot,
  config: ConfigCycleLue,
): Promise<{ etape: EtapeCycle; changee: boolean }> {
  const maintenant = s.horloge();
  const a = artisan.data()!;
  const ref = s.db.collection(collections.cycleEtat).doc(artisan.id);
  const [etat, abo] = await Promise.all([ref.get(), etatAbonnement(s.db, artisan.id)]);
  const plan =
    (a.plan as 'gratuit' | 'visibilite' | 'premium') === 'gratuit' && a.optionVisibilite === true
      ? 'visibilite'
      : a.plan;
  const etape = etapeCycle({ compte: true, enLigne: a.enLigne === true, plan, ...abo });
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
  const commun = {
    schemaVersion: 1,
    score,
    offreCible: offre,
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
              signaux: {},
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
  return { etape, changee };
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

/**
 * `cyclePlanifier` (7 h 00 et 18 h 15) : pour chaque séquence dont le prochain envoi est dû,
 * étape suivante → contrôles (interrupteur, pause, témoin, veille, pression) → `notifier()` au
 * prochain créneau, ou trace du blocage.
 */
export async function planifierCycle(s: ServicesCycle, limite = 200): Promise<BilanPlanification> {
  const maintenant = s.horloge();
  const config = await lireConfigCycle(s.db);
  const dus = await s.db
    .collection(collections.cycleEtat)
    .where('sequence.prochainEnvoi', '<=', Timestamp.fromMillis(maintenant))
    .limit(limite)
    .get();
  const cache = new Map<string, { etapes: EtapeSequence[]; actif: boolean } | null>();
  const bilan: BilanPlanification = { examines: dus.size, planifies: 0, bloques: 0, termines: 0 };
  for (const etat of dus.docs) {
    const seq = etat.get('sequence') as { id: string; etape: number };
    const sequence = await lireSequence(s.db, seq.id, cache);
    const ref = etat.ref;
    const base = { artisanId: etat.id, fonction: 'cyclePlanifier', sequenceId: seq.id };
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
    const artisan = await s.db.doc(chemins.artisan(etat.id)).get();
    const uid = artisan.get('proprietaireUid') as string | undefined;
    const envois = uid
      ? (
          await s.db
            .collection(collections.emails)
            .where('uid', '==', uid)
            .where('createdAt', '>', Timestamp.fromMillis(maintenant - 7 * J))
            .get()
        ).docs.map((e) => ({
          le: ms(e.get('envoyerLe')) ?? 0,
          categorie: e.get('categorie') as string,
        }))
      : [];
    const decision = !config.actif
      ? ({ ok: false, raison: 'interrupteur' } as const)
      : !uid
        ? ({ ok: false, raison: 'preferences' } as const)
        : controlerPression({
            categorie: definition(pas.modele as NomModele).categorie,
            maintenant,
            envois,
            emailsNonOuverts: (etat.get('emailsNonOuvertsConsecutifs') as number | undefined) ?? 0,
            groupeTemoin: etat.get('groupeTemoin') === true,
            maxSemaine: config.maxOffresProSemaine,
            maxJour: config.maxNonTransacJour,
            veilleApres: config.veilleApres,
          });
    if (!decision.ok) {
      bilan.bloques++;
      await tracer(s.db, maintenant, {
        ...base,
        type: 'email_bloque',
        raison: decision.raison,
        modele: pas.modele,
      });
      // Pression : nouvel essai demain ; témoin, veille, interrupteur : l'étape est passée.
      await ref.update(
        decision.raison === 'pression'
          ? { 'sequence.prochainEnvoi': Timestamp.fromMillis(maintenant + J) }
          : {
              'sequence.etape': pas.index + 1,
              'sequence.prochainEnvoi': Timestamp.fromMillis(maintenant),
            },
      );
      continue;
    }
    // Chiffres réels de l'entreprise : sans eux, pas d'envoi (CONVERSION §1.2).
    const proprietaire = await s.db.doc(chemins.user(uid!)).get();
    const contexte = {
      ...((etat.get('signaux') as Record<string, unknown> | undefined) ?? {}),
      prenom:
        ((proprietaire.get('nomAffiche') as string | undefined) ?? '').split(' ')[0] || undefined,
      nomCommercial: (artisan.get('nomCommercial') as string | undefined) ?? '',
      metier: (artisan.get('metierPrincipal') as string | undefined) ?? '',
      ville: (artisan.get('adresseSiege.ville') as string | undefined) ?? '',
      nbAvis: (artisan.get('nbAvis') as number | undefined) ?? 0,
      offre: etat.get('offreCible') as string,
      signataire: config.signataire.nom,
      lien: `${s.urlSite ?? URL_SITE_DEFAUT}/pro/abonnement`,
    };
    const preparees = preparerDonnees(pas.modele, contexte);
    if (!preparees.ok) {
      await tracer(s.db, maintenant, {
        ...base,
        type: 'email_annule',
        raison: 'plus_valable',
        modele: pas.modele,
        details: { manque: preparees.manque },
      });
      await ref.update({
        'sequence.etape': pas.index + 1,
        'sequence.prochainEnvoi': Timestamp.fromMillis(maintenant),
      });
      continue;
    }
    const v = variante(etat.id, pas.modele, sequence.etapes[pas.index]?.ab);
    const envoyerLe = new Date(creneauEnvoi(maintenant, 'calendrier'));
    await s.notifier({
      modele: pas.modele as NomModele,
      destinataire: { uid: uid!, artisanId: etat.id },
      refObjet: `cycle/${etat.id}/${seq.id}/${pas.index}`,
      ...(v ? { variante: v } : {}),
      envoyerLe,
      donnees: preparees.donnees,
    });
    await tracer(s.db, maintenant, {
      ...base,
      type: 'email_planifie',
      modele: pas.modele,
      ...(v ? { variante: v } : {}),
      details: { envoyerLe: envoyerLe.toISOString(), etape: pas.index },
    });
    await ref.update({
      'sequence.etape': pas.index + 1,
      'sequence.prochainEnvoi': Timestamp.fromMillis(maintenant),
    });
    bilan.planifies++;
  }
  return bilan;
}

/** `cycleCalculer` (5 h) : toutes les entreprises actives, par lots. */
export async function calculerCycles(
  s: ServicesCycle,
  lot = 200,
): Promise<{ entreprises: number; changements: number }> {
  const config = await lireConfigCycle(s.db);
  let dernier: DocumentSnapshot | undefined;
  let entreprises = 0;
  let changements = 0;
  for (;;) {
    let q = s.db
      .collection(collections.artisans)
      .where('statut', '==', 'actif')
      .orderBy('__name__')
      .limit(lot);
    if (dernier) q = q.startAfter(dernier);
    const r = await q.get();
    for (const a of r.docs) {
      const { changee } = await synchroniserCycle(s, a, config);
      entreprises++;
      if (changee) changements++;
    }
    if (r.size < lot) break;
    dernier = r.docs[r.size - 1];
  }
  return { entreprises, changements };
}
