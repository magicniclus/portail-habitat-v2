import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ConfigFirebase } from '@/features/firebase/ConfigFirebase';
import { CadreInscription } from '@/features/inscription/CadreInscription';
import { ActiviteSecteur } from '@/features/inscription/ActiviteSecteur';
import { EtapeCompte } from '@/features/inscription/EtapeCompte';
import { brouillonCourant } from '@/server/inscription';

export const metadata: Metadata = { title: 'Votre compte', robots: { index: false } };

/**
 * Étape 3 de l'inscription pro : entreprise (SIREN, ou saisie à la main), puis Google ou email et
 * mot de passe (COMPTES §3.3) ; mêmes demandes récentes qu'à l'étape 2.
 */
export default async function PageCompte() {
  const b = await brouillonCourant();
  if (!b) redirect('/pro#inscription');
  if (!b.zone) redirect('/pro/inscription/zone');
  return (
    <CadreInscription etape={3} largeur="max-w-[420px]" aside={<ActiviteSecteur zone={b.zone} />}>
      <ConfigFirebase />
      <EtapeCompte email={b.identite.email} nom={b.identite.nom} zone={b.zone} />
    </CadreInscription>
  );
}
