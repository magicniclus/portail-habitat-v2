import { articleAnnuaire, faqAnnuaire } from '@ph/core/annuaire';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageLocale } from '@/features/seoLocal/PageLocale';
import { routes } from '@/lib/routes';
import { nomMetier, prestationsDuMetier } from '@/server/metiers';
import { donneesLocales, RAYON_LOCAL } from '@/server/pagesLocales';
import { communeParSlug, metierParId, tousLesMetiers } from '@/server/seoLocal';

type Params = Promise<{ metier: string; ville: string }>;

// Page permanente « métier à une ville » : rendue à la première visite puis mise en cache
// (ISR, une heure), pour que les nouveaux artisans y apparaissent sans redéploiement.
export const revalidate = 3600;
export const generateStaticParams = async () => [];

async function charger(p: Params) {
  const { metier: id, ville } = await p;
  const [metier, commune] = [metierParId(id), await communeParSlug(ville)];
  if (!metier || !commune) notFound();
  return { metier, commune };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { metier, commune } = await charger(params);
  const titre = `${metier.nom} à ${commune.nom} (${commune.codePostal}) : artisans vérifiés`;
  const description = `Trouvez ${metier.nom.toLowerCase()} vérifié à ${commune.nom} et alentour : entreprises contrôlées, avis vérifiés, réalisations. Contact direct et devis gratuits.`;
  const chemin = routes.metierVille(metier.id, commune.slug);
  return {
    title: titre,
    description,
    alternates: { canonical: chemin },
    openGraph: { title: titre, description, url: chemin, type: 'website', locale: 'fr_FR' },
  };
}

export default async function PageMetierVille({ params }: { params: Params }) {
  const { metier, commune } = await charger(params);
  const [d, prestations] = await Promise.all([
    donneesLocales(commune, [metier.id]),
    prestationsDuMetier(metier.id),
  ]);
  const entree = {
    ville: commune.nom,
    rayonKm: RAYON_LOCAL,
    nbArtisans: d.nbSecteur,
    metier: { nom: metier.nom, prestations: prestations.map((x) => x.nom) },
  };
  const article = articleAnnuaire(entree)!;
  const [intro, ...suite] = article.paragraphes;
  return (
    <PageLocale
      fil={[
        { nom: 'Accueil', chemin: routes.accueil },
        { nom: 'Métiers', chemin: routes.metiers },
        { nom: metier.nom, chemin: routes.metier(metier.id) },
        { nom: commune.nom, chemin: routes.metierVille(metier.id, commune.slug) },
      ]}
      titre={`${metier.nom} à ${commune.nom}`}
      intro={intro!}
      artisans={d.artisans}
      repli={d.repli}
      nomMetier={nomMetier}
      paragraphes={suite}
      faq={faqAnnuaire(entree)}
      appel={{ libelle: 'Décrire mon projet gratuitement', href: routes.simulateur }}
      groupes={[
        {
          titre: `${metier.nom} près de ${commune.nom}`,
          liens: d.voisines.map((v) => ({
            libelle: `${metier.nom} à ${v}`,
            href: routes.metierVille(metier.id, v),
          })),
        },
        {
          titre: `Travaux à ${commune.nom}`,
          liens: prestations.slice(0, 12).map((x) => ({
            libelle: `${x.nom} à ${commune.nom}`,
            href: routes.travauxVille(x.id, commune.slug),
          })),
        },
        {
          titre: `Autres artisans à ${commune.nom}`,
          liens: tousLesMetiers()
            .filter((m) => m.id !== metier.id && m.famille === metier.famille)
            .slice(0, 12)
            .map((m) => ({
              libelle: `${m.nom} à ${commune.nom}`,
              href: routes.metierVille(m.id, commune.slug),
            })),
        },
      ]}
    />
  );
}
