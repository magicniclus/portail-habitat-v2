'use client';

import type { Element } from '@ph/core/sites';
import { Info, Interrupteur, Segments } from './controles';
import type { ContexteReglages } from './contexte';

/** Élément « Articles du blog » : affichage, nombre, catégorie, résumé (BLOG §6). */
export function ContenuBlog({
  el,
  c,
}: {
  el: Extract<Element, { type: 'blog' }>;
  c: ContexteReglages;
}) {
  const maj = c.maj;
  return (
    <>
      <Segments
        libelle="Affichage"
        valeur={el.p.affichage}
        options={[
          ['grille', 'Grille'],
          ['liste', 'Liste'],
          ['une', 'À la une'],
        ]}
        onChange={(affichage) => maj({ affichage })}
      />
      {el.p.affichage === 'une' ? null : (
        <Segments
          libelle="Nombre d’articles"
          valeur={el.p.nb}
          options={[
            [3, '3'],
            [6, '6'],
            [9, '9'],
          ]}
          onChange={(nb) => maj({ nb })}
        />
      )}
      <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
        Catégorie
        <select
          value={el.p.cat}
          onChange={(e) => maj({ cat: e.target.value })}
          className="min-h-11 rounded-[8px] border border-trait bg-blanc px-3 text-base"
        >
          <option value="">Toutes</option>
          {c.categoriesBlog.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nom}
            </option>
          ))}
        </select>
      </label>
      <Interrupteur
        libelle="Afficher le résumé"
        actif={el.p.extrait}
        onChange={(extrait) => maj({ extrait })}
      />
      <Info>Les articles publiés apparaissent ici tout seuls, sans republier le site.</Info>
    </>
  );
}
