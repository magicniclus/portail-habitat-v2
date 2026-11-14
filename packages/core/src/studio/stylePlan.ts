import type { StyleMontage } from './catalogue';
import type { PlanMontage } from './plan';

/**
 * Plan de Claude ramené au style voulu, quoi qu'il ait répondu : jamais de musique ; en « écran
 * filmé », ni appareil, ni zoom, ni animation autre qu'un texte (et la scène de fin, sur le
 * dernier plan seulement).
 */
export function planSelonStyle(p: PlanMontage, style: StyleMontage): PlanMontage {
  const sansMusique = { ...p, musique: false };
  if (style !== 'ecran') return sansMusique;
  const dernier = p.plans.length - 1;
  return {
    ...sansMusique,
    plans: p.plans.map(({ appareil: _a, zoom: _z, ...x }, i) => ({
      ...x,
      calques: x.calques.filter((c) => c.type === 'texte' || (c.type === 'fin' && i === dernier)),
    })),
  };
}
