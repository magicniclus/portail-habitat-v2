import { peut } from '@ph/core/equipe';
import { appAdmin } from '@ph/firebase/admin';
import { lireAvisPro } from '@ph/firebase/pro';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DemanderAvis } from '@/features/avisPro/DemanderAvis';
import { MesAvisPro } from '@/features/avisPro/MesAvisPro';
import { routes } from '@/lib/routes';
import { sessionPro } from '@/server/sessionPro';
import { maintenant } from '@/server/temps';

export const metadata: Metadata = { title: 'Mes avis', robots: { index: false } };

/** Maquette Mes Avis : avis publiés de l'entreprise, réponses publiques. */
export default async function PageMesAvis() {
  const s = await sessionPro(routes.proAvis);
  const active = s.espace.active;
  if (!active || active.membre.role === 'comptable') redirect(routes.proTableauDeBord);
  const avis = await lireAvisPro(getFirestore(appAdmin()), active.artisanId);
  return (
    <main className="grid gap-6 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 mb-1.5 text-[clamp(26px,3vw,34px)] leading-[1.1]">Mes avis</h1>
          <p className="m-0 text-base text-neutre-800">
            Les avis vérifiés de vos clients, publiés sur votre fiche.
          </p>
        </div>
        <DemanderAvis />
      </div>
      <MesAvisPro
        avis={avis}
        maintenant={maintenant()}
        peutRepondre={peut(active.membre, 'avis.repondre')}
      />
    </main>
  );
}
