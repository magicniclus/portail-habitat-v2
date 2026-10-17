import { peut } from '@ph/core/equipe';
import { appAdmin } from '@ph/firebase/admin';
import { lireEquipe } from '@ph/firebase/pro';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EnAttente } from '@/features/equipe/EnAttente';
import { InviterMembre } from '@/features/equipe/InviterMembre';
import { ListeMembres } from '@/features/equipe/ListeMembres';
import { routes } from '@/lib/routes';
import { sessionPro } from '@/server/sessionPro';
import { maintenant } from '@/server/temps';

export const metadata: Metadata = { title: 'Équipe', robots: { index: false } };

/** Maquette Equipe (COMPTES §4) : membres, sièges, invitations, demandes pour rejoindre. */
export default async function PageEquipe() {
  const s = await sessionPro(routes.proEquipe);
  const active = s.espace.active;
  if (!active || active.membre.role === 'comptable') redirect(routes.proTableauDeBord);
  const e = await lireEquipe(
    getFirestore(appAdmin()),
    active.artisanId,
    active.membre,
    maintenant(),
  );
  const gere = peut(active.membre, 'membres.gerer');
  // Objet simple pour les composants client (le document contient des dates Firestore).
  const { role, statut, permissions } = active.membre;
  const moi = { role, statut, ...(permissions ? { permissions } : {}) };
  return (
    <main className="grid max-w-[900px] gap-5 px-[clamp(16px,3vw,32px)] pt-[clamp(20px,3vw,32px)] pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 mb-1.5 text-[clamp(26px,3vw,34px)] leading-[1.1]">Équipe</h1>
          <p className="m-0 text-base text-neutre-800">
            {e.sieges.utilises} siège{e.sieges.utilises > 1 ? 's' : ''} utilisé
            {e.sieges.utilises > 1 ? 's' : ''} sur {e.sieges.max}
            {gere ? ' (les invitations en cours comptent)' : ''}.
          </p>
        </div>
        {gere ? (
          <InviterMembre
            artisanId={active.artisanId}
            moi={moi}
            disponibles={e.sieges.disponibles}
          />
        ) : null}
      </div>
      <EnAttente
        artisanId={active.artisanId}
        invitations={e.invitations}
        demandes={e.demandesAcces}
      />
      <ListeMembres artisanId={active.artisanId} membres={e.membres} moi={moi} moiUid={s.uid} />
    </main>
  );
}
