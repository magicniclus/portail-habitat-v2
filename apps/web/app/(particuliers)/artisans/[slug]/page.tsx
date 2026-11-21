import { assuranceVerifiee, positionBanniere, seoFiche } from '@ph/core/annuaire';
import { AssuranceNonVerifiee } from '@/features/annuaire/AssuranceNonVerifiee';
import { LabelPremium } from '@/features/annuaire/LabelPremium';
import { jsonLdArtisan } from '@ph/core/annuaire';
import { casseVille, formatFourchette } from '@ph/core/format';
import { NoteMoyenne } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BandeauApercu } from '@/features/fiche/BandeauApercu';
import { CarrouselBannieres } from '@/features/fiche/CarrouselBannieres';
import { MesureFiche } from '@/features/fiche/MesureFiche';
import { ContactFiche } from '@/features/fiche/ContactFiche';
import { MenuSectionsFiche } from '@/features/fiche/MenuSectionsFiche';
import { SeoFiche } from '@/features/fiche/SeoFiche';
import { communeDuPoint, communesProches } from '@/server/communesProches';
import { DerniersAvis, Labels, Realisations } from '@/features/fiche/SectionsFiche';
import { CarteFiche } from '@/features/fichePro/CarteFiche';
import { CarteZoneFiche } from '@/features/fichePro/CarteZoneFiche';
import { EnTeteFiche } from '@/features/fichePro/EnTeteFiche';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { enTeteParticuliers, piedParticuliers } from '@/features/vitrine/navigation';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { URL_SITE } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';
import { lireFiche } from '@/server/annuaire';
import { metiersPopulaires, nomMetier, prestationsDuMetier } from '@/server/metiers';
import { LecteurVideo } from '@/features/fiche/LecteurVideo';

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

/**
 * Fiche publique : même contenu et même mise en page que Ma fiche (en-tête avec bannière et logo,
 * avis, à propos, zone sur la carte, devis moyen, projets), et à droite le formulaire pour
 * laisser ses coordonnées directement à l'artisan. Hors ligne ou inconnue : 404 (FIC-02).
 */
