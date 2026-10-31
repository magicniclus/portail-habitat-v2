import { LIBELLES_ROLE_ADMIN, sectionsVisibles } from '@ph/core/admin';
import type { ReactNode } from 'react';
import { CoqueAdmin } from '@/features/admin/CoqueAdmin';
import { lireSessionAdmin } from '@/server/sessionAdmin';

/** Coque du back-office : chaque page revérifie la session et la section (`pageAdmin`). */
export default async function LayoutCoqueAdmin({ children }: { children: ReactNode }) {
  const r = await lireSessionAdmin();
  if (r.etat !== 'ok') return children;
  const liens = sectionsVisibles(r.session.permissions).map(({ id, libelle, chemin, icone }) => ({
    id,
    libelle,
    chemin,
    icone,
  }));
  return (
    <CoqueAdmin
      liens={liens}
      nom={r.session.nom}
      role={LIBELLES_ROLE_ADMIN[r.session.role] ?? r.session.role}
    >
      {children}
    </CoqueAdmin>
  );
}
