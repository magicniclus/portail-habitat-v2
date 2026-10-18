import type { ReactNode } from 'react';

/** Section mesurée (temps de lecture, dernière section vue avant la sortie). */
export function Zone({ id, children }: { id: string; children: ReactNode }) {
  return <div data-ph-section={id}>{children}</div>;
}