export default async function PageFiche({ params }: { params: Params }) {
  const donnees = await lireFiche((await params).slug);
  if (!donnees) notFound();
  const { id, fiche: f, avis, realisations } = donnees;
  const metier = nomMetier(f.metierPrincipal);
  // Vidéo en bannière et images qui défilent : fiches mises en avant (Premium).
  const videoBanniere = f.misEnAvant ? f.videoUrl : undefined;
  const villeSiege = casseVille(f.ville);
  const [villesProches, prestations, communeZone] = await Promise.all([
    communesProches(f.geo, f.rayonKm),
    prestationsDuMetier(f.metierPrincipal),
    communeDuPoint(f.geo),
  ]);
  // Liens et textes autour de la zone réellement couverte (son centre), pas du seul siège.
  const villeZone = communeZone ?? villeSiege;
  const seo = seoFiche({
    nom: f.nomCommercial,
    metier: { id: f.metierPrincipal, nom: metier },
    ville: villeZone,
    nbAvis: f.nbAvis,
    note: f.noteMoyenne,
    villesProches,
    autresMetiers: metiersPopulaires(),
    prestations,
  });
  const sections = [
    { id: 'a-propos', libelle: 'À propos' },
    ...(realisations.length ? [{ id: 'projets', libelle: 'Réalisations' }] : []),
    { id: 'zone', libelle: 'Zone d’intervention' },
    { id: 'avis', libelle: 'Avis' },
    { id: 'labels', libelle: 'Certifications' },
    ...(f.budgetMin !== undefined && f.budgetMax !== undefined
      ? [{ id: 'budget', libelle: 'Devis moyen' }]
      : []),
    ...(f.videoUrl ? [{ id: 'video', libelle: 'Vidéo' }] : []),
  ];

  return (
    <>
      <JsonLd donnees={jsonLdArtisan(f, URL_SITE)} />
      <EnTetePublic {...enTeteParticuliers} />
      <main className="mx-auto grid w-full max-w-[1240px] gap-5 px-[clamp(18px,4vw,44px)] py-[clamp(20px,3vw,36px)] pb-16">
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

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] [&>*]:min-w-0">
          <div className="grid min-w-0 gap-5">
            <EnTeteFiche
              artisanId={id}
              nom={f.nomCommercial}
              metiers={f.metiers}
              modifiable={false}
              {...(f.logoUrl ? { logoUrl: f.logoUrl } : {})}
              banniere={
                f.bannieres?.length || videoBanniere ? (
                  <div className="h-[clamp(150px,24vw,280px)] overflow-hidden bg-neutre-100">
                    <CarrouselBannieres
                      urls={f.bannieres ?? []}
                      position={positionBanniere(f.cadrageBanniere)}
                      className="size-full"
                      auto={Boolean(f.misEnAvant)}
                      {...(videoBanniere ? { video: videoBanniere } : {})}
                    />
                  </div>
                ) : (
                  <div className="h-16 bg-neutre-100" />
                )
              }
              complement={
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {f.badgeRecommande ? <LabelPremium /> : null}
                  <span className="text-[15px] text-neutre-800">
                    {metier} · {villeSiege}
                    {f.anneesActivite ? ` · ${f.anneesActivite} ans d’activité` : ''}
                  </span>
                  <NoteMoyenne note={f.noteMoyenne} nbAvis={f.nbAvis} className="text-[15px]" />
                </div>
              }
            />
            <CarteFiche titre="À propos" id="a-propos">
              {f.pitch ? <p className="m-0 text-[17px] font-semibold">{f.pitch}</p> : null}
              {f.description ? (
                <p className="m-0 text-base leading-[26px] whitespace-pre-line text-neutre-800">
                  {f.description}
                </p>
              ) : null}
            </CarteFiche>
            <MenuSectionsFiche sections={sections} />
            {realisations.length ? (
              <CarteFiche titre="Projets réalisés" id="projets">
                <Realisations liste={realisations} />
              </CarteFiche>
            ) : null}
            <CarteFiche titre="Zone d’intervention" id="zone">
              <p className="m-0 text-[15px] text-neutre-800">
                Intervient jusqu&apos;à {f.rayonKm} km autour de {villeZone}.
              </p>
              <CarteZoneFiche centre={f.geo} rayonKm={f.rayonKm} />
            </CarteFiche>
            <CarteFiche
              titre={f.nbAvis ? `Derniers avis (${f.nbAvis})` : 'Derniers avis'}
              id="avis"
            >
              <DerniersAvis avis={avis} />
            </CarteFiche>
            <CarteFiche titre="Certifications et assurance" id="labels">
              <Labels labels={f.labels} />
              {assuranceVerifiee(f.labels) ? null : <AssuranceNonVerifiee />}
            </CarteFiche>
            {f.budgetMin !== undefined && f.budgetMax !== undefined ? (
              <CarteFiche titre="Devis moyen" id="budget">
                <p className="m-0 text-lg font-bold">
                  {formatFourchette(f.budgetMin, f.budgetMax)}
                </p>
              </CarteFiche>
            ) : null}
            {f.videoUrl ? (
              <CarteFiche titre="Vidéo de présentation" id="video">
                <LecteurVideo
                  url={f.videoUrl}
                  titre={`Vidéo de présentation de ${f.nomCommercial}`}
                />
              </CarteFiche>
            ) : null}
          </div>
          <ContactFiche artisanId={id} nom={f.nomCommercial} telephone={f.telephone} />
        </div>
        <SeoFiche seo={seo} metier={f.metierPrincipal} ville={villeZone} />
      </main>
      <MesureFiche artisanId={id} />
      <PiedPublic {...piedParticuliers} />
    </>
  );
}
