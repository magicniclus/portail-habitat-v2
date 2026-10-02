import { peut } from '@ph/core/equipe';
import { lireDemandesPro, marquerDemandesVues } from '@ph/firebase/pro';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { MesDemandesPro } from '@/features/demandesPro/MesDemandesPro';
import { routes } from '@/lib/routes';
import { servicesDemandesPro } from '@/server/demandesPro';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Mes demandes', robots: { index: false } };

/** Maquette Mes Demandes : demandes reçues, en temps réel (PRO-01 à 03). */
export default async function PageMesDemandes() {
  const s = await sessionPro(routes.proDemandes);
  const active = s.espace.active;
  if (!active || !peut(active.membre, 'demandes.repondre')) redirect(routes.proTableauDeBord);
  // Ouvrir Mes demandes = les propositions sont vues (demande partenaire : délai normal, pas 2 h).
  await marquerDemandesVues(servicesDemandesPro(), active.artisanId);
  const demandes = await lireDemandesPro(servicesDemandesPro(), active.artisanId);
  return (
    <main className="grid gap-5 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <ConfigFirebase />
      <div>
        <h1 className="m-0 mb-1.5 text-[clamp(26px,3vw,34px)] leading-[1.1]">Mes demandes</h1>
        <p className="m-0 text-base text-neutre-800">
          Les demandes de devis des particuliers de votre zone. Acceptez-en une pour voir les
          coordonnées du particulier.
        </p>
      </div>
      <MesDemandesPro initiales={demandes} artisanId={active.artisanId} uid={s.uid} />
    </main>
  );
}
