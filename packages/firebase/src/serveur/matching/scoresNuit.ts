import { labelsAuto, scoresNuit, syntheseScores, type AttributionScore } from '@ph/core/matching';
import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections, GROUPE_ATTRIBUTIONS } from '../../chemins';

/**
 * Scores de nuit (MATCHING [10], chaque nuit à 3 h) : attributions des 90 derniers jours regroupées
 * par entreprise → `artisanScores/{id}`, puis recopie sur `artisans/{id}` seulement si une valeur a
 * changé (chaque écriture relance la projection publique : COUTS).
 */

const JOUR_MS = 86_400_000;
const PAGE = 1000;

export interface BilanScores {
  artisans: number;
  modifies: number;
}

const ms = (t: unknown) => (t as Timestamp | undefined)?.toMillis?.();

async function attributionsRecentes(db: Firestore, depuis: number) {
  const parArtisan = new Map<string, AttributionScore[]>();
  let curseur: DocumentSnapshot | undefined;
  for (;;) {
    let q = db
      .collectionGroup(GROUPE_ATTRIBUTIONS)
      .where('proposeeLe', '>=', Timestamp.fromMillis(depuis))
      .orderBy('proposeeLe')
      .limit(PAGE);
    if (curseur) q = q.startAfter(curseur);
    const page = await q.get();
    for (const d of page.docs) {
      if (d.ref.parent.parent?.parent.id !== collections.demandes) continue;
      const artisanId = d.get('artisanId') as string;
      const reponduLe = ms(d.get('reponduLe'));
      const appelOffresId = d.get('appelOffresId') as string | undefined;
      const liste = parArtisan.get(artisanId) ?? [];
      liste.push({
        statut: d.get('statut') as string,
        proposeeLe: ms(d.get('proposeeLe'))!,
        ...(reponduLe !== undefined ? { reponduLe } : {}),
        ...(appelOffresId ? { appelOffresId } : {}),
      });
      parArtisan.set(artisanId, liste);
    }
    if (page.size < PAGE) return parArtisan;
    curseur = page.docs[page.docs.length - 1];
  }
}

const memes = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

export async function calculerScoresNuit(s: {
  db: Firestore;
  horloge: () => number;
}): Promise<BilanScores> {
  const maintenant = s.horloge();
  const parArtisan = await attributionsRecentes(s.db, maintenant - 90 * JOUR_MS);
  // Entreprises sans attribution récente mais encore marquées chargées : remises à zéro.
  const charges = await s.db
    .collection(collections.artisans)
    .where('attributions7j', '>', 0)
    .select()
    .get();
  for (const d of charges.docs) if (!parArtisan.has(d.id)) parArtisan.set(d.id, []);
  const ids = [...parArtisan.keys()];
  const ecriture = s.db.bulkWriter();
  let modifies = 0;
  const horodatage = Timestamp.fromMillis(maintenant);
  for (let i = 0; i < ids.length; i += 100) {
    const docs = await s.db.getAll(
      ...ids.slice(i, i + 100).map((id) => s.db.doc(chemins.artisan(id))),
    );
    for (const a of docs) {
      if (!a.exists) continue;
      const scores = scoresNuit(parArtisan.get(a.id) ?? [], maintenant);
      const avis = {
        noteMoyenne: (a.get('noteMoyenne') as number | undefined) ?? 0,
        nbAvis: (a.get('nbAvis') as number | undefined) ?? 0,
        tauxRecommandation: a.get('tauxRecommandation') as number | undefined,
      };
      void ecriture.set(s.db.collection(collections.artisanScores).doc(a.id), {
        schemaVersion: 1,
        ...syntheseScores(scores, avis),
        ...scores,
        calculeLe: horodatage,
      });
      const labels = (a.get('labels') as string[] | undefined) ?? [];
      const recopie = {
        attributions7j: scores.attributions7j,
        tauxRefus30j: scores.tauxRefus30j,
        ...(scores.tauxReponse !== undefined ? { tauxReponse: scores.tauxReponse } : {}),
        ...(scores.tempsReponseMoyenMin !== undefined
          ? { tempsReponseMoyenMin: scores.tempsReponseMoyenMin }
          : {}),
      };
      const nouveauxLabels = labelsAuto(labels, scores, avis);
      const change =
        Object.entries(recopie).some(([k, v]) => a.get(k) !== v) || !memes(labels, nouveauxLabels);
      if (!change) continue;
      modifies += 1;
      void ecriture.update(a.ref, { ...recopie, labels: nouveauxLabels, updatedAt: horodatage });
    }
  }
  await ecriture.close();
  return { artisans: ids.length, modifies };
}
