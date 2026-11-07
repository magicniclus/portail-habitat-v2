import { LIBELLES_ROLE_ADMIN } from '@ph/core/admin';
import { formatDate } from '@ph/core/format';
import { appAdmin } from '@ph/firebase/admin';
import { listerEquipeAdmin } from '@ph/firebase/admin-serveur';
import { Badge } from '@ph/ui';
import { getFirestore } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import { forbidden, redirect } from 'next/navigation';
import { InvitationEquipe } from '@/features/adminEquipe/InvitationEquipe';
import { ModifierMembre } from '@/features/adminEquipe/ModifierMembre';
import { NavEquipe } from '@/features/adminEquipe/NavEquipe';
import { pageAdmin } from '@/server/sessionAdmin';

export const metadata: Metadata = { title: 'Équipe' };

/** Maquette « Admin Equipe » (ADMIN §2.12) : membres, rôles, invitation, désactivation. */
export default async function EquipeAdmin() {
  const s = await pageAdmin('/admin/equipe', 'equipe');
  if (!s.permissions.includes('equipe.gerer')) {
    if (s.permissions.includes('audit.lire')) redirect('/admin/equipe/audit');
    forbidden();
  }
  const membres = await listerEquipeAdmin(getFirestore(appAdmin()));
  return (
    <main className="grid content-start gap-5 px-[clamp(16px,3vw,32px)] py-[clamp(20px,3vw,32px)]">
      <h1 className="m-0 text-[clamp(26px,3vw,32px)]">Équipe</h1>
      <NavEquipe actif="/admin/equipe" permissions={s.permissions} />
      <InvitationEquipe />
      <ul aria-label="Membres" className="m-0 grid list-none gap-2 p-0">
        {membres.map((m) => (
          <li
            key={m.uid}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-trait bg-blanc p-3"
          >
            <span className="grid gap-0.5">
              <strong>{m.nom}</strong>
              <span className="text-[13px] text-neutre-700">
                {m.email} · {LIBELLES_ROLE_ADMIN[m.role] ?? m.role}
                {m.dernierAcces ? ` · vu le ${formatDate(m.dernierAcces)}` : ''}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone={m.actif ? 'succes' : 'neutre'}>{m.actif ? 'Actif' : 'Désactivé'}</Badge>
              {m.uid === s.uid ? (
                <span className="text-sm text-neutre-700">Vous</span>
              ) : (
                <ModifierMembre uid={m.uid} nom={m.nom} role={m.role} actif={m.actif} />
              )}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
