import { sectionsVisibles } from '@ph/core/admin';
import type { ReactNode } from 'react';
import { CoqueAdmin } from '@/features/admin/CoqueAdmin';
import { lireSessionAdmin } from '@/server/sessionAdmin';

const NOMS_ROLE: Record<string, string> = {
  superadmin: 'Super-administrateur',
  admin: 'Administrateur',
  moderateur: 'Modérateur',
  commercial: 'Commercial',
  finance: 'Finance',
  lecture: 'Lecture seule',
};

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
      role={NOMS_ROLE[r.session.role] ?? r.session.role}
    >
      {children}
    </CoqueAdmin>
  );
}
