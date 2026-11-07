'use client';

import { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from '../cn';

interface ContexteChamp {
  id: string;
  describedBy: string | undefined;
  invalide: boolean;
  requis: boolean;
}

const Contexte = createContext<ContexteChamp | null>(null);

/** Attributs d'accessibilité fournis par le `<Field>` englobant (vide hors d'un Field). */
export function useChamp(): Partial<ContexteChamp> {
  return useContext(Contexte) ?? {};
}

export interface FieldProps {
  label: ReactNode;
  /** Aide sous le libellé (format attendu, usage de la donnée). */
  aide?: ReactNode;
  /** Message d'erreur : affiché sous le champ et relié par `aria-describedby`. */
  erreur?: ReactNode;
  requis?: boolean;
  className?: string;
  children: ReactNode;
}

/** Libellé + aide + erreur autour d'un seul contrôle (Input, Select, Textarea). */
export function Field({ label, aide, erreur, requis = false, className, children }: FieldProps) {
  const id = useId();
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = erreur ? `${id}-erreur` : undefined;
  const describedBy = [idAide, idErreur].filter(Boolean).join(' ') || undefined;
  return (
    <Contexte.Provider value={{ id, describedBy, invalide: Boolean(erreur), requis }}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label htmlFor={id} className="text-[15px] font-semibold text-texte">
          {label}
          {requis && (
            <span aria-hidden="true" className="text-danger">
              {' '}
              *
            </span>
          )}
        </label>
        {aide && (
          <p id={idAide} className="m-0 text-sm text-neutre-700">
            {aide}
          </p>
        )}
        {children}
        {erreur && (
          <p id={idErreur} className="m-0 text-sm font-semibold text-danger">
            {erreur}
          </p>
        )}
      </div>
    </Contexte.Provider>
  );
}
