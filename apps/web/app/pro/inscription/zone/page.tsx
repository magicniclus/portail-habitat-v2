import { RAYON_ZONE } from '@ph/core/onboarding';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EtapeZone } from '@/features/inscription/EtapeZone';
import { brouillonCourant } from '@/server/inscription';
import { chercherCommunes } from '@/server/lieux';
import { baseDemandesRecentes } from '@/server/statsDemandes';

export const metadata: Metadata = { title: 'Votre zone', robots: { index: false } };

/**
 * Étape 2 de l'inscription pro : zone et rayon (COMPTES §3.2). Sans zone enregistrée, la ville est
 * proposée d'office d'après le code postal de l'étape 1 (décision du 15/11/2026) ; l'artisan peut
 * la changer.
 */
export default async function PageZone() {
  const b = await brouillonCourant();
  if (!b) redirect('/pro#inscription');
  const proposee = b.zone ? null : (await chercherCommunes(b.identite.codePostal, 1500))[0];
  const zoneInitiale =
    b.zone ??
    (proposee
      ? {
          ville: proposee.nom,
          codePostal: proposee.codePostal,
          centre: proposee.centre,
          rayonKm: RAYON_ZONE.defaut,
        }
      : undefined);
  const base = baseDemandesRecentes(zoneInitiale?.codePostal ?? b.identite.codePostal, b.metiers);
  return <EtapeZone base={base} {...(zoneInitiale ? { zoneInitiale } : {})} />;
}
