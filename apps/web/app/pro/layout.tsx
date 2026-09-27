import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { EspaceTheme } from '@/features/theme/Theme';
import { viewportEspace } from '@/features/theme/viewport';

export const metadata: Metadata = {
  title: { default: 'Portail Habitat Pro', template: '%s · Portail Habitat Pro' },
};

export const viewport: Viewport = viewportEspace('pro');

export default function ProLayout({ children }: { children: ReactNode }) {
  return <EspaceTheme theme="pro">{children}</EspaceTheme>;
}
