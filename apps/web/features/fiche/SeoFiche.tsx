import type { seoFiche } from '@ph/core/annuaire';
import Link from 'next/link';
import type { Route } from 'next';
import {
  ArrowRightIcon,
  ChatCircleTextIcon,
  MagnifyingGlassIcon,
  StarIcon,
} from '@phosphor-icons/react/ssr';
import { routes } from '@/lib/routes';

type Seo = ReturnType<typeof seoFiche>;

/** Action de chaque carte : comparer les artisans, lire les avis, demander un devis. */
const ACTIONS = [
  {
    Icone: MagnifyingGlassIcon,
    libelle: 'Comparer les artisans',
    lien: (s: Seo, metier: string) =>
      routes.artisansFiltres({ metier, ville: s.metiers.liens[0]?.ville ?? '' }),
  },
  { Icone: StarIcon, libelle: 'Lire les avis', lien: () => '#avis' as Route },
  { Icone: ChatCircleTextIcon, libelle: 'Demander un devis', lien: () => '#contact' as Route },
] as const;

/**
 * Bas de fiche publique (référencement) : trois paragraphes propres à l'artisan, puis les liens
 * vers les communes voisines, les autres métiers de sa ville et les travaux souvent demandés.
 */
export function SeoFiche({ seo, metier }: { seo: ReturnType<typeof seoFiche>; metier: string }) {
  const liste = 'm-0 flex list-none flex-wrap gap-2 p-0 text-sm text-neutre-800';
  // Pastilles neutres de 44 px (cibles tactiles, MOBILE).
  const lien =
    'inline-flex min-h-11 items-center rounded-pill border border-trait bg-blanc px-3.5 no-underline hover:border-neutre-500 hover:text-texte';
  return (
    <section
      aria-label="En savoir plus"
      className="mt-6 grid gap-7 border-t border-trait pt-8 text-neutre-800"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {seo.paragraphes.map((p, i) => {
          const a = ACTIONS[i]!;
          return (
            <article
              key={p.titre}
              className="flex flex-col gap-3 rounded-[16px] border border-trait bg-neutre-100 p-5"
            >
              <span
                aria-hidden="true"
                className="grid size-11 place-items-center rounded-full bg-blanc text-texte shadow-sm"
              >
                <a.Icone size={22} weight="duotone" />
              </span>
              <h2 className="m-0 text-[17px] leading-snug font-bold text-texte">{p.titre}</h2>
              <p className="m-0 flex-1 text-[15px] leading-6">{p.texte}</p>
              <Link
                href={a.lien(seo, metier)}
                className="inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-texte underline-offset-4 hover:underline"
              >
                {a.libelle}
                <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
      {seo.villes.liens.length ? (
        <nav aria-label={seo.villes.titre} className="grid gap-2">
          <h2 className="m-0 text-base font-bold text-texte">{seo.villes.titre}</h2>
          <ul className={liste}>
            {seo.villes.liens.map((l) => (
              <li key={l.ville}>
                <Link
                  href={routes.artisansFiltres({ metier: l.metier, ville: l.ville })}
                  className={lien}
                >
                  {l.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {seo.metiers.liens.length ? (
        <nav aria-label={seo.metiers.titre} className="grid gap-2">
          <h2 className="m-0 text-base font-bold text-texte">{seo.metiers.titre}</h2>
          <ul className={liste}>
            {seo.metiers.liens.map((l) => (
              <li key={l.metier}>
                <Link
                  href={routes.artisansFiltres({ metier: l.metier, ville: l.ville })}
                  className={lien}
                >
                  {l.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {seo.services.liens.length ? (
        <nav aria-label={seo.services.titre} className="grid gap-2">
          <h2 className="m-0 text-base font-bold text-texte">{seo.services.titre}</h2>
          <ul className={liste}>
            {seo.services.liens.map((l) => (
              <li key={l.prestation}>
                <Link
                  href={routes.annuaire(`?${new URLSearchParams({ q: l.nom, ville: l.ville })}`)}
                  className={lien}
                >
                  {l.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </section>
  );
}
