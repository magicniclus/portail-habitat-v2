'use client';

import type { TauxTva } from '@ph/core/devis';
import { parseEuros } from '@ph/core/format';
import type { PrestationBiblio } from '@ph/firebase/devis';
import { useState, type ReactNode } from 'react';
import { posterJson } from '@/lib/posterJson';
import { ligneSaisie, ligneTexte, ligneVide, type LigneSaisie } from '../etat';
import { AjoutLigne } from './AjoutLigne';
import { COLONNES } from './CasesFeuille';
import { LigneFeuille } from './LigneFeuille';

const entete =
  'flex min-h-10 items-center rounded-[8px] bg-accent-action px-3 text-sm font-semibold text-blanc';

/**
 * Lignes de la feuille (captures) : en-tête coloré, « + Ligne simple ▾ » (ligne de texte, lignes
 * types), et « Enregistrer comme ligne type » sur chaque ligne, sans quitter le devis.
 */
export function LignesFeuille({
  lignes,
  tvaDefaut,
  bibliotheque,
  rapide,
  avecCout,
  onChange,
  onMessage,
  apresLignes,
}: {
  /** Sous les lignes, avant « + Ligne simple » (remise globale). */
  apresLignes?: ReactNode;
  lignes: LigneSaisie[];
  tvaDefaut: TauxTva;
  bibliotheque: PrestationBiblio[];
  rapide: boolean;
  avecCout: boolean;
  onChange: (l: LigneSaisie[]) => void;
  onMessage: (m: { ton: 'succes' | 'danger'; texte: string }) => void;
}) {
  const [biblio, setBiblio] = useState(bibliotheque);
  /** Une ligne vide (la seule, au départ) est remplacée plutôt que gardée. */
  const ajouter = (l: LigneSaisie) =>
    onChange([...lignes.filter((x) => x.designation || x.puHt), l]);
  const maj = (i: number, patch: Partial<LigneSaisie>) =>
    onChange(lignes.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const enregistrerType = async (l: LigneSaisie) => {
    const puHtCentimes = parseEuros(l.puHt) ?? 0;
    if (l.type === 'chiffree' && puHtCentimes < 1)
      return onMessage({
        ton: 'danger',
        texte: 'Indiquez un prix avant d’enregistrer la ligne type.',
      });
    const corps =
      l.type === 'texte'
        ? { action: 'creerTexte', designation: l.designation.trim() }
        : {
            action: 'creer',
            designation: l.designation.trim(),
            unite: l.unite.trim() || 'u',
            puHtCentimes,
            tva: l.tva,
            ...(l.nature === 'fourniture' ? { nature: 'fourniture' } : {}),
            ...(parseEuros(l.cout) !== null ? { coutHtCentimes: parseEuros(l.cout) } : {}),
          };
    const r = await posterJson<{ id: string }>('/api/pro/devis/bibliotheque', corps);
    if (!r.ok) return onMessage({ ton: 'danger', texte: r.message });
    setBiblio((b) =>
      [
        ...b,
        {
          id: r.data.id,
          ...(l.type === 'texte' ? { type: 'texte' as const } : {}),
          designation: l.designation.trim(),
          unite: l.type === 'texte' ? '' : l.unite.trim() || 'u',
          puHtCentimes: l.type === 'texte' ? 0 : puHtCentimes,
          tva: l.tva,
        },
      ].sort((a, b) => a.designation.localeCompare(b.designation, 'fr')),
    );
    onMessage({ ton: 'succes', texte: `« ${l.designation.trim()} » ajoutée à vos lignes types.` });
  };

  return (
    <section aria-label="Lignes du devis" className="grid gap-2">
      <div
        aria-hidden="true"
        className={`hidden gap-1.5 sm:grid ${rapide ? COLONNES.rapide : COLONNES.complet}`}
      >
        <span className={`${entete} col-span-2`}>Désignation</span>
        {rapide ? (
          <>
            <span className={`${entete} justify-center`}>TVA</span>
            <span className={`${entete} justify-end`}>Montant HT</span>
          </>
        ) : (
          <>
            <span className={`${entete} justify-center`}>Quantité</span>
            <span className={`${entete} justify-center`}>Unité</span>
            <span className={`${entete} justify-center`}>Prix unitaire</span>
            <span className={`${entete} justify-center`}>TVA</span>
            <span className={`${entete} justify-end`}>Montant HT</span>
          </>
        )}
        <span />
      </div>
      {lignes.map((l, i) => (
        <LigneFeuille
          key={l.cle}
          l={l}
          n={i + 1}
          rapide={rapide}
          avecCout={avecCout}
          maj={(p) => maj(i, p)}
          supprimer={lignes.length > 1 ? () => onChange(lignes.filter((_, j) => j !== i)) : null}
          enregistrerType={() => void enregistrerType(l)}
        />
      ))}
      {apresLignes}
      <AjoutLigne
        ligneSimple={() => onChange([...lignes, ligneVide(tvaDefaut)])}
        ligneTexte={() => onChange([...lignes, ligneTexte(tvaDefaut)])}
        lignesTypes={biblio}
        ligneType={(p) => ajouter(ligneSaisie(p))}
      />
    </section>
  );
}
