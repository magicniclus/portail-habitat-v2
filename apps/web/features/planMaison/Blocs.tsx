import { bouton, cn } from '@ph/ui';
import { ArrowRightIcon, CheckCircleIcon } from '@phosphor-icons/react/dist/ssr';
import type { Route } from 'next';
import Link from 'next/link';
import { Curseur2D3D } from '@/features/dessin/public/Curseur2D3D';
import { conteneur, Section } from '@/features/vitrine/Section';
import { routes } from '@/lib/routes';
import { GUIDES_PLAN, type Partie } from './contenu';

const boutonEssai = bouton({ taille: 'lg', className: 'min-h-[52px] px-[26px]' });
export const titreH2 = 'm-0 mb-4 text-[clamp(25px,3vw,34px)] leading-[1.14]';

/** Fil d'Ariane visible (le JSON-LD est posé par la page). */
export function FilAriane({ etapes }: { etapes: readonly { nom: string; chemin?: Route }[] }) {
  return (
    <nav aria-label="Fil d’Ariane" className={cn(conteneur, 'pt-4 text-[14px] text-neutre-700')}>
      <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {etapes.map((e, i) => (
          <li key={e.nom} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden="true">›</span> : null}
            {e.chemin ? (
              <Link href={e.chemin} className="inline-flex min-h-11 items-center">
                {e.nom}
              </Link>
            ) : (
              <span aria-current="page">{e.nom}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Haut de page : H1, promesse, points, essai sans compte et curseur 2D / 3D. */
export function HerosPlan({
  surtitre,
  h1,
  intro,
  points,
}: {
  surtitre: string;
  h1: string;
  intro: string;
  points: readonly string[];
}) {
  return (
    <section
      className={cn(
        conteneur,
        'grid items-center gap-x-[clamp(28px,4vw,60px)] gap-y-8 py-[clamp(24px,4.5vw,64px)] min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
      )}
    >
      <div>
        <p className="m-0 mb-3 text-[14px] font-bold tracking-wide text-accent-700 uppercase">
          {surtitre}
        </p>
        <h1 className="m-0 mb-[18px] text-[clamp(32px,4.4vw,54px)] leading-[1.08]">{h1}</h1>
        <p className="m-0 mb-6 max-w-[56ch] text-[18px] leading-[28px] text-neutre-800">{intro}</p>
        <ul className="m-0 mb-7 grid list-none gap-2 p-0 min-[520px]:grid-cols-2">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[16px]">
              <CheckCircleIcon
                weight="fill"
                className="shrink-0 text-accent-700"
                aria-hidden="true"
              />
              {p}
            </li>
          ))}
        </ul>
        <Link href={routes.dessinEssai} className={boutonEssai}>
          Dessiner mon plan gratuitement
        </Link>
      </div>
      <Curseur2D3D />
    </section>
  );
}

/** Une partie de texte : H2, paragraphes, liste à puces. */
export function PartieTexte({ partie, id }: { partie: Partie; id?: string }) {
  return (
    <Section id={id} etiquette={partie.titre} className="max-w-[860px]">
      <h2 className={titreH2}>{partie.titre}</h2>
      {partie.paragraphes.map((p) => (
        <p key={p} className="m-0 mb-4 text-[17px] leading-[28px] text-neutre-800">
          {p}
        </p>
      ))}
      {partie.points ? (
        <ul className="m-0 mt-2 grid list-none gap-2.5 p-0 min-[640px]:grid-cols-2">
          {partie.points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-[16px] leading-6">
              <CheckCircleIcon
                weight="fill"
                className="mt-0.5 shrink-0 text-accent-700"
                aria-hidden="true"
              />
              {p}
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

/** Cartes vers les guides (maillage interne), sauf la page courante. */
export function GuidesLies({ sauf, titre }: { sauf?: string; titre: string }) {
  return (
    <Section etiquette={titre} fond="bg-neutre-100">
      <h2 className={titreH2}>{titre}</h2>
      <ul className="m-0 grid list-none gap-3.5 p-0 min-[640px]:grid-cols-2 min-[1000px]:grid-cols-3">
        {GUIDES_PLAN.filter((g) => g.slug !== sauf).map((g) => (
          <li key={g.slug}>
            <Link
              href={routes.planMaisonGuide(g.slug)}
              className="group flex h-full min-h-11 flex-col gap-1.5 rounded-2xl bg-blanc p-5 text-texte no-underline ring-1 ring-trait transition-shadow hover:shadow-md"
            >
              <span className="text-[18px] font-bold">{g.h1}</span>
              <span className="text-[15px] leading-6 text-neutre-800">
                {g.intro.split('. ')[0]}.
              </span>
              <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[15px] font-semibold text-accent-700">
                Voir le guide <ArrowRightIcon aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Appel final : essai sans compte, et liens vers les devis. */
export function AppelFinal({ titre }: { titre: string }) {
  return (
    <Section fond="bg-accent-100" etiquette="Commencer">
      <h2 className="m-0 mb-3.5 max-w-[24ch] text-[clamp(28px,3.8vw,44px)] leading-[1.1]">
        {titre}
      </h2>
      <p className="m-0 mb-[26px] max-w-[54ch] text-[17px] leading-[27px] text-neutre-800">
        Gratuit, sans téléchargement, sans inscription pour essayer. Ensuite, enregistrez votre plan
        et demandez des devis avec.
      </p>
      <div className="flex flex-wrap gap-3.5">
        <Link href={routes.dessinEssai} className={boutonEssai}>
          Dessiner mon plan gratuitement
        </Link>
        <Link
          href={routes.simulateur}
          className={bouton({ variant: 'fantome', taille: 'lg', className: 'min-h-[52px]' })}
        >
          Estimer mes travaux
        </Link>
      </div>
    </Section>
  );
}
