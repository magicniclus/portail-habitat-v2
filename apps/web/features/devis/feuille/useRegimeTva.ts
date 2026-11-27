import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

type Message = { ton: 'succes' | 'danger'; texte: string };

/**
 * « Je suis / ne suis pas soumis à la TVA » sur la feuille : totaux recalculés tout de suite,
 * choix enregistré dans les paramètres de facturation ; refusé → choix précédent rétabli.
 */
export function useRegimeTva(initial: boolean, onMessage: (m: Message) => void) {
  const [franchiseTva, setFranchiseTva] = useState(initial);
  const changer = async (franchise: boolean) => {
    const avant = franchiseTva;
    setFranchiseTva(franchise);
    const r = await posterJson<null>('/api/pro/devis/regime-tva', { franchiseTva: franchise });
    if (!r.ok) {
      setFranchiseTva(avant);
      onMessage({ ton: 'danger', texte: r.message });
    }
  };
  return { franchiseTva, changer };
}
