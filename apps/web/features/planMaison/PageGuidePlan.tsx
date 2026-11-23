import { EnTetePublic } from '@/features/vitrine/EnTetePublic';
import { JsonLd } from '@/features/vitrine/JsonLd';
import { enTeteParticuliersPour, piedParticuliersPour } from '@/features/vitrine/navigation';
import { PiedPublic } from '@/features/vitrine/PiedPublic';
import { ListeFaq, Section } from '@/features/vitrine/Section';
import { faqPage, filAriane } from '@/features/vitrine/seo';
import { routes } from '@/lib/routes';
import { AppelFinal, FilAriane, GuidesLies, HerosPlan, PartieTexte } from './Blocs';
import type { GuidePlan } from './contenu';
import { applicationPlans } from './seo';

const POINTS = ['Gratuit', 'Rien à télécharger', 'Plan 2D et 3D', 'Surfaces calculées'];

/** Guide « plan de … » : une intention de recherche précise, reliée à la landing. */
export function PageGuidePlan({ guide }: { guide: GuidePlan }) {
  const chemin = routes.planMaisonGuide(guide.slug);
  return (
    <>
      <JsonLd donnees={applicationPlans(chemin, guide.description)} />
      <JsonLd donnees={faqPage(guide.faq)} />
      <JsonLd
        donnees={filAriane([
          { nom: 'Accueil', chemin: routes.accueil },
          { nom: 'Plan de maison gratuit', chemin: routes.planMaison },
          { nom: guide.nom, chemin },
        ])}
      />
      <EnTetePublic {...enTeteParticuliersPour(true)} />
      <main>
        <FilAriane
          etapes={[
            { nom: 'Accueil', chemin: routes.accueil },
            { nom: 'Plan de maison gratuit', chemin: routes.planMaison },
            { nom: guide.nom },
          ]}
        />
        <HerosPlan
          surtitre={`${guide.nom} · gratuit`}
          h1={guide.h1}
          intro={guide.intro}
          points={POINTS}
        />
        {guide.parties.map((p) => (
          <PartieTexte key={p.titre} partie={p} />
        ))}
        <Section
          etiquette="Questions fréquentes"
          className="grid items-start gap-x-[clamp(28px,4vw,60px)] gap-y-8 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
        >
          <h2 className="m-0 text-[clamp(25px,3vw,34px)] leading-[1.14]">Questions fréquentes</h2>
          <ListeFaq faq={guide.faq} />
        </Section>
        <div className="mt-[clamp(44px,5.5vw,80px)]">
          <GuidesLies sauf={guide.slug} titre="Autres plans gratuits" />
        </div>
        <AppelFinal titre={`${guide.h1}, en quelques minutes.`} />
      </main>
      <PiedPublic {...piedParticuliersPour(true)} />
    </>
  );
}
