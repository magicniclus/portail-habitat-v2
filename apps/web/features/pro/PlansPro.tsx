import { bouton } from '@ph/ui';
import { CheckCircleIcon, CubeIcon } from '@phosphor-icons/react/dist/ssr';
import { IllustrationPlan } from '@/features/dessin/public/IllustrationPlan';
import { plansProOuverts } from '@/server/plansAcquisition';
import { conteneurPro } from './Sections';

/**
 * Plans mis en avant sur /pro et les landings artisans (demande du propriétaire du 22/11/2026) :
 * affiché seulement si l'outil existe dans l'espace pro (flag `dessin`). Seulement ce que l'outil
 * fait (DESSIN.md §0 et §1 ; pas de devis prérempli depuis le plan, DES-45), aucun chiffre.
 */
const POINTS = [
  'Murs, portes, fenêtres, meubles, toiture et jardin',
  'Métré calculé pour vous : surfaces, longueurs, menuiseries',
  'PDF à l’échelle et lien de partage pour votre client',
  'Le plan joint par le particulier à sa demande, lisible dans votre espace',
];

export async function PlansPro() {
  if (!(await plansProOuverts())) return null;
  return (
    <section
      id="plans"
      aria-labelledby="titre-plans-pro"
      data-promo-plans="pro"
      className="scroll-mt-20 bg-neutre-100 py-[clamp(48px,6vw,80px)]"
    >
      <div
        className={`${conteneurPro} grid items-center gap-x-[clamp(28px,4vw,64px)] gap-y-8 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}
      >
        <div>
          <p className="m-0 mb-3 inline-flex items-center gap-2 rounded-pill bg-blanc px-3.5 py-[7px] text-[13px] font-bold tracking-[0.06em] text-accent-700 uppercase">
            <CubeIcon size={16} weight="bold" aria-hidden="true" />
            Plans 2D et 3D · inclus et gratuit
          </p>
          <h2
            id="titre-plans-pro"
            className="m-0 mb-4 max-w-[20ch] text-[clamp(28px,3.4vw,40px)] leading-[1.12]"
          >
            Dessinez les plans de vos chantiers et{' '}
            <span className="accent-editorial">montrez-les en 3D</span>
          </h2>
          <p className="m-0 mb-6 max-w-[52ch] text-[17px] leading-[27px] text-neutre-800">
            Tracez le logement de votre client en quelques minutes, passez en 3D pour lui faire
            visiter le projet, puis sortez le métré et un plan propre à joindre à votre devis.
          </p>
          <ul className="m-0 mb-7 grid list-none gap-2.5 p-0">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-[16px] leading-6">
                <CheckCircleIcon
                  size={20}
                  weight="fill"
                  className="mt-0.5 flex-none text-accent-700"
                  aria-hidden="true"
                />
                {p}
              </li>
            ))}
          </ul>
          <a
            href="#inscription"
            className={bouton({ taille: 'lg', className: 'min-h-[52px] px-7' })}
          >
            Créer mon compte gratuit
          </a>
        </div>
        <div className="relative rounded-[18px] bg-blanc p-3 shadow-lg">
          <IllustrationPlan />
          <span className="absolute top-6 right-6 inline-flex items-center gap-1.5 rounded-pill bg-accent px-3 py-1.5 text-[13px] font-bold text-blanc shadow-md">
            <CubeIcon size={16} weight="bold" aria-hidden="true" />
            2D · 3D
          </span>
        </div>
      </div>
    </section>
  );
}
