import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EtapeZone } from '@/features/inscription/EtapeZone';
import { nomMetier } from '@/features/pro/metiers';
import { brouillonCourant } from '@/server/inscription';

export const metadata: Metadata = { title: 'Votre zone', robots: { index: false } };

/** Étape 2 de l'inscription pro : zone et rayon (COMPTES §3.2). */
export default async function PageZone() {
  const b = await brouillonCourant();
  if (!b) redirect('/pro#inscription');
  return (
    <EtapeZone
      metiers={b.metiers}
      nomMetier={nomMetier(b.metierPrincipal) ?? 'artisan'}
      {...(b.zone ? { zoneInitiale: b.zone } : {})}
    />
  );
}
