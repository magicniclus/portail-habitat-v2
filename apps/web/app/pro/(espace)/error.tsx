'use client';

import { ErreurSection } from '@/features/erreurs/ErreurSection';

export default function Erreur({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErreurSection erreur={error} reessayer={reset} />;
}
