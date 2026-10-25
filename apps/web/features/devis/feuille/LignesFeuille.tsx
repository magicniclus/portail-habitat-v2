'use client';

import type { TauxTva } from '@ph/core/devis';
import { parseEuros } from '@ph/core/format';
import type { PrestationBiblio } from '@ph/firebase/devis';
import { Button } from '@ph/ui';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { ligneSaisie, ligneTexte, ligneVide, type LigneSaisie } from '../etat';
import { COLONNES, LigneFeuille } from './LigneFeuille';

const entete = 'text-xs font-bold tracking-[0.04em] text-neutre-700 uppercase';

/**
 * Lignes de la feuille : « + Ligne chiffrée », « + Ligne de texte », « + Ligne type » (la
 * bibliothèque), et « Enregistrer comme ligne type » sur chaque ligne, sans quitter le devis.
 */
export function LignesFeuille({
  lignes,
  tvaDefaut,
  bibliotheque,
  rapide,
  avecCout,
  onChange,
  onMessage,
}: {
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
    <section aria-label="Lignes du devis" className="grid">
      <div
        aria-hidden="true"
        className={`hidden gap-1 border-b-2 border-texte px-1.5 pb-1.5 sm:grid ${rapide ? COLONNES.rapide : COLONNES.complet}`}
      >
        <span className={entete}>Désignation</span>
        {rapide ? (
          <>
            <span className={entete}>TVA</span>
            <span className={`${entete} text-right`}>Montant HT</span>
          </>
        ) : (
          <>
            <span className={`${entete} text-right`}>Qté</span>
            <span className={entete}>Unité</span>
            <span className={`${entete} text-right`}>PU HT</span>
            <span className={entete}>TVA</span>
            <span className={`${entete} text-right`}>Total HT</span>
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
      <div className="flex flex-wrap items-center gap-2 pt-3 print:hidden">
        <Button variant="secondaire" onClick={() => onChange([...lignes, ligneVide(tvaDefaut)])}>
          + Ligne chiffrée
        </Button>
        <Button variant="fantome" onClick={() => onChange([...lignes, ligneTexte(tvaDefaut)])}>
          + Ligne de texte
        </Button>
        {biblio.length ? (
          <select
            aria-label="Ajouter une ligne type"
            value=""
            onChange={(x) => {
              const p = biblio.find((b) => b.id === x.target.value);
              if (p) ajouter(ligneSaisie(p));
            }}
            className="min-h-11 max-w-full rounded-control border border-trait bg-blanc px-3 text-base font-semibold sm:w-auto"
          >
            <option value="">+ Ligne type…</option>
            {biblio.map((p) => (
              <option key={p.id} value={p.id}>
                {p.type === 'texte' ? `¶ ${p.designation}` : p.designation}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </section>
  );
}
