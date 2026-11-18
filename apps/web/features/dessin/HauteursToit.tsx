'use client';

import type { Dispatch } from 'react';
import type { Action } from './etat';
import { ChampMesure } from './ChampMesure';

/**
 * Hauteurs du toit depuis le sol (DES-16) : au plus bas (égout = haut des murs) et au plus
 * haut (faîtage). La pente se calcule seule ; on peut aussi la régler au curseur.
 */
export function HauteursToit({
  egout,
  faitage,
  plat,
  dispatch,
}: {
  egout: number;
  faitage: number;
  plat: boolean;
  dispatch: Dispatch<Action>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <ChampMesure
        unite="m"
        label="Au plus bas (m)"
        aide="Égout, depuis le sol"
        mm={egout}
        appliquer={(v) => dispatch({ type: 'hauteursToit', egout: v })}
      />
      <ChampMesure
        unite="m"
        label="Au plus haut (m)"
        aide={plat ? 'Toit plat : sans faîtage' : 'Faîtage, depuis le sol'}
        mm={faitage}
        desactive={plat}
        appliquer={(v) => dispatch({ type: 'hauteursToit', faitage: v })}
      />
    </div>
  );
}
