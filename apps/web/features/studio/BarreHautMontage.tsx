'use client';

import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  FloppyDiskIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';

const OUTIL =
  'flex size-10 items-center justify-center rounded-[8px] text-montage-texte hover:bg-montage-survol disabled:opacity-40 disabled:hover:bg-transparent';

/** Liste dépliante de la barre (points à corriger, conseils de rythme). */
function Alerte({
  libelle,
  ton,
  lignes,
}: {
  libelle: string;
  ton: 'danger' | 'conseil';
  lignes: string[];
}) {
  if (!lignes.length) return null;
  return (
    <details className="relative">
      <summary
        className={`flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${ton === 'danger' ? 'bg-danger text-blanc' : 'bg-montage-surface text-montage-texte'}`}
      >
        <WarningIcon size={16} aria-hidden="true" />
        {libelle} ({lignes.length})
      </summary>
      <ul className="absolute top-12 right-0 z-30 m-0 grid w-80 gap-1.5 rounded-[10px] border border-montage-trait bg-montage-surface p-3 pl-7 text-sm shadow-lg">
        {lignes.slice(0, 6).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Barre du haut de l'éditeur plein écran : fermer, titre et état du projet, annuler / rétablir,
 * points à corriger et conseils de rythme, puis « Enregistrer et fabriquer ».
 */
export function BarreHautMontage(p: {
  titre: string;
  etat: string | null;
  message: { ton: 'succes' | 'danger'; texte: string } | null;
  erreurs: string[];
  rythme: string[];
  /** Le brouillon diffère du montage enregistré. */
  modifie: boolean;
  onFermer: () => void;
  onAnnuler: (() => void) | undefined;
  onRetablir: (() => void) | undefined;
  enregistrable: boolean;
  enCours: boolean;
  onEnregistrer: () => void;
  /** Libellé du bouton d'enregistrement (« Enregistrer et fabriquer » par défaut). */
  libelleEnregistrer?: string;
}) {
  return (
    <header className="flex min-w-0 items-center gap-2 border-b border-montage-trait bg-montage-panneau px-2">
      <button
        type="button"
        className={OUTIL}
        onClick={() => {
          // Le brouillon n'est gardé que dans l'éditeur : on prévient avant de le perdre.
          if (
            !p.modifie ||
            window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')
          )
            p.onFermer();
        }}
        aria-label="Fermer l’éditeur"
      >
        <XIcon size={20} aria-hidden="true" />
      </button>
      <div className="min-w-0">
        <h2 className="m-0 truncate text-sm font-semibold">{p.titre}</h2>
        {p.etat ? <p className="m-0 truncate text-xs text-montage-texte-doux">{p.etat}</p> : null}
      </div>
      <span aria-hidden="true" className="mx-1 h-6 w-px bg-montage-trait" />
      <button
        type="button"
        className={OUTIL}
        onClick={p.onAnnuler}
        disabled={!p.onAnnuler}
        aria-label="Annuler (Ctrl+Z)"
        title="Annuler (Ctrl+Z)"
      >
        <ArrowCounterClockwiseIcon size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={OUTIL}
        onClick={p.onRetablir}
        disabled={!p.onRetablir}
        aria-label="Rétablir (Ctrl+Y)"
        title="Rétablir (Ctrl+Y)"
      >
        <ArrowClockwiseIcon size={20} aria-hidden="true" />
      </button>
      <div className="ml-auto flex items-center gap-2">
        {p.message ? (
          <p
            role="status"
            className={`m-0 hidden text-sm md:block ${p.message.ton === 'danger' ? 'text-danger' : 'text-montage-selection'}`}
          >
            {p.message.texte}
          </p>
        ) : null}
        <Alerte libelle="À corriger" ton="danger" lignes={p.erreurs} />
        <Alerte libelle="Rythme" ton="conseil" lignes={p.rythme} />
        <button
          type="button"
          disabled={!p.enregistrable || !p.modifie}
          onClick={p.onEnregistrer}
          className="flex min-h-10 items-center gap-2 rounded-[8px] bg-montage-selection px-4 text-sm font-bold text-montage-fond disabled:opacity-40"
        >
          <FloppyDiskIcon size={18} aria-hidden="true" />
          {p.enCours ? 'Enregistrement…' : (p.libelleEnregistrer ?? 'Enregistrer et fabriquer')}
        </button>
      </div>
    </header>
  );
}
