import { debutsPlans } from './montage';
import type { MotTranscrit, PlanMontage } from './plan';

/**
 * Mots placés sur la vidéo finale : un mot est gardé si son milieu tombe dans un passage du plan,
 * puis recalé sur le temps de sortie (les coupes disparaissent).
 */
export function motsSortie(
  p: Pick<PlanMontage, 'plans'>,
  mots: readonly MotTranscrit[],
): MotTranscrit[] {
  const debuts = debutsPlans(p);
  const r: MotTranscrit[] = [];
  p.plans.forEach((x, i) => {
    const { debut, fin } = x.source;
    for (const m of mots) {
      const milieu = (m.debut + m.fin) / 2;
      if (milieu < debut || milieu >= fin) continue;
      const decalage = debuts[i]! - debut;
      r.push({
        texte: m.texte,
        debut: Math.max(m.debut, debut) + decalage,
        fin: Math.min(m.fin, fin) + decalage,
      });
    }
  });
  return r;
}

export interface LigneSousTitre {
  debut: number;
  fin: number;
  mots: MotTranscrit[];
}

/** Lignes courtes (karaoké) : coupées au nombre de mots, de caractères ou à une pause. */
export function lignesSousTitres(
  mots: readonly MotTranscrit[],
  o: { motsMax?: number; caracteresMax?: number; pauseMs?: number } = {},
): LigneSousTitre[] {
  const motsMax = o.motsMax ?? 4;
  const carMax = o.caracteresMax ?? 26;
  const pause = o.pauseMs ?? 700;
  const lignes: LigneSousTitre[] = [];
  let l: LigneSousTitre | null = null;
  for (const m of mots) {
    const longueur: number = l
      ? l.mots.map((x) => x.texte).join(' ').length + 1 + m.texte.length
      : 0;
    if (
      !l ||
      l.mots.length >= motsMax ||
      longueur > carMax ||
      m.debut - l.fin > pause ||
      /[.!?…]$/.test(l.mots.at(-1)!.texte)
    ) {
      l = { debut: m.debut, fin: m.fin, mots: [m] };
      lignes.push(l);
    } else {
      l.mots.push(m);
      l.fin = m.fin;
    }
  }
  return lignes;
}

const horodatage = (ms: number) => {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor(ms / 60_000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(ms % 1000, 3)}`;
};

/** Fichier de sous-titres .srt (à joindre à la publication : meilleure portée sur les réseaux). */
export function srt(lignes: readonly LigneSousTitre[]): string {
  return lignes
    .map(
      (l, i) =>
        `${i + 1}\n${horodatage(l.debut)} --> ${horodatage(l.fin)}\n${l.mots.map((m) => m.texte).join(' ')}\n`,
    )
    .join('\n');
}

/** Lignes courtes en vertical (lisibles sur téléphone), plus longues en horizontal. */
export function reglagesSousTitres(format: 'vertical' | 'horizontal' | 'carre') {
  return format === 'vertical'
    ? { motsMax: 3, caracteresMax: 18 }
    : format === 'carre'
      ? { motsMax: 4, caracteresMax: 22 }
      : { motsMax: 5, caracteresMax: 34 };
}
