import type { ArtisanAnnuaire } from '@ph/firebase/annuaire';
import { bouton } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { CarteArtisan } from '@/features/annuaire/CarteArtisan';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { enTeteParticuliers, piedParticuliers } from '@/features/vitrine/navigation';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { absolue, faqPage, filAriane } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';

export interface Lien {
  libelle: string;
  href: Route;
}

/**
 * Page permanente de référencement local (« Plombier à Bordeaux », « Douche à l'italienne à
 * Bordeaux ») : titre, texte rédigé depuis les données, artisans du secteur (ou les plus proches),
 * questions fréquentes, liens vers les pages voisines ; fil d'Ariane, liste et FAQ en JSON-LD.
 */
export function PageLocale(p: {
  fil: { nom: string; chemin: string }[];
  titre: string;
  intro: string;
  artisans: ArtisanAnnuaire[];
  /** Les artisans affichés sont les plus proches, faute d'artisan dans le secteur. */
  repli: boolean;
  nomMetier: (id: string) => string;
  paragraphes: string[];
  faq: { q: string; r: string }[];
  groupes: { titre: string; liens: Lien[] }[];
  appel: { libelle: string; href: Route };
}) {
  const liste = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: p.titre,
    itemListElement: p.artisans.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absolue(routes.ficheArtisan(a.slug)),
      name: a.nom,
    })),
  };
  return (
    <>
      <JsonLd donnees={filAriane(p.fil)} />
      <JsonLd donnees={faqPage(p.faq)} />
      {p.artisans.length ? <JsonLd donnees={liste} /> : null}
      <EnTetePublic {...enTeteParticuliers} />
      <main className="mx-auto grid w-full max-w-[1100px] gap-8 px-[clamp(18px,4vw,44px)] py-[clamp(20px,3vw,36px)] pb-16">
        <nav
          aria-label="Fil d’Ariane"
          className="flex flex-wrap items-center gap-x-1.5 text-sm text-neutre-700"
        >
          {p.fil.map((e, i) =>
            i < p.fil.length - 1 ? (
              <span key={e.chemin} className="inline-flex items-center gap-1.5">
                <Link href={e.chemin as Route} className="inline-flex min-h-11 items-center">
                  {e.nom}
                </Link>
                <span aria-hidden="true">›</span>
              </span>
            ) : (
              <span key={e.chemin} aria-current="page">
                {e.nom}
              </span>
            ),
          )}
        </nav>
        <header className="grid max-w-[820px] gap-3">
          <h1 className="m-0 text-[clamp(28px,3.6vw,42px)] leading-[1.1]">{p.titre}</h1>
          <p className="m-0 text-[17px] leading-[27px] text-neutre-800">{p.intro}</p>
          <Link href={p.appel.href} prefetch={false} className={`${bouton()} justify-self-start`}>
            {p.appel.libelle}
          </Link>
        </header>

        <section aria-labelledby="titre-artisans" className="grid gap-3.5">
          <h2 id="titre-artisans" className="m-0 text-xl">
            {p.repli ? 'Les artisans vérifiés les plus proches' : 'Artisans vérifiés du secteur'}
          </h2>
          {p.artisans.length ? (
            p.artisans.map((a) => (
              <CarteArtisan key={a.id} a={a} nomMetier={p.nomMetier(a.metierPrincipal)} />
            ))
          ) : (
            <p className="m-0 text-[15px] text-neutre-800">
              Aucun artisan inscrit pour le moment : déposez votre projet, il sera transmis aux
              artisans qui rejoignent le secteur.
            </p>
          )}
        </section>

        <article className="grid max-w-[820px] gap-3 text-neutre-800">
          {p.paragraphes.map((t) => (
            <p key={t} className="m-0 text-base leading-[26px]">
              {t}
            </p>
          ))}
        </article>

        <section aria-labelledby="titre-faq" className="grid max-w-[820px] gap-3">
          <h2 id="titre-faq" className="m-0 text-xl">
            Questions fréquentes
          </h2>
          {p.faq.map((f) => (
            <details
              key={f.q}
              className="rounded-[12px] border border-trait bg-blanc px-4 [&[open]]:pb-4"
            >
              <summary className="flex min-h-12 cursor-pointer items-center font-semibold">
                {f.q}
              </summary>
              <p className="m-0 text-[15px] leading-6 text-neutre-800">{f.r}</p>
            </details>
          ))}
        </section>

        {p.groupes
          .filter((g) => g.liens.length)
          .map((g) => (
            <nav key={g.titre} aria-label={g.titre} className="grid gap-2">
              <h2 className="m-0 text-base font-bold">{g.titre}</h2>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm">
                {g.liens.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="inline-flex min-h-11 items-center rounded-pill border border-trait bg-blanc px-3.5 text-neutre-800 no-underline hover:border-neutre-500 hover:text-texte"
                    >
                      {l.libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
      </main>
      <PiedPublic {...piedParticuliers} />
    </>
  );
}
