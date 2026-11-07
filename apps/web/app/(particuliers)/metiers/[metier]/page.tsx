import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { enTeteParticuliers, piedParticuliers } from '@/features/vitrine/navigation';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { filAriane } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';
import { prestationsDuMetier } from '@/server/metiers';
import { metierParId, tousLesMetiers, VILLES_LOCALES } from '@/server/seoLocal';

type Params = Promise<{ metier: string }>;

// Une page par métier, générée au build (liste connue et courte).
export const generateStaticParams = () => tousLesMetiers().map((m) => ({ metier: m.id }));
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const m = metierParId((await params).metier);
  if (!m) return {};
  return {
    title: `${m.nom} : trouver un artisan vérifié près de chez vous`,
    description: `Trouvez ${m.nom.toLowerCase()} vérifié dans votre commune : entreprises contrôlées, avis vérifiés, contact direct et devis gratuits.`,
    alternates: { canonical: routes.metier(m.id) },
  };
}

/** Page d'un métier : ses travaux courants et les communes desservies (pages métier × ville). */
export default async function PageMetier({ params }: { params: Params }) {
  const m = metierParId((await params).metier);
  if (!m) notFound();
  const prestations = await prestationsDuMetier(m.id);
  const pastille =
    'inline-flex min-h-11 items-center rounded-pill border border-trait bg-blanc px-3.5 text-neutre-800 no-underline hover:border-neutre-500 hover:text-texte';
  return (
    <>
      <JsonLd
        donnees={filAriane([
          { nom: 'Accueil', chemin: routes.accueil },
          { nom: 'Métiers', chemin: routes.metiers },
          { nom: m.nom, chemin: routes.metier(m.id) },
        ])}
      />
      <EnTetePublic {...enTeteParticuliers} />
      <main className="mx-auto grid w-full max-w-[1100px] gap-6 px-[clamp(18px,4vw,44px)] py-[clamp(20px,3vw,36px)] pb-16">
        <h1 className="m-0 text-[clamp(28px,3.6vw,42px)] leading-[1.1]">{m.nom}</h1>
        <p className="m-0 max-w-[70ch] text-[17px] leading-[27px] text-neutre-800">
          Choisissez votre commune pour voir les artisans vérifiés qui interviennent chez vous,
          leurs réalisations et leurs avis. Les contacter est gratuit.
        </p>
        <nav aria-label={`${m.nom} par commune`} className="grid gap-2">
          <h2 className="m-0 text-xl">{m.nom} par commune</h2>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm">
            {VILLES_LOCALES.map((v) => (
              <li key={v}>
                <Link href={routes.metierVille(m.id, v)} className={pastille}>
                  {m.nom} à {v}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {prestations.length ? (
          <section aria-labelledby="titre-travaux" className="grid gap-2">
            <h2 id="titre-travaux" className="m-0 text-xl">
              Travaux souvent demandés
            </h2>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm">
              {prestations.map((p) => (
                <li key={p.id}>
                  <Link href={routes.travauxVille(p.id, 'Bordeaux')} className={pastille}>
                    {p.nom}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <PiedPublic {...piedParticuliers} />
    </>
  );
}
