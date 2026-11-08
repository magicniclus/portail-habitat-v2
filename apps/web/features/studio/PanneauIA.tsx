'use client';

import { useState } from 'react';

/**
 * Onglet IA de l'éditeur : demander à Claude de revoir le montage (projets montés par Claude).
 * Le nouveau montage remplace la frise ; les médias importés restent dans la bibliothèque.
 */
export function PanneauIA(p: {
  /** Retouche possible : le projet a une prise et un montage de Claude. */
  retouche: boolean;
  enCours: boolean;
  onRetouche: (demande: string) => void;
}) {
  const [demande, setDemande] = useState('');
  if (!p.retouche)
    return (
      <p className="m-0 text-sm text-montage-texte-doux">
        Claude monte les vidéos tournées dans le Studio (idée, script, tournage). Ici, vous montez
        vous-même : importez vos médias, ajoutez les écrans de Portail Travaux, cochez les
        sous-titres dans les réglages du projet.
      </p>
    );
  return (
    <div className="grid gap-2">
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">Revoir avec Claude</span>
        <textarea
          value={demande}
          rows={5}
          maxLength={1_000}
          onChange={(e) => setDemande(e.target.value)}
          placeholder="Ex. une accroche plus courte, plus d’écrans de la fiche, finir sur le prix"
          className="rounded-[8px] border border-montage-trait bg-montage-surface p-2 text-base text-montage-texte"
        />
      </label>
      <p className="m-0 text-xs text-montage-texte-doux">
        Claude refait le montage à partir de la prise : vos retouches à la main seront remplacées.
      </p>
      <button
        type="button"
        disabled={p.enCours || demande.trim().length < 3}
        onClick={() => {
          if (window.confirm('Remplacer le montage actuel par celui de Claude ?'))
            p.onRetouche(demande.trim());
        }}
        className="min-h-11 rounded-[8px] bg-montage-selection px-3 text-sm font-bold text-montage-fond disabled:opacity-40"
      >
        Lancer la retouche
      </button>
    </div>
  );
}
