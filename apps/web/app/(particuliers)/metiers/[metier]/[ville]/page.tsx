import { articleAnnuaire, chipsFiltres, faqAnnuaire } from '@ph/core/annuaire';
import { pageIndexee } from '@ph/core/pages-secteur';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageSecteur } from '@/features/seoLocal/PageSecteur';
import { routes } from '@/lib/routes';
import { nomMetier, prestationsDuMetier } from '@/server/metiers';
import { optionsAnnuaire } from '@/server/optionsAnnuaire';
import { donneesLocales, RAYON_LOCAL } from '@/server/pagesLocales';
import { liensSecteur, pageRegistre } from '@/server/pagesSecteur';
import { communeParSlug, metierParId, tousLesMetiers } from '@/server/seoLocal';

type Params = Promise<{ metier: string; ville: string }>;

// Page de secteur « métier à une commune » : rendue à la première visite puis mise en cache
// (ISR, une heure). Indexée seulement si elle est au registre (créée par l'arrivée d'un artisan)
// et qu'au moins un artisan du secteur est affiché ; sinon « noindex, follow ».
export const revalidate = 3600;
export const generateStaticParams = async () => [];

async function charger(p: Params) {
  const { metier: id, ville } = await p;
  const [metier, commune] = [metierParId(id), await communeParSlug(ville)];
  if (!metier || !commune) notFound();
  const [d, registre] = await Promise.all([
    donneesLocales(commune, [metier.id]),
    pageRegistre(metier.id, commune.slug),
  ]);
  return { metier, commune, d, registre };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { metier, commune, d, registre } = await charger(params);
  const cp = commune.codePostal ? ` (${commune.codePostal})` : '';
  const nb = d.nbSecteur;
  const titre = `${metier.nom} à ${commune.nom}${cp} : ${nb > 1 ? `${nb} artisans vérifiés` : 'artisan vérifié'}`;
  const description = `${metier.nom} à ${commune.nom} et alentour : ${nb > 1 ? `${nb} artisans vérifiés` : 'artisans vérifiés'}, avis contrôlés, réalisations. Comparez les fiches et demandez des devis gratuits.`;
  const chemin = routes.metierVille(metier.id, commune.slug);
  return {
    title: titre,
    description,
    alternates: { canonical: chemin },
    robots: pageIndexee(registre, nb) ? undefined : { index: false, follow: true },
    openGraph: { title: titre, description, url: chemin, type: 'website', locale: 'fr_FR' },
  };
}

export default async function PageMetierVille({ params }: { params: Params }) {
  const { metier, commune, d, registre } = await charger(params);
  const page = registre && registre !== 'absente' ? registre : null;
  const [prestations, liens] = await Promise.all([
    prestationsDuMetier(metier.id),
    liensSecteur(metier.id, commune.slug, page?.commune.departement ?? ''),
  ]);
  const entree = {
    ville: commune.nom,
    rayonKm: RAYON_LOCAL,
    nbArtisans: d.nbSecteur,
    metier: { nom: metier.nom, prestations: prestations.map((x) => x.nom) },
  };
  // Texte local rédigé par l'IA et contrôlé ; sinon, texte construit sur nos données.
  const ia = page?.texteEtat === 'pret' ? page.texte : undefined;
  const article = articleAnnuaire(entree)!;
  const [introDonnees, ...suite] = article.paragraphes;
  const faqDonnees = faqAnnuaire(entree);
  const faq = ia
    ? [...ia.faq, ...faqDonnees.filter((f) => !ia.faq.some((x) => x.q === f.q))]
    : faqDonnees;
  const nomsMetiers = new Map(tousLesMetiers().map((m) => [m.id, m.nom]));
  // Liens : pages indexées du registre ; à défaut (registre illisible), communes voisines.
  const voisines = liens.voisines.length
    ? liens.voisines.map((v) => ({
        libelle: `${metier.nom} à ${v.commune.nom}`,
        slug: v.commune.slug,
      }))
    : d.voisines.map((v) => ({ libelle: `${metier.nom} à ${v}`, slug: v }));
  return (
    <PageSecteur
      fil={[
        { nom: 'Accueil', chemin: routes.accueil },
        { nom: 'Métiers', chemin: routes.metiers },
        { nom: metier.nom, chemin: routes.metier(metier.id) },
        { nom: commune.nom, chemin: routes.metierVille(metier.id, commune.slug) },
      ]}
      titre={`${metier.nom} à ${commune.nom}`}
      intro={ia?.intro ?? introDonnees!}
      appel={{ libelle: 'Décrire mon projet gratuitement', href: routes.simulateur }}
      annuaire={{
        f: d.f,
        r: d.r,
        proches: d.repli ? d.artisans : [],
        options: optionsAnnuaire(d.f.metier),
        nbActifs: chipsFiltres(d.f, nomMetier).length,
        lieu: commune.nom,
        nomMetier,
        titre: d.repli
          ? `Aucun ${metier.nom.toLowerCase()} à ${commune.nom} pour l’instant : les plus proches`
          : `${metier.nom} à ${commune.nom} : les artisans vérifiés du secteur`,
      }}
      artisans={d.artisans}
      sections={ia?.sections ?? [{ titre: article.titre, paragraphes: suite }]}
      faits={ia?.faits ?? []}
      faq={faq}
      groupes={[
        {
          titre: `${metier.nom} près de ${commune.nom}`,
          liens: voisines.slice(0, 16).map((v) => ({
            libelle: v.libelle,
            href: routes.metierVille(metier.id, v.slug),
          })),
        },
        {
          titre: `Autres artisans à ${commune.nom}`,
          liens: (liens.metiers.length
            ? liens.metiers
            : tousLesMetiers()
                .filter((m) => m.id !== metier.id && m.famille === metier.famille)
                .map((m) => m.id)
          )
            .slice(0, 16)
            .map((m) => ({
              libelle: `${nomsMetiers.get(m) ?? m} à ${commune.nom}`,
              href: routes.metierVille(m, commune.slug),
            })),
        },
        {
          titre: `Travaux à ${commune.nom}`,
          liens: prestations.slice(0, 12).map((x) => ({
            libelle: `${x.nom} à ${commune.nom}`,
            href: routes.travauxVille(x.id, commune.slug),
          })),
        },
      ]}
    />
  );
}
