'use client';

import { usePathname } from 'next/navigation';
import { PageIncident } from '@/features/erreurs/PageIncident';
import type { EspacePublic } from '@/features/erreurs/espaces';

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
