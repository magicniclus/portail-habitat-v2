import { ErreurMetier } from '@ph/core/erreurs';
import type { FormatStudio, SerieVideo } from '@ph/core/studio';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { creerProjetStudio, type ProjetStudio, type ServicesStudio } from './projets';

/**
 * Séries d'épisodes (STUDIO.md §13) : une promesse, un nouvel angle par épisode, un repère
 * « épisode N » et un appel à s'abonner pour la suite. Admin SDK uniquement.
 */
export interface SerieStudio {
  id: string;
  nom: string;
  promesse: string;
  episodes: number;
  creeLe: number;
}

export async function creerSerieStudio(
  s: Pick<ServicesStudio, 'db' | 'horloge'>,
  e: { nom: string; promesse: string; auteurUid: string },
): Promise<string> {
  const ref = s.db.collection(collections.studioSeries).doc();
  await ref.set({
    schemaVersion: 1,
    nom: e.nom,
    promesse: e.promesse,
    episodes: 0,
    auteurUid: e.auteurUid,
    creeLe: Timestamp.fromMillis(s.horloge()),
  });
  return ref.id;
}

export async function listerSeriesStudio(db: Firestore): Promise<SerieStudio[]> {
  const q = await db.collection(collections.studioSeries).orderBy('creeLe', 'desc').limit(50).get();
  return q.docs.map((d) => ({
    id: d.id,
    nom: d.get('nom') as string,
    promesse: d.get('promesse') as string,
    episodes: (d.get('episodes') as number | undefined) ?? 0,
    creeLe: (d.get('creeLe') as Timestamp).toMillis(),
  }));
}

export async function supprimerSerieStudio(db: Firestore, id: string) {
  await db.doc(chemins.serieStudio(id)).delete();
}

/** Épisode suivant : numéro réservé en transaction, vidéo créée, Claude propose la suite. */
export async function episodeSuivantStudio(
  s: ServicesStudio,
  e: { serieId: string; auteurUid: string; format: FormatStudio; camera: boolean },
): Promise<string> {
  const ref = s.db.doc(chemins.serieStudio(e.serieId));
  const { nom, numero } = await s.db.runTransaction(async (tx) => {
    const d = await tx.get(ref);
    if (!d.exists) throw new ErreurMetier('INTROUVABLE', 'Cette série n’existe plus.');
    tx.update(ref, { episodes: FieldValue.increment(1) });
    return {
      nom: d.get('nom') as string,
      numero: ((d.get('episodes') as number | undefined) ?? 0) + 1,
    };
  });
  return creerProjetStudio(s, {
    auteurUid: e.auteurUid,
    titre: `${nom} · épisode ${numero}`.slice(0, 100),
    format: e.format,
    camera: e.camera,
    serie: { id: e.serieId, nom, numero },
  });
}

/** Contexte donné à Claude : promesse de la série et épisodes déjà faits (titres). */
export async function contexteSerieStudio(
  db: Firestore,
  p: Pick<ProjetStudio, 'id' | 'serie'>,
): Promise<SerieVideo | null> {
  if (!p.serie) return null;
  const [serie, episodes] = await Promise.all([
    db.doc(chemins.serieStudio(p.serie.id)).get(),
    db.collection(collections.studioProjets).where('serie.id', '==', p.serie.id).limit(100).get(),
  ]);
  const precedents = episodes.docs
    .filter((d) => d.id !== p.id && ((d.get('serie.numero') as number) ?? 0) < p.serie!.numero)
    .sort((a, b) => (a.get('serie.numero') as number) - (b.get('serie.numero') as number))
    .map((d) => (d.get('sujet.titre') as string | undefined) ?? (d.get('titre') as string));
  return {
    nom: p.serie.nom,
    promesse: (serie.get('promesse') as string | undefined) ?? '',
    numero: p.serie.numero,
    precedents,
  };
}
