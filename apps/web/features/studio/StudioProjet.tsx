'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import type { ComponentProps } from 'react';
import { EditeurFrise } from './EditeurFrise';

/** Le Studio d'une vidéo, ouvert directement en plein écran ; fermer ramène aux vidéos. */
export function StudioProjet(p: Omit<ComponentProps<typeof EditeurFrise>, 'onFermer'>) {
  const router = useRouter();
  return <EditeurFrise {...p} onFermer={() => router.push('/admin/studio' as Route)} />;
}
