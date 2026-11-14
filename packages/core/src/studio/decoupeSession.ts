import type { MotTranscrit } from './plan';

/**
 * Session tournée d'une traite (STUDIO.md, Session de tournage) : une seule longue prise où
 * l'auteur lit les scripts à la suite. On retrouve où commence et finit chacun, sans IA : la
 * transcription est coupée en autant de morceaux qu'il y a de scripts, dans l'ordre, de façon à
 * ce que chaque morceau contienne le plus de mots de son script (programmation dynamique).
 */

const MARGE_MS = 300;

/** Mot ramené à sa forme simple (minuscules, sans accents ni ponctuation). */
export const motSimple = (m: string) =>
  m
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

function motsUtiles(texte: string): Set<string> {
  return new Set(
    texte
      .split(/\s+/)
      .map(motSimple)
      .filter((m) => m.length >= 3),
  );
}

export interface MorceauSession {
  /** Passage de la prise (ms), marge comprise. */
  debut: number;
  fin: number;
  mots: MotTranscrit[];
}

/**
 * Découpe la transcription en `scripts.length` morceaux consécutifs (un par script, dans
 * l'ordre). Chaque morceau a au moins un mot ; moins de mots que de scripts : `null`.
 */
export function decouperSession(
  mots: readonly MotTranscrit[],
  scripts: readonly string[],
): MorceauSession[] | null {
  const K = scripts.length;
  const N = mots.length;
  if (!K || N < K) return null;
  const simples = mots.map((m) => motSimple(m.texte));
  // pre[k][j] : mots du script k parmi les j premiers mots prononcés.
  const pre = scripts.map((s) => {
    const ens = motsUtiles(s);
    const p = new Array<number>(N + 1).fill(0);
    for (let j = 0; j < N; j++) p[j + 1] = p[j]! + (ens.has(simples[j]!) ? 1 : 0);
    return p;
  });
  const MOINS = -Infinity;
  // f[k][j] : meilleur score avec les k premiers scripts couvrant les j premiers mots.
  let f = new Array<number>(N + 1).fill(MOINS);
  f[0] = 0;
  const retour: number[][] = [];
  for (let k = 0; k < K; k++) {
    const p = pre[k]!;
    const g = new Array<number>(N + 1).fill(MOINS);
    const de = new Array<number>(N + 1).fill(-1);
    let meilleur = MOINS;
    let ou = -1;
    for (let j = 1; j <= N; j++) {
      // Début possible en j-1 (morceau d'au moins un mot).
      const candidat = f[j - 1]! - p[j - 1]!;
      if (candidat > meilleur) {
        meilleur = candidat;
        ou = j - 1;
      }
      if (meilleur > MOINS) {
        g[j] = meilleur + p[j]!;
        de[j] = ou;
      }
    }
    retour.push(de);
    f = g;
  }
  if (f[N] === MOINS) return null;
  const bornes: number[] = [N];
  let j = N;
  for (let k = K - 1; k >= 0; k--) {
    j = retour[k]![j]!;
    bornes.unshift(j);
  }
  return scripts.map((_, k) => {
    const morceau = mots.slice(bornes[k]!, bornes[k + 1]!);
    const avant = mots[bornes[k]! - 1];
    const apres = mots[bornes[k + 1]!];
    // Marge autour du morceau, sans déborder au-delà du milieu du silence voisin.
    const premier = morceau[0]!.debut;
    const dernier = morceau.at(-1)!.fin;
    const debut = Math.max(avant ? (avant.fin + premier) / 2 : 0, premier - MARGE_MS, 0);
    const fin = Math.min(apres ? (dernier + apres.debut) / 2 : Infinity, dernier + MARGE_MS);
    return { debut: Math.round(debut), fin: Math.round(fin), mots: [...morceau] };
  });
}
