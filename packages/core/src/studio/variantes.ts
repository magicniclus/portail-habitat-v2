import type { Calque, PlanMontage } from './plan';

type Variante = NonNullable<PlanMontage['variantes']>[number];

/** Durée d'affichage de l'accroche ajoutée quand le premier plan n'en a pas. */
const ACCROCHE_MS = 2_500;

/**
 * Plan d'une variante (STUDIO.md §5) : même montage, autre accroche sur la première image (carton
 * ou premier texte), autre miniature. Sans les variantes elles-mêmes, pour le rendu.
 */
export function appliquerVariante(plan: PlanMontage, v: Variante): PlanMontage {
  const [premier, ...reste] = plan.plans;
  const base: PlanMontage = { ...plan, variantes: undefined };
  delete base.variantes;
  if (!premier) return base;
  const duree = premier.source.fin - premier.source.debut;
  let p = premier;
  if (premier.visuel === 'carton') p = { ...premier, carton: v.accroche };
  else {
    const i = premier.calques.findIndex((c) => c.type === 'texte' && c.debut < 300);
    p =
      i >= 0
        ? {
            ...premier,
            calques: premier.calques.map((c, j) =>
              j === i && c.type === 'texte' ? { ...c, texte: v.accroche } : c,
            ),
          }
        : {
            ...premier,
            calques: [
              {
                type: 'texte',
                texte: v.accroche,
                style: 'accroche',
                position: 'haut',
                debut: 0,
                fin: Math.min(ACCROCHE_MS, duree),
              } satisfies Calque,
              ...premier.calques,
            ].slice(0, 8),
          };
  }
  return {
    ...base,
    plans: [p, ...reste],
    ...(v.miniature && plan.miniature ? { miniature: { ...plan.miniature, ...v.miniature } } : {}),
  };
}

/** Texte d'accroche de la version principale (premier texte ou carton), pour l'afficher. */
export function accrochePrincipale(plan: PlanMontage): string | null {
  const p = plan.plans[0];
  if (!p) return null;
  if (p.visuel === 'carton' && p.carton) return p.carton;
  const c = p.calques.find((x) => x.type === 'texte' && x.debut < 300);
  return c && c.type === 'texte' ? c.texte : null;
}
