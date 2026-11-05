import type { PlacementCamera, Visuel } from './catalogue';
import {
  DUREE_MAX_MS,
  DUREE_MIN_MS,
  FORMATS_STUDIO,
  PLAN_MIN_MS,
  type FormatStudio,
} from './formats';
import { planMontage, type PlanMontage } from './plan';

/** Durée de la vidéo finale : somme des passages gardés. */
export function dureePlan(p: Pick<PlanMontage, 'plans'>): number {
  return p.plans.reduce((n, x) => n + Math.max(0, x.source.fin - x.source.debut), 0);
}

/**
 * Où en est-on à l'instant `t` (ms) de la vidéo finale : plan, temps dans le plan et dans la prise.
 * Au-delà de la fin, la dernière image.
 */
export function positionSource(
  p: Pick<PlanMontage, 'plans'>,
  t: number,
): { index: number; tPlan: number; tSource: number } {
  let debut = 0;
  for (let i = 0; i < p.plans.length; i++) {
    const s = p.plans[i]!.source;
    const d = s.fin - s.debut;
    if (t < debut + d) {
      const tPlan = Math.max(0, t - debut);
      return { index: i, tPlan, tSource: s.debut + tPlan };
    }
    debut += d;
  }
  const i = p.plans.length - 1;
  const s = p.plans[i]!.source;
  return { index: i, tPlan: s.fin - s.debut, tSource: s.fin };
}

/** Début de chaque plan dans la vidéo finale. */
export function debutsPlans(p: Pick<PlanMontage, 'plans'>): number[] {
  const r: number[] = [];
  let t = 0;
  for (const x of p.plans) {
    r.push(t);
    t += x.source.fin - x.source.debut;
  }
  return r;
}

const sec = (ms: number) => `${Math.round(ms / 100) / 10} s`;

/**
 * Vérifications après le schéma : durée totale, passages dans la prise, captures connues, caméra
 * disponible, calques dans leur plan. Liste vide = plan accepté. Les messages sont renvoyés à
 * Claude pour qu'il corrige.
 */
export function verifierPlan(
  brut: unknown,
  contexte: { dureePriseMs: number; camera: boolean },
): string[] {
  const r = planMontage.safeParse(brut);
  if (!r.success) return r.error.issues.map((i) => `${i.path.join('.') || 'plan'} : ${i.message}`);
  const p = r.data;
  const erreurs: string[] = [];
  const duree = dureePlan(p);
  if (duree < DUREE_MIN_MS || duree > DUREE_MAX_MS)
    erreurs.push(`La vidéo dure ${sec(duree)} : elle doit durer entre 10 s et 3 min.`);
  const captures = new Set(p.captures.map((c) => c.id));
  const ids = new Set<string>();
  for (const x of p.plans) {
    const nom = `Plan « ${x.id} »`;
    if (ids.has(x.id)) erreurs.push(`${nom} : identifiant en double.`);
    ids.add(x.id);
    const d = x.source.fin - x.source.debut;
    if (d <= 0) erreurs.push(`${nom} : fin avant son début.`);
    else if (d < PLAN_MIN_MS) erreurs.push(`${nom} : trop court (${sec(d)}).`);
    if (x.source.fin > contexte.dureePriseMs)
      erreurs.push(`${nom} : dépasse la fin de la prise (${sec(contexte.dureePriseMs)}).`);
    if (x.visuel === 'capture' && (!x.captureId || !captures.has(x.captureId)))
      erreurs.push(`${nom} : capture « ${x.captureId ?? '?'} » absente de la liste des captures.`);
    if (x.visuel === 'carton' && !x.carton) erreurs.push(`${nom} : texte du carton manquant.`);
    if (!contexte.camera && (x.visuel === 'camera' || x.camera !== 'cachee'))
      erreurs.push(`${nom} : la prise est sans caméra, utilisez « cachee ».`);
    for (const c of x.calques) {
      if (c.fin <= c.debut || c.fin > Math.max(0, d))
        erreurs.push(`${nom} : un calque « ${c.type} » sort du plan (0 à ${sec(d)}).`);
    }
  }
  return erreurs;
}

export interface Rectangle {
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

/**
 * Où placer le visuel principal et la caméra, en pixels de la vidéo finale. Utilisé par l'aperçu
 * et par le rendu : les deux tombent juste.
 */
export function disposition(
  format: FormatStudio,
  visuel: Visuel,
  camera: PlacementCamera,
): { principal: Rectangle | null; camera: Rectangle | null } {
  const { largeur: L, hauteur: H } = FORMATS_STUDIO[format];
  const tout: Rectangle = { x: 0, y: 0, largeur: L, hauteur: H };
  if (visuel === 'camera' || camera === 'plein') return { principal: null, camera: tout };
  if (camera === 'cachee') return { principal: tout, camera: null };
  if (camera === 'bas') {
    // Un tiers de la hauteur en vertical, un quart sinon.
    const h = Math.round(format === 'vertical' ? H / 3 : H / 4);
    return {
      principal: { x: 0, y: 0, largeur: L, hauteur: H - h },
      camera: { x: 0, y: H - h, largeur: L, hauteur: h },
    };
  }
  // Coin : vignette en bas à droite, marge de 3 % du petit côté.
  const marge = Math.round(Math.min(L, H) * 0.03);
  const largeur = Math.round(Math.min(L, H) * 0.3);
  const hauteur = Math.round((largeur * 4) / 3);
  return {
    principal: tout,
    camera: { x: L - largeur - marge, y: H - hauteur - marge * 4, largeur, hauteur },
  };
}
