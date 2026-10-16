'use client';

import {
  appliquerOperations,
  FORMULAIRE_GRATUIT,
  type ChampFormulaire,
  type OperationIa,
  type PageSite,
} from '@ph/core/sites';
import { useMemo } from 'react';
import { rendreDocument } from '@/features/siteArtisan/document';
import type { BrouillonSite } from './useBrouillonSite';

/**
 * Document de l'aperçu : la page du brouillon, ou l'accueil de l'aperçu gratuit de l'IA, appliqué
 * à une copie seulement (jamais au brouillon ni au site, SITE-IA-01).
 */
export function useHtmlApercu(
  b: BrouillonSite,
  page: PageSite,
  o: {
    hote: string;
    offre: 'gratuit' | 'site_pro';
    medias: Record<string, string>;
    champs?: ChampFormulaire[];
    apercuIa: OperationIa[] | null;
  },
): string {
  const { hote, offre, medias, champs, apercuIa } = o;
  return useMemo(() => {
    let n = 0;
    const r = apercuIa ? appliquerOperations(b, apercuIa, () => `apercu${n++}`) : null;
    const base = r?.ok ? r.brouillon : b;
    const p = r?.ok ? base.pages.accueil! : page;
    return rendreDocument(
      {
        hote,
        offre,
        theme: base.theme,
        navigation: base.navigation,
        page: p,
        pages: base.pages,
        nomEntreprise: base.navigation.nom,
      },
      {
        pages: base.pages,
        media: (src) => medias[src] ?? null,
        champs: offre === 'site_pro' && champs ? champs : FORMULAIRE_GRATUIT,
      },
    );
  }, [b, page, hote, offre, medias, champs, apercuIa]);
}
