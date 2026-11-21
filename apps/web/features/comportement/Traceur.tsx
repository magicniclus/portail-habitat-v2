'use client';

import { PAGES_SUIVIES, type PageSuivie } from '@ph/core/comportement';
import { initTracker } from '@ph/tracker';
import { useEffect } from 'react';
import { consentementActuel } from '@/features/cookies/consentement';

/**
 * Mesure du comportement d'une page publique (COMPORTEMENT §2) : ne démarre qu'avec le
 * consentement « Mesure d'audience détaillée » ; rien n'est rendu.
 */
export function Traceur({ page, variante }: { page: PageSuivie; variante?: string }) {
  useEffect(
    () =>
      initTracker({
        page,
        app: PAGES_SUIVIES[page],
        ...(variante ? { variante } : {}),
        consentement: () => consentementActuel()?.audienceDetaillee === true,
      }),
    [page, variante],
  );
  return null;
}
