'use client';

import { Banner, Button, IconButton, Input } from '@ph/ui';
import { useState } from 'react';
import type { OngletBlogDonnees } from '@/server/blog';
import { useAppelBlog } from './appelBlog';

type Article = OngletBlogDonnees['articles'][number];

/** Champ + bouton « Ajouter » (catégorie ou tag). */
function Ajout({
  libelle,
  max,
  enCours,
  onAjouter,
}: {
  libelle: string;
  max: number;
  enCours: boolean;
  onAjouter: (nom: string) => Promise<unknown>;
}) {
  const [nom, setNom] = useState('');
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (nom.trim()) void onAjouter(nom.trim()).then((r) => r && setNom(''));
      }}
    >
      <Input
        aria-label={libelle}
        placeholder={libelle}
        value={nom}
        maxLength={max}
        onChange={(e) => setNom(e.target.value)}
      />
      <Button type="submit" variant="secondaire" disabled={enCours}>
        Ajouter
      </Button>
    </form>
  );
}

/**
 * Catégories et tags (BLOG §5) : catégories créées, renommées (appliqué aux articles sans copie),
 * réordonnées (ordre des onglets du blog), supprimées si vides ; tags créés et supprimés.
 */
export function ClassementBlog({ donnees: d }: { donnees: OngletBlogDonnees }) {
  const { appeler, erreur, enCours } = useAppelBlog();
  const [noms, setNoms] = useState<Record<string, string>>({});
  const cats = d.classement.categories;
  const nb = (pred: (a: Article) => boolean) =>
    d.articles.filter((a) => !a.supprimeLe && pred(a)).length;
  const deplacer = (i: number, sens: -1 | 1) => {
    const ids = cats.map((c) => c.id);
    const j = i + sens;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    void appeler('categorie', { action: 'ordonner', ids });
  };
  const renommer = (id: string, ancien: string) => {
    const nom = (noms[id] ?? ancien).trim();
    if (nom && nom !== ancien) void appeler('categorie', { action: 'renommer', id, nom });
  };
  return (
    <div className="grid gap-6 min-[900px]:grid-cols-2">
      <section aria-labelledby="cats-blog" className="grid content-start gap-3">
        <div>
          <h2 id="cats-blog" className="m-0 text-lg">
            Catégories
          </h2>
          <p className="m-0 text-sm text-neutre-800">
            Une par article. L’ordre est celui des onglets sur votre site.
          </p>
        </div>
        <ul className="m-0 grid list-none gap-2 p-0">
          {cats.map((c, i) => (
            <li key={c.id} className="flex items-center gap-1">
              <IconButton
                aria-label={`Monter ${c.nom}`}
                icone="▲"
                onClick={() => deplacer(i, -1)}
                disabled={i === 0 || enCours}
              />
              <IconButton
                aria-label={`Descendre ${c.nom}`}
                icone="▼"
                onClick={() => deplacer(i, 1)}
                disabled={i === cats.length - 1 || enCours}
              />
              <Input
                aria-label={`Nom de la catégorie ${c.nom}`}
                value={noms[c.id] ?? c.nom}
                maxLength={60}
                onChange={(e) => setNoms((x) => ({ ...x, [c.id]: e.target.value }))}
                onBlur={() => renommer(c.id, c.nom)}
              />
              <span className="min-w-8 text-center text-sm text-neutre-800">
                {nb((a) => a.categorieId === c.id)}
              </span>
              <IconButton
                aria-label={`Supprimer la catégorie ${c.nom}`}
                icone="×"
                onClick={() => void appeler('categorie', { action: 'supprimer', id: c.id })}
              />
            </li>
          ))}
        </ul>
        <Ajout
          libelle="Nouvelle catégorie"
          max={60}
          enCours={enCours}
          onAjouter={(nom) => appeler('categorie', { action: 'creer', nom })}
        />
      </section>
      <section aria-labelledby="tags-blog" className="grid content-start gap-3">
        <div>
          <h2 id="tags-blog" className="m-0 text-lg">
            Tags
          </h2>
          <p className="m-0 text-sm text-neutre-800">Plusieurs par article.</p>
        </div>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {d.classement.tags.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-1 rounded-pill border border-trait pl-3"
            >
              {t.nom}
              <span className="text-sm text-neutre-700">{nb((a) => a.tags.includes(t.id))}</span>
              <IconButton
                aria-label={`Supprimer le tag ${t.nom}`}
                icone="×"
                onClick={() => void appeler('tag', { action: 'supprimer', id: t.id })}
              />
            </li>
          ))}
        </ul>
        <Ajout
          libelle="Nouveau tag"
          max={40}
          enCours={enCours}
          onAjouter={(nom) => appeler('tag', { action: 'creer', nom })}
        />
      </section>
      {erreur ? <Banner tone="danger">{erreur}</Banner> : null}
    </div>
  );
}
