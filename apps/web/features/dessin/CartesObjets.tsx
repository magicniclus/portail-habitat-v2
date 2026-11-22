'use client';

import { miniatureObjet, type ObjetCatalogue } from '@ph/core/dessin';
import { useState } from 'react';
import { ApercuObjet } from './Apercus';

const cm = (mm: number) => Math.round(mm / 10);

/**
 * Miniature 3D d'un objet (vue de trois quarts, pnpm dessin:miniatures) ; si l'image manque,
 * le symbole vu de dessus.
 */
export function MiniatureObjet({ o, taille = 44 }: { o: ObjetCatalogue; taille?: number }) {
  const [absente, setAbsente] = useState(false);
  if (absente) return <ApercuObjet o={o} />;
  return (
    // Petites images statiques déjà optimisées (WebP 112 px) : pas de passage par next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={miniatureObjet(o.id)}
      alt=""
      width={taille}
      height={taille}
      loading="lazy"
      decoding="async"
      onError={() => setAbsente(true)}
      className="shrink-0 object-contain"
      style={{ width: taille, height: taille }}
    />
  );
}

/**
 * Objets d'un univers en cartes (DES-21) : grande miniature, nom, dimensions. Un clic choisit
 * l'objet, puis on clique sur le plan pour le poser.
 */
export function CartesObjets({
  objets,
  choisi,
  choisir,
}: {
  objets: readonly ObjetCatalogue[];
  choisi: string | null;
  choisir: (id: string) => void;
}) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
      {objets.map((o) => {
        const actif = choisi === o.id;
        return (
          <li key={o.id}>
            <button
              type="button"
              aria-pressed={actif}
              onClick={() => choisir(o.id)}
              className={`grid h-full w-full cursor-pointer justify-items-center gap-1 rounded-xl border-2 p-2 text-center font-[inherit] text-texte transition-colors duration-150 ${
                actif
                  ? 'border-accent bg-accent-100'
                  : 'border-neutre-200 bg-blanc hover:border-neutre-300 hover:bg-neutre-100'
              }`}
            >
              <MiniatureObjet o={o} taille={88} />
              <span className="text-[13px] leading-4 font-semibold">{o.libelle}</span>
              <span className="text-xs text-neutre-700">
                {actif
                  ? 'Cliquez sur le plan'
                  : `${cm(o.dimensions.l)} × ${cm(o.dimensions.p)} cm${o.contreMur ? ' · contre un mur' : ''}`}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
