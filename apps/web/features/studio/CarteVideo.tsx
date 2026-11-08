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
import { TONS_STATUT } from './tons';

/**
 * Une vidéo dans la grille du Studio (comme les projets de CapCut) : miniature au format de la
 * vidéo (image de couverture une fois fabriquée), état, étape et date.
 */
export function CarteVideo({
  projet: p,
  maintenant,
  href,
}: {
  projet: Pick<
    ProjetStudio,
    'id' | 'titre' | 'statut' | 'format' | 'libre' | 'rendu' | 'updatedAt'
  >;
  maintenant: number;
  /** Lien de la carte (par défaut : la vidéo à son étape en cours). */
  href?: string;
}) {
  const { largeur, hauteur } = FORMATS_STUDIO[p.format];
  const etape = etapeProjet({ statut: p.statut, rendu: Boolean(p.rendu), libre: p.libre });
  return (
    <Link
      href={(href ?? `/admin/studio/${p.id}`) as Route}
      className="group grid content-start gap-2 no-underline"
    >
      <span
        className="relative grid w-full place-items-center overflow-hidden rounded-[12px] bg-neutre-900 ring-1 ring-trait transition group-hover:ring-2 group-hover:ring-neutre-700"
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
  );
}
