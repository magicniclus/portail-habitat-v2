'use client';

import { Chip, Field, Input, Select } from '@ph/ui';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import type { EditeurArticleDonnees } from '@/server/blog';
import type { ChampsArticle } from './useArticle';

/** Catégorie (une), auteur (membres de l'équipe) et tags (plusieurs, créés à la volée). */
export function ClassementArticle({
  c,
  maj,
  d,
}: {
  c: ChampsArticle;
  maj: (p: Partial<ChampsArticle>) => void;
  d: EditeurArticleDonnees;
}) {
  const [tags, setTags] = useState(d.classement.tags);
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const ajouter = async (nom: string) => {
    const r = await posterJson<{ id: string }>('/api/pro/blog/tag', { action: 'creer', nom });
    if (!r.ok) return setErreur(r.message);
    if (!tags.some((t) => t.id === r.data.id)) setTags([...tags, { id: r.data.id, nom, slug: '' }]);
    if (!c.tags.includes(r.data.id)) maj({ tags: [...c.tags, r.data.id] });
    setSaisie('');
  };
  return (
    <section aria-labelledby="classement-article" className="grid gap-3">
      <h2 id="classement-article" className="m-0 text-lg">
        Classement
      </h2>
      <div className="grid gap-3 min-[600px]:grid-cols-2">
        <Field label="Catégorie">
          <Select value={c.categorieId} onChange={(e) => maj({ categorieId: e.target.value })}>
            <option value="">Choisir une catégorie</option>
            {d.classement.categories.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nom}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Auteur">
          <Select value={c.auteurUid} onChange={(e) => maj({ auteurUid: e.target.value })}>
            {d.auteurs.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.nom}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tags">
        {tags.map((t) => (
          <Chip
            key={t.id}
            selectionne={c.tags.includes(t.id)}
            onClick={() =>
              maj({
                tags: c.tags.includes(t.id) ? c.tags.filter((x) => x !== t.id) : [...c.tags, t.id],
              })
            }
          >
            {t.nom}
          </Chip>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (saisie.trim()) void ajouter(saisie.trim());
          }}
        >
          <Input
            aria-label="Ajouter un tag"
            placeholder="+ Ajouter un tag"
            value={saisie}
            maxLength={40}
            onChange={(e) => setSaisie(e.target.value)}
          />
        </form>
      </div>
      {!d.classement.categories.length ? (
        <p className="m-0 text-sm text-neutre-800">
          Créez vos catégories dans l’onglet Blog › Catégories et tags.
        </p>
      ) : null}
      {erreur ? <p className="m-0 text-sm text-danger">{erreur}</p> : null}
    </section>
  );
}
