import { formatEuros } from '@ph/core/format';
import Link from 'next/link';
import { EnTeteSection, Section } from '@/features/vitrine/Section';
import { Visuel } from '@/features/vitrine/Visuel';
import { routes } from '@/lib/routes';
import { METIERS_ACCUEIL } from './contenu';

/** « Par où commencer ? » : grille auto-fit 210 px + carte « Simuler mon devis ». */
export function Metiers() {
  return (
    <Section id="metiers">
      <EnTeteSection
        titre="Par où commencer ?"
        chapeau="Choisissez le métier dont vous avez besoin : vous voyez les artisans disponibles dans votre commune et les budgets constatés."
        lien={{ libelle: 'Voir tous les métiers', href: routes.artisans }}
      />
      <ul className="m-0 grid list-none grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(210px,1fr))] sm:gap-[18px] p-0">
        {METIERS_ACCUEIL.map((m) => (
          <li key={m.metier}>
            <Link
              href={routes.artisansFiltres({ metier: m.metier })}
              className="block overflow-hidden rounded-card bg-blanc text-texte no-underline shadow-sm transition-[transform,box-shadow] duration-200 hover:shadow-md motion-safe:hover:-translate-y-1"
            >
              <span className="block aspect-[4/3]">
                <Visuel />
              </span>
              <span className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-0.5 px-3 py-3 sm:px-4 sm:py-3.5">
                <span className="text-base font-semibold">{m.nom}</span>
                <span className="text-[13px] text-neutre-700">
                  dès {formatEuros(m.des)}
                  {'parM2' in m ? '/m²' : ''}
                </span>
              </span>
            </Link>
          </li>
        ))}
        <li className="col-span-2 sm:col-span-1">
          <Link
            href={routes.simulateur}
            className="flex h-full min-h-[140px] flex-col justify-between sm:min-h-[180px] gap-[18px] rounded-card bg-accent-action px-5 py-[22px] text-blanc no-underline shadow-sm hover:bg-accent-700 hover:text-blanc"
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
              <path d="M7.5 7h9M8 11.5h1.5M11.5 11.5H13M15 11.5h1.5M8 15.5h1.5M11.5 15.5H13M15 15.5h1.5M8 19h5" />
            </svg>
            <span>
              <span className="mb-1.5 block text-[19px] font-bold">Simuler mon devis</span>
              <span className="block text-[14.5px] leading-[21px] opacity-95">
                Estimation détaillée poste par poste, en 2 minutes.
              </span>
            </span>
          </Link>
        </li>
      </ul>
    </Section>
  );
}
