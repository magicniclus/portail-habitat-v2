'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../cn';
import { classesControle } from '../primitives/Input';

export interface OptionCombobox {
  id: string;
  libelle: string;
  /** Texte secondaire (métier, badge « Estimation en ligne »…). */
  complement?: ReactNode;
}

export interface ComboboxProps {
  label: string;
  labelMasque?: boolean;
  valeur: string;
  onValeurChange: (texte: string) => void;
  options: OptionCombobox[];
  onSelection: (option: OptionCombobox) => void;
  placeholder?: string;
  /** Message quand la saisie ne donne rien. */
  vide?: ReactNode;
  className?: string;
}

/**
 * Champ avec suggestions (motif ARIA 1.2 « combobox » + « listbox ») :
 * flèches, Entrée, Échap ; la liste est filtrée par l'appelant.
 */
export function Combobox({
  label,
  labelMasque,
  valeur,
  onValeurChange,
  options,
  onSelection,
  placeholder,
  vide,
  className,
}: ComboboxProps) {
  const id = useId();
  const idListe = `${id}-liste`;
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const visible = ouvert && valeur.trim().length > 0;

  const choisir = (option: OptionCombobox) => {
    onSelection(option);
    setOuvert(false);
    setActif(-1);
  };

  const clavier = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOuvert(true);
      setActif((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActif((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && visible && actif >= 0 && options[actif]) {
      e.preventDefault();
      choisir(options[actif]);
    } else if (e.key === 'Escape') {
      setOuvert(false);
      setActif(-1);
    }
  };

  return (
    <div className={cn('relative flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-[15px] font-semibold', labelMasque && 'sr-only')}>
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        type="text"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={idListe}
        aria-activedescendant={visible && actif >= 0 ? `${id}-option-${actif}` : undefined}
        value={valeur}
        placeholder={placeholder}
        onChange={(e) => {
          onValeurChange(e.target.value);
          setOuvert(true);
          setActif(-1);
        }}
        onKeyDown={clavier}
        onFocus={() => setOuvert(true)}
        onBlur={() => setOuvert(false)}
        className={classesControle}
      />
      <ul
        id={idListe}
        role="listbox"
        aria-label={label}
        hidden={!visible}
        className="absolute top-full z-30 m-0 mt-1 max-h-80 w-full list-none overflow-y-auto rounded-card border border-neutre-200 bg-blanc p-1.5 shadow-lg"
      >
        {options.map((option, i) => (
          <li
            key={option.id}
            id={`${id}-option-${i}`}
            role="option"
            aria-selected={i === actif}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choisir(option)}
            className={cn(
              'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-control px-3 py-2',
              i === actif ? 'bg-accent-100' : 'hover:bg-neutre-100',
            )}
          >
            <span className="font-semibold">{option.libelle}</span>
            {option.complement && (
              <span className="text-sm text-neutre-700">{option.complement}</span>
            )}
          </li>
        ))}
        {options.length === 0 && (
          <li role="presentation" className="px-3 py-2.5 text-neutre-700">
            {vide ?? 'Aucun résultat.'}
          </li>
        )}
      </ul>
    </div>
  );
}
