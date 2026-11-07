import { LIBELLES_ROLE_ADMIN, sectionsVisibles } from '@ph/core/admin';
import type { ReactNode } from 'react';
import { appAdmin } from '@ph/firebase/admin';
import { videosEnCoursStudio } from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';
import { CoqueAdmin } from '@/features/admin/CoqueAdmin';
import { IndicateurStudio } from '@/features/studio/IndicateurStudio';
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
  // Pastille « Vidéo en création » : on navigue pendant que Claude et le robot travaillent.
  const studio = r.session.permissions.includes('studio.utiliser')
    ? await videosEnCoursStudio(getFirestore(appAdmin())).catch(() => [])
    : null;
  return (
    <CoqueAdmin
      liens={liens}
      nom={r.session.nom}
      role={LIBELLES_ROLE_ADMIN[r.session.role] ?? r.session.role}
    >
      {children}
      {studio ? <IndicateurStudio initial={studio} /> : null}
    </CoqueAdmin>
  );
}
