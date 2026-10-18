import { ErreurMetier } from '@ph/core/erreurs';
import { jourIso } from '@ph/core/format';
import {
  controlerEffet,
  controlerSuivi,
  coutCentimes,
  demandeEffet,
  demandeSuivi,
  effetDu,
  MAX_SUIVIS,
  promptSysteme,
  SCHEMA_JSON_EFFET,
  SCHEMA_JSON_SUIVI,
  sortieEffetIa,
  sortieSuiviIa,
  type PerimetreIa,
  type UsageIa,
} from '@ph/core/ia';
import type { z } from '@ph/core/zod';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { lireConfigIa, refBudget, refQuota, type ServicesIa } from './analyser';
import { lireContextesIa } from './contexte';

/** Questions de suivi (IA_ADMIN §4) et effet à 30 jours (§5) : même contrat que l'analyse. */
const J = 86_400_000;

/** Un appel, une nouvelle tentative si la sortie est refusée ; jamais rien d'inventé. */
async function appelControle<T>(
  s: ServicesIa,
  a: {
    modele: string;
    consignes: string[];
    contexte: string;
    demande: string;
    schema: Record<string, unknown>;
    lecteur: z.ZodType<T>;
    controler: (x: T) => string[];
  },
): Promise<{ sortie: T | null; cout: number; ecarts: string[] }> {
  const usage: UsageIa = { entree: 0, sortie: 0, cacheEcrit: 0, cacheLu: 0 };
  let ecarts: string[] = [];
  let sortie: T | null = null;
  for (let essai = 0; essai < 2 && !sortie; essai++) {
    const r = await s.client!({
      modele: a.modele,
      systeme: promptSysteme(a.consignes),
      contexte: `Contexte (agrégats, aucune donnée personnelle) :\n${a.contexte}`,
      demande: essai
        ? `${a.demande}\nTa réponse précédente a été refusée, corrige :\n${ecarts.map((x) => `- ${x}`).join('\n')}`
        : a.demande,
      schema: a.schema,
      maxTokens: 2000,
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
    const lu = a.lecteur.safeParse(brut);
    if (!lu.success) {
      ecarts = lu.error.issues.slice(0, 5).map((i) => `${i.path.join('.')} : ${i.message}`);
      continue;
    }
    ecarts = a.controler(lu.data);
    if (!ecarts.length) sortie = lu.data;
  }
  return { sortie, cout: coutCentimes(a.modele, usage), ecarts };
}

const depenser = (
  db: Firestore,
  lot: FirebaseFirestore.WriteBatch,
  maintenant: number,
  cout: number,
) =>
  lot.set(
    refBudget(db, jourIso(maintenant).slice(0, 7)),
    {
      schemaVersion: 1,
      coutCentimes: FieldValue.increment(cout),
      expireLe: Timestamp.fromMillis(maintenant + 400 * J),
    },
    { merge: true },
  );

export interface SuiviLu {
  question: string;
  reponse: string;
  preuves: { source: string; ref: string; valeur: string }[];
  le: number;
}

/**
 * Question de suivi sur une analyse : même contexte (préfixe en cache), quota et budget de
 * l'assistant, 10 échanges au plus par analyse, chaque valeur citée vérifiée.
 */
export async function poserQuestionSuiviIa(
  s: ServicesIa,
  e: { analyseId: string; question: string },
  acteurUid: string,
): Promise<SuiviLu> {
  const config = await lireConfigIa(s.db);
  if (!config.actif || !s.client)
    throw new ErreurMetier('INDISPONIBLE', 'L’assistant IA n’est pas encore activé.');
  const maintenant = s.horloge();
  const jour = jourIso(maintenant);
  const ref = s.db.collection(collections.iaAnalyses).doc(e.analyseId);
  const [analyse, recos, budget, quota] = await Promise.all([
    ref.get(),
    s.db.collection(collections.iaRecommandations).where('analyseId', '==', e.analyseId).get(),
    refBudget(s.db, jour.slice(0, 7)).get(),
    refQuota(s.db, acteurUid, jour).get(),
  ]);
  if (!analyse.exists || analyse.get('statut') !== 'ok') throw new ErreurMetier('INTROUVABLE');
  const precedents = (analyse.get('suivis') as SuiviLu[] | undefined) ?? [];
  if (precedents.length >= MAX_SUIVIS)
    throw new ErreurMetier(
      'PRECONDITION',
      `${MAX_SUIVIS} questions au plus par analyse : lancez une nouvelle analyse.`,
    );
  if (((budget.get('coutCentimes') as number | undefined) ?? 0) >= config.budgetMensuelCentimes)
    throw new ErreurMetier('PRECONDITION', 'Budget mensuel de l’assistant atteint.');
  if (((quota.get('utilisations') as number | undefined) ?? 0) >= config.quotaJour)
    throw new ErreurMetier(
      'TROP_DE_REQUETES',
      `Vous avez utilisé vos ${config.quotaJour} analyses du jour.`,
    );
  const contexte = await lireContextesIa(s.db, analyse.get('perimetres') as PerimetreIa[]);
  const r = await appelControle(s, {
    modele: analyse.get('modele') as string,
    consignes: config.consignes,
    contexte: contexte.texte,
    demande: demandeSuivi(
      {
        resume: analyse.get('resume') as string,
        recommandations: recos.docs.map((d) => d.get('titre') as string),
      },
      precedents,
      e.question,
    ),
    schema: SCHEMA_JSON_SUIVI,
    lecteur: sortieSuiviIa,
    controler: (x) => controlerSuivi(x, contexte.texte),
  });
  const lot = s.db.batch();
  depenser(s.db, lot, maintenant, r.cout);
  lot.set(
    refQuota(s.db, acteurUid, jour),
    {
      schemaVersion: 1,
      utilisations: FieldValue.increment(1),
      expireLe: Timestamp.fromMillis(maintenant + 2 * J),
    },
    { merge: true },
  );
  const suivi: SuiviLu | null = r.sortie
    ? { question: e.question, ...r.sortie, le: maintenant }
    : null;
  if (suivi)
    lot.update(ref, {
      suivis: FieldValue.arrayUnion(suivi),
      coutCentimes: FieldValue.increment(r.cout),
      updatedAt: Timestamp.fromMillis(maintenant),
    });
  await lot.commit();
  if (!suivi)
    throw new ErreurMetier(
      'INDISPONIBLE',
      'L’assistant n’a pas rendu de réponse vérifiable. Reformulez la question.',
    );
  return suivi;
}

/**
 * Chaque nuit : effet des recommandations « faites » depuis 30 jours (au plus 10 par nuit),
 * comparé au contexte du jour. Une mesure impossible est notée « non mesurable », une seule fois.
 */
export async function mesurerEffetsIa(s: ServicesIa): Promise<{ mesurees: number }> {
  const config = await lireConfigIa(s.db);
  if (!config.actif || !s.client) return { mesurees: 0 };
  const maintenant = s.horloge();
  const faites = await s.db
    .collection(collections.iaRecommandations)
    .where('statut', '==', 'faite')
    .where('faiteLe', '<=', Timestamp.fromMillis(maintenant - 30 * J))
    .limit(30)
    .get();
  const dues = faites.docs
    .filter((d) =>
      effetDu(
        {
          statut: 'faite',
          faiteLe: (d.get('faiteLe') as Timestamp).toMillis(),
          effet: d.get('effet') as unknown,
        },
        maintenant,
      ),
    )
    .slice(0, 10);
  let mesurees = 0;
  for (const d of dues) {
    const budget = await refBudget(s.db, jourIso(maintenant).slice(0, 7)).get();
    if (((budget.get('coutCentimes') as number | undefined) ?? 0) >= config.budgetMensuelCentimes)
      break;
    const analyse = await s.db
      .collection(collections.iaAnalyses)
      .doc(d.get('analyseId') as string)
      .get();
    const preuves = d.get('preuves') as { source: string; ref: string; valeur: string }[];
    const contexte = await lireContextesIa(
      s.db,
      (analyse.get('perimetres') as PerimetreIa[] | undefined) ?? [],
    );
    const r = await appelControle(s, {
      modele: config.modeleDefaut,
      consignes: config.consignes,
      contexte: contexte.texte,
      demande: demandeEffet(
        { titre: d.get('titre') as string, constat: d.get('constat') as string, preuves },
        (d.get('faiteLe') as Timestamp).toMillis(),
      ),
      schema: SCHEMA_JSON_EFFET,
      lecteur: sortieEffetIa,
      controler: (x) => controlerEffet(x, preuves, contexte.texte),
    });
    const lot = s.db.batch();
    depenser(s.db, lot, maintenant, r.cout);
    lot.update(d.ref, {
      effet: {
        ...(r.sortie ?? {
          verdict: 'indetermine',
          resume:
            'Mesure impossible : les valeurs d’alors ne se retrouvent pas dans les données actuelles.',
          mesures: [],
        }),
        mesureLe: Timestamp.fromMillis(maintenant),
      },
      updatedAt: Timestamp.fromMillis(maintenant),
    });
    await lot.commit();
    mesurees++;
  }
  return { mesurees };
}
