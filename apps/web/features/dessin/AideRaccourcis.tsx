'use client';

import { Modal } from '@ph/ui';
import { useEffect, useState } from 'react';
import { RACCOURCIS } from './raccourcis';

/** Fenêtre des raccourcis (DES-47) : touche « ? » partout dans l'éditeur, hors des champs. */
export function AideRaccourcis() {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    const ecouter = (ev: KeyboardEvent) => {
      if (ev.key !== '?') return;
      if ((ev.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]'))
        return;
      ev.preventDefault();
      setOuvert(true);
    };
    document.addEventListener('keydown', ecouter);
    return () => document.removeEventListener('keydown', ecouter);
  }, []);
  return (
    <Modal open={ouvert} onOpenChange={setOuvert} titre="Raccourcis clavier">
      <ListeRaccourcis />
    </Modal>
  );
}

export function ListeRaccourcis() {
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {RACCOURCIS.map(([touches, action]) => (
        <div key={touches} className="contents">
          <dt>
            <kbd className="rounded-md border border-trait bg-neutre-100 px-1.5 py-0.5 font-[inherit] text-[13px] font-semibold whitespace-nowrap">
              {touches}
            </kbd>
          </dt>
          <dd className="m-0 text-neutre-800">{action}</dd>
        </div>
      ))}
    </dl>
  );
}
