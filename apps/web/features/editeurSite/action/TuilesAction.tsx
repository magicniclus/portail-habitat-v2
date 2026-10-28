'use client';

import { TUILES_ACTION, type Action } from '@ph/core/sites';
import {
  ChatTextIcon,
  ClipboardTextIcon,
  CrosshairSimpleIcon,
  DownloadSimpleIcon,
  EnvelopeSimpleIcon,
  FileTextIcon,
  GlobeSimpleIcon,
  PhoneIcon,
  ProhibitIcon,
  WhatsappLogoIcon,
  type Icon,
} from '@phosphor-icons/react';
import { cn } from '@ph/ui';

const ICONES: Record<Action['type'], Icon> = {
  page: FileTextIcon,
  ancre: CrosshairSimpleIcon,
  url: GlobeSimpleIcon,
  tel: PhoneIcon,
  email: EnvelopeSimpleIcon,
  sms: ChatTextIcon,
  whatsapp: WhatsappLogoIcon,
  formulaire: ClipboardTextIcon,
  fichier: DownloadSimpleIcon,
  aucun: ProhibitIcon,
};

/** Choix du type d'action en tuiles (maquette Editeur de Site, « Action du bouton »). */
export function TuilesAction({
  libelle,
  valeur,
  onChange,
}: {
  libelle: string;
  valeur: Action['type'];
  onChange: (t: Action['type']) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={libelle}
      className="grid grid-cols-5 gap-1.5 max-[360px]:grid-cols-4"
    >
      {(Object.keys(TUILES_ACTION) as Action['type'][]).map((t) => {
        const I = ICONES[t];
        const actif = t === valeur;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => onChange(t)}
            className={cn(
              'grid min-h-14 min-w-0 place-items-center content-center gap-1 rounded-[8px] border px-0.5 py-1.5 text-[11px] leading-none font-semibold',
              actif
                ? 'border-accent bg-accent-50 text-accent-700'
                : 'border-trait bg-blanc text-neutre-700 hover:bg-neutre-100',
            )}
          >
            <I size={18} weight={actif ? 'fill' : 'regular'} aria-hidden="true" />
            <span className="max-w-full truncate">{TUILES_ACTION[t]}</span>
          </button>
        );
      })}
    </div>
  );
}
