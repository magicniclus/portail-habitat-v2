import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { EspaceTheme } from '@/features/theme/Theme';
import { viewportEspace } from '@/features/theme/viewport';

export const metadata: Metadata = {
  title: { default: 'Portail Travaux Diag', template: '%s · Portail Travaux Diag' },
};

export const viewport: Viewport = viewportEspace('diag');

export default function DiagnosticLayout({ children }: { children: ReactNode }) {
  return <EspaceTheme theme="diag">{children}</EspaceTheme>;
}
