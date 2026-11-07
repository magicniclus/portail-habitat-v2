import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Fusion créée au premier appel, et non au chargement du module : sans appel au niveau du module,
 * une page qui n'utilise pas `cn` côté navigateur n'embarque pas tailwind-merge (≈ 9 Ko, D46).
 */
let fusionner: ((classes: string) => string) | null = null;

/** Concatène des classes et résout les conflits Tailwind (la dernière gagne). */
export function cn(...classes: ClassValue[]): string {
  // Les rayons et ombres maison doivent être reconnus pour que les surcharges fonctionnent.
  fusionner ??= extendTailwindMerge({
    extend: {
      theme: {
        radius: ['control', 'card', 'panel', 'pill'],
        color: ['accent', 'accent-action', 'texte', 'fond', 'surface', 'trait'],
      },
    },
  });
  return fusionner(clsx(classes));
}
