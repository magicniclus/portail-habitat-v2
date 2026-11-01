import type { seoFiche } from '@ph/core/annuaire';
import Link from 'next/link';
import type { Route } from 'next';
import { routes } from '@/lib/routes';

/**
 * Bas de fiche publique (référencement) : trois paragraphes propres à l'artisan, puis les liens
 * vers les communes voisines, les autres métiers de sa ville et les travaux souvent demandés.
 */
export function SeoFiche({ seo }: { seo: ReturnType<typeof seoFiche> }) {
  const liste = 'm-0 flex list-none flex-wrap gap-2 p-0 text-sm text-neutre-800';
  // Pastilles neutres de 44 px (cibles tactiles, MOBILE).
  const lien =
    'inline-flex min-h-11 items-center rounded-pill border border-trait bg-blanc px-3.5 no-underline hover:border-neutre-500 hover:text-texte';
  return (
    <section
      aria-label="En savoir plus"
      className="mt-6 grid gap-7 border-t border-trait pt-8 text-neutre-800"
    >
      <div className="grid gap-6 md:grid-cols-3">
        {seo.paragraphes.map((p) => (
          <div key={p.titre} className="grid content-start gap-2">
            <h2 className="m-0 text-base font-bold text-texte">{p.titre}</h2>
            <p className="m-0 text-sm leading-[22px]">{p.texte}</p>
          </div>
        ))}
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
                  href={`${routes.simulateur}?prestation=${l.prestation}` as Route}
                  prefetch={false}
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
