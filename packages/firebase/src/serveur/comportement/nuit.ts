import {
  agregerSessions,
  APPAREILS_AGREGES,
  cleAlerte,
  detecterAlertes,
  evaluerTestPage,
  fusionnerAgregats,
  PAGES_SUIVIES,
  partsSorties,
  type Agregat,
  type AppareilAgrege,
  type SessionAgregee,
} from '@ph/core/comportement';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { collections } from '../../chemins';

/** Nuit (COMPORTEMENT §3 et §4) : journée de la veille, cumuls 7/30/90 jours, alertes, tests A/B. */
const J = 86_400_000;
const PERIODES = { '7j': 7, '30j': 30, '90j': 90 } as const;
/** Une friction de gravité 4 ou plus crée une tâche dans la file de travail. */
const GRAVITE_TACHE = 4;

/** `AAAA-MM-JJ` décalé de `n` jours (calcul calendaire). */
export const decalerJour = (jour: string, n: number) =>
  new Date(Date.parse(`${jour}T00:00:00Z`) + n * J).toISOString().slice(0, 10);

type AgregatStocke = Omit<Agregat, 'grilleClics' | 'grilleAttention' | 'grilleMouvements'> & {
  jour?: string;
  grilleClics: string;
  grilleAttention: string;
  grilleMouvements: string;
};
const versStockage = (a: Agregat) => ({
  ...a,
  grilleClics: JSON.stringify(a.grilleClics),
  grilleAttention: JSON.stringify(a.grilleAttention),
  grilleMouvements: JSON.stringify(a.grilleMouvements),
  sorties: partsSorties(a),
});
const depuisStockage = (d: AgregatStocke & { sorties?: unknown }): Agregat => {
  const { jour: _j, sorties: _s, ...reste } = d;
  return {
    ...reste,
    grilleClics: JSON.parse(d.grilleClics) as Record<string, number>,
    grilleAttention: JSON.parse(d.grilleAttention) as Record<string, number>,
    grilleMouvements: JSON.parse(d.grilleMouvements) as Record<string, number>,
  };
};

export interface BilanNuit {
  sessions: number;
  alertes: number;
  tests: number;
}

export async function agregerComportementJour(
  db: Firestore,
  jour: string,
  horloge: () => number = Date.now,
): Promise<BilanNuit> {
  const bilan: BilanNuit = { sessions: 0, alertes: 0, tests: 0 };
  const agregats = db.collection(collections.comportementAgregats);
  const maintenant = Timestamp.fromMillis(horloge());
  for (const page of Object.keys(PAGES_SUIVIES)) {
    const sessions = (
      await db
        .collection(collections.comportementSessions)
        .where('page', '==', page)
        .where('jour', '==', jour)
        .get()
    ).docs.map((d) => d.data() as SessionAgregee);
    bilan.sessions += sessions.length;

    const lot = db.batch();
    const parAppareil = new Map<AppareilAgrege, { jour: string; a: Agregat }[]>();
    for (const appareil of APPAREILS_AGREGES) {
      const duJour = agregerSessions(sessions, appareil);
      if (duJour.sessions)
        lot.set(agregats.doc(`${page}_${jour}_${appareil}`), {
          schemaVersion: 1,
          page,
          appareil,
          periode: 'jour',
          jour,
          jusquAu: jour,
          ...versStockage(duJour),
          updatedAt: maintenant,
        });
      // Les 89 jours précédents (une requête), plus la journée qui vient d'être calculée.
      const passes = await agregats
        .where('page', '==', page)
        .where('appareil', '==', appareil)
        .where('jour', '>=', decalerJour(jour, -89))
        .where('jour', '<', jour)
        .get();
      const jours = passes.docs.map((d) => ({
        jour: d.get('jour') as string,
        a: depuisStockage(d.data() as AgregatStocke),
      }));
      if (duJour.sessions) jours.push({ jour, a: duJour });
      parAppareil.set(appareil, jours);
      for (const [periode, n] of Object.entries(PERIODES)) {
        const debut = decalerJour(jour, 1 - n);
        const cumul = fusionnerAgregats(jours.filter((j) => j.jour >= debut).map((j) => j.a));
        lot.set(agregats.doc(`${page}_${periode}_${appareil}`), {
          schemaVersion: 1,
          page,
          appareil,
          periode,
          jusquAu: jour,
          ...versStockage(cumul),
          updatedAt: maintenant,
        });
      }
    }
    await lot.commit();

    const tous = parAppareil.get('tous')!;
    const entre = (de: number, a: number) =>
      fusionnerAgregats(
        tous
          .filter((j) => j.jour >= decalerJour(jour, de) && j.jour <= decalerJour(jour, a))
          .map((j) => j.a),
      );
    bilan.alertes += await enregistrerAlertes(
      db,
      page,
      detecterAlertes(entre(-6, 0), entre(-34, -7)),
      maintenant,
    );
    bilan.tests += await evaluerTests(db, page, tous, maintenant);
  }
  return bilan;
}

async function enregistrerAlertes(
  db: Firestore,
  page: string,
  alertes: ReturnType<typeof detecterAlertes>,
  maintenant: Timestamp,
) {
  let creees = 0;
  for (const a of alertes) {
    const id = cleAlerte(page, a);
    const ref = db.collection(collections.comportementAlertes).doc(id);
    const existante = await ref.get();
    // Une alerte ignorée le reste ; une alerte ouverte ou traitée est mise à jour (rouverte).
    if (existante.get('statut') === 'ignoree') continue;
    const nouvelle = !existante.exists || existante.get('statut') === 'traitee';
    await ref.set({
      schemaVersion: 1,
      page,
      type: a.type,
      ...(a.element ? { element: a.element } : {}),
      gravite: a.gravite,
      valeur: a.valeur,
      reference: a.reference,
      statut: 'ouverte',
      createdAt: nouvelle ? maintenant : existante.get('createdAt'),
      constateeLe: maintenant,
    });
    if (!nouvelle) continue;
    creees++;
    if (a.gravite >= GRAVITE_TACHE)
      await db
        .collection(collections.filesModeration)
        .doc(`friction-${id}-${maintenant.toMillis()}`)
        .set({
          schemaVersion: 1,
          createdAt: maintenant,
          type: 'friction_page',
          refs: { alerteId: id, page },
          priorite: a.gravite,
          statut: 'a_traiter',
          permissionRequise: 'comportement.lire',
        });
  }
  return creees;
}

/** Tests A/B en cours : résultat bayésien depuis le début du test, bascule seulement proposée. */
async function evaluerTests(
  db: Firestore,
  page: string,
  jours: { jour: string; a: Agregat }[],
  maintenant: Timestamp,
) {
  const tests = await db
    .collection(collections.abTests)
    .where('page', '==', page)
    .where('statut', '==', 'en_cours')
    .get();
  for (const t of tests.docs) {
    const debut = new Date((t.get('debut') as Timestamp).toMillis()).toISOString().slice(0, 10);
    const cumul = fusionnerAgregats(jours.filter((j) => j.jour >= debut).map((j) => j.a));
    const variantes = (t.get('variantes') as { id: string }[]).map((v) => ({
      id: v.id,
      sessions: cumul.variantes[v.id] ?? 0,
      conversions: cumul.conversionsVariantes[v.id] ?? 0,
    }));
    await t.ref.update({
      resultat: { ...evaluerTestPage(variantes), variantes, calculeLe: maintenant },
      updatedAt: maintenant,
    });
  }
  return tests.size;
}
