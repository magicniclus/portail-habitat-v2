import { ARTICLES_IA_MOIS } from '@ph/core/blog';
import Link from 'next/link';
import { FenetreOffre } from '@/features/offres/FenetreOffre';
import { routes } from '@/lib/routes';

/**
 * Plus d'articles rédigés par l'IA : Tout inclus (15 par mois) ou l'option Blog (+20, D71) pour
 * Site Pro et Fiche + Site. Rien en Tout inclus (BLOG-14 : simple message au quota atteint).
 */
export function PlusArticles({
  credits,
}: {
  credits: { toutInclus: boolean; optionBlog: boolean };
}) {
  if (credits.toutInclus) return null;
  return (
    <span className="flex flex-wrap items-center gap-2">
      {credits.optionBlog ? null : (
        <Link
          href={`${routes.proAbonnement}?offre=blog`}
          className="flex min-h-11 items-center text-sm font-semibold"
        >
          Option Blog : +{ARTICLES_IA_MOIS.optionBlog} articles / mois
        </Link>
      )}
      <FenetreOffre
        formule="tout_inclus"
        raison={`Avec Tout inclus, l’IA rédige ${ARTICLES_IA_MOIS.toutInclus} articles par mois.`}
      >
        Tout inclus : {ARTICLES_IA_MOIS.toutInclus} articles / mois
      </FenetreOffre>
    </span>
  );
}
