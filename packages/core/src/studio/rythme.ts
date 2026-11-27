import { debutsPlans } from './montage';
import type { PlanMontage } from './plan';

/**
 * Rythme des vidéos courtes (STUDIO.md §5) : un changement visuel au moins toutes les 3 s (plan,
 * calque, zoom) et un texte dès la première image. Avertissements seulement : l'auteur décide.
 */
export const RYTHME_MAX_MS = 3_000;
/** Un texte apparu avant cet instant compte comme visible « dès la première image ». */
const ACCROCHE_MS = 300;

const sec = (ms: number) => `${Math.round(ms / 100) / 10} s`;

export function verifierRythme(p: Pick<PlanMontage, 'plans'>): {
  lents: { debut: number; fin: number }[];
  accroche: boolean;
  messages: string[];
} {
  const debuts = debutsPlans(p);
  const changements = new Set<number>();
  p.plans.forEach((x, i) => {
    const d = debuts[i]!;
    changements.add(d);
    for (const c of x.calques) changements.add(d + c.debut);
  });
  const fin = debuts.at(-1)! + (p.plans.at(-1)!.source.fin - p.plans.at(-1)!.source.debut);
  const t = [...changements].filter((x) => x < fin).sort((a, b) => a - b);
  t.push(fin);
  const lents: { debut: number; fin: number }[] = [];
  for (let i = 1; i < t.length; i++)
    if (t[i]! - t[i - 1]! > RYTHME_MAX_MS) lents.push({ debut: t[i - 1]!, fin: t[i]! });
  const premier = p.plans[0]!;
  const accroche =
    premier.visuel === 'carton' ||
    premier.calques.some((c) => c.debut < ACCROCHE_MS && 'texte' in c);
  const messages = [
    ...(accroche ? [] : ['Aucun texte sur la première image : ajoutez l’accroche en grand.']),
    ...lents.map(
      (l) => `De ${sec(l.debut)} à ${sec(l.fin)} : rien ne bouge, ajoutez une coupe ou un texte.`,
    ),
  ];
  return { lents, accroche, messages };
}
