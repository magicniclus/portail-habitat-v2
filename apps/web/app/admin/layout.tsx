import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { EspaceTheme } from '@/features/theme/Theme';
import { viewportEspace } from '@/features/theme/viewport';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = viewportEspace('admin');

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <EspaceTheme theme="admin">{children}</EspaceTheme>;
}
