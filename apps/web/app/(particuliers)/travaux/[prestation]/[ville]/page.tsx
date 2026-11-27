import { articleAnnuaire, faqAnnuaire } from '@ph/core/annuaire';
import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import { PageLocale } from '@/features/seoLocal/PageLocale';
import { routes } from '@/lib/routes';
import { nomMetier } from '@/server/metiers';
import { donneesLocales, RAYON_LOCAL } from '@/server/pagesLocales';
import {
  communeParSlug,
  metiersDeFamille,
  prestationParId,
  prestationsDeFamille,
} from '@/server/seoLocal';

type Params = Promise<{ prestation: string; ville: string }>;

// Page permanente « travaux à une ville » (prestations du simulateur) : ISR, une heure.
export const revalidate = 3600;
export const generateStaticParams = async () => [];

async function charger(p: Params) {
  const { prestation: id, ville } = await p;
  const [prestation, commune] = [prestationParId(id), await communeParSlug(ville)];
  if (!prestation || !commune) notFound();
  return { prestation, commune };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { prestation, commune } = await charger(params);
  const titre = `${prestation.nom} à ${commune.nom} : prix repère et artisans vérifiés`;
  const description = `${prestation.pitch} à ${commune.nom} (${commune.codePostal}). Prix repère ${prestation.repere} selon notre simulateur, artisans vérifiés du secteur, devis gratuits.`;
  const chemin = routes.travauxVille(prestation.id, commune.slug);
  return {
    title: titre,
    description,
    alternates: { canonical: chemin },
    openGraph: { title: titre, description, url: chemin, type: 'website', locale: 'fr_FR' },
  };
}

export default async function PageTravauxVille({ params }: { params: Params }) {
  const { prestation, commune } = await charger(params);
  const metiers = metiersDeFamille(prestation.famille);
  const d = await donneesLocales(commune, metiers);
  const entree = {
    ville: commune.nom,
    rayonKm: RAYON_LOCAL,
    nbArtisans: d.nbSecteur,
    prestation,
  };
  const article = articleAnnuaire(entree)!;
  const [intro, ...suite] = article.paragraphes;
  return (
    <PageLocale
      fil={[
        { nom: 'Accueil', chemin: routes.accueil },
        { nom: 'Métiers', chemin: routes.metiers },
        {
          nom: `${prestation.nom} à ${commune.nom}`,
          chemin: routes.travauxVille(prestation.id, commune.slug),
        },
      ]}
      titre={`${prestation.nom} à ${commune.nom}`}
      intro={intro!}
      artisans={d.artisans}
      repli={d.repli}
      nomMetier={nomMetier}
      paragraphes={suite}
      faq={faqAnnuaire(entree)}
      appel={{
        libelle: 'Estimer mon projet gratuitement',
        href: `${routes.simulateur}?prestation=${prestation.id}` as Route,
      }}
      groupes={[
        {
          titre: `${prestation.nom} près de ${commune.nom}`,
          liens: d.voisines.map((v) => ({
            libelle: `${prestation.nom} à ${v}`,
            href: routes.travauxVille(prestation.id, v),
          })),
        },
        {
          titre: `Travaux similaires à ${commune.nom}`,
          liens: prestationsDeFamille(prestation.famille)
            .filter((x) => x.id !== prestation.id)
            .slice(0, 12)
            .map((x) => ({
              libelle: `${x.nom} à ${commune.nom}`,
              href: routes.travauxVille(x.id, commune.slug),
            })),
        },
        {
          titre: `Artisans à ${commune.nom}`,
          liens: metiers.map((m) => ({
            libelle: `${nomMetier(m)} à ${commune.nom}`,
            href: routes.metierVille(m, commune.slug),
          })),
        },
      ]}
    />
  );
}
