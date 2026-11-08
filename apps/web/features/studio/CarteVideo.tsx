import {
  etapeProjet,
  FORMATS_STUDIO,
  LIBELLES_ETAPE_PROJET,
  LIBELLES_STATUT_STUDIO,
} from '@ph/core/studio';
import { formatRelatif } from '@ph/core/format';
import type { ProjetStudio } from '@ph/firebase/studio';
import { Badge } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { SupprimerVideo } from './SupprimerVideo';
import { TONS_STATUT } from './tons';

/**
 * Une vidéo dans la grille du Studio (comme les projets de CapCut) : miniature au format de la
 * vidéo (image de couverture une fois fabriquée), état, étape et date. Un clic ouvre le Studio ;
 * la corbeille supprime la vidéo.
 */
export function CarteVideo({
  projet: p,
  maintenant,
}: {
  projet: Pick<
    ProjetStudio,
    'id' | 'titre' | 'statut' | 'format' | 'libre' | 'rendu' | 'updatedAt'
  >;
  maintenant: number;
}) {
  const { largeur, hauteur } = FORMATS_STUDIO[p.format];
  const etape = etapeProjet({ statut: p.statut, rendu: Boolean(p.rendu), libre: p.libre });
  return (
    <div className="group relative">
      <Link
        href={`/admin/studio/${p.id}/montage` as Route}
        className="grid content-start gap-2 no-underline"
      >
        <span
          className="relative grid w-full place-items-center overflow-hidden rounded-[12px] bg-neutre-900 ring-1 ring-trait transition group-hover:ring-2 group-focus-within:ring-2 group-hover:ring-neutre-700"
          style={{ aspectRatio: `${largeur} / ${hauteur}`, maxHeight: 360 }}
        >
          {p.rendu?.miniature ? (
            // eslint-disable-next-line @next/next/no-img-element -- fichier privé servi par notre serveur
            <img
              src={`/api/studio/fichier?c=${encodeURIComponent(p.rendu.miniature)}`}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <span className="line-clamp-4 px-4 text-center text-lg font-bold text-blanc">
              {p.titre}
            </span>
          )}
          <span className="absolute top-2 left-2">
            <Badge tone={TONS_STATUT[p.statut]}>{LIBELLES_STATUT_STUDIO[p.statut]}</Badge>
          </span>
        </span>
        <span className="grid gap-0.5">
          <strong className="line-clamp-2 text-sm text-texte">{p.titre}</strong>
          <span className="text-xs text-neutre-700">
            {p.libre ? 'Montage libre' : LIBELLES_ETAPE_PROJET[etape]} ·{' '}
            {formatRelatif(p.updatedAt, maintenant)}
          </span>
        </span>
      </Link>
      {/* Hors du lien (un bouton ne va pas dans un lien) ; visible au survol et au clavier. */}
      <span className="absolute top-2 right-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
        <SupprimerVideo projetId={p.id} titre={p.titre} />
      </span>
    </div>
  );
}
