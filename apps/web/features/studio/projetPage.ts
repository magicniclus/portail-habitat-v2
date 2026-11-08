import 'server-only';
import { appAdmin } from '@ph/firebase/admin';
import { etatCaptures } from '@ph/core/studio';
import { lireProjetStudio } from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { pageAdmin } from '@/server/sessionAdmin';

/**
 * Projet Studio d'une page d'étape : session et section vérifiées, projet lu une seule fois par
 * rendu (partagé entre la mise en page commune et la page de l'étape).
 */
export const projetStudioPage = cache(async (id: string, etape?: string) => {
  await pageAdmin(`/admin/studio/${id}${etape ? `/${etape}` : ''}`, 'studio');
  const p = await lireProjetStudio(getFirestore(appAdmin()), id);
  if (!p) notFound();
  return p;
});

/** État utile au choix de l'étape (pages accessibles, étape en cours). */
export const etatEtapes = (p: Awaited<ReturnType<typeof projetStudioPage>>) => ({
  statut: p.statut,
  prise: Boolean(p.prise),
  rendu: Boolean(p.rendu),
  captures: etatCaptures(p),
  libre: p.libre,
});
