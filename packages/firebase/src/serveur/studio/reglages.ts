import { FieldValue, type Firestore } from 'firebase-admin/firestore';
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

/** Ce qui rend les scripts « à la façon de l'auteur » : sa description et ses réécritures. */
export interface VoixAuteur {
  voix: string;
  exemples: string[];
}

/** Derniers scripts réécrits gardés comme modèles de ton (les plus récents d'abord). */
const EXEMPLES_MAX = 5;

export async function lireVoixStudio(db: Firestore, uid: string): Promise<VoixAuteur> {
  const d = await db.doc(chemins.reglagesStudio(uid)).get();
  return {
    voix: (d.get('voix') as string | undefined) ?? '',
    exemples: (d.get('exemples') as string[] | undefined) ?? [],
  };
}

export async function enregistrerVoixStudio(
  s: Pick<ServicesStudio, 'db'>,
  e: { auteurUid: string; voix: string },
): Promise<void> {
  await s.db
    .doc(chemins.reglagesStudio(e.auteurUid))
    .set({ schemaVersion: 1, voix: e.voix }, { merge: true });
}

/** Un script réécrit à la main devient un exemple du vrai ton de l'auteur. */
export async function ajouterExempleStudio(
  s: Pick<ServicesStudio, 'db'>,
  e: { auteurUid: string; texte: string },
): Promise<void> {
  const texte = e.texte.replace(/\s+/g, ' ').trim().slice(0, 1_200);
  if (!texte) return;
  const ref = s.db.doc(chemins.reglagesStudio(e.auteurUid));
  await s.db.runTransaction(async (t) => {
    const avant = ((await t.get(ref)).get('exemples') as string[] | undefined) ?? [];
    t.set(
      ref,
      {
        schemaVersion: 1,
        exemples: [texte, ...avant.filter((x) => x !== texte)].slice(0, EXEMPLES_MAX),
        majLe: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}
