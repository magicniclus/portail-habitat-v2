'use client';

import { controleSeo, type StatutArticle } from '@ph/core/blog';
import { useEffect, useMemo, useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { routes } from '@/lib/routes';
import type { EditeurArticleDonnees } from '@/server/blog';

export interface ChampsArticle {
  titre: string;
  sousTitre: string;
  slug: string;
  slugAuto: boolean;
  corpsHtml: string;
  image: { src: string; alt: string };
  meta: string;
  motCle: string;
  motsSecondaires: string[];
  categorieId: string;
  tags: string[];
  auteurUid: string;
}

const vide = (auteur: string, categorie: string): ChampsArticle => ({
  titre: '',
  sousTitre: '',
  slug: '',
  slugAuto: true,
  corpsHtml: '<p></p>',
  image: { src: '', alt: '' },
  meta: '',
  motCle: '',
  motsSecondaires: [],
  categorieId: categorie,
  tags: [],
  auteurUid: auteur,
});

/**
 * État de l'éditeur d'article : champs, contrôle SEO en direct (mêmes règles que le serveur),
 * enregistrement, publication et planification. Quitter avec des changements non enregistrés
 * demande confirmation.
 */
export function useArticle(d: EditeurArticleDonnees, moi: string) {
  const [c, setC] = useState<ChampsArticle>(() => {
    const a = d.article;
    if (!a) return vide(moi, d.classement.categories[0]?.id ?? '');
    return {
      titre: a.titre,
      sousTitre: a.sousTitre,
      slug: a.slug,
      slugAuto: a.slugAuto,
      corpsHtml: a.corpsHtml,
      image: a.image,
      meta: a.meta,
      motCle: a.motCle,
      motsSecondaires: a.motsSecondaires,
      categorieId: a.categorieId,
      tags: a.tags,
      auteurUid: a.auteurUid,
    };
  });
  const [id, setId] = useState(d.article?.id);
  const [statut, setStatut] = useState<StatutArticle>(d.article?.statut ?? 'brouillon');
  const [modifie, setModifie] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const seo = useMemo(
    () => controleSeo(c, { mentionsCompletes: d.mentions.complet }),
    [c, d.mentions.complet],
  );
  const maj = (p: Partial<ChampsArticle>) => {
    setC((x) => ({ ...x, ...p }));
    setModifie(true);
  };

  useEffect(() => {
    if (!modifie) return;
    const avant = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avant);
    return () => window.removeEventListener('beforeunload', avant);
  }, [modifie]);

  /** Enregistre ; renvoie l'identifiant de l'article, ou `null` en cas d'erreur. */
  const enregistrer = async (): Promise<string | null> => {
    const { slugAuto, slug, ...reste } = c;
    const r = await posterJson<{ articleId: string; slug: string }>('/api/pro/blog/article', {
      ...reste,
      ...(id ? { articleId: id } : {}),
      ...(slugAuto || !slug ? {} : { slug }),
    });
    if (!r.ok) {
      setMessage({ ton: 'danger', texte: r.message });
      return null;
    }
    setC((x) => ({ ...x, slug: r.data.slug }));
    setModifie(false);
    if (!id) {
      setId(r.data.articleId);
      // Adresse de l'article sans recharger l'éditeur (l'état en cours est gardé).
      window.history.replaceState(null, '', routes.proBlogArticle(r.data.articleId));
    }
    return r.data.articleId;
  };

  const executer = async (f: () => Promise<string | null>) => {
    setEnCours(true);
    setMessage(null);
    const texte = await f();
    setEnCours(false);
    if (texte) setMessage({ ton: 'succes', texte });
  };

  const agir = (action: 'publier' | 'planifier', date?: string) =>
    executer(async () => {
      const articleId = await enregistrer();
      if (!articleId) return null;
      const r = await posterJson<{ faits: string[]; refuses: { raison: string }[] }>(
        '/api/pro/blog/actions',
        { ids: [articleId], action, ...(date ? { date } : {}) },
      );
      if (!r.ok || !r.data.faits.length) {
        setMessage({
          ton: 'danger',
          texte: r.ok ? (r.data.refuses[0]?.raison ?? 'Action impossible.') : r.message,
        });
        return null;
      }
      setStatut(action === 'publier' ? 'publie' : 'planifie');
      return action === 'publier'
        ? 'Article publié : il apparaît sur votre site.'
        : 'Article planifié : il sera publié à la date choisie.';
    });

  return {
    c,
    maj,
    id,
    statut,
    seo,
    modifie,
    enCours,
    message,
    enregistrer: () => executer(async () => ((await enregistrer()) ? 'Article enregistré.' : null)),
    publier: () => agir('publier'),
    planifier: (date: string) => agir('planifier', date),
  };
}
