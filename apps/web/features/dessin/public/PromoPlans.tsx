import { bouton, cn } from '@ph/ui';
import { ArrowRightIcon, CheckCircleIcon, CubeIcon } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { Section } from '@/features/vitrine/Section';
import { routes } from '@/lib/routes';
import { plansPublicsOuverts } from '@/server/plansAcquisition';
import { Curseur2D3D } from './Curseur2D3D';

/**
 * Plans mis en avant sur les pages d'acquisition particuliers (demande du propriétaire du
 * 22/11/2026). Chaque bloc ne s'affiche que si la page publique et l'essai sont ouverts : aucun
 * lien vers une 404 tant que Plans est fermé. Seulement ce que l'outil fait (LANDINGS §7).
 */
const POINTS = [
  'Sans inscription pour essayer',
  'Plan 2D, vue 3D et visite',
  'Métré et PDF à l’échelle',
  'Joint à votre demande de devis',
];

/** Accueil : grande section juste sous le haut de page. */
export async function SectionPlansAccueil() {
  if (!(await plansPublicsOuverts())) return null;
  return (
    <Section
      id="plans"
      fond="bg-neutre-100"
      etiquette="Plan de maison en 3D"
      className="grid items-center gap-x-[clamp(28px,4vw,60px)] gap-y-8 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
    >
      <div data-promo-plans="accueil">
        <p className="m-0 mb-3 inline-flex items-center gap-2 rounded-pill bg-blanc px-3.5 py-[7px] text-[13px] font-bold tracking-[0.06em] text-accent-700 uppercase">
          <CubeIcon size={16} weight="bold" aria-hidden="true" />
          Plans · gratuit
        </p>
        <h2 className="m-0 mb-4 max-w-[20ch] text-[clamp(28px,3.6vw,44px)] leading-[1.1]">
          Dessinez le plan de votre maison et{' '}
          <span className="accent-editorial">voyez-le en 3D</span>
        </h2>
        <p className="m-0 mb-6 max-w-[52ch] text-[17px] leading-[27px] text-neutre-800">
          Murs, portes, meubles, toiture et jardin : imaginez vos travaux en quelques minutes, puis
          demandez des devis avec votre plan. Les artisans voient tout de suite ce que vous voulez.
        </p>
        <ul className="m-0 mb-7 grid list-none gap-2.5 p-0 sm:grid-cols-2">
          {POINTS.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[16px]">
              <CheckCircleIcon
                size={20}
                weight="fill"
                className="flex-none text-accent-700"
                aria-hidden="true"
              />
              {p}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3.5">
          <Link
            href={routes.dessinEssai}
            prefetch={false}
            className={bouton({ taille: 'lg', className: 'min-h-[52px] px-[26px]' })}
          >
            Dessiner mon plan gratuitement
          </Link>
          <Link
            href={routes.planMaison}
            className={bouton({ variant: 'fantome', taille: 'lg', className: 'min-h-[52px]' })}
          >
            Découvrir l’outil
          </Link>
        </div>
      </div>
      <Curseur2D3D />
    </Section>
  );
}

/** Haut de page de l'accueil : une ligne vers l'outil, sous le formulaire. */
export async function LienPlansHero() {
  if (!(await plansPublicsOuverts())) return null;
  return (
    <Link
      href={routes.planMaison}
      data-promo-plans="hero"
      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-pill bg-blanc px-4 text-[15px] font-semibold text-accent-700 no-underline shadow-sm hover:text-accent-800"
    >
      <CubeIcon size={18} weight="bold" aria-hidden="true" />
      Gratuit : dessinez le plan de votre maison en 3D
      <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
    </Link>
  );
}

/** Pages métiers, travaux et simulateur : encart compact. */
export async function EncartPlans({ className }: { className?: string }) {
  if (!(await plansPublicsOuverts())) return null;
  return (
    <aside
      aria-label="Plan de maison en 3D"
      data-promo-plans="encart"
      className={cn(
        'grid items-center gap-4 rounded-2xl border border-trait bg-blanc p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto]',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-[12px] bg-accent-100 text-accent-700">
        <CubeIcon size={26} weight="duotone" aria-hidden="true" />
      </span>
      <span className="grid gap-1">
        <strong className="text-[17px] leading-6">
          Préparez votre projet avec un plan 2D et 3D
        </strong>
        <span className="text-[15px] leading-6 text-neutre-800">
          Gratuit et sans inscription : dessinez vos pièces, voyez le résultat en 3D, puis joignez
          le plan à votre demande de devis.
        </span>
      </span>
      <Link
        href={routes.dessinEssai}
        prefetch={false}
        className={bouton({ className: 'min-h-11 justify-self-start whitespace-nowrap' })}
      >
        Dessiner mon plan
      </Link>
    </aside>
  );
}
