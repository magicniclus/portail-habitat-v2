'use client';

import { forceMotDePasse } from '@ph/core/onboarding';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { Field, Input } from '@ph/ui';
import { useState } from 'react';

const NIVEAUX = ['à définir', 'faible', 'correcte', 'bonne', 'excellente'];

/** Mot de passe et confirmation de l'étape 3, avec la jauge de sécurité. */
export function MotDePasseCompte(p: {
  motDePasse: string;
  confirmation: string;
  onMotDePasse: (v: string) => void;
  onConfirmation: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const force = forceMotDePasse(p.motDePasse);
  return (
    <>
      <Field label="Mot de passe" requis>
        <span className="relative flex">
          <Input
            champ="motDePasseNouveau"
            type={visible ? 'text' : 'password'}
            placeholder="10 caractères minimum"
            value={p.motDePasse}
            onChange={(e) => p.onMotDePasse(e.target.value)}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 grid min-h-11 w-11 cursor-pointer place-items-center border-0 bg-transparent text-neutre-700"
          >
            {visible ? (
              <EyeSlash size={20} aria-hidden="true" />
            ) : (
              <Eye size={20} aria-hidden="true" />
            )}
            <span className="sr-only">
              {visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            </span>
          </button>
        </span>
      </Field>
      <div aria-live="polite" className="-mt-2 grid gap-2">
        <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-pill bg-neutre-300">
          <span
            className="block h-full bg-accent motion-safe:transition-[width]"
            style={{ width: `${force * 25}%` }}
          />
        </span>
        <span className="text-[13px] text-neutre-800">
          Sécurité : <strong>{NIVEAUX[force]}</strong> · 10 caractères, une majuscule ou un chiffre
        </span>
      </div>
      <Field label="Confirmer le mot de passe" requis>
        <Input
          champ="motDePasseNouveau"
          type={visible ? 'text' : 'password'}
          placeholder="Retapez votre mot de passe"
          value={p.confirmation}
          onChange={(e) => p.onConfirmation(e.target.value)}
        />
      </Field>
    </>
  );
}
