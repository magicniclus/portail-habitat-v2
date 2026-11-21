import { bouton } from '@ph/ui';
import Link from 'next/link';
import { ListeFaq, Section } from '@/features/vitrine/Section';
import { routes } from '@/lib/routes';
import { FAQ_ACCUEIL, VILLES } from './contenu';
import type { ChiffresVitrine } from './vitrine';

export function Villes({ chiffres }: { chiffres: ChiffresVitrine }) {
  return (
    <Section id="villes">
      <h2 className="m-0 mb-2.5 text-[clamp(24px,2.8vw,32px)] leading-[1.14]">
        Trouvez un artisan dans votre ville
      </h2>
      <p className="m-0 mb-[22px] max-w-[56ch] text-[16.5px] leading-[26px] text-neutre-800">
        {chiffres ? `Nous couvrons ${chiffres.villes} communes. ` : ''}Sélectionnez la vôtre pour
        voir les artisans disponibles et les budgets pratiqués.
      </p>
      <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
        {VILLES.map((v) => (
          <li key={v}>
            <Link
              href={routes.artisansFiltres({ ville: v })}
              className="flex min-h-11 items-center rounded-pill bg-accent-100 px-4 text-[14.5px] font-semibold text-accent-700 no-underline hover:bg-accent-200"
            >
              {v}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Bandeau orange « Vous êtes artisan ? » (couleurs de l'espace pro). */
export function BandeauArtisan() {
  return (
    <section
      data-theme="pro"
      aria-labelledby="bandeau-artisan"
      className="mx-auto mt-[clamp(44px,5.5vw,80px)] max-w-[1280px] px-[clamp(18px,4vw,44px)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-[22px] rounded-[16px] bg-accent-100 p-[clamp(24px,3vw,36px)]">
        <div className="flex flex-wrap items-center gap-[18px]">
          <span
            aria-hidden="true"
            className="flex size-[52px] flex-none items-center justify-center rounded-[14px] bg-accent-action"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-blanc)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 6.5 17 4l3 3-2.5 2.5" />
              <path d="M12.8 8.2 5 16v3h3l7.8-7.8" />
            </svg>
          </span>
          <div>
            <h2
              id="bandeau-artisan"
              className="m-0 mb-1.5 text-[clamp(20px,2.2vw,25px)] leading-[1.2]"
            >
              Vous êtes artisan ?
            </h2>
            <p className="m-0 max-w-[52ch] text-[15.5px] leading-6 text-neutre-800">
              Recevez les demandes des particuliers de votre secteur. Inscription gratuite, 0 % de
              commission.
            </p>
          </div>
        </div>
        <Link href={routes.pro} className={bouton({ className: 'min-h-12 px-[22px]' })}>
          Devenir partenaire
        </Link>
      </div>
    </section>
  );
}

export function FaqAccueil() {
  return (
    <Section
      etiquette="Questions fréquentes"
      fond="bg-transparent"
      className="grid items-start gap-x-[clamp(28px,4vw,60px)] gap-y-8 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
    >
      <div>
        <h2 className="m-0 mb-3.5 text-[clamp(25px,3vw,34px)] leading-[1.14]">
          Vos questions avant de lancer un projet
        </h2>
        <p className="m-0 mb-5 max-w-[44ch] text-[16.5px] leading-[26px] text-neutre-800">
          Une question sur votre projet ? Notre équipe répond du lundi au vendredi, 9 h – 18 h.
        </p>
        <Link
          href={routes.aide}
          className={bouton({ variant: 'secondaire', className: 'text-[15.5px]' })}
        >
          Nous contacter
        </Link>
      </div>
      <ListeFaq faq={FAQ_ACCUEIL} />
    </Section>
  );
}

export function AppelFinal() {
  return (
    <Section fond="bg-accent-100" etiquette="Lancer mon projet">
      <h2 className="m-0 mb-3.5 max-w-[22ch] text-[clamp(28px,3.8vw,44px)] leading-[1.1]">
        Votre projet mérite le bon artisan.
      </h2>
      <p className="m-0 mb-[26px] max-w-[50ch] text-[17px] leading-[27px] text-neutre-800">
        Estimation immédiate, jusqu&apos;à 3 devis comparables, artisans vérifiés. Gratuit et sans
        engagement.
      </p>
      <div className="flex flex-wrap gap-3.5">
        <a
          href="#accueil"
          className={bouton({ taille: 'lg', className: 'min-h-[52px] px-[26px]' })}
        >
          Décrire mon projet
        </a>
        <Link
          href={routes.artisans}
          className={bouton({ variant: 'fantome', taille: 'lg', className: 'min-h-[52px]' })}
        >
          Parcourir les artisans
        </Link>
      </div>
    </Section>
  );
}
