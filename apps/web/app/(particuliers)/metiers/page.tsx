import type { Metadata } from 'next';
import Link from 'next/link';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { enTeteParticuliers, piedParticuliers } from '@/features/vitrine/navigation';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { filAriane } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';
import { tousLesMetiers } from '@/server/seoLocal';

export const metadata: Metadata = {
  title: 'Tous les métiers du bâtiment : trouver un artisan vérifié',
  description:
    'Plombier, électricien, couvreur, peintre… Choisissez un métier pour trouver un artisan vérifié près de chez vous et le contacter gratuitement.',
  alternates: { canonical: routes.metiers },
};

/** Index des métiers : chaque lien mène à la page permanente du métier (maillage interne). */
export default function PageMetiers() {
  const metiers = tousLesMetiers();
  return (
    <>
      <JsonLd
        donnees={filAriane([
          { nom: 'Accueil', chemin: routes.accueil },
          { nom: 'Métiers', chemin: routes.metiers },
        ])}
      />
      <EnTetePublic {...enTeteParticuliers} />
      <main className="mx-auto grid w-full max-w-[1100px] gap-6 px-[clamp(18px,4vw,44px)] py-[clamp(20px,3vw,36px)] pb-16">
        <h1 className="m-0 text-[clamp(28px,3.6vw,42px)] leading-[1.1]">
          Tous les métiers du bâtiment
        </h1>
        <p className="m-0 max-w-[70ch] text-[17px] leading-[27px] text-neutre-800">
          Choisissez un métier pour voir les artisans vérifiés près de chez vous. Les contacter
          depuis leur fiche est gratuit et sans engagement.
        </p>
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {metiers.map((m) => (
            <li key={m.id}>
              <Link
                href={routes.metier(m.id)}
                className="flex min-h-12 items-center rounded-[12px] border border-trait bg-blanc px-4 font-semibold text-texte no-underline hover:border-neutre-500"
              >
                {m.nom}
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <PiedPublic {...piedParticuliers} />
    </>
  );
}
