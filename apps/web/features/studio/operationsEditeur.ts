import {
  ajouterCalque,
  ajouterCapture,
  couperPlan,
  modifierPlanVideo,
  supprimerCalque,
  supprimerPlan,
  type Calque,
  type PlanMontage,
  type SceneCapture,
} from '@ph/core/studio';
import type { Selection } from './FriseMontage';

/** Position de la tête de lecture : plan sous la tête et temps dans ce plan. */
export type Ici = { index: number; tPlan: number };
type Resultat = { plan: PlanMontage; selection: Selection };

/** Pose un effet à la tête de lecture, avec sa durée par défaut (rognée à la fin du plan). */
export function poserEffet(p: PlanMontage, ici: Ici, c: Calque): Resultat {
  const x = p.plans[ici.index]!;
  const d = x.source.fin - x.source.debut;
  const debut = Math.min(ici.tPlan, Math.max(0, d - 400));
  return {
    plan: ajouterCalque(p, ici.index, { ...c, debut, fin: Math.min(d, debut + (c.fin - c.debut)) }),
    selection: { type: 'calque', i: ici.index, k: x.calques.length },
  };
}

/** Nouveau plan à la tête de lecture : le plan courant est coupé, la suite devient le nouveau. */
export function poserPlan(p: PlanMontage, ici: Ici, scene: SceneCapture | null): Resultat {
  const coupe = couperPlan(p, ici.index, ici.tPlan);
  const i = coupe.plans.length > p.plans.length ? ici.index + 1 : ici.index;
  return {
    plan: scene
      ? ajouterCapture(coupe, i, scene)
      : modifierPlanVideo(coupe, i, { visuel: 'carton', carton: 'Votre texte', camera: 'cachee' }),
    selection: { type: 'plan', i },
  };
}

/** Efface l'élément choisi (un montage garde toujours au moins un plan). */
export function effacer(p: PlanMontage, s: Selection): PlanMontage {
  if (!s) return p;
  return s.type === 'calque' ? supprimerCalque(p, s.i, s.k) : supprimerPlan(p, s.i);
}
