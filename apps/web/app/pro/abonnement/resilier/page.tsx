import { peut } from '@ph/core/equipe';
import { appAdmin } from '@ph/firebase/admin';
import { lireResiliation } from '@ph/firebase/facturation';
import { Banner, Logo } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ParcoursResiliation } from '@/features/facturation/ParcoursResiliation';
import { routes } from '@/lib/routes';
import { facturationBloquee } from '@/server/facturation';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Résilier', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Résiliation en fin de période : raison, alternative adaptée, puis confirmation (CONVERSION S8). */
export default async function PageResiliation() {
  const s = await sessionPro(routes.proResiliation);
  const active = s.espace.active;
  if (!active || facturationBloquee(s)) redirect(routes.proFacturation);
  const { abonnements } = await lireResiliation(getFirestore(appAdmin()), active.artisanId);
  return (
    <div className="min-h-dvh bg-blanc">
      <header className="border-b border-trait px-4 py-3">
        <Link
          href={routes.proFacturation}
          aria-label="Retour à la facturation"
          className="inline-flex min-h-11 items-center"
        >
          <Logo variant="pro" />
        </Link>
      </header>
      <main className="mx-auto grid w-full max-w-[560px] gap-5 px-4 py-8">
        <h1 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.1]">Résilier mon abonnement</h1>
        {!peut(active.membre, 'abonnement.gerer') ? (
          <Banner tone="info">
            Seuls le propriétaire et les gérants peuvent résilier l’abonnement de{' '}
            {active.artisan.nomCommercial}.
          </Banner>
        ) : abonnements.length ? (
          <ParcoursResiliation abonnements={abonnements} />
        ) : (
          <Banner tone="info">Aucun abonnement en cours à résilier.</Banner>
        )}
      </main>
    </div>
  );
}
