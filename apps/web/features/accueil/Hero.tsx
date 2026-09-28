import { conteneur } from '@/features/vitrine/Section';
import { Etoiles } from '@/features/vitrine/Etoiles';
import { Visuel } from '@/features/vitrine/Visuel';
import { FormulaireProjet } from './FormulaireProjet';
import type { ChiffresVitrine } from './vitrine';

/** Hero 2 colonnes (1.05fr / 0.95fr), fond accent-100 ; une colonne sous 900 px. */
export function Hero({ chiffres }: { chiffres: ChiffresVitrine }) {
  return (
    <section
      id="accueil"
      className="scroll-mt-20 bg-accent-100 pt-[clamp(32px,4.5vw,64px)] pb-[clamp(36px,5vw,72px)]"
    >
      <div
        className={`${conteneur} grid items-center gap-x-[clamp(28px,4vw,60px)] gap-y-9 min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]`}
      >
        <div>
          {chiffres ? (
            <p className="m-0 mb-5 inline-flex items-center gap-2 rounded-pill bg-blanc px-3.5 py-[7px] text-[13.5px] font-semibold text-accent-700">
              <span aria-hidden="true" className="block size-[7px] rounded-full bg-accent" />
              {chiffres.demandes} projets déposés ce mois-ci
            </p>
          ) : null}
          <h1 className="m-0 mb-[18px] max-w-[22ch] text-[clamp(34px,4.5vw,54px)] leading-[1.07]">
            Trouvez le bon artisan pour <span className="accent-editorial">vos travaux</span>
          </h1>
          <p className="m-0 mb-[26px] max-w-[52ch] text-lg leading-[29px] text-neutre-800">
            Décrivez votre projet en une phrase : vous obtenez une estimation de budget immédiate et
            jusqu&apos;à 3 artisans vérifiés de votre commune vous rappellent. Gratuit, sans
            engagement.
          </p>
          <FormulaireProjet />
          <ul className="m-0 mt-[22px] flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[15px] text-neutre-800">
            {chiffres ? (
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="font-bold text-accent">
                  ✓
                </span>
                {chiffres.artisans} artisans vérifiés
              </li>
            ) : null}
            {chiffres?.note ? (
              <li className="flex items-center gap-2">
                <Etoiles />
                <span>
                  <strong>{chiffres.note}/5</strong> sur {chiffres.avis} avis
                </span>
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="font-bold text-accent">
                ✓
              </span>
              Devis 100 % gratuits
            </li>
          </ul>
        </div>

        <figure className="relative m-0 hidden min-[900px]:block">
          <div className="aspect-[4/5] overflow-hidden rounded-[18px] shadow-lg">
            <Visuel />
          </div>
          <div className="absolute bottom-6 -left-2.5 flex max-w-[min(88%,290px)] items-center gap-3 rounded-card bg-blanc px-4 py-3.5 shadow-md">
            <span
              aria-hidden="true"
              className="flex size-[42px] flex-none items-center justify-center rounded-[12px] bg-accent-100 text-[17px] font-bold text-accent-700"
            >
              3
            </span>
            <span className="text-sm leading-5">
              Jusqu&apos;à <strong>3 devis comparables</strong> pour le même projet, sous 48 h.
            </span>
          </div>
        </figure>
      </div>
    </section>
  );
}
