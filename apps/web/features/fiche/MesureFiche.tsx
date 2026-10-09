'use client';

import { useEffect } from 'react';

const envoyer = (artisanId: string, type: 'vue' | 'tel' | 'devis') => {
  const corps = JSON.stringify({ artisanId, type });
  if (
    !navigator.sendBeacon?.('/api/fiche/evenement', new Blob([corps], { type: 'application/json' }))
  )
    void fetch('/api/fiche/evenement', { method: 'POST', body: corps, keepalive: true }).catch(
      () => undefined,
    );
};

/**
 * Statistiques de la fiche (vues, clics) : une vue par fiche et par onglet ; les clics sont lus
 * sur les éléments marqués `data-ph-fiche="tel"` ou `"devis"`. Rien en aperçu par l'artisan.
 */
export function MesureFiche({ artisanId }: { artisanId: string }) {
  useEffect(() => {
    if (new URLSearchParams(location.search).has('apercu')) return;
    const cle = `ph_vue_${artisanId}`;
    try {
      if (!sessionStorage.getItem(cle)) {
        sessionStorage.setItem(cle, '1');
        envoyer(artisanId, 'vue');
      }
    } catch {
      envoyer(artisanId, 'vue');
    }
    const clic = (e: MouseEvent) => {
      const type = (e.target as Element | null)
        ?.closest('[data-ph-fiche]')
        ?.getAttribute('data-ph-fiche');
      if (type === 'tel' || type === 'devis') envoyer(artisanId, type);
    };
    document.addEventListener('click', clic, true);
    return () => document.removeEventListener('click', clic, true);
  }, [artisanId]);
  return null;
}
