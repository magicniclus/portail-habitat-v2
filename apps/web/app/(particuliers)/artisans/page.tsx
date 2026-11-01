import {
  articleAnnuaire,
  BUDGETS_ANNUAIRE,
  chipsFiltres,
  DISPOS_ANNUAIRE,
  ecrireFiltresAnnuaire,
  LIBELLES_LABELS,
  lireFiltresAnnuaire,
  NOTES_ANNUAIRE,
} from '@ph/core/annuaire';
import { trierResultats } from '@ph/firebase/annuaire';
import { bouton } from '@ph/ui';
import type { Metadata, Route } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { BarreRecherche } from '@/features/annuaire/BarreRecherche';
import { Traceur } from '@/features/comportement/Traceur';
import { Filtres, type OptionsFiltres } from '@/features/annuaire/Filtres';
import { PanneauFiltres } from '@/features/annuaire/PanneauFiltres';
import { Resultats } from '@/features/annuaire/Resultats';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { enTeteParticuliers, piedParticuliers } from '@/features/vitrine/navigation';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { routes } from '@/lib/routes';
import { artisansAutour, compterRecherche, idsTexte, resoudreLieu } from '@/server/annuaire';
import { metiersFiltre, nomMetier, prestationParNom, prestationsDuMetier } from '@/server/metiers';
import { ArticleAnnuaire } from '@/features/annuaire/ArticleAnnuaire';

type Params = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Params;
}): Promise<Metadata> {
  const f = lireFiltresAnnuaire(await searchParams);
  const metier = f.metier.length === 1 ? nomMetier(f.metier[0]!) : null;
  const prestation = f.q ? await prestationParNom(f.q) : null;
  const titre = prestation
    ? `${prestation.nom}${f.ville ? ` à ${f.ville}` : ''} : artisans vérifiés`
    : `${metier ? `${metier}s` : 'Artisans vérifiés'}${f.ville ? ` à ${f.ville}` : ' en Gironde'}`;
  return {
    title: titre,
    description:
      'Artisans vérifiés près de chez vous : SIRET et avis contrôlés, assurance vérifiée signalée sur chaque fiche. Comparez les notes, les disponibilités et demandez un devis gratuit.',
    // Une page par métier et par ville, et par travaux du simulateur et par ville (avec leur
    // texte) ; les autres recherches et combinaisons de filtres ne sont pas indexées.
    alternates: {
      canonical: routes.annuaire(
        ecrireFiltresAnnuaire({
          ...lireFiltresAnnuaire({}),
          ...(prestation ? { q: prestation.nom } : { metier: f.metier.slice(0, 1) }),
          ville: f.ville,
        }),
      ),
    },
    robots:
      chipsFiltres(f, String).length > 1 || (f.q && !prestation)
        ? { index: false, follow: true }
        : undefined,
  };
}

