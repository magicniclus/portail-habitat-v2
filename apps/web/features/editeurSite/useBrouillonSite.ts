'use client';

import {
  ancresDe,
  annuler,
  appliquer,
  appliquerOperations,
  elementsDe,
  historique,
  nouvellePage,
  retablir,
  slugDePage,
  validerAction,
  type Action,
  type ContexteLiens,
  type Navigation,
  type OperationIa,
  type PageSite,
  type Theme,
} from '@ph/core/sites';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  // Dernier état connu, pour enchaîner plusieurs propositions sans attendre un rendu (création).
  const courant = useRef(b);
  useEffect(() => {
    courant.current = b;
  }, [b]);
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
  const erreurAction =
    (pageId: string, fichiers = contexte.fichiers) =>
    (a: Action) =>
      validerAction(a, { ...contexte, fichiers }, pageId);

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

  /** Navigation remise comme à son dernier enregistrement. */
  const annulerNavigation = () => modifier((x) => ({ ...x, navigation: enregistre.navigation }));

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
    const r = appliquerOperations(courant.current, ops, () =>
      Math.random().toString(36).slice(2, 10),
    );
    if (!r.ok) return `Proposition impossible à appliquer : ${r.erreurs[0] ?? ''}`;
    courant.current = r.brouillon;
    modifier(() => r.brouillon);
    return null;
  };

  /** Modèle enregistré (dont « Avant IA ») restauré en une étape d'historique (SITE-IA-09). */
  const restaurer = (m: Partial<BrouillonSite> & { pages: BrouillonSite['pages'] }) =>
    modifier((x) => ({
      pages: m.pages,
      navigation: m.navigation ?? x.navigation,
      theme: m.theme ?? x.theme,
    }));

  return {
    b,
    modifier,
    appliquerIa,
    restaurer,
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
    annulerNavigation,
    erreurAction,
  };
}
