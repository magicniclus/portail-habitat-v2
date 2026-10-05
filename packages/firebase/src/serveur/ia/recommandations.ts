import { ErreurMetier } from '@ph/core/erreurs';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { auditerAdmin } from '../admin/audit';

/** Actions depuis une recommandation (IA_ADMIN §5) : rien n'est appliqué sans un humain. */
export type ActionRecommandation =
  | { id: string; action: 'tache' | 'ab_test' | 'faite' }
  | { id: string; action: 'ignorer'; motif: string };

export async function agirSurRecommandation(
  s: { db: Firestore; horloge: () => number },
  e: ActionRecommandation & { acteurUid: string },
): Promise<void> {
  const ref = s.db.collection(collections.iaRecommandations).doc(e.id);
  const t = Timestamp.fromMillis(s.horloge());
  await s.db.runTransaction(async (tx) => {
    const r = await tx.get(ref);
    if (!r.exists) throw new ErreurMetier('INTROUVABLE');
    const titre = r.get('titre') as string;
    const perimetre = r.get('perimetre') as string;
    let apres: Record<string, unknown>;
    if (e.action === 'tache') {
      tx.create(s.db.collection(collections.filesModeration).doc(`ia-${e.id}`), {
        schemaVersion: 1,
        createdAt: t,
        type: 'recommandation_ia',
        refs: { recommandationId: e.id, perimetre },
        priorite: Math.min(5, (r.get('priorite') as number) + 1),
        statut: 'a_traiter',
        permissionRequise: 'ia.utiliser',
      });
      apres = { statut: 'en_cours' };
    } else if (e.action === 'ab_test') {
      // Brouillon prérempli (page, hypothèse) ; un humain le complète avant tout lancement.
      const page = perimetre.startsWith('landing:') ? perimetre.slice(8) : perimetre;
      tx.create(s.db.collection(collections.abTests).doc(`ia-${e.id}`), {
        schemaVersion: 1,
        createdAt: t,
        updatedAt: t,
        page,
        nom: titre.slice(0, 120),
        variantes: [
          { id: 'A', poids: 0.5, description: 'Version actuelle' },
          { id: 'B', poids: 0.5, description: (r.get('action.details') as string).slice(0, 400) },
        ],
        objectif: r.get('etape') as string,
        statut: 'brouillon',
        debut: t,
        creePar: e.acteurUid,
      });
      apres = { statut: 'en_cours' };
    } else if (e.action === 'faite') apres = { statut: 'faite', faiteLe: t };
    else if (e.action === 'ignorer') {
      apres = { statut: 'ignoree', motifIgnore: e.motif };
      // Le motif alimente les consignes : « ne plus proposer » (config/ia.consignes).
      tx.set(
        s.db.doc(chemins.configIa()),
        { consignes: FieldValue.arrayUnion(`${titre} — ${e.motif}`.slice(0, 300)) },
        { merge: true },
      );
    } else throw new ErreurMetier('ENTREE_INVALIDE');
    tx.update(ref, { ...apres, updatedAt: t });
    auditerAdmin(
      s.db,
      {
        acteurUid: e.acteurUid,
        action: 'adminRecommandationIa',
        cible: `${collections.iaRecommandations}/${e.id}`,
        avant: { statut: r.get('statut') as string },
        apres: { action: e.action, ...apres },
      },
      s.horloge(),
      tx,
    );
  });
}

export interface AnalyseLue {
  id: string;
  mode: string;
  perimetres: string[];
  question?: string;
  modele: string;
  resume: string;
  etapes: { etape: string; score: number; constat: string }[];
  gainTotal?: string;
  questionsOuvertes: string[];
  coutCentimes: number;
  statut: string;
  createdAt: number;
}
export interface RecommandationLue {
  id: string;
  titre: string;
  perimetre: string;
  etape: string;
  gainEstime: string;
  priorite: number;
  impact: string;
  effort: string;
  confiance: number;
  constat: string;
  preuves: { source: string; ref: string; valeur: string }[];
  action: { type: string; details: string };
  propositionTexte?: string;
  statut: string;
}

const versAnalyse = (d: FirebaseFirestore.DocumentSnapshot): AnalyseLue => {
  const x = d.data()!;
  return {
    id: d.id,
    mode: x.mode,
    perimetres: x.perimetres,
    ...(x.question ? { question: x.question } : {}),
    modele: x.modele,
    resume: x.resume,
    etapes: x.etapes ?? [],
    ...(x.gainTotal ? { gainTotal: x.gainTotal } : {}),
    questionsOuvertes: x.questionsOuvertes ?? [],
    coutCentimes: x.coutCentimes,
    statut: x.statut,
    createdAt: (x.createdAt as Timestamp).toMillis(),
  };
};

/** Une analyse et ses recommandations, les plus prioritaires d'abord. */
export async function lireAnalyseIa(db: Firestore, id: string) {
  const [a, recos] = await Promise.all([
    db.collection(collections.iaAnalyses).doc(id).get(),
    db.collection(collections.iaRecommandations).where('analyseId', '==', id).get(),
  ]);
  if (!a.exists) return null;
  return {
    analyse: versAnalyse(a),
    recommandations: recos.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<RecommandationLue, 'id'>) }))
      .sort((x, y) => x.priorite - y.priorite),
  };
}

/** Historique des analyses (les 20 dernières). */
export async function listerAnalysesIa(db: Firestore): Promise<AnalyseLue[]> {
  const r = await db
    .collection(collections.iaAnalyses)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();
  return r.docs.map(versAnalyse);
}
