import { SEQUENCES_DEFAUT, type EtapeSequence } from '@ph/core/conversion';
import { ETAPES_CYCLE } from '@ph/core/schemas';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { lireConfigCycle, type ConfigCycleLue } from '../cycle/moteur';

/** Back-office › Conversion (ADMIN §2.8b) : lectures. Comptages par agrégation, jamais de scan. */

const J = 86_400_000;
const PAYANTES = ['visibilite', 'premium'];
const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis();

export interface ApercuConversion {
  parEtape: Record<string, number>;
  envois: number;
  bloques: number;
  annules: number;
  conversions: number;
  codes: number;
  temoin: { effectif: number; payants: number; autres: number; autresPayants: number };
  meilleursModeles: { modele: string; conversions: number }[];
}

export async function lireApercuConversion(
  db: Firestore,
  maintenant: number,
  jours = 30,
): Promise<ApercuConversion> {
  const etats = db.collection(collections.cycleEtat);
  const traces = db.collection(collections.cycleTraces);
  const depuis = Timestamp.fromMillis(maintenant - jours * J);
  const compte = async (q: FirebaseFirestore.Query) => (await q.count().get()).data().count;
  const parType = (type: string) =>
    compte(traces.where('type', '==', type).where('createdAt', '>=', depuis));
  const [etapes, envois, bloques, annules, conversions, codes, temoin, temoinPayants, payants] =
    await Promise.all([
      Promise.all(ETAPES_CYCLE.map((e) => compte(etats.where('etape', '==', e)))),
      parType('email_planifie'),
      parType('email_bloque'),
      parType('email_annule'),
      parType('conversion'),
      parType('code_cree'),
      compte(etats.where('groupeTemoin', '==', true)),
      compte(etats.where('groupeTemoin', '==', true).where('etape', 'in', PAYANTES)),
      compte(etats.where('etape', 'in', PAYANTES)),
    ]);
  const parEtape = Object.fromEntries(ETAPES_CYCLE.map((e, i) => [e, etapes[i]!]));
  const total = Object.values(parEtape).reduce((a, b) => a + b, 0);
  // Conversion attribuée au dernier email planifié dans les 7 jours qui la précèdent.
  const convs = await traces
    .where('type', '==', 'conversion')
    .where('createdAt', '>=', depuis)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  const attributions = new Map<string, number>();
  await Promise.all(
    convs.docs.map(async (c) => {
      const le = ms(c.get('createdAt'))!;
      const dernier = await traces
        .where('artisanId', '==', c.get('artisanId'))
        .where('createdAt', '>=', Timestamp.fromMillis(le - 7 * J))
        .where('createdAt', '<=', Timestamp.fromMillis(le))
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      const email = dernier.docs.find((d) => d.get('type') === 'email_planifie');
      const modele = email?.get('modele') as string | undefined;
      if (modele) attributions.set(modele, (attributions.get(modele) ?? 0) + 1);
    }),
  );
  return {
    parEtape,
    envois,
    bloques,
    annules,
    conversions,
    codes,
    temoin: {
      effectif: temoin,
      payants: temoinPayants,
      autres: total - temoin,
      autresPayants: payants - temoinPayants,
    },
    meilleursModeles: [...attributions]
      .map(([modele, n]) => ({ modele, conversions: n }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5),
  };
}

export interface SequenceAdmin {
  id: string;
  nom: string;
  etapeEntree: string;
  objectif: string;
  actif: boolean;
  etapes: EtapeSequence[];
  version: number;
  /** Séquence par défaut jamais modifiée (pas encore dans `sequences/`). */
  parDefaut: boolean;
  enCours: number;
  envois30j: number;
}

export async function listerSequencesAdmin(
  db: Firestore,
  maintenant: number,
): Promise<SequenceAdmin[]> {
  const docs = await db.collection(collections.sequences).get();
  const lues = new Map(docs.docs.map((d) => [d.id, d]));
  const ids = [...new Set([...Object.keys(SEQUENCES_DEFAUT), ...lues.keys()])].filter(
    (id) => lues.get(id)?.get('supprimee') !== true,
  );
  const depuis = Timestamp.fromMillis(maintenant - 30 * J);
  const liste = await Promise.all(
    ids.map(async (id): Promise<SequenceAdmin> => {
      const d = lues.get(id);
      const defaut = SEQUENCES_DEFAUT[id];
      const [enCours, envois] = await Promise.all([
        db.collection(collections.cycleEtat).where('sequence.id', '==', id).count().get(),
        db
          .collection(collections.cycleTraces)
          .where('sequenceId', '==', id)
          .where('type', '==', 'email_planifie')
          .where('createdAt', '>=', depuis)
          .count()
          .get(),
      ]);
      return {
        id,
        nom: (d?.get('nom') as string | undefined) ?? defaut?.nom ?? id,
        etapeEntree: (d?.get('etapeEntree') as string | undefined) ?? defaut?.etapeEntree ?? '',
        objectif: (d?.get('objectif') as string | undefined) ?? defaut?.objectif ?? '',
        actif: d ? d.get('actif') === true : true,
        etapes: (d?.get('etapes') as EtapeSequence[] | undefined) ?? defaut?.etapes ?? [],
        version: (d?.get('version') as number | undefined) ?? 0,
        parDefaut: !d,
        enCours: enCours.data().count,
        envois30j: envois.data().count,
      };
    }),
  );
  return liste.sort((a, b) => a.id.localeCompare(b.id, 'fr', { numeric: true }));
}

export const FILTRES_JOURNAL_CYCLE = {
  tous: null,
  envois: ['email_planifie'],
  non_envois: ['email_bloque', 'email_annule'],
  signaux: ['etape_changee', 'demande_offerte'],
  conversions: [
    'conversion',
    'code_cree',
    'code_utilise',
    'code_expire',
    'demande_offerte_convertie',
  ],
  admin: ['action_admin', 'tache_creee'],
} as const;
export type FiltreJournalCycle = keyof typeof FILTRES_JOURNAL_CYCLE;

export interface TraceCycle {
  id: string;
  le: number;
  artisanId: string;
  entreprise: string;
  type: string;
  modele: string | null;
  raison: string | null;
  details: Record<string, unknown>;
  fonction: string;
}

async function nomsEntreprises(db: Firestore, ids: string[]) {
  const uniques = [...new Set(ids)];
  if (!uniques.length) return new Map<string, string>();
  const docs = await db.getAll(...uniques.map((id) => db.doc(chemins.artisan(id))));
  return new Map(docs.map((d) => [d.id, (d.get('nomCommercial') as string | undefined) ?? d.id]));
}

export async function lireJournalCycle(
  db: Firestore,
  o: { filtre?: FiltreJournalCycle; artisanId?: string; limite?: number } = {},
): Promise<TraceCycle[]> {
  let q: FirebaseFirestore.Query = db.collection(collections.cycleTraces);
  const types = FILTRES_JOURNAL_CYCLE[o.filtre ?? 'tous'];
  if (o.artisanId) q = q.where('artisanId', '==', o.artisanId);
  else if (types) q = q.where('type', 'in', [...types]);
  const r = await q
    .orderBy('createdAt', 'desc')
    .limit(o.limite ?? 100)
    .get();
  const docs =
    o.artisanId && types
      ? r.docs.filter((d) => (types as readonly string[]).includes(d.get('type') as string))
      : r.docs;
  const noms = await nomsEntreprises(
    db,
    docs.map((d) => d.get('artisanId') as string).filter(Boolean),
  );
  return docs.map((d) => ({
    id: d.id,
    le: ms(d.get('createdAt'))!,
    artisanId: (d.get('artisanId') as string | undefined) ?? '',
    entreprise: noms.get(d.get('artisanId') as string) ?? '—',
    type: d.get('type') as string,
    modele: (d.get('modele') as string | undefined) ?? null,
    raison: (d.get('raison') as string | undefined) ?? null,
    details: (d.get('details') as Record<string, unknown> | undefined) ?? {},
    fonction: d.get('function') as string,
  }));
}

export interface FicheCycle {
  artisanId: string;
  entreprise: string;
  metier: string;
  ville: string;
  plan: string;
  etape: string | null;
  depuis: number | null;
  score: number | null;
  offreCible: string | null;
  groupeTemoin: boolean;
  sequence: { id: string; etape: number; prochainEnvoi: number | null } | null;
  pause: { motif: string; depuis: number } | null;
  exclu: boolean;
  enVeille: boolean;
  emailsNonOuverts: number;
  derniereRemise: number | null;
  signaux: Record<string, number>;
  historique: TraceCycle[];
}

export async function lireFicheCycle(db: Firestore, artisanId: string): Promise<FicheCycle | null> {
  const [artisan, etat] = await Promise.all([
    db.doc(chemins.artisan(artisanId)).get(),
    db.collection(collections.cycleEtat).doc(artisanId).get(),
  ]);
  if (!artisan.exists) return null;
  const seq = etat.get('sequence') as
    { id: string; etape: number; prochainEnvoi: Timestamp | null } | null | undefined;
  const pause = etat.get('pause') as { motif: string; depuis: Timestamp } | undefined;
  const signaux = Object.fromEntries(
    Object.entries((etat.get('signaux') as Record<string, unknown> | undefined) ?? {}).filter(
      (e): e is [string, number] => typeof e[1] === 'number',
    ),
  );
  return {
    artisanId,
    entreprise: (artisan.get('nomCommercial') as string | undefined) ?? artisanId,
    metier: (artisan.get('metierPrincipal') as string | undefined) ?? '',
    ville: (artisan.get('adresseSiege.ville') as string | undefined) ?? '',
    plan:
      artisan.get('plan') === 'gratuit' && artisan.get('optionVisibilite') === true
        ? 'visibilite'
        : ((artisan.get('plan') as string | undefined) ?? 'gratuit'),
    etape: (etat.get('etape') as string | undefined) ?? null,
    depuis: ms(etat.get('depuis')) ?? null,
    score: (etat.get('score') as number | undefined) ?? null,
    offreCible: (etat.get('offreCible') as string | undefined) ?? null,
    groupeTemoin: etat.get('groupeTemoin') === true,
    sequence: seq
      ? { id: seq.id, etape: seq.etape, prochainEnvoi: ms(seq.prochainEnvoi) ?? null }
      : null,
    pause: pause ? { motif: pause.motif, depuis: pause.depuis.toMillis() } : null,
    exclu: etat.get('exclu') === true,
    enVeille: etat.get('enVeille') === true,
    emailsNonOuverts: (etat.get('emailsNonOuvertsConsecutifs') as number | undefined) ?? 0,
    derniereRemise: ms(etat.get('derniereRemise')) ?? null,
    signaux,
    historique: await lireJournalCycle(db, { artisanId, limite: 30 }),
  };
}

const TYPES_TACHES_CONVERSION = [
  'appel_commercial',
  'reponse_commerciale',
  'risque_resiliation',
  'appel_activation',
] as const;

export interface TacheConversion {
  id: string;
  type: string;
  artisanId: string;
  entreprise: string;
  statut: string;
  creeeLe: number;
  assigneA: string | null;
}

export async function listerTachesConversion(db: Firestore): Promise<TacheConversion[]> {
  const r = await db
    .collection(collections.filesModeration)
    .where('type', 'in', [...TYPES_TACHES_CONVERSION])
    .where('statut', 'in', ['a_traiter', 'en_cours'])
    .limit(100)
    .get();
  const noms = await nomsEntreprises(
    db,
    r.docs.map((d) => d.get('refs.artisanId') as string).filter(Boolean),
  );
  return r.docs
    .map((d) => ({
      id: d.id,
      type: d.get('type') as string,
      artisanId: (d.get('refs.artisanId') as string | undefined) ?? '',
      entreprise: noms.get(d.get('refs.artisanId') as string) ?? '—',
      statut: d.get('statut') as string,
      creeeLe: ms(d.get('createdAt')) ?? 0,
      assigneA: (d.get('assigneA') as string | undefined) ?? null,
    }))
    .sort((a, b) => b.creeeLe - a.creeeLe);
}

export const lireReglagesCycle = (db: Firestore): Promise<ConfigCycleLue> => lireConfigCycle(db);
