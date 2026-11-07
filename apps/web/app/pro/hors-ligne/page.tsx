import type { Metadata } from 'next';
import { Reessayer } from '@/features/pwa/Reessayer';

export const metadata: Metadata = { title: 'Hors ligne', robots: { index: false } };
export const dynamic = 'force-static';

/** Affichée par le service worker quand une page de l'espace pro n'a jamais été ouverte hors ligne. */
export default function PageHorsLigne() {
  return (
    <main className="mx-auto grid max-w-[520px] gap-4 px-4 py-16 text-center">
      <h1 className="m-0 text-[clamp(26px,3vw,34px)]">Vous êtes hors ligne</h1>
      <p className="m-0 text-base text-neutre-800">
        Les pages déjà ouvertes restent consultables. Cette page s&apos;affichera dès que la
        connexion reviendra.
      </p>
      <Reessayer />
    </main>
  );
}
