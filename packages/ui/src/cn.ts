import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Les rayons et ombres maison doivent être reconnus pour que les surcharges fonctionnent.
const fusionner = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['control', 'card', 'panel', 'pill'],
      color: ['accent', 'accent-action', 'texte', 'fond', 'surface', 'trait'],
    },
  },
});

/** Concatène des classes et résout les conflits Tailwind (la dernière gagne). */
export function cn(...classes: ClassValue[]): string {
  return fusionner(clsx(classes));
}
