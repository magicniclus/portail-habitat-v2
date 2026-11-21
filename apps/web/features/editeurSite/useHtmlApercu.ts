'use client';

import {
  appliquerOperations,
  changementsIa,
  FORMULAIRE_GRATUIT,
  type ChampFormulaire,
  type OperationIa,
} from '@ph/core/sites';
import { useMemo } from 'react';
import { rendreDocument } from '@/features/siteArtisan/document';
import type { ContexteRendu } from '@/features/siteArtisan/elements';
import type { BrouillonSite } from './useBrouillonSite';

/**
 * Document de l'aperçu : la page du brouillon ; ou, appliquées à une copie seulement (jamais au
 * brouillon ni au site), l'accueil de l'aperçu gratuit (SITE-IA-01) ou la proposition de l'IA en
 * cours, changements surlignés (IA_SITE §2.3).
 */
export function useHtmlApercu(
  b: BrouillonSite,
  pageId: string,
  o: {
    hote: string;
    offre: 'gratuit' | 'site_pro';
    medias: Record<string, string>;
    champs?: ChampFormulaire[];
    apercuIa: OperationIa[] | null;
    proposition: OperationIa[] | null;
    blog?: ContexteRendu['blog'];
    /** Page cliquable (sélection) ; faux en mode Aperçu. */
    edition?: boolean;
  },
): string {
  const { hote, offre, medias, champs, apercuIa, proposition, blog, edition } = o;
  return useMemo(() => {
    const ops = apercuIa ?? proposition;
    let n = 0;
    const r = ops ? appliquerOperations(b, ops, () => `apercu${n++}`) : null;
    const base = r?.ok ? r.brouillon : b;
    const c =
      r?.ok && !apercuIa
        ? changementsIa(b, base, pageId)
        : { pageId: apercuIa && r?.ok ? 'accueil' : pageId, ids: [] };
    const page = base.pages[c.pageId] ?? base.pages.accueil!;
    return rendreDocument(
      {
        hote,
        offre,
        theme: base.theme,
        navigation: base.navigation,
        page,
        pages: base.pages,
        nomEntreprise: base.navigation.nom,
      },
      {
        pages: base.pages,
        media: (src) => medias[src] ?? null,
        champs: offre === 'site_pro' && champs ? champs : FORMULAIRE_GRATUIT,
        ...(c.ids.length ? { surligner: new Set(c.ids) } : {}),
        ...(blog ? { blog } : {}),
        ...(edition ? { edition } : { apercu: true }),
      },
    );
  }, [b, pageId, hote, offre, medias, champs, apercuIa, proposition, blog, edition]);
}
