import type { MotTranscrit } from './plan';

/** Mots de remplissage retirés à la découpe automatique (hésitations). */
const REMPLISSAGE = new Set(['euh', 'heu', 'euhh', 'hum', 'hmm', 'bah', 'ben', 'hein']);

const nettoyer = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');

export const estRemplissage = (texte: string) => REMPLISSAGE.has(nettoyer(texte));

/**
 * Passages de parole à garder (STUDIO.md §3) : coupe les silences plus longs que `silenceMaxMs`
 * et les hésitations (« euh »), avec une marge autour des mots, jamais plus de la moitié de
 * l'écart avec ce qui a été retiré. Point de départ proposé à Claude, qui choisit ensuite les
 * meilleures prises.
 */
export function segmentsParoles(
  mots: readonly MotTranscrit[],
  o: { silenceMaxMs?: number; margeMs?: number },
): { debut: number; fin: number }[] {
  const silenceMax = o.silenceMaxMs ?? 700;
  const marge = o.margeMs ?? 150;
  const groupes: { premier: number; dernier: number }[] = [];
  let courant: { premier: number; dernier: number } | null = null;
  for (let i = 0; i < mots.length; i++) {
    if (estRemplissage(mots[i]!.texte)) {
      courant = null;
      continue;
    }
    if (courant && mots[i]!.debut - mots[courant.dernier]!.fin <= silenceMax) courant.dernier = i;
    else {
      courant = { premier: i, dernier: i };
      groupes.push(courant);
    }
  }
  return groupes.map(({ premier, dernier }) => {
    const a = mots[premier]!;
    const b = mots[dernier]!;
    const avant = premier > 0 ? mots[premier - 1]!.fin : -Infinity;
    const apres = dernier < mots.length - 1 ? mots[dernier + 1]!.debut : Infinity;
    return {
      debut: Math.max(0, Math.round(a.debut - Math.min(marge, (a.debut - avant) / 2))),
      fin: Math.round(b.fin + Math.min(marge, (apres - b.fin) / 2)),
    };
  });
}

/** Transcription lisible par Claude : une ligne par phrase, horodatée en millisecondes. */
export function transcriptionHorodatee(mots: readonly MotTranscrit[]): string {
  const lignes: string[] = [];
  let debut = 0;
  let texte: string[] = [];
  let fin = 0;
  const vider = () => {
    if (texte.length) lignes.push(`[${debut}-${fin}] ${texte.join(' ')}`);
    texte = [];
  };
  for (const m of mots) {
    if (texte.length && m.debut - fin > 700) vider();
    if (!texte.length) debut = m.debut;
    texte.push(m.texte);
    fin = m.fin;
    if (/[.!?…]$/.test(m.texte)) vider();
  }
  vider();
  return lignes.join('\n');
}
