import { bouton, cn } from '@ph/ui';
import type { OutilLanding } from '@ph/core/landings';
import { conteneur } from './styles';
import { TuilesOutils } from './TuilesOutils';

/**
 * Bloc final Portail Travaux (maquette : fond bleu nuit) : appel vers le formulaire et tous les
 * outils, chacun avec sa vidéo (bouton lecture en haut à droite de la carte).
 */
export function AppelFinal({
  titre,
  cta,
  outil,
}: {
  titre: string;
  cta: string;
  outil: OutilLanding;
}) {
  return (
    <section
      data-formulaire-landing
      className="relative overflow-hidden bg-nuit py-[clamp(64px,8vw,120px)] text-blanc"
      style={{
        backgroundImage:
          'radial-gradient(circle at 88% 110%, color-mix(in srgb, var(--accent) 42%, transparent) 0, transparent 42%), radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--color-blanc) 7%, transparent) 0, transparent 38%), radial-gradient(color-mix(in srgb, var(--color-blanc) 7%, transparent) 1px, transparent 1.2px)',
        backgroundSize: 'auto, auto, 22px 22px',
      }}
    >
      <div
        className={cn(
          conteneur,
          'relative grid items-center gap-[clamp(40px,6vw,72px)] min-[900px]:grid-cols-2',
        )}
      >
        <div className="grid min-w-0 justify-items-start gap-[22px]">
          <span className="inline-flex items-center gap-2 rounded-pill border border-blanc/20 bg-blanc/10 px-3.5 py-[7px] text-[13px] font-bold whitespace-nowrap uppercase tracking-[0.06em]">
            <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
            Portail Travaux
          </span>
          <h2 className="m-0 max-w-[18ch] text-[clamp(34px,4.6vw,58px)] leading-[1.04] tracking-[-0.025em] text-blanc">
            {titre}
          </h2>
          <p className="m-0 max-w-[44ch] text-[clamp(17px,1.6vw,19px)] leading-[1.55] text-blanc/90">
            Portail Travaux met en relation les particuliers et les artisans du bâtiment. En
            rejoignant le réseau, vous recevez des demandes de travaux et vous avez tous les outils
            pour en faire des chantiers : fiche sur le portail, site internet, avis, devis et
            factures, suivi clients. Gratuitement. Touchez ▶ pour voir chaque outil en vidéo.
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-3.5">
            <a
              href="#inscription"
              data-cta-final
              className={bouton({ taille: 'lg', className: 'min-h-[52px] px-7 text-[17px]' })}
            >
              {cta}
            </a>
            <span className="text-sm text-blanc/80">Sans abonnement · Sans carte bancaire</span>
          </div>
        </div>
        <TuilesOutils outil={outil} />
      </div>
    </section>
  );
}
