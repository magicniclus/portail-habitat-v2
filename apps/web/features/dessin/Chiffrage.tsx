'use client';

import {
  formatLongueur,
  formatSurface,
  LIBELLES_EQUIPEMENT,
  LIBELLES_POSTE,
  listeMenuiseries,
  metreNiveau,
  type LigneMetre,
} from '@ph/core/dessin';
import { formatNombre } from '@ph/core/format';
import { niveauDe, type EtatEditeur } from './etat';

const quantite = (l: LigneMetre) =>
  l.unite === 'm2'
    ? formatSurface(l.quantite)
    : l.unite === 'ml'
      ? formatLongueur(l.quantite)
      : formatNombre(l.quantite);

/** Onglet « Chiffrer » (DES-43) : métré calculé depuis le plan. Demande de devis : lot 15i. */
export function Chiffrage({ etat }: { etat: EtatEditeur }) {
  const lignes = metreNiveau(niveauDe(etat));
  const menuiseries = listeMenuiseries(niveauDe(etat));
  return (
    <div className="grid gap-3.5 px-1">
      <p className="m-0 text-sm leading-5 text-neutre-800">
        Les quantités se calculent depuis votre plan et se mettent à jour à chaque modification.
      </p>
      {lignes.length === 0 ? (
        <p className="m-0 text-sm text-neutre-800">Dessinez une pièce pour obtenir le métré.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <caption className="pb-1.5 text-left text-xs font-bold tracking-wide text-neutre-700 uppercase">
            Métré du niveau
          </caption>
          <tbody>
            {lignes.map((l) => (
              <tr
                key={`${l.poste}-${l.famille ?? ''}-${l.prestationId ?? ''}`}
                className="border-t border-trait"
              >
                <th scope="row" className="py-2 text-left font-normal text-neutre-800">
                  {l.poste === 'equipements' && l.prestationId
                    ? (LIBELLES_EQUIPEMENT[l.prestationId] ?? LIBELLES_POSTE[l.poste])
                    : LIBELLES_POSTE[l.poste]}
                </th>
                <td className="py-2 text-right font-bold whitespace-nowrap">{quantite(l)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {menuiseries.length ? (
        <table className="w-full border-collapse text-sm">
          <caption className="pb-1.5 text-left text-xs font-bold tracking-wide text-neutre-700 uppercase">
            Menuiseries
          </caption>
          <tbody>
            {menuiseries.map((m) => (
              <tr key={m.libelle} className="border-t border-trait">
                <th scope="row" className="py-2 text-left font-normal text-neutre-800">
                  {m.libelle}
                </th>
                <td className="py-2 pl-2 text-right font-bold whitespace-nowrap">× {m.nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
