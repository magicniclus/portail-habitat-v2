import { Logo } from '@ph/ui';
import Link from 'next/link';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { EspaceTheme } from '@/features/theme/Theme';
import { routes } from '@/lib/routes';
import { ConnexionPro } from './ConnexionPro';

const ATOUTS = [
  'Les demandes de votre secteur en temps réel',
  'Le suivi de vos devis et de vos chantiers',
  '0 % de commission sur vos chantiers signés',
];

/** Maquette Connexion (espace pro) : formulaire à gauche, atouts de l'espace à droite (sans témoignage inventé, D49). */
export function PageConnexionPro({ suite, smsActif }: { suite: string; smsActif: boolean }) {
  return (
    <EspaceTheme theme="pro">
      <ConfigFirebase />
      <div className="grid min-h-dvh bg-blanc lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8 px-[clamp(18px,5vw,64px)] py-[clamp(24px,4vw,48px)]">
          <Link
            href={routes.pro}
            className="flex min-h-11 w-fit items-center text-texte no-underline"
          >
            <Logo variant="pro" taille={34} />
          </Link>
          <main className="mx-auto grid w-full max-w-[440px] flex-1 content-center gap-6">
            <div>
              <h1 className="m-0 mb-2 text-[clamp(28px,3.4vw,38px)] leading-[1.08]">
                Content de vous <span className="accent-editorial">revoir</span>
              </h1>
              <p className="m-0 text-base text-neutre-800">
                Connectez-vous à votre espace artisan pour suivre vos demandes.
              </p>
            </div>
            <ConnexionPro suite={suite} smsActif={smsActif} />
          </main>
          <p className="m-0 text-center text-sm text-neutre-800">
            Besoin d&apos;aide ? <Link href={routes.proAide}>Contactez le support</Link>
          </p>
        </div>
        <aside className="relative hidden flex-col justify-center gap-[22px] overflow-hidden bg-accent-100 p-[clamp(28px,4vw,56px)] text-texte lg:flex">
          <svg
            viewBox="0 0 600 420"
            aria-hidden="true"
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none absolute -right-[60px] -bottom-10 w-[min(70%,520px)] opacity-[0.12]"
          >
            <path d="M430 60h48v86l-48-38z" fill="var(--accent)" />
            <path d="M30 230 300 30l270 200v190H30z" fill="var(--accent)" />
            <path d="M300 30 570 230v190H300z" fill="var(--color-texte)" opacity="0.3" />
          </svg>
          <div className="relative max-w-[460px]">
            <p className="m-0 mb-2.5 text-xs font-bold tracking-[0.08em] text-accent-700 uppercase">
              Votre espace artisan
            </p>
            <h2 className="m-0 mb-3.5 text-[clamp(22px,2.4vw,28px)] leading-[1.18]">
              Vos demandes, vos devis et vos avis au même endroit.
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0 text-[15px] leading-[23px]">
              {ATOUTS.map((a) => (
                <li key={a} className="flex gap-2.5">
                  <span aria-hidden="true" className="font-bold text-accent">
                    ✓
                  </span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Carte de la maquette : exemple de demande à la place du témoignage (aucun avis inventé, D49). */}
          <div
            aria-hidden="true"
            className="relative grid max-w-[460px] gap-2.5 rounded-[14px] bg-blanc p-[18px] shadow-md"
          >
            <p className="m-0 flex items-center justify-between gap-3 text-xs font-bold tracking-[0.06em] text-accent-700 uppercase">
              Nouvelle demande
              <span className="rounded-pill bg-succes-fond px-2.5 py-0.5 text-[11px] tracking-normal text-succes normal-case">
                Gratuite
              </span>
            </p>
            <p className="m-0 text-[15px] leading-[23px] font-semibold">
              Douche à l’italienne à la place de la baignoire
            </p>
            <p className="m-0 flex items-center gap-2.5 text-[13px] text-neutre-700">
              <span className="flex size-[34px] items-center justify-center rounded-full bg-accent-200 text-xs font-bold text-accent-800">
                CM
              </span>
              Exemple · Mérignac (33700)
            </p>
          </div>
        </aside>
      </div>
    </EspaceTheme>
  );
}
