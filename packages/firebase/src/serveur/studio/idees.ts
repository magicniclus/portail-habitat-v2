import { createHash } from 'node:crypto';
import { ErreurMetier } from '@ph/core/erreurs';
import type { FormatStudio, SujetStudio } from '@ph/core/studio';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import {
  lireProjetStudio,
  projetAvecSujetStudio,
  type ServicesStudio,
  type TendanceAffichee,
} from './projets';

/**
 * Idées gardées (STUDIO.md §1) : un sujet proposé par Claude, mis de côté pour être tourné plus
 * tard sans rappeler l'IA. Admin SDK uniquement ; une même idée (même titre) n'est gardée qu'une fois.
 */
export interface IdeeStudio {
  id: string;
  sujet: SujetStudio;
  theme: string | null;
  /** Liens des vidéos qui ont inspiré l'idée, pour les regarder plus tard. */
  liens: { titre: string; lien: string }[];
  auteurUid: string;
  gardeeLe: number;
  /** Vidéos lancées depuis cette idée. */
  utilisations: number;
}

const idIdee = (titre: string) =>
  createHash('sha256').update(titre.trim().toLowerCase()).digest('hex').slice(0, 24);

const liensInspirations = (sujet: SujetStudio, tendances: TendanceAffichee[]) =>
  (sujet.inspirations ?? []).flatMap((titre) => {
    const lien = tendances.find((t) => t.titre === titre)?.lien;
    return lien ? [{ titre, lien }] : [];
  });

export async function garderIdeeStudio(
  s: ServicesStudio,
  e: { projetId: string; index: number; auteurUid: string },
): Promise<string> {
  const p = await lireProjetStudio(s.db, e.projetId);
  const sujet = p?.sujets[e.index];
  if (!p || !sujet) throw new ErreurMetier('INTROUVABLE', 'Cette idée n’existe plus.');
  const id = idIdee(sujet.titre);
  const ref = s.db.doc(chemins.ideeStudio(id));
  await s.db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    tx.set(ref, {
      schemaVersion: 1,
      sujet,
      theme: p.theme ?? null,
      liens: liensInspirations(sujet, p.tendances),
      auteurUid: e.auteurUid,
      utilisations: 0,
      gardeeLe: Timestamp.fromMillis(s.horloge()),
    });
  });
  return id;
}

export async function supprimerIdeeStudio(s: ServicesStudio, e: { ideeId: string }) {
  await s.db.doc(chemins.ideeStudio(e.ideeId)).delete();
}

export async function listerIdeesStudio(db: Firestore): Promise<IdeeStudio[]> {
  const q = await db
    .collection(collections.studioIdees)
    .orderBy('gardeeLe', 'desc')
    .limit(200)
    .get();
  return q.docs.map((d) => ({
    id: d.id,
    sujet: d.get('sujet') as SujetStudio,
    theme: (d.get('theme') as string | null) ?? null,
    liens: (d.get('liens') as IdeeStudio['liens'] | undefined) ?? [],
    auteurUid: d.get('auteurUid') as string,
    gardeeLe: (d.get('gardeeLe') as Timestamp).toMillis(),
    utilisations: (d.get('utilisations') as number | undefined) ?? 0,
  }));
}

/** Tourner une idée gardée : nouvelle vidéo prête à tourner, sans appel à Claude. */
export async function tournerIdeeStudio(
  s: ServicesStudio,
  e: { ideeId: string; auteurUid: string; format: FormatStudio; camera: boolean },
): Promise<string> {
  const ref = s.db.doc(chemins.ideeStudio(e.ideeId));
  const d = await ref.get();
  if (!d.exists) throw new ErreurMetier('INTROUVABLE', 'Cette idée a été supprimée.');
  const id = await projetAvecSujetStudio(s, {
    auteurUid: e.auteurUid,
    sujet: d.get('sujet') as SujetStudio,
    format: e.format,
    camera: e.camera,
    theme: (d.get('theme') as string | null) ?? null,
    origine: { ideeId: e.ideeId },
  });
  await ref.update({ utilisations: FieldValue.increment(1) });
  return id;
}
