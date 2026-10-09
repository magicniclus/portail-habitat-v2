import { jsonLdArtisan } from '@ph/core/annuaire';
import { formatFourchette, formatTel } from '@ph/core/format';
import { bouton, NoteMoyenne } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { initiales } from '@ph/core/format';
import { BandeauApercu } from '@/features/fiche/BandeauApercu';
import { MesureFiche } from '@/features/fiche/MesureFiche';
import { Bloc, DerniersAvis, Labels, Realisations } from '@/features/fiche/SectionsFiche';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { enTeteParticuliers, piedParticuliers } from '@/features/vitrine/navigation';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { URL_SITE } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';
import { lireFiche } from '@/server/annuaire';
import { nomMetier } from '@/server/metiers';

// Fiches générées à la première visite puis régénérées toutes les heures (ISR, README).
export const revalidate = 3600;
export const generateStaticParams = async () => [];

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const f = await lireFiche((await params).slug);
  if (!f) return { title: 'Artisan introuvable', robots: { index: false } };
  const metier = nomMetier(f.fiche.metierPrincipal);
  return {
    title: `${f.fiche.nomCommercial}, ${metier.toLowerCase()} à ${f.fiche.ville}`,
    description: (f.fiche.pitch || f.fiche.description).slice(0, 160),
    alternates: { canonical: routes.ficheArtisan(f.fiche.slug) },
  };
}

/** Fiche publique (vue publique de la maquette Ma Fiche) ; hors ligne ou inconnue : 404 (FIC-02). */
export default async function PageFiche({ params }: { params: Params }) {
  const donnees = await lireFiche((await params).slug);
  if (!donnees) notFound();
  const { id, fiche: f, avis, realisations } = donnees;
  const metier = nomMetier(f.metierPrincipal);
  const devis = routes.simulateurArtisan(id);

  return (
    <>
      <JsonLd donnees={jsonLdArtisan(f, URL_SITE)} />
      <EnTetePublic {...enTeteParticuliers} />
      <main className="mx-auto grid w-full max-w-[1180px] gap-5 px-[clamp(18px,4vw,44px)] py-[clamp(20px,3vw,36px)] pb-16">
        <Suspense>
          <BandeauApercu />
        </Suspense>
        <nav
          aria-label="Fil d’Ariane"
          className="flex flex-wrap items-center gap-x-1.5 text-sm text-neutre-700"
        >
          <Link href={routes.artisans} className="inline-flex min-h-11 items-center">
            Artisans
          </Link>
          <span aria-hidden="true">›</span>
          <Link
            href={routes.annuaire(`?metier=${f.metierPrincipal}`)}
            className="inline-flex min-h-11 items-center"
          >
            {metier}
          </Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{f.nomCommercial}</span>
        </nav>
        <header className="flex flex-wrap items-center gap-4.5 rounded-[18px] bg-accent-100 p-[clamp(18px,3vw,30px)]">
          {f.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo Storage, taille fixe
            <img
              src={f.logoUrl}
              alt=""
              width={96}
              height={96}
              className="size-24 rounded-[16px] bg-blanc object-contain"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-24 place-items-center rounded-[16px] bg-blanc text-3xl font-bold text-accent-700"
            >
              {initiales(f.nomCommercial)}
            </span>
          )}
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-1.5">
            {f.premium ? (
              <span className="w-fit rounded-pill bg-premium-fond px-2.5 py-0.5 text-xs font-bold tracking-[0.04em] text-premium-texte uppercase">
                Premium
              </span>
            ) : null}
            <h1 className="m-0 text-[clamp(26px,3.4vw,38px)] leading-[1.1]">{f.nomCommercial}</h1>
            <p className="m-0 text-base text-neutre-800">
              {metier} · {f.ville}
              {f.anneesActivite ? ` · ${f.anneesActivite} ans d’activité` : ''}
            </p>
            <NoteMoyenne note={f.noteMoyenne} nbAvis={f.nbAvis} className="text-[15px]" />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={devis}
              prefetch={false}
              className={bouton({ taille: 'lg' })}
              data-ph-fiche="devis"
            >
              Demander un devis
            </Link>
            {f.telephone ? (
              <a
                href={`tel:${f.telephone}`}
                data-ph-fiche="tel"
                className={bouton({ variant: 'secondaire', taille: 'lg' })}
              >
                <span className="sr-only">Appeler au </span>
                {formatTel(f.telephone)}
              </a>
            ) : null}
          </div>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="grid gap-5">
            <Bloc titre="À propos" id="a-propos">
              <p className="m-0 text-base leading-[26px] whitespace-pre-line text-neutre-800">
                {f.description || f.pitch}
              </p>
            </Bloc>
            {realisations.length ? (
              <Bloc titre="Projets réalisés" id="projets">
                <Realisations liste={realisations} />
              </Bloc>
            ) : null}
            <Bloc titre={f.nbAvis ? `Derniers avis (${f.nbAvis})` : 'Derniers avis'} id="avis">
              <DerniersAvis avis={avis} />
            </Bloc>
          </div>
          <aside className="grid gap-5 lg:sticky lg:top-5">
            <Bloc titre="Certifications et labels" id="labels">
              <Labels labels={f.labels} />
            </Bloc>
            <Bloc titre="Zone d'intervention" id="zone">
              <p className="m-0 text-[15px] text-neutre-800">
                Intervient jusqu&apos;à {f.rayonKm} km autour de {f.ville}.
              </p>
            </Bloc>
            {f.budgetMin !== undefined && f.budgetMax !== undefined ? (
              <Bloc titre="Devis moyen" id="budget">
                <p className="m-0 text-lg font-bold">
                  {formatFourchette(f.budgetMin, f.budgetMax)}
                </p>
              </Bloc>
            ) : null}
            <div className="rounded-[16px] bg-accent-2-100 p-5">
              <p className="m-0 mb-1.5 text-base font-bold">Un projet avec {f.nomCommercial} ?</p>
              <p className="m-0 mb-3 text-sm leading-[22px] text-neutre-800">
                Décrivez vos travaux en 2 minutes : l&apos;artisan reçoit votre demande et vous
                répond.
              </p>
              <Link href={devis} prefetch={false} className={bouton()} data-ph-fiche="devis">
                Demander un devis
              </Link>
            </div>
          </aside>
        </div>
      </main>
      <MesureFiche artisanId={id} />
      <PiedPublic {...piedParticuliers} />
    </>
  );
}
