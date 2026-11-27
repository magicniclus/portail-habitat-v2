'use client';

import type { Theme } from '@ph/ui/tokens';
import { useEffect, type ReactNode } from 'react';

/**
 * Pose le thème de l'espace sur le contenu rendu côté serveur, et sur <html> pour que
 * les fenêtres (portails Radix, ouverts après hydratation) le reçoivent aussi.
 */
export function EspaceTheme({ theme, children }: { theme: Theme; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <div data-theme={theme} className="contents">
      {children}
    </div>
  );
}
