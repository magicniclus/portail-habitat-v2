'use client';

import { majNoeud, trouverNoeud, type Element, type PageSite } from '@ph/core/sites';
import { useCallback } from 'react';
import { depuisHtml, liensUtilises } from './texteRiche';

/** Texte modifié directement sur la page (double-clic dans l'aperçu) : repris dans le brouillon. */
export function useTexteSurPage(majPage: (f: (p: PageSite) => PageSite) => void) {
  return useCallback(
    (id: string, html: string, brut: string, simple: boolean) =>
      majPage((p) => {
        const el = trouverNoeud(p, id)?.noeud as Element | undefined;
        if (!el || !('texte' in el.p)) return p;
        // HTML du cadre isolé relu dans un document inerte : rien ne s'exécute, seules les
        // balises du texte riche sont gardées.
        const texte = simple
          ? brut.replace(/\s+/g, ' ').trim()
          : depuisHtml(new DOMParser().parseFromString(html, 'text/html').body);
        if (texte === el.p.texte) return p;
        return majNoeud(
          p,
          id,
          simple
            ? { texte }
            : { texte, liens: liensUtilises(texte, 'liens' in el.p ? el.p.liens : undefined) },
        );
      }),
    [majPage],
  );
}
