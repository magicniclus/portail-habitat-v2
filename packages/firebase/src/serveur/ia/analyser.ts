import { ErreurMetier } from '@ph/core/erreurs';
import { jourIso } from '@ph/core/format';
import {
  cleCacheAnalyse,
  controlerSortie,
  coutCentimes,
  MODELE_APPROFONDI,
  MODELE_DEFAUT,
  PERIMETRES_IA,
  PROMPT_VERSION,
  promptSysteme,
  schemaJsonSortie,
  sortieAnalyseIa,
  type SortieAnalyseIa,
  type UsageIa,
} from '@ph/core/ia';
import type { EntreeAnalyseIa } from '@ph/core/schemas';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import type { ClientIa } from './client';
import { lireContextesIa } from './contexte';

/** Assistant IA de l'admin (IA_ADMIN §3) : quota, budget, cache 24 h, contrôle de la sortie. */
const J = 86_400_000;

export interface ServicesIa {
  db: Firestore;
  horloge: () => number;
  /** Absent tant que `ANTHROPIC_API_KEY` n'est pas posée : l'assistant est coupé. */
  client: ClientIa | null;
}

export interface ConfigIaLue {
  actif: boolean;
  analyseHebdo: boolean;
  modeleDefaut: string;
  modeleApprofondi: string;
  quotaJour: number;
  budgetMensuelCentimes: number;
  consignes: string[];
}

export async function lireConfigIa(db: Firestore): Promise<ConfigIaLue> {
  const d = (await db.doc(chemins.configIa()).get()).data() as Partial<ConfigIaLue> | undefined;
  return {
    actif: d?.actif ?? true,
    analyseHebdo: d?.analyseHebdo ?? true,
    modeleDefaut: d?.modeleDefaut ?? MODELE_DEFAUT,
    modeleApprofondi: d?.modeleApprofondi ?? MODELE_APPROFONDI,
    quotaJour: d?.quotaJour ?? 30,
    budgetMensuelCentimes: d?.budgetMensuelCentimes ?? 1000,
    consignes: d?.consignes ?? [],
  };
}

export const refBudget = (db: Firestore, mois: string) =>
  db.collection(collections.iaQuotas).doc(`budget_${mois}`);
export const refQuota = (db: Firestore, uid: string, jour: string) =>
  db.collection(collections.iaQuotas).doc(`${uid}_${jour}`);

/** Analyses déjà lancées aujourd'hui par un membre (quota). */
export async function lireQuotaJourIa(db: Firestore, uid: string, maintenant: number) {
  return (
    ((await refQuota(db, uid, jourIso(maintenant)).get()).get('utilisations') as
      number | undefined) ?? 0
  );
}

/** Dépense du mois en cours, pour l'écran (alerte à 80 %, coupure à 100 %). */
export async function lireBudgetIa(db: Firestore, maintenant: number) {
  const [config, budget] = await Promise.all([
    lireConfigIa(db),
    refBudget(db, jourIso(maintenant).slice(0, 7)).get(),
  ]);
  return {
    depenseCentimes: (budget.get('coutCentimes') as number | undefined) ?? 0,
    budgetCentimes: config.budgetMensuelCentimes,
  };
}

const demande = (e: EntreeAnalyseIa, ecarts?: string[]) =>
  [
    `Mode : ${e.mode === 'audit' ? 'audit' : 'rapide'}.`,
    e.question
      ? `Question de l’équipe : ${e.question}`
      : 'Pas de question précise : analyse le périmètre fourni.',
    ...(ecarts?.length
      ? [
          'Ta réponse précédente a été refusée pour ces raisons, corrige-les :',
          ...ecarts.map((x) => `- ${x}`),
        ]
      : []),
  ].join('\n');

/**
 * Lance une analyse. Même question, même périmètre et même mode dans les 24 h : le résultat
 * enregistré est renvoyé sans nouvel appel (IA-02), sauf « Relancer ». Une sortie non conforme
 * est redemandée une fois, puis l'analyse échoue sans rien enregistrer d'inventé.
 */
