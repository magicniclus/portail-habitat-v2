import { bouton, cn } from '@ph/ui';
import {
  CameraIcon,
  CheckCircleIcon,
  CubeIcon,
  DoorOpenIcon,
  HouseLineIcon,
  ListChecksIcon,
  WallIcon,
  ArmchairIcon,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { enTeteParticuliersPour, piedParticuliersPour } from '@/features/vitrine/navigation';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { conteneur, ListeFaq, Section } from '@/features/vitrine/Section';
import { faqPage } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';
import { ETAPES_PLANS, FAQ_PLANS, FONCTIONS_PLANS } from './contenu';
import { IllustrationPlan } from './IllustrationPlan';

const ICONES = {
  murs: WallIcon,
  portes: DoorOpenIcon,
  meubles: ArmchairIcon,
  toit: HouseLineIcon,
  troisd: CubeIcon,
  metre: ListChecksIcon,
} as const;
const POINTS = [
  'Sans inscription pour essayer',
  'Plan 2D, 3D et visite',
  'Métré et PDF à l’échelle',
];
const essayer = bouton({ taille: 'lg', className: 'min-h-[52px] px-[26px]' });

/** Page publique Plans (DES-03) : présenter l'outil et ouvrir l'essai sans compte. */
export function PageDessinPublic() {
  return (
    <>
      <JsonLd donnees={faqPage(FAQ_PLANS)} />
      <EnTetePublic {...enTeteParticuliersPour(true)} />
      <main>
        <section
          className={cn(
            conteneur,
            'grid items-center gap-x-[clamp(28px,4vw,60px)] gap-y-8 py-[clamp(28px,5vw,72px)] min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
          )}
        >
          <div>
            <p className="m-0 mb-3 text-[14px] font-bold tracking-wide text-accent-700 uppercase">
              Plans · gratuit
            </p>
            <h1 className="m-0 mb-[18px] text-[clamp(34px,4.6vw,56px)] leading-[1.08]">
              Dessinez le plan de votre maison et voyez-le en 3D
            </h1>
            <p className="m-0 mb-6 max-w-[52ch] text-[18px] leading-[28px] text-neutre-800">
              Murs, portes, meubles, toiture et jardin : préparez votre projet en quelques minutes,
              puis demandez des devis avec un plan clair.
            </p>
            <ul className="m-0 mb-7 grid list-none gap-2 p-0">
              {POINTS.map((p) => (
                <li key={p} className="flex items-center gap-2 text-[16px]">
                  <CheckCircleIcon weight="fill" className="text-accent-700" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3.5">
              <Link href={routes.dessinEssai} className={essayer}>
                Essayer gratuitement
              </Link>
              <Link
                href={routes.monEspacePlans}
                className={bouton({ variant: 'fantome', taille: 'lg', className: 'min-h-[52px]' })}
              >
                J’ai déjà un compte
              </Link>
            </div>
          </div>
          <IllustrationPlan />
        </section>

        <Section etiquette="Ce que vous pouvez faire" fond="bg-neutre-100">
          <h2 className="m-0 mb-7 text-[clamp(25px,3vw,34px)] leading-[1.14]">
            Tout votre projet, au même endroit
          </h2>
          <ul className="m-0 grid list-none gap-4 p-0 min-[640px]:grid-cols-2 min-[1000px]:grid-cols-3">
            {FONCTIONS_PLANS.map((f) => {
              const Icone = ICONES[f.icone];
              return (
                <li key={f.titre} className="grid gap-2 rounded-2xl bg-blanc p-5">
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

        <Section etiquette="Comment ça marche">
          <h2 className="m-0 mb-7 text-[clamp(25px,3vw,34px)] leading-[1.14]">Comment ça marche</h2>
          <ol className="m-0 grid list-none gap-4 p-0 min-[800px]:grid-cols-3">
            {ETAPES_PLANS.map((e, i) => (
              <li key={e.titre} className="grid gap-2 rounded-2xl border border-trait p-5">
                <span className="grid size-9 place-items-center rounded-full bg-accent-100 font-bold text-accent-800">
                  {i + 1}
                </span>
                <h3 className="m-0 text-[18px]">{e.titre}</h3>
                <p className="m-0 text-[15.5px] leading-6 text-neutre-800">{e.texte}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          etiquette="Questions fréquentes"
          className="grid items-start gap-x-[clamp(28px,4vw,60px)] gap-y-8 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
        >
          <h2 className="m-0 text-[clamp(25px,3vw,34px)] leading-[1.14]">
            Vos questions sur Plans
          </h2>
          <ListeFaq faq={FAQ_PLANS} />
        </Section>

        <Section fond="bg-accent-100" etiquette="Commencer">
          <h2 className="m-0 mb-3.5 max-w-[22ch] text-[clamp(28px,3.8vw,44px)] leading-[1.1]">
            Votre maison, dessinée en quelques minutes.
          </h2>
          <p className="m-0 mb-[26px] max-w-[50ch] text-[17px] leading-[27px] text-neutre-800">
            Gratuit, sans inscription pour essayer.{' '}
            <CameraIcon className="inline" aria-hidden="true" /> Partagez ensuite votre plan ou
            demandez des devis.
          </p>
          <Link href={routes.dessinEssai} className={essayer}>
            Essayer gratuitement
          </Link>
        </Section>
      </main>
      <PiedPublic {...piedParticuliersPour(true)} />
    </>
  );
}
