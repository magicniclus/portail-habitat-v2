import type { ArtisanAnnuaire } from '@ph/firebase/annuaire';
import { bouton } from '@ph/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { EncartPlans } from '@/features/dessin/public/PromoPlans';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { EnTeteParticuliers, PiedParticuliers } from '@/features/vitrine/CadreParticuliers';
import { absolue, faqPage, filAriane } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';
import { AnnuaireSecteur } from './AnnuaireSecteur';
import type { Lien } from './PageLocale';

/**
 * Page de secteur « métier à une commune » (SEO local) : H1, introduction, l'annuaire complet
 * (filtres, tri, résultats), texte local (rédigé par l'IA et contrôlé, sinon construit sur nos
 * données), sources, FAQ, liens vers les pages indexées voisines. JSON-LD : fil d'Ariane, FAQ,
 * liste des artisans affichés (aucune note agrégée inventée).
 */
export function PageSecteur(p: {
  fil: { nom: string; chemin: string }[];
  titre: string;
  intro: string;
  appel: { libelle: string; href: Route };
  annuaire: ComponentProps<typeof AnnuaireSecteur>;
  artisans: ArtisanAnnuaire[];
  sections: readonly { titre: string; paragraphes: readonly string[] }[];
  faits: readonly { texte: string; source: string }[];
  faq: readonly { q: string; r: string }[];
  groupes: { titre: string; liens: Lien[] }[];
}) {
  const liste = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: p.titre,
    itemListElement: p.artisans.slice(0, 30).map((a, i) => ({
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
      <EnTeteParticuliers />
      <main className="mx-auto grid w-full max-w-[1320px] gap-9 overflow-clip px-[clamp(18px,4vw,44px)] py-[clamp(20px,3vw,36px)] pb-16">
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
        <header className="grid max-w-[860px] gap-3">
          <h1 className="m-0 text-[clamp(28px,3.6vw,42px)] leading-[1.1]">{p.titre}</h1>
          <p className="m-0 text-[17px] leading-[27px] text-neutre-800">{p.intro}</p>
          <Link href={p.appel.href} prefetch={false} className={`${bouton()} justify-self-start`}>
            {p.appel.libelle}
          </Link>
        </header>

        <AnnuaireSecteur {...p.annuaire} />

        <EncartPlans />

        <article className="grid max-w-[860px] gap-7 text-neutre-800">
          {p.sections.map((s) => (
            <section key={s.titre} className="grid gap-3">
              <h2 className="m-0 text-[clamp(20px,2.4vw,26px)] text-texte">{s.titre}</h2>
              {s.paragraphes.map((t) => (
                <p key={t} className="m-0 text-base leading-[27px]">
                  {t}
                </p>
              ))}
            </section>
          ))}
          {p.faits.length ? (
            <aside aria-label="Sources" className="rounded-[12px] bg-neutre-100 p-4 text-sm">
              <p className="m-0 mb-2 font-semibold text-texte">Sources</p>
              <ul className="m-0 grid gap-1.5 pl-5">
                {p.faits.map((f) => (
                  <li key={f.source + f.texte}>
                    {f.texte}{' '}
                    <a
                      href={f.source}
                      rel="noopener nofollow"
                      target="_blank"
                      className="break-all"
                    >
                      ({new URL(f.source).hostname.replace(/^www\./, '')})
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </article>

        <section aria-labelledby="titre-faq" className="grid max-w-[860px] gap-3">
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
      <PiedParticuliers />
    </>
  );
}
