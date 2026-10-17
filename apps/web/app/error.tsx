'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type { EspacePublic } from '@/features/erreurs/espaces';

// Chargée seulement quand une erreur survient : rien dans le JavaScript initial des pages.
const PageIncident = dynamic(() =>
  import('@/features/erreurs/PageIncident').then((m) => m.PageIncident),
);

function espaceDe(chemin: string): EspacePublic {
  if (chemin.startsWith('/pro')) return 'pro';
  if (chemin.startsWith('/diagnostic-immobilier')) return 'diag';
  return 'particulier';
}

export default function Erreur({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageIncident erreur={error} reessayer={reset} espace={espaceDe(usePathname() ?? '/')} />;
}
