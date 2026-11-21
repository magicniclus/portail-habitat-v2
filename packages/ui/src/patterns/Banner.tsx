import {
  CheckCircleIcon,
  InfoIcon,
  SealCheckIcon,
  WarningCircleIcon,
  WarningIcon,
} from '@phosphor-icons/react/ssr';
import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '../cn';

const banniere = cva('flex flex-wrap items-start gap-3 rounded-card border px-4 py-3.5', {
  variants: {
    tone: {
      info: 'border-info/25 bg-info-fond text-info',
      succes: 'border-succes/25 bg-succes-fond text-succes',
      attention: 'border-attention-vif/40 bg-attention-fond text-attention',
      danger: 'border-danger/30 bg-danger-fond text-danger',
      premium: 'border-premium bg-premium-fond text-premium-texte',
    },
  },
});

type ToneBanniere = 'info' | 'succes' | 'attention' | 'danger' | 'premium';

const ICONES: Record<ToneBanniere, ReactNode> = {
  info: <InfoIcon weight="duotone" />,
  succes: <CheckCircleIcon weight="duotone" />,
  attention: <WarningIcon weight="duotone" />,
  danger: <WarningCircleIcon weight="duotone" />,
  premium: <SealCheckIcon weight="duotone" />,
};

export interface BannerProps {
  tone?: ToneBanniere;
  titre?: string;
  children?: ReactNode;
  /** Bouton ou lien d'action, à droite (en dessous sur mobile). */
  action?: ReactNode;
  className?: string;
}

/** Message de page (tableaux de bord, alertes). Les dangers sont annoncés immédiatement. */
export function Banner({ tone = 'info', titre, children, action, className }: BannerProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(banniere({ tone }), className)}
    >
      <span aria-hidden="true" className="mt-0.5 flex-none text-[22px]">
        {ICONES[tone]}
      </span>
      <div className="flex min-w-[min(100%,220px)] flex-1 flex-col gap-0.5 text-texte">
        {titre && <strong className="font-bold">{titre}</strong>}
        {children && <div className="text-[15px]">{children}</div>}
      </div>
      {action && <div className="flex-none">{action}</div>}
    </div>
  );
}
