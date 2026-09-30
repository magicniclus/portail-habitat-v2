import { peut } from '@ph/core/equipe';
import { appAdmin } from '@ph/firebase/admin';
import { lireFacturation } from '@ph/firebase/facturation';
import { Banner, bouton } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ListeFactures, OffreActuelle } from '@/features/facturation/Facturation';
import { routes } from '@/lib/routes';
import { facturationBloquee } from '@/server/facturation';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Facturation', robots: { index: false } };

/**
 * Facturation : abonnement en cours, factures, portail client Stripe. CON-02 : propriétaire ou
 * gérant Premium sans second facteur → activation demandée avant l'accès.
 */
export default async function PageFacturation() {
  const s = await sessionPro(routes.proFacturation);
  const active = s.espace.active;
  if (!active) redirect(routes.proTableauDeBord);
  const titre = <h1 className="m-0 text-[clamp(26px,3vw,34px)]">Facturation</h1>;
  if (facturationBloquee(s))
    return (
      <main className="grid max-w-[760px] gap-5 px-[clamp(16px,3vw,32px)] py-10">
        {titre}
        <Banner
          tone="attention"
          titre="Activez la double authentification"
          action={
            <Link href={`${routes.proCompte}#securite`} className={bouton()}>
              Activer maintenant
            </Link>
          }
        >
          Votre entreprise est Premium : pour protéger vos paiements, la double authentification est
          obligatoire avant d&apos;accéder à la facturation.
        </Banner>
      </main>
    );
  const f = await lireFacturation(getFirestore(appAdmin()), active.artisanId);
  return (
    <main className="grid max-w-[760px] gap-6 px-[clamp(16px,3vw,32px)] py-10">
      {titre}
      <OffreActuelle abonnements={f.abonnements} gerer={peut(active.membre, 'abonnement.gerer')} />
      <ListeFactures factures={f.factures} />
    </main>
  );
}
