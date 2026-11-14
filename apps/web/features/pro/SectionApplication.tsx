import type { CaptureLanding } from '@ph/core/landings';
import { bouton } from '@ph/ui';
import { AppleLogoIcon, BellRingingIcon, GooglePlayLogoIcon } from '@phosphor-icons/react/ssr';
import { CaptureEcran } from '@/features/landings/CaptureEcran';

const conteneur = 'mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,44px)]';

/** Vraies captures de l'espace pro sur téléphone (`pnpm captures`). */
const DEMANDES: CaptureLanding = {
  image: 'mes-demandes',
  url: '',
  legende: 'Mes demandes, sur téléphone.',
};
const DEVIS: CaptureLanding = {
  image: 'devis-liste',
  url: '',
  legende: 'Devis et factures, sur téléphone.',
};

const POINTS = [
  'Une notification à chaque nouvelle demande près de chez vous',
  'Vous appelez le client et envoyez le devis depuis le chantier',
  'Demandes, devis, factures et avis : tout est dans la poche',
];

/** Les stores, tant que l'app n'y est pas publiée (D33, D82) : affichés « Bientôt », sans lien. */
const STORES = [
  { nom: 'App Store', Icone: AppleLogoIcon },
  { nom: 'Google Play', Icone: GooglePlayLogoIcon },
] as const;

/**
 * « Application mobile » (/pro, landings, espace pro) : texte, badges des stores en « Bientôt
 * disponible », installation possible dès aujourd'hui depuis le navigateur, et deux vraies
 * captures de l'espace sur téléphone.
 */
export function ApplicationPro() {
  return (
    <section
      id="application"
      className="relative scroll-mt-20 overflow-hidden bg-[linear-gradient(180deg,var(--color-blanc)_0%,var(--accent-100)_100%)] py-[clamp(56px,7vw,96px)]"
    >
      <div
        className={`${conteneur} grid items-center gap-x-[clamp(28px,5vw,72px)] gap-y-12 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}
      >
        <div>
          <p className="m-0 mb-3 text-[13px] font-bold tracking-[0.08em] text-accent-700 uppercase">
            L’application Portail Travaux
          </p>
          <h2 className="m-0 mb-4 text-[clamp(28px,3.4vw,42px)] leading-[1.1]">
            Une notification dès qu’une demande tombe près de vous
          </h2>
          <p className="m-0 mb-6 max-w-[52ch] text-[17px] leading-[27px] text-neutre-800">
            Votre espace pro tient dans votre téléphone. Vous voyez la demande, vous appelez le
            client, vous envoyez le devis, sans redescendre de l’échafaudage. L’application est
            incluse et gratuite, comme le reste.
          </p>
          <ul className="m-0 mb-7 grid list-none gap-2.5 p-0">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-[16px] leading-6 font-semibold">
                <span aria-hidden="true" className="font-bold text-accent-700">
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
          <ul className="m-0 mb-3 flex list-none flex-wrap gap-3 p-0" aria-label="Stores">
            {STORES.map(({ nom, Icone }) => (
              <li
                key={nom}
                aria-label={`Bientôt disponible sur ${nom}`}
                className="flex min-h-14 items-center gap-3 rounded-[12px] bg-texte px-4 py-2 text-blanc opacity-80"
              >
                <Icone size={26} weight="fill" aria-hidden="true" />
                <span className="grid leading-tight">
                  <span className="text-[11px] tracking-[0.04em] uppercase opacity-85">
                    Bientôt sur
                  </span>
                  <span className="text-[17px] font-bold">{nom}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="m-0 mb-7 text-[15px] text-neutre-700">
            En attendant, l’application s’installe déjà depuis votre navigateur, en deux touches.
          </p>
          <a href="#inscription" className={bouton({ className: 'min-h-12' })}>
            Créer mon compte gratuit
          </a>
        </div>
        <div aria-hidden="true" className="relative mx-auto w-full max-w-[520px] pt-6 pb-2">
          <CaptureEcran
            capture={DEVIS}
            cadre="telephone"
            legende={false}
            className="absolute top-14 right-0 w-[46%] rotate-[4deg] opacity-95"
          />
          <CaptureEcran
            capture={DEMANDES}
            cadre="telephone"
            legende={false}
            className="relative z-[2] ml-[6%] w-[52%]"
          />
          <div className="absolute top-0 left-[30%] z-[3] flex max-w-[300px] items-center gap-3 rounded-[16px] border border-trait bg-blanc/95 px-4 py-3 shadow-lg backdrop-blur">
            <span className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-accent text-blanc">
              <BellRingingIcon size={22} weight="fill" />
            </span>
            <span className="grid text-[13px] leading-tight">
              <b className="text-[14px]">Nouvelle demande près de vous</b>
              <span className="text-neutre-700">Portail Travaux · maintenant</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
