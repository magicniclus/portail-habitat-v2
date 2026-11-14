import { actions, type Theme } from '@ph/ui/tokens';
import type { Viewport } from 'next';

/** viewport-fit=cover (zones sûres iOS) et couleur de la barre du navigateur par espace (MOBILE.md §8). */
export function viewportEspace(theme: Theme): Viewport {
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: actions[theme],
  };
}
