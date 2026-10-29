'use client';

import { ACTIONS_ARTICLES, lignesExportArticles, STATUTS_ARTICLE_AFFICHES } from '@ph/core/blog';
import { formatDate, versCsv } from '@ph/core/format';
import { Banner, bouton, Button, Input, StatusBadge } from '@ph/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { routes } from '@/lib/routes';
import type { OngletBlogDonnees } from '@/server/blog';
import { useAppelBlog } from './appelBlog';

type Article = OngletBlogDonnees['articles'][number];

/** Fichier CSV téléchargé dans le navigateur (Excel : « ; » et BOM UTF-8, BLOG-08). */
function telecharger(nom: string, contenu: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Liste des articles (BLOG §5) : recherche (titre, tag, catégorie), sélection, actions groupées,
 * export CSV de la sélection ou de la liste affichée. Le statut se lit dans le tableau.
 */
export function ListeArticles({
  donnees: d,
  actif,
  corbeille = false,
}: {
  donnees: OngletBlogDonnees;
  /** Site Pro : écriture permise (sinon lecture seule). */
  actif: boolean;
  /** Articles supprimés depuis moins de 30 jours, à restaurer. */
  corbeille?: boolean;
}) {
  const { appeler, erreur, enCours } = useAppelBlog();
  const [recherche, setRecherche] = useState('');
  const [selection, setSelection] = useState<string[]>([]);
  const [bilan, setBilan] = useState<string | null>(null);
  const nomCat = (id: string) => d.classement.categories.find((c) => c.id === id)?.nom ?? '';
  const nomTag = (id: string) => d.classement.tags.find((t) => t.id === id)?.nom ?? '';
  const nomAuteur = (uid: string) => d.auteurs.find((a) => a.uid === uid)?.nom ?? '';
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return d.articles.filter(
      (a) =>
        Boolean(a.supprimeLe) === corbeille &&
        (!q ||
          [a.titre, nomCat(a.categorieId), ...a.tags.map(nomTag)].some((x) =>
            x.toLowerCase().includes(q),
          )),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, recherche, corbeille]);
  const actions = corbeille ? ([['restaurer', 'Restaurer']] as const) : ACTIONS_ARTICLES;

  const exporter = () => {
    const liste = selection.length ? visibles.filter((a) => selection.includes(a.id)) : visibles;
    const { entetes, lignes } = lignesExportArticles(
      liste.map((a: Article) => ({
        titre: a.titre || 'Sans titre',
        slug: a.slug,
        statut: a.statut,
        categorie: nomCat(a.categorieId),
        tags: a.tags.map(nomTag).filter(Boolean),
        ...(a.datePublication ? { datePublication: a.datePublication } : {}),
        vues: a.vues,
        auteur: nomAuteur(a.auteurUid),
        genereParIA: a.genereParIA,
      })),
      d.hote,
    );
    telecharger('articles-blog.csv', versCsv(entetes, lignes));
  };

  const agir = async (action: (typeof actions)[number][0]) => {
    setBilan(null);
    const r = await appeler<{ faits: string[]; refuses: { titre: string; raison: string }[] }>(
      'actions',
      { ids: selection, action },
    );
    if (!r) return;
    setSelection([]);
    setBilan(
      [
        `${r.faits.length} article${r.faits.length > 1 ? 's' : ''} mis à jour.`,
        ...r.refuses.map((x) => `« ${x.titre} » : ${x.raison}`),
      ].join(' '),
    );
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Rechercher un article, un tag"
          placeholder="Rechercher un article, un tag…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="max-w-[360px]"
        />
        <Button variant="fantome" onClick={exporter} disabled={!visibles.length}>
          Export CSV
        </Button>
      </div>
      {actif && selection.length ? (
        <div
          role="toolbar"
          aria-label="Actions sur la sélection"
          className="flex flex-wrap items-center gap-2 rounded-[12px] bg-accent-100 p-2"
        >
          <span className="font-semibold">{selection.length} sélectionné(s)</span>
          {actions.map(([a, l]) => (
            <Button
              chargement={enCours}
              key={a}
              taille="sm"
              variant="secondaire"
              disabled={enCours}
              onClick={() => void agir(a)}
            >
              {l}
            </Button>
          ))}
          <Button taille="sm" variant="fantome" onClick={() => setSelection([])}>
            Annuler
          </Button>
        </div>
      ) : null}
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
      {bilan ? <Banner tone="info">{bilan}</Banner> : null}
      {visibles.length ? (
        <ul className="m-0 grid list-none gap-2 p-0" aria-label="Articles">
          {visibles.map((a) => (
            <li
              key={a.id}
              className="grid gap-2 rounded-[12px] border border-trait p-3 min-[760px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[760px]:items-center"
            >
              {actif ? (
                <input
                  type="checkbox"
                  aria-label={`Sélectionner « ${a.titre || 'Sans titre'} »`}
                  className="size-5 accent-accent-action"
                  checked={selection.includes(a.id)}
                  onChange={(e) =>
                    setSelection((x) =>
                      e.target.checked ? [...x, a.id] : x.filter((y) => y !== a.id),
                    )
                  }
                />
              ) : (
                <span />
              )}
              <div className="grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{a.titre || 'Sans titre'}</strong>
                  <StatusBadge statut={STATUTS_ARTICLE_AFFICHES[a.statut]} />
                  {a.bloquants ? (
                    <span className="text-sm text-attention">
                      {a.bloquants} point(s) à corriger
                    </span>
                  ) : null}
                </div>
                <span className="text-sm text-neutre-800">
                  {[
                    nomCat(a.categorieId),
                    ...a.tags.map(nomTag),
                    a.genereParIA ? '✦ rédigé avec l’IA' : '',
                    a.datePublication ? formatDate(a.datePublication) : '',
                    `${a.vues} vue${a.vues > 1 ? 's' : ''}`,
                    nomAuteur(a.auteurUid),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              <Link
                href={routes.proBlogArticle(a.id)}
                className={bouton({ variant: 'secondaire' })}
              >
                Modifier
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[15px] text-neutre-800">
          {d.articles.length ? 'Aucun article ne correspond.' : 'Pas encore d’article.'}
        </p>
      )}
    </div>
  );
}
