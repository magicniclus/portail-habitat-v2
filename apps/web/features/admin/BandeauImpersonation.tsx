'use client';

import { deconnecterAdmin } from './deconnexion';

/** Bandeau rouge du mode « voir en tant que » (ADM-04) : lecture seule, sortie en un clic. */
export function BandeauImpersonation() {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 bg-danger px-4 py-2 text-blanc"
    >
      <p className="m-0 text-sm font-semibold">
        Mode « voir en tant que » : lecture seule, aucune modification n’est possible.
      </p>
      <button
        type="button"
        onClick={() => void deconnecterAdmin(undefined, '/admin')}
        className="min-h-11 cursor-pointer rounded-md border border-blanc px-3 text-sm font-semibold"
      >
        Quitter et revenir à l’administration
      </button>
    </div>
  );
}
