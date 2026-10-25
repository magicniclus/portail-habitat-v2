import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { CadreInscription } from '@/features/inscription/CadreInscription';
import { EtapeCompte } from '@/features/inscription/EtapeCompte';
import { brouillonCourant } from '@/server/inscription';
import { demandesEstimees } from '@/server/statsDemandes';

export const metadata: Metadata = { title: 'Votre compte', robots: { index: false } };

/** Étape 3 de l'inscription pro : entreprise (SIREN), mot de passe, activation (COMPTES §3.3). */
export default async function PageCompte() {
  const b = await brouillonCourant();
  if (!b) redirect('/pro#inscription');
  if (!b.zone) redirect('/pro/inscription/zone');
  const zone = `${b.zone.ville} · ${b.zone.rayonKm} km`;
  // Même calcul qu'aux étapes 1 et 2 (STATS_DEMANDES), sur le code postal saisi à l'étape 1.
  const { total } = demandesEstimees({
    codePostal: b.identite.codePostal,
    metiers: b.metiers,
    rayonKm: b.zone.rayonKm,
  });
  return (
    <CadreInscription
      etape={3}
      largeur="max-w-[420px]"
      aside={
        <div>
          <p className="m-0 mb-2.5 text-xs font-bold tracking-[0.08em] text-accent-700 uppercase">
            Ce qui vous attend
          </p>
          <h2 className="m-0 text-[clamp(22px,2.4vw,28px)] leading-[1.18] font-normal">
            {total ? (
              <>
                <strong>≈ {total} demandes</strong> vous attendent sur {zone}.
              </>
            ) : (
              <>
                Les demandes de <strong>{zone}</strong> arrivent dans votre espace dès
                l&apos;activation.
              </>
            )}
          </h2>
        </div>
      }
    >
      <ConfigFirebase />
      <EtapeCompte email={b.identite.email} nom={b.identite.nom} />
    </CadreInscription>
  );
}
