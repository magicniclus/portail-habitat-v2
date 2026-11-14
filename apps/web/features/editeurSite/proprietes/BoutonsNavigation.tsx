'use client';

import type { NavigationComplete } from '@ph/core/sites';
import { ChampAction } from '../ChampAction';
import { Groupe, Interrupteur } from './controles';
import { Couleurs } from './Couleurs';
import type { ContexteReglages } from './contexte';

const champ = 'min-h-11 rounded-[8px] border border-trait px-3 text-base font-normal';

/** Navigation › Boutons : bouton devis (texte, action, couleurs) et numéro de téléphone. */
export function BoutonsNavigation({
  n,
  maj,
  c,
}: {
  n: NavigationComplete;
  maj: (r: Partial<NavigationComplete>) => void;
  c: ContexteReglages;
}) {
  return (
    <Groupe titre="Boutons">
      <Interrupteur
        libelle="Bouton devis"
        actif={n.cta.visible}
        onChange={(visible) => maj({ cta: { ...n.cta, visible } })}
      />
      {n.cta.visible ? (
        <>
          <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
            Texte du bouton
            <input
              value={n.cta.texte}
              maxLength={40}
              onChange={(e) => maj({ cta: { ...n.cta, texte: e.target.value } })}
              className={champ}
            />
          </label>
          <ChampAction
            action={n.cta.action}
            onChange={(action) => maj({ cta: { ...n.cta, action } })}
            c={c}
            libelle="Action du bouton"
          />
          <Couleurs
            libelle="Couleur du bouton"
            valeur={n.cta.couleur}
            jetons={['primaire', 'accent', 'sombre', 'blanc']}
            palette={c.palette}
            onChange={(couleur) => maj({ cta: { ...n.cta, couleur } })}
          />
          <Couleurs
            libelle="Couleur du texte du bouton"
            valeur={n.cta.texteCouleur}
            jetons={['auto', 'blanc', 'sombre', 'primaire', 'accent']}
            palette={c.palette}
            libre={false}
            onChange={(texteCouleur) => maj({ cta: { ...n.cta, texteCouleur } })}
          />
        </>
      ) : null}
      <Interrupteur
        libelle="Numéro de téléphone"
        actif={n.tel.visible}
        onChange={(visible) => maj({ tel: { ...n.tel, visible } })}
      />
      {n.tel.visible ? (
        <label className="grid gap-1.5 text-[13px] font-bold text-neutre-800">
          Numéro
          <input
            type="tel"
            value={n.tel.numero}
            maxLength={30}
            onChange={(e) => maj({ tel: { ...n.tel, numero: e.target.value } })}
            className={champ}
          />
        </label>
      ) : null}
    </Groupe>
  );
}