export async function analyserIa(
  s: ServicesIa,
  e: EntreeAnalyseIa,
  acteurUid: string,
): Promise<{ analyseId: string; depuisCache: boolean }> {
  const config = await lireConfigIa(s.db);
  if (!config.actif || !s.client)
    throw new ErreurMetier(
      'INDISPONIBLE',
      'L’assistant IA n’est pas encore activé (clé API absente ou assistant coupé).',
    );
  const maintenant = s.horloge();
  const perimetres = e.perimetres.length ? e.perimetres : [...PERIMETRES_IA];
  const cle = cleCacheAnalyse({ ...e, perimetres });
  const analyses = s.db.collection(collections.iaAnalyses);

  if (!e.relancer) {
    const deja = await analyses
      .where('cleCache', '==', cle)
      .where('statut', '==', 'ok')
      .where('createdAt', '>=', Timestamp.fromMillis(maintenant - J))
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    if (!deja.empty) return { analyseId: deja.docs[0]!.id, depuisCache: true };
  }

  const jour = jourIso(maintenant);
  const [budget, quota] = await Promise.all([
    refBudget(s.db, jour.slice(0, 7)).get(),
    refQuota(s.db, acteurUid, jour).get(),
  ]);
  if (((budget.get('coutCentimes') as number | undefined) ?? 0) >= config.budgetMensuelCentimes)
    throw new ErreurMetier(
      'PRECONDITION',
      'Budget mensuel de l’assistant atteint : il reprendra le mois prochain (ou relevez le budget dans les réglages).',
    );
  if (((quota.get('utilisations') as number | undefined) ?? 0) >= config.quotaJour)
    throw new ErreurMetier(
      'TROP_DE_REQUETES',
      `Vous avez utilisé vos ${config.quotaJour} analyses du jour.`,
    );

  const modele = e.approfondie ? config.modeleApprofondi : config.modeleDefaut;
  const contexte = await lireContextesIa(s.db, perimetres);
  const usage: UsageIa = { entree: 0, sortie: 0, cacheEcrit: 0, cacheLu: 0 };
  let sortie: SortieAnalyseIa | null = null;
  let ecarts: string[] = [];
  for (let essai = 0; essai < 2 && !sortie; essai++) {
    const r = await s.client({
      modele,
      systeme: promptSysteme(config.consignes),
      contexte: `Contexte (agrégats, aucune donnée personnelle) :\n${contexte.texte}`,
      demande: demande(e, essai ? ecarts : undefined),
      schema: schemaJsonSortie(),
      maxTokens: e.mode === 'audit' ? 16_000 : 8000,
    });
    for (const k of Object.keys(usage) as (keyof UsageIa)[]) usage[k] += r.usage[k];
    if (r.refus) {
      ecarts = ['le modèle a décliné la demande'];
      continue;
    }
    let brut: unknown;
    try {
      brut = JSON.parse(r.texte);
    } catch {
      ecarts = ['la réponse n’est pas un JSON valide'];
      continue;
    }
    const lu = sortieAnalyseIa.safeParse(brut);
    if (!lu.success) {
      ecarts = lu.error.issues.slice(0, 5).map((i) => `${i.path.join('.')} : ${i.message}`);
      continue;
    }
    ecarts = controlerSortie(lu.data, e.mode, contexte.texte);
    if (!ecarts.length) sortie = lu.data;
  }

  const cout = coutCentimes(modele, usage);
  const ref = analyses.doc();
  const t = Timestamp.fromMillis(maintenant);
  const lot = s.db.batch();
  lot.set(ref, {
    schemaVersion: 1,
    createdAt: t,
    updatedAt: t,
    mode: e.mode,
    perimetres,
    ...(e.question ? { question: e.question } : {}),
    approfondie: e.approfondie,
    demandePar: acteurUid,
    modele,
    promptVersion: PROMPT_VERSION,
    resume: sortie?.resume ?? '',
    etapes: sortie?.etapes ?? [],
    ...(sortie?.gainTotal ? { gainTotal: sortie.gainTotal } : {}),
    questionsOuvertes: sortie?.questionsOuvertes ?? [],
    tokensEntree: usage.entree + usage.cacheEcrit + usage.cacheLu,
    tokensSortie: usage.sortie,
    coutCentimes: cout,
    dureeMs: s.horloge() - maintenant,
    cleCache: cle,
    sources: contexte.sources,
    statut: sortie ? 'ok' : 'erreur',
    ...(sortie ? {} : { erreur: ecarts.slice(0, 5).join(' · ') }),
  });
  for (const r of sortie?.recommandations ?? [])
    lot.set(s.db.collection(collections.iaRecommandations).doc(), {
      schemaVersion: 1,
      createdAt: t,
      updatedAt: t,
      analyseId: ref.id,
      ...r,
      statut: 'nouvelle',
    });
  lot.set(
    refBudget(s.db, jour.slice(0, 7)),
    {
      schemaVersion: 1,
      coutCentimes: FieldValue.increment(cout),
      expireLe: Timestamp.fromMillis(maintenant + 400 * J),
    },
    { merge: true },
  );
  lot.set(
    refQuota(s.db, acteurUid, jour),
    {
      schemaVersion: 1,
      utilisations: FieldValue.increment(1),
      expireLe: Timestamp.fromMillis(maintenant + 2 * J),
    },
    { merge: true },
  );
  await lot.commit();
  if (!sortie)
    throw new ErreurMetier(
      'INDISPONIBLE',
      'L’assistant n’a pas rendu d’analyse exploitable. Réessayez ou reformulez la question.',
    );
  return { analyseId: ref.id, depuisCache: false };
}
