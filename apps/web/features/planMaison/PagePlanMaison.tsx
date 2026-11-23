import { cn } from '@ph/ui';
import {
  ArmchairIcon,
  CubeIcon,
  DoorOpenIcon,
  HouseLineIcon,
  ListChecksIcon,
  WallIcon,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { FONCTIONS_PLANS } from '@/features/dessin/public/contenu';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { enTeteParticuliersPour, piedParticuliersPour } from '@/features/vitrine/navigation';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { conteneur, ListeFaq, Section } from '@/features/vitrine/Section';
import { faqPage, filAriane } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';
import { AppelFinal, FilAriane, GuidesLies, HerosPlan, PartieTexte, titreH2 } from './Blocs';
import { ETAPES_LANDING, FAQ_LANDING, LANDING_PLAN, PARTIES_LANDING } from './contenu';
import { applicationPlans } from './seo';

const ICONES = {
  murs: WallIcon,
  portes: DoorOpenIcon,
  meubles: ArmchairIcon,
  toit: HouseLineIcon,
  troisd: CubeIcon,
  metre: ListChecksIcon,
} as const;

const SOMMAIRE = [
  ...PARTIES_LANDING.slice(0, 1).map((p) => ({ id: p.id, titre: p.titre })),
  { id: 'fonctions', titre: 'Ce que vous pouvez dessiner' },
  { id: 'etapes', titre: 'Comment faire un plan de maison' },
  ...PARTIES_LANDING.slice(1).map((p) => ({ id: p.id, titre: p.titre })),
  { id: 'guides', titre: 'Plans par type de projet' },
  { id: 'questions', titre: 'Questions fréquentes' },
];

/** Landing SEO « plan de maison gratuit » : pilier des guides, essai sans compte. */
export function PagePlanMaison() {
  return (
    <>
      <JsonLd donnees={applicationPlans(routes.planMaison, LANDING_PLAN.description)} />
      <JsonLd donnees={faqPage(FAQ_LANDING)} />
      <JsonLd
        donnees={filAriane([
          { nom: 'Accueil', chemin: routes.accueil },
          { nom: 'Plan de maison gratuit', chemin: routes.planMaison },
        ])}
      />
      <EnTetePublic {...enTeteParticuliersPour(true)} />
      <main>
        <FilAriane
          etapes={[{ nom: 'Accueil', chemin: routes.accueil }, { nom: 'Plan de maison gratuit' }]}
        />
        <HerosPlan
          surtitre="Logiciel en ligne · gratuit"
          h1={LANDING_PLAN.h1}
          intro={LANDING_PLAN.intro}
          points={LANDING_PLAN.points}
        />

        <nav aria-label="Sommaire" className={cn(conteneur, 'pb-2')}>
          <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-2 [scrollbar-width:none]">
            {SOMMAIRE.map((s) => (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  className="inline-flex min-h-11 items-center rounded-pill bg-neutre-100 px-4 text-[14.5px] font-semibold text-texte no-underline hover:bg-neutre-200"
                >
                  {s.titre}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <PartieTexte id={PARTIES_LANDING[0]!.id} partie={PARTIES_LANDING[0]!} />

        <Section id="fonctions" etiquette="Ce que vous pouvez dessiner" fond="bg-neutre-100">
          <h2 className={titreH2}>Ce que vous pouvez dessiner</h2>
          <ul className="m-0 grid list-none gap-4 p-0 min-[640px]:grid-cols-2 min-[1000px]:grid-cols-3">
            {FONCTIONS_PLANS.map((f) => {
              const Icone = ICONES[f.icone];
              return (
                <li key={f.titre} className="grid content-start gap-2 rounded-2xl bg-blanc p-5">
                  <Icone
                    size={28}
                    weight="duotone"
                    className="text-accent-700"
                    aria-hidden="true"
                  />
                  <h3 className="m-0 text-[18px]">{f.titre}</h3>
                  <p className="m-0 text-[15.5px] leading-6 text-neutre-800">{f.texte}</p>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section id="etapes" etiquette="Comment faire un plan de maison">
          <h2 className={titreH2}>Comment faire un plan de maison en 6 étapes</h2>
          <ol className="m-0 grid list-none gap-4 p-0 min-[700px]:grid-cols-2 min-[1000px]:grid-cols-3">
            {ETAPES_LANDING.map((e, i) => (
              <li
                key={e.titre}
                className="grid content-start gap-2 rounded-2xl border border-trait p-5"
              >
                <span className="grid size-9 place-items-center rounded-full bg-accent-100 font-bold text-accent-800">
                  {i + 1}
                </span>
                <h3 className="m-0 text-[18px]">{e.titre}</h3>
                <p className="m-0 text-[15.5px] leading-6 text-neutre-800">{e.texte}</p>
              </li>
            ))}
          </ol>
        </Section>

        {PARTIES_LANDING.slice(1).map((p) => (
          <PartieTexte key={p.id} id={p.id} partie={p} />
        ))}
        <p className={cn(conteneur, 'mt-4 max-w-[860px] text-[16px]')}>
          <Link href={routes.metiers} className="inline-flex min-h-11 items-center font-semibold">
            Trouver un artisan par métier <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </p>

        <div id="guides" className="mt-[clamp(44px,5.5vw,80px)] scroll-mt-20">
          <GuidesLies titre="Plans de maison par type de projet" />
        </div>

        <Section
          id="questions"
          etiquette="Questions fréquentes"
          className="grid items-start gap-x-[clamp(28px,4vw,60px)] gap-y-8 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
        >
          <h2 className="m-0 text-[clamp(25px,3vw,34px)] leading-[1.14]">
            Vos questions sur le plan de maison gratuit
          </h2>
          <ListeFaq faq={FAQ_LANDING} />
        </Section>

        <div className="mt-[clamp(44px,5.5vw,80px)]">
          <AppelFinal titre="Votre plan de maison, gratuit, en quelques minutes." />
        </div>
      </main>
      <PiedPublic {...piedParticuliersPour(true)} />
    </>
  );
}
