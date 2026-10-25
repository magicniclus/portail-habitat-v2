import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { CadreInscription } from '@/features/inscription/CadreInscription';
import { ActiviteSecteur } from '@/features/inscription/ActiviteSecteur';
import { EtapeCompte } from '@/features/inscription/EtapeCompte';
import { nomMetier } from '@/features/pro/metiers';
import { brouillonCourant } from '@/server/inscription';
import { demandesEstimees } from '@/server/statsDemandes';

export const metadata: Metadata = { title: 'Votre compte', robots: { index: false } };

/** Étape 3 de l'inscription pro : entreprise (SIREN), mot de passe, activation (COMPTES §3.3). */
export default async function PageCompte() {
  const b = await brouillonCourant();
  if (!b) redirect('/pro#inscription');
  if (!b.zone) redirect('/pro/inscription/zone');
  // Même calcul et mêmes valeurs qu'à l'étape 2 (STATS_DEMANDES) : code postal de la ville choisie.
  const { total, source } = demandesEstimees({
    codePostal: b.zone.codePostal ?? b.identite.codePostal,
    metiers: b.metiers,
    rayonKm: b.zone.rayonKm,
  });
  return (
    <CadreInscription
      etape={3}
      largeur="max-w-[420px]"
      aside={
        <ActiviteSecteur
          zone={b.zone}
          total={total}
          source={source}
          nomMetier={nomMetier(b.metierPrincipal) ?? 'artisan'}
        />
      }
    >
      <ConfigFirebase />
      <EtapeCompte email={b.identite.email} nom={b.identite.nom} />
    </CadreInscription>
  );
}
