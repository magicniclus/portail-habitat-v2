import type { Firestore } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import type { ServicesStudio } from './projets';

/** Thèmes de la session de tournage, gardés d'une fois sur l'autre (un document par auteur). */
export interface ThemeEnregistre {
  theme: string;
  nombre: number;
}

export async function lireThemesStudio(db: Firestore, uid: string): Promise<ThemeEnregistre[]> {
  const d = await db.doc(chemins.reglagesStudio(uid)).get();
  return (d.get('themes') as ThemeEnregistre[] | undefined) ?? [];
}

export async function enregistrerThemesStudio(
  s: Pick<ServicesStudio, 'db'>,
  e: { auteurUid: string; themes: ThemeEnregistre[] },
): Promise<void> {
  await s.db
    .doc(chemins.reglagesStudio(e.auteurUid))
    .set({ schemaVersion: 1, themes: e.themes }, { merge: true });
}
