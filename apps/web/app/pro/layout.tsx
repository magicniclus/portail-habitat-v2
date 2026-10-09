import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { PWA_PRO } from '@/features/pwa/manifest';
import { EspaceTheme } from '@/features/theme/Theme';
import { viewportEspace } from '@/features/theme/viewport';

export const metadata: Metadata = {
  title: { default: 'Portail Habitat Pro', template: '%s · Portail Habitat Pro' },
  // Application installable (MOBILE §9, MOB-06).
  manifest: PWA_PRO.manifest,
  appleWebApp: { capable: true, title: 'PH Pro', statusBarStyle: 'default' },
  icons: { apple: PWA_PRO.icone('apple') },
};

export const viewport: Viewport = viewportEspace('pro');

export default function ProLayout({ children }: { children: ReactNode }) {
  return <EspaceTheme theme="pro">{children}</EspaceTheme>;
}
