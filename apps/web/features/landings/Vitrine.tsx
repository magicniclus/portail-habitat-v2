import type { ContenuLanding } from '@ph/core/landings';
import { cn } from '@ph/ui';
import { CaptureEcran } from './CaptureEcran';
import { pastille, titreFort } from './styles';

/**
 * « Sur le chantier » / « Le résultat » (maquette) : titre centré sur fond blanc → accent, grand écran
 * d'ordinateur et téléphone posé devant, en bas à droite.
 */
export function Vitrine({ v }: { v: ContenuLanding['vitrine'] }) {
  return (
    <section className="bg-[linear-gradient(180deg,var(--color-blanc)_0%,var(--accent-100)_100%)] px-[clamp(20px,4vw,48px)] py-[clamp(56px,7vw,96px)]">
      <div className="mx-auto grid max-w-[1100px] justify-items-center gap-[clamp(24px,4vw,40px)]">
        <div className="max-w-[720px] text-center">
          <span className={cn(pastille, 'mb-3 bg-blanc')}>{v.surtitre}</span>
          <h2 className={cn(titreFort, 'mb-2.5 text-[clamp(26px,3.6vw,46px)] leading-[1.08]')}>
            {v.titre}
          </h2>
          <p className="m-0 mx-auto max-w-[56ch] text-[clamp(15px,1.5vw,17px)] leading-[1.55] text-neutre-800">
            {v.texte}
          </p>
        </div>
        <div className="relative w-full pr-[4%] pb-[3%]">
          <CaptureEcran capture={v.grand} cadre="navigateur" />
          <CaptureEcran
            capture={v.tel}
            cadre="telephone"
            legende={false}
            className="absolute right-[-1%] bottom-0 z-[2] w-[21%] min-w-[96px]"
          />
        </div>
      </div>
    </section>
  );
}
