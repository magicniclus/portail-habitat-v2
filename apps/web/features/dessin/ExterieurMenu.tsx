'use client';

import { LIBELLES_FORME_PISCINE, type FormePiscine, type TypeCloture } from '@ph/core/dessin';
import { Select } from '@ph/ui';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import type { Dispatch, ReactNode } from 'react';
import { ApercuExterieur } from './ApercusExterieur';
import { sceneDe, type Action, type ElementExterieur, type EtatEditeur } from './etat';
import { Ligne, SousSection } from './LigneMenu';

type Outil = { el: ElementExterieur; libelle: string; aide: string };

/** Sous-sections du menu, dans l'ordre où l'on aménage un terrain. */
const GROUPES: { titre: string; outils: Outil[] }[] = [
  {
    titre: 'Terrain',
    outils: [{ el: 'parcelle', libelle: 'Parcelle', aide: 'Deux coins opposés' }],
  },
  {
    titre: 'Sols extérieurs',
    outils: [
      { el: 'terrasse', libelle: 'Terrasse', aide: 'Deux coins opposés' },
      { el: 'allee', libelle: 'Allée', aide: 'Deux coins opposés' },
    ],
  },
  { titre: 'Piscine', outils: [{ el: 'piscine', libelle: 'Piscine', aide: 'Un clic au centre' }] },
  {
    titre: 'Clôtures',
    outils: [{ el: 'cloture', libelle: 'Clôture', aide: 'Point par point, Échap pour finir' }],
  },
  {
    titre: 'Végétaux',
    outils: [
      { el: 'arbre', libelle: 'Arbre', aide: 'Un clic, taille adulte' },
      { el: 'arbuste', libelle: 'Arbuste', aide: 'Un clic' },
      { el: 'haie', libelle: 'Haie', aide: 'Un clic par pied' },
    ],
  },
];
const CLOTURES: [TypeCloture, string][] = [
  ['bois', 'Bois'],
  ['grillage', 'Grillage'],
  ['muret', 'Muret'],
  ['haie', 'Haie'],
  ['portail', 'Portail'],
];

/** Réglage sous un outil (forme de la piscine, type de clôture), sur toute la largeur. */
function Reglage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="px-2.5 pt-1 pb-2">
      <label className="grid gap-1 text-[13px] font-semibold text-neutre-800">
        {label}
        {children}
      </label>
    </li>
  );
}

/**
 * Extérieur (DES-18 à DES-20) : terrain, sols extérieurs, piscine, clôtures, végétaux, rangés
 * comme les portes et fenêtres (sous-sections, vignettes vues de dessus) ; les réglages d'un
 * outil sont juste sous lui.
 */
export function ExterieurMenu({
  etat,
  dispatch,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  const outil = (el: ElementExterieur, reglage?: Partial<Extract<Action, { type: 'outil' }>>) =>
    dispatch({ type: 'outil', outil: 'exterieur', elementExterieur: el, ...reglage });
  const ligne = (o: Outil) => (
    <Ligne
      key={o.el}
      titre={o.libelle}
      detail={o.aide}
      apercu={<ApercuExterieur element={o.el} />}
      pressee={etat.outil === 'exterieur' && etat.elementExterieur === o.el}
      onClick={() => outil(o.el)}
    />
  );
  const [terrain, sols, piscine, clotures, vegetaux] = GROUPES as [
    (typeof GROUPES)[number],
    (typeof GROUPES)[number],
    (typeof GROUPES)[number],
    (typeof GROUPES)[number],
    (typeof GROUPES)[number],
  ];
  return (
    <div className="grid gap-1">
      <SousSection titre={terrain.titre} nombre={2}>
        <Ligne
          titre={
            sceneDe(etat).terrain ? 'Recaler autour de la maison' : 'Parcelle autour de la maison'
          }
          detail="Un rectangle à ajuster ensuite"
          apercu={
            <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-neutre-200 bg-blanc text-neutre-700">
              <ArrowsOutSimpleIcon size={22} aria-hidden="true" />
            </span>
          }
          onClick={() => dispatch({ type: 'parcelleAutour' })}
        />
        {terrain.outils.map(ligne)}
      </SousSection>
      <SousSection titre={sols.titre} nombre={sols.outils.length}>
        {sols.outils.map(ligne)}
      </SousSection>
      <SousSection titre={piscine.titre} nombre={piscine.outils.length}>
        {piscine.outils.map(ligne)}
        <Reglage label="Forme de piscine">
          <Select
            value={etat.formePiscine}
            onChange={(ev) => outil('piscine', { formePiscine: ev.target.value as FormePiscine })}
          >
            {(Object.keys(LIBELLES_FORME_PISCINE) as FormePiscine[]).map((f) => (
              <option key={f} value={f}>
                {LIBELLES_FORME_PISCINE[f]}
              </option>
            ))}
          </Select>
        </Reglage>
      </SousSection>
      <SousSection titre={clotures.titre} nombre={clotures.outils.length}>
        {clotures.outils.map(ligne)}
        <Reglage label="Type de clôture">
          <Select
            value={etat.typeCloture}
            onChange={(ev) => outil('cloture', { typeCloture: ev.target.value as TypeCloture })}
          >
            {CLOTURES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Reglage>
      </SousSection>
      <SousSection titre={vegetaux.titre} nombre={vegetaux.outils.length}>
        {vegetaux.outils.map(ligne)}
      </SousSection>
      <p className="m-0 px-1 pt-2 text-[13px] leading-5 text-neutre-700">
        Cliquez ensuite sur un élément posé pour le régler. Distances aux limites indicatives : ce
        n’est pas un avis d’urbanisme.
      </p>
    </div>
  );
}
