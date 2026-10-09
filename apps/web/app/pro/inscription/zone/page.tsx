import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CadreInscription } from '@/features/inscription/CadreInscription';
import { EtapeZone } from '@/features/inscription/EtapeZone';
import { nomMetier } from '@/features/pro/metiers';
import { brouillonCourant } from '@/server/inscription';

export const metadata: Metadata = { title: 'Votre zone', robots: { index: false } };

/** Étape 2 de l'inscription pro : zone et rayon (COMPTES §3.2). */
export default async function PageZone() {
  const b = await brouillonCourant();
  if (!b) redirect('/pro#inscription');
  return (
    <CadreInscription
      etape={2}
      aside={
        <div className="grid gap-4">
          <p className="m-0 text-sm font-bold tracking-[0.08em] text-accent-300 uppercase">
            L&apos;activité de votre secteur
          </p>
          <h2 className="m-0 text-[clamp(24px,2.6vw,32px)] leading-[1.15] text-blanc">
            Des demandes déposées chaque jour, près de chez vous.
          </h2>
          <p className="m-0 text-base leading-[26px]">
            Vous ne recevez que les demandes de votre zone et de vos chantiers acceptés.
          </p>
        </div>
      }
    >
      <EtapeZone
        metiers={b.metiers}
        nomMetier={nomMetier(b.metierPrincipal) ?? 'artisan'}
        {...(b.zone ? { zoneInitiale: b.zone } : {})}
      />
    </CadreInscription>
  );
}
