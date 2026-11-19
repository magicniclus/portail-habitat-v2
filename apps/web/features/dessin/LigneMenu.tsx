'use client';

import { CaretRightIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

const ligne =
  'flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[10px] border border-transparent bg-blanc px-2.5 py-2 text-left font-[inherit] text-texte hover:bg-neutre-100';
const actif = (oui: boolean) => (oui ? 'border-accent-300 bg-accent-100' : '');

export function Ligne({
  titre,
  detail,
  action,
  pressee,
  onClick,
}: {
  titre: string;
  detail: string;
  action?: ReactNode;
  pressee?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={pressee}
        className={`${ligne} ${actif(Boolean(pressee))}`}
        onClick={onClick}
      >
        <span className="flex-1">
          <span className="block font-semibold">{titre}</span>
          <span className="text-[13px] text-neutre-700">{detail}</span>
        </span>
        {action ?? <CaretRightIcon aria-hidden="true" />}
      </button>
    </li>
  );
}
