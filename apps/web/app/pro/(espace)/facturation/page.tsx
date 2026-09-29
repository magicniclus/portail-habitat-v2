import { deuxFacteursRequisPourFacturation } from '@ph/core/connexion';
import { Banner, bouton } from '@ph/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { sessionPro } from '@/server/sessionPro';

export const metadata: Metadata = { title: 'Facturation', robots: { index: false } };

/**
 * Facturation (abonnement, factures, moyens de paiement : lot 11). CON-02 : propriétaire ou gérant
 * Premium sans second facteur → activation demandée avant l'accès.
 */
export default async function PageFacturation() {
  const s = await sessionPro('/pro/facturation');
  const bloque =
    s.plan !== null &&
    s.role !== null &&
    deuxFacteursRequisPourFacturation({
      plan: s.plan,
      role: s.role,
      secondFacteur: s.secondFacteur,
    });
  return (
    <main className="mx-auto grid max-w-[760px] gap-5 px-[clamp(18px,4vw,44px)] py-10">
      <h1 className="m-0 text-[clamp(26px,3vw,34px)]">Facturation</h1>
      {bloque ? (
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
      ) : (
        <p className="m-0 text-base text-neutre-800">
          Votre abonnement, vos factures et vos moyens de paiement seront disponibles ici.
        </p>
      )}
    </main>
  );
}
