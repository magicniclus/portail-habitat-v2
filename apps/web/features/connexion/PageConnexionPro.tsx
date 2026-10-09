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
        <aside className="hidden flex-col justify-center gap-6 bg-accent-900 p-[clamp(32px,5vw,72px)] text-accent-200 lg:flex">
          <p className="m-0 text-sm font-bold tracking-[0.08em] text-accent-300 uppercase">
            Votre espace artisan
          </p>
          <h2 className="m-0 max-w-[20ch] text-[clamp(26px,2.8vw,36px)] leading-[1.15] text-blanc">
            Vos demandes, vos devis et vos avis au même endroit.
          </h2>
          <ul className="m-0 grid list-none gap-3 p-0 text-base">
            {ATOUTS.map((a) => (
              <li key={a} className="flex gap-3">
                <span aria-hidden="true" className="font-bold text-accent-400">
                  ✓
                </span>
                {a}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </EspaceTheme>
  );
}
