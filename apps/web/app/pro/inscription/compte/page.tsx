import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { CadreInscription } from '@/features/inscription/CadreInscription';
import { EtapeCompte } from '@/features/inscription/EtapeCompte';
import { brouillonCourant } from '@/server/inscription';

export const metadata: Metadata = { title: 'Votre compte', robots: { index: false } };

const ENSUITE = [
  'Votre fiche est créée, hors ligne le temps d’envoyer 2 documents.',
  'Kbis (ou SIREN vérifié) et attestation décennale : la fiche passe en ligne.',
  'Les demandes de votre zone arrivent dans votre espace et sur votre téléphone.',
];

/** Étape 3 de l'inscription pro : entreprise (SIREN), mot de passe, activation (COMPTES §3.3). */
export default async function PageCompte() {
  const b = await brouillonCourant();
  if (!b) redirect('/pro#inscription');
  if (!b.zone) redirect('/pro/inscription/zone');
  return (
    <CadreInscription
      etape={3}
      aside={
        <div className="grid gap-4">
          <p className="m-0 text-sm font-bold tracking-[0.08em] text-accent-300 uppercase">
            Ce qui vous attend
          </p>
          <ol className="m-0 grid list-none gap-3 p-0 text-base leading-[26px]">
            {ENSUITE.map((t, i) => (
              <li key={t} className="flex gap-3">
                <span aria-hidden="true" className="font-bold text-accent-400">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ol>
        </div>
      }
    >
      <ConfigFirebase />
      <EtapeCompte email={b.identite.email} nom={b.identite.nom} />
    </CadreInscription>
  );
}