/** Maquette Annuaire Artisans : page serveur, tout l'état est dans l'URL (ANN-01). */
export default async function PageAnnuaire({ searchParams }: { searchParams: Params }) {
  const f = lireFiltresAnnuaire(await searchParams);
  // Commune choisie dans les suggestions : sa position exacte ; sinon, la ville est géocodée.
  const lieu =
    f.ville && f.lat !== undefined && f.lon !== undefined
      ? { nom: f.ville, latitude: f.lat, longitude: f.lon }
      : await resoudreLieu(f.ville);
  const [fiches, ordre] = await Promise.all([
    artisansAutour(lieu, f.rayon),
    idsTexte(f.q, lieu, f.rayon),
  ]);
  const r = trierResultats(fiches, f, ordre);
  // Pages « métier à une ville » et « travaux à une ville » : un vrai texte sous la liste.
  const prestation = f.q ? await prestationParNom(f.q) : null;
  const metierSeul = f.metier.length === 1 && !f.q ? f.metier[0]! : null;
  const article = articleAnnuaire({
    ville: f.ville ? lieu.nom : '',
    rayonKm: f.rayon,
    nbArtisans: r.premium.length + r.standards.length,
    ...(prestation ? { prestation } : {}),
    ...(metierSeul
      ? {
          metier: {
            nom: nomMetier(metierSeul),
            prestations: (await prestationsDuMetier(metierSeul)).map((p) => p.nom),
          },
        }
      : {}),
  });
  if (f.metier.length === 1 && f.ville)
    compterRecherche(
      { metier: f.metier[0]!, lieu, userAgent: (await headers()).get('user-agent') ?? '' },
      r,
    );
  const options: OptionsFiltres = {
    metiers: metiersFiltre(f.metier),
    notes: NOTES_ANNUAIRE,
    labels: Object.entries(LIBELLES_LABELS).map(([id, libelle]) => ({ id, libelle })),
    dispos: DISPOS_ANNUAIRE,
    budgets: BUDGETS_ANNUAIRE,
  };
  const cle = ecrireFiltresAnnuaire(f);
  const nbActifs = chipsFiltres(f, nomMetier).length;

  return (
    <>
      <EnTetePublic {...enTeteParticuliers} />
      <div className="border-b border-accent-200 bg-accent-100 px-[clamp(18px,4vw,44px)] py-[clamp(20px,2.6vw,32px)]">
        <div className="mx-auto max-w-[1320px]">
          <h1 className="m-0 mb-2 text-[clamp(24px,3vw,34px)] leading-[1.1]">
            Trouver un artisan vérifié près de chez vous
          </h1>
          <p className="m-0 mb-4.5 max-w-[58ch] text-[16.5px] leading-[25px] text-neutre-800">
            SIRET et avis contrôlés ; l’assurance vérifiée (décennale ou RC Pro) est signalée sur
            chaque fiche.
            {lieu.inconnu
              ? ` Lieu « ${f.ville} » introuvable : résultats autour de ${lieu.nom}.`
              : ''}
          </p>
          <BarreRecherche f={f} />
        </div>
      </div>
      {/* overflow-clip : les filtres collants ne dépassent pas sous le pied de page (peu de résultats). */}
      <main className="mx-auto w-full max-w-[1320px] overflow-clip px-[clamp(18px,4vw,44px)] py-[clamp(20px,2.6vw,32px)] pb-[clamp(40px,5vw,64px)]">
        <div className="mb-4 lg:hidden">
          <PanneauFiltres key={cle} valeurs={f} options={options} nbActifs={nbActifs} />
        </div>
        <div className="grid items-start gap-x-[clamp(22px,3vw,38px)] gap-y-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <aside
            data-ph-section="filtres"
            className="sticky top-4.5 hidden max-h-[calc(100vh-36px)] min-h-0 flex-col gap-3.5 lg:flex"
          >
            <div className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-trait bg-blanc p-4.5">
              <p className="m-0 mb-4 flex-none text-base font-bold">Filtres</p>
              <div className="min-h-0 overflow-y-auto pr-1.5">
                <Filtres key={cle} valeurs={f} options={options} id="colonne" />
              </div>
            </div>
            <div className="flex-none rounded-[14px] bg-accent-2-100 p-4.5">
              <p className="m-0 mb-1.5 text-[15px] font-bold">Vous ne trouvez pas ?</p>
              <p className="m-0 mb-3 text-[13.5px] leading-[21px] text-neutre-800">
                Décrivez votre projet : les artisans disponibles de votre secteur viennent à vous.
              </p>
              <Link
                href={routes.simulateur}
                prefetch={false}
                className={bouton()}
                data-ph="cta-deposer-projet"
              >
                Déposer mon projet
              </Link>
            </div>
          </aside>
          <Resultats f={f} r={r} nomMetier={nomMetier} />
        </div>
        {article ? (
          <ArticleAnnuaire
            article={article}
            {...(prestation
              ? { simulateur: `${routes.simulateur}?prestation=${prestation.id}` as Route }
              : {})}
          />
        ) : null}
      </main>
      <Traceur page="annuaire" />
      <PiedPublic {...piedParticuliers} />
    </>
  );
}
