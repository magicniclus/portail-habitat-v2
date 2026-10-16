'use client';

import {
  ancresDe,
  annuler,
  appliquer,
  appliquerOperations,
  deplacer,
  dupliquerSection,
  elementsDe,
  historique,
  nouvellePage,
  retablir,
  slugDePage,
  supprimerSection,
  validerAction,
  type Action,
  type ContexteLiens,
  type Navigation,
  type OperationIa,
  type PageSite,
  type Theme,
} from '@ph/core/sites';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { posterJson } from '@/lib/posterJson';

export interface BrouillonSite {
  pages: Record<string, PageSite>;
  navigation: Navigation;
  theme: Theme;
}

/**
 * État de l'éditeur : historique (Ctrl Z / Ctrl ⇧ Z, 80 états), différences avec la dernière
 * version enregistrée, enregistrement des pages et du thème (la navigation s'enregistre à part).
 */
export function useBrouillonSite(initial: BrouillonSite) {
  const [h, setH] = useState(() => historique(initial));
  const [enregistre, setEnregistre] = useState(initial);
  const b = h.present;
  const modifier = useCallback(
    (f: (b: BrouillonSite) => BrouillonSite) => setH((x) => appliquer(x, f(x.present))),
    [],
  );
  const modifiees = Object.keys(b.pages).filter((id) => b.pages[id] !== enregistre.pages[id]);
  const supprimees = Object.keys(enregistre.pages).filter((id) => !b.pages[id]);
  const themeModifie = b.theme !== enregistre.theme;
  const navModifiee = b.navigation !== enregistre.navigation;
  const aEnregistrer = modifiees.length > 0 || supprimees.length > 0 || themeModifie;

  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement;
      if (cible.closest('input, textarea, select, [contenteditable]')) return;
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      setH((x) => (e.shiftKey ? retablir(x) : annuler(x)));
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, []);

  useEffect(() => {
    if (!aEnregistrer && !navModifiee) return;
    const avant = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avant);
    return () => window.removeEventListener('beforeunload', avant);
  }, [aEnregistrer, navModifiee]);

  /** Validation en direct des actions (même règle qu'à la publication, SITE-09). */
  const contexte = useMemo<ContexteLiens>(
    () => ({
      pages: Object.fromEntries(
        Object.entries(b.pages).map(([id, p]) => [id, ancresDe(p.sections)]),
      ),
      fichiers: new Set(),
      formulaire: Object.values(b.pages).some((p) =>
        elementsDe(p).some((e) => e.el.type === 'formulaire'),
      ),
    }),
    [b.pages],
  );
  const erreurAction = (pageId: string) => (a: Action) => validerAction(a, contexte, pageId);

  /** Enregistre pages et thème ; renvoie le message d'erreur éventuel. */
  const enregistrer = async (): Promise<string | null> => {
    for (const pageId of supprimees) {
      const r = await posterJson('/api/pro/site/page/supprimer', { pageId });
      if (!r.ok) return r.message;
    }
    for (const pageId of modifiees) {
      const r = await posterJson('/api/pro/site/page', { pageId, page: b.pages[pageId] });
      if (!r.ok) return `${b.pages[pageId]!.nom} : ${r.message}`;
    }
    if (themeModifie) {
      const r = await posterJson('/api/pro/site/theme', { theme: b.theme });
      if (!r.ok) return r.message;
    }
    setEnregistre((e) => ({ ...e, pages: b.pages, theme: b.theme }));
    return null;
  };

  const enregistrerNavigation = async (): Promise<string | null> => {
    const r = await posterJson('/api/pro/site/navigation', { navigation: b.navigation });
    if (!r.ok) return r.message;
    setEnregistre((e) => ({ ...e, navigation: b.navigation }));
    return null;
  };

  /** Nouvelle page en brouillon ; renvoie son identifiant. */
  const ajouterPage = (nom: string): string => {
    const slug = slugDePage(nom, b.pages);
    const base = slug.replace(/-/g, '_').slice(0, 36);
    let id = base;
    for (let n = 2; b.pages[id]; n++) id = `${base}_${n}`;
    const ordre = Math.max(0, ...Object.values(b.pages).map((p) => p.ordre)) + 1;
    modifier((x) => ({ ...x, pages: { ...x.pages, [id]: nouvellePage(nom, slug, ordre) } }));
    return id;
  };
  const supprimerPage = (id: string) =>
    modifier((x) => {
      const { [id]: _supprimee, ...reste } = x.pages;
      return { ...x, pages: reste };
    });

  /** Proposition de l'IA appliquée en une seule étape d'historique (SITE-IA-06). */
  const appliquerIa = (ops: OperationIa[]): string | null => {
    const r = appliquerOperations(b, ops, () => Math.random().toString(36).slice(2, 10));
    if (!r.ok) return `Proposition impossible à appliquer : ${r.erreurs[0] ?? ''}`;
    modifier(() => r.brouillon);
    return null;
  };

  /** Section monter, descendre, dupliquer, supprimer. */
  const operationSection = (
    pageId: string,
    id: string,
    op: 'haut' | 'bas' | 'dupliquer' | 'supprimer',
  ) =>
    modifier((x) => {
      const p = x.pages[pageId]!;
      const i = p.sections.findIndex((v) => v.id === id);
      const page =
        op === 'supprimer'
          ? supprimerSection(p, id)
          : op === 'dupliquer'
            ? dupliquerSection(p, id, () => Math.random().toString(36).slice(2, 10))
            : { ...p, sections: deplacer(p.sections, i, op === 'haut' ? -1 : 1) };
      return { ...x, pages: { ...x.pages, [pageId]: page } };
    });

  return {
    b,
    modifier,
    operationSection,
    appliquerIa,
    ajouterPage,
    supprimerPage,
    annuler: () => setH(annuler),
    retablir: () => setH(retablir),
    peutAnnuler: h.passe.length > 0,
    peutRetablir: h.futur.length > 0,
    aEnregistrer,
    navModifiee,
    enregistrer,
    enregistrerNavigation,
    erreurAction,
  };
}
