'use client';

import { useCallback, useEffect, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const flash = useCallback((m: string) => setToast(m), []);
  const fermerToast = useCallback(() => setToast(null), []);
  return { toast, flash, fermerToast };
}

/** Message bref en bas de l'écran (« Zone ajoutée · Ctrl+Z pour annuler »), effacé après 2,8 s. */
export function Toast({ message, onFin }: { message: string | null; onFin: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onFin, 2800);
    return () => clearTimeout(t);
  }, [message, onFin]);
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[10px] bg-neutre-900 px-4 py-2.5 text-sm text-blanc shadow-lg"
    >
      {message}
    </div>
  );
}
